/*!
 * STDateRange v1.0.0
 * Date range picker: ปฏิทิน 2 เดือน + Presets + พิมพ์วันที่ (dd/mm/yyyy) + Apply/Cancel
 * - ไม่ต้องใช้ jQuery / Bootstrap (แต่ใช้ class ของ Bootstrap 5 ได้ทันที)
 * - ใช้ได้หลายตัวในหน้าเดียว
 * แยกมาจาก PMHWeb › Views/WMSReport/PickProfileReport.cshtml
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.STDateRange = factory();
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    /* ============================================================
       Date helpers (ทุกค่าเป็น Date ที่เวลา 00:00 ของเครื่อง)
       ============================================================ */
    const DAY_MS = 86400000;

    function pad(n) { return String(n).padStart(2, '0'); }
    function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
    function today() { return startOfDay(new Date()); }
    function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
    // บวก/ลบเดือนแบบไม่ล้นเดือน (31 มี.ค. - 1 เดือน = 28/29 ก.พ. ไม่ใช่ 3 มี.ค.)
    function addMonths(d, n) {
        const x = new Date(d.getFullYear(), d.getMonth() + n, 1);
        const last = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate();
        x.setDate(Math.min(d.getDate(), last));
        return x;
    }
    function firstOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
    function startOfWeekMon(d) {
        const x = startOfDay(d);
        const day = x.getDay();
        x.setDate(x.getDate() + (day === 0 ? -6 : 1 - day));
        return x;
    }
    function sameDay(a, b) {
        return !!a && !!b && a.getFullYear() === b.getFullYear() &&
            a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    }
    function dayCount(s, e) { return Math.round((startOfDay(e) - startOfDay(s)) / DAY_MS) + 1; }
    function formatDMY(d) { return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` : ''; }
    function formatISO(d) { return d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : ''; }

    function validYMD(y, m, d) {
        const x = new Date(y, m - 1, d);
        return (x.getFullYear() === y && x.getMonth() === m - 1 && x.getDate() === d) ? x : null;
    }
    function parseISO(text) {
        const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(text || '').trim());
        return m ? validYMD(+m[1], +m[2], +m[3]) : null;
    }
    // dd/mm/yyyy, d/m/yyyy, dd-mm-yyyy, dd.mm.yyyy หรือ ddmmyyyy
    function parseDMY(text) {
        const s = String(text || '').trim();
        const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/) || s.match(/^(\d{2})(\d{2})(\d{4})$/);
        return m ? validYMD(+m[3], +m[2], +m[1]) : null;
    }
    // Date | 'yyyy-mm-dd' | 'dd/mm/yyyy' | number (จำนวนวันนับจากวันนี้ เช่น -89) | function → Date | null
    function toDate(v) {
        if (typeof v === 'function') v = v();
        if (v === null || v === undefined || v === '') return null;
        if (v instanceof Date) return isNaN(v) ? null : startOfDay(v);
        if (typeof v === 'number') return addDays(today(), v);
        return parseISO(v) || parseDMY(v);
    }
    function esc(s) {
        return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    /* ============================================================
       Presets สำเร็จรูป — range(today) คืนค่า [from, to]
       ============================================================ */
    const PRESETS = {
        today:       { label: 'Today',        range: t => [t, t] },
        yesterday:   { label: 'Yesterday',    range: t => { const d = addDays(t, -1); return [d, d]; } },
        thisWeek:    { label: 'This Week',    range: t => [startOfWeekMon(t), t] },          // เริ่มวันจันทร์
        last7Days:   { label: 'Last 7 Days',  range: t => [addDays(t, -6), t] },
        last30Days:  { label: 'Last 30 Days', range: t => [addDays(t, -29), t] },
        thisMonth:   { label: 'This Month',   range: t => [firstOfMonth(t), t] },
        lastMonth:   { label: 'Last Month',   range: t => [firstOfMonth(addMonths(t, -1)), new Date(t.getFullYear(), t.getMonth(), 0)] },
        last1Month:  { label: '1 Months',     range: t => [addMonths(t, -1), t] },
        last2Months: { label: '2 Months',     range: t => [addMonths(t, -2), t] },
        last3Months: { label: '3 Months',     range: t => [addMonths(t, -3), t] }
    };

    const DEFAULTS = {
        startDate: null,          // ช่วงเริ่มต้น (ไม่ใส่ = ย้อนหลัง 1 เดือน ถึงวันนี้)
        endDate: null,
        minDate: null,            // วันแรกที่เลือกได้  เช่น -89 = ย้อนหลัง 90 วันรวมวันนี้
        maxDate: null,            // วันสุดท้ายที่เลือกได้ เช่น 0 = วันนี้
        maxRangeDays: null,       // ช่วงยาวสุด (วัน รวมวันแรก/วันสุดท้าย)
        calendars: 2,             // จำนวนเดือนที่แสดง (1 หรือ 2)
        weekStart: 0,             // 0 = อาทิตย์, 1 = จันทร์ (คอลัมน์แรกของปฏิทิน)
        presets: ['today', 'yesterday', 'thisWeek', 'last1Month', 'last2Months'],
        align: 'auto',            // 'auto' | 'left' | 'right'
        inputClass: 'form-control',
        typeClass: 'form-control',
        applyClass: 'btn btn-primary',
        cancelClass: 'btn btn-outline-secondary',
        fromName: null,           // ชื่อ hidden input (yyyy-mm-dd) สำหรับ submit form
        toName: null,
        note: 'auto',             // 'auto' | ข้อความ | false
        weekdays: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
        months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        texts: {
            separator: 'ถึง',
            apply: 'Apply',
            cancel: 'Cancel',
            placeholder: 'dd/mm/yyyy',
            prevMonth: 'เดือนก่อนหน้า',
            nextMonth: 'เดือนถัดไป',
            noteMaxRange: 'เลือกได้ไม่เกิน {n} วัน',
            noteBack: 'ย้อนหลังได้ไม่เกิน {n} วัน',
            errInvalid: 'วันที่ที่พิมพ์ไม่ถูกต้อง หรืออยู่นอกช่วงที่เลือกได้ (dd/mm/yyyy)',
            errRequired: 'กรุณาเลือกช่วงวันที่',
            errMaxRange: 'ช่วงวันที่ต้องไม่เกิน {n} วัน'
        },
        formatDisplay: null,      // (from, to, picker) => string
        onApply: null,            // (from, to, picker) => void  — เรียกเมื่อผู้ใช้กด Apply
        onError: null             // (message, picker) => void   — ไม่ใส่ = แสดงข้อความสีแดงในกล่อง
    };

    const CALENDAR_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5M1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4z"/></svg>';

    let uid = 0;

    /* ============================================================
       STDateRange
       ============================================================ */
    class STDateRange {
        /**
         * @param {string|HTMLElement} target  div ว่าง ๆ ที่จะวาง picker ลงไป
         * @param {object} options             ดู DEFAULTS
         */
        constructor(target, options) {
            const el = typeof target === 'string' ? document.querySelector(target) : target;
            if (!el) throw new Error('STDateRange: ไม่พบ element ' + target);
            if (el._stdr) el._stdr.destroy();

            options = options || {};
            this.el = el;
            this.opts = Object.assign({}, DEFAULTS, options);
            this.opts.texts = Object.assign({}, DEFAULTS.texts, options.texts);
            this.opts.calendars = this.opts.calendars === 1 ? 1 : 2;
            this._uid = ++uid;
            this._presetList = this._resolvePresets();

            this._build();
            this._bind();

            const [s, e] = this._initialRange();
            this.from = s;
            this.to = e;
            this._initial = [new Date(s), new Date(e)];
            this._sync();
            el._stdr = this;
        }

        /* ---------- public API ---------- */

        /** { from: Date, to: Date } */
        getRange() { return { from: new Date(this.from), to: new Date(this.to) }; }

        /** { from: 'yyyy-mm-dd', to: 'yyyy-mm-dd' } — ใช้ส่งเข้า Controller */
        getISO() { return { from: formatISO(this.from), to: formatISO(this.to) }; }

        /** ข้อความที่แสดงในช่อง เช่น "11/10/2026 ถึง 11/11/2026" */
        getText() { return this._displayText(); }

        /** จำนวนวันในช่วง (รวมวันแรกและวันสุดท้าย) */
        getDayCount() { return dayCount(this.from, this.to); }

        /**
         * ตั้งช่วงวันที่จากโค้ด (ไม่เรียก onApply) — ค่าจะถูกบีบให้อยู่ใน min/max/maxRangeDays
         * รับ Date | 'yyyy-mm-dd' | 'dd/mm/yyyy' | number
         */
        setRange(from, to) {
            let s = toDate(from), e = toDate(to === undefined ? from : to);
            if (!s && !e) return false;
            s = s || e; e = e || s;
            if (s > e) [s, e] = [e, s];
            [this.from, this.to] = this._fit(s, e);
            this._sync();
            if (this.isOpen()) this._loadTemp();
            return true;
        }

        /** กลับไปช่วงเริ่มต้นตอนสร้าง (ไม่เรียก onApply) */
        reset() { return this.setRange(this._initial[0], this._initial[1]); }

        open() {
            if (this.isOpen()) return;
            this._loadTemp();
            this.el.classList.add('stdr-open');
            this._display.setAttribute('aria-expanded', 'true');
            this._position();
        }

        close() {
            if (!this.isOpen()) return;
            this.el.classList.remove('stdr-open');
            this._display.setAttribute('aria-expanded', 'false');
        }

        toggle() { this.isOpen() ? this.close() : this.open(); }
        isOpen() { return this.el.classList.contains('stdr-open'); }

        destroy() {
            document.removeEventListener('pointerdown', this._onDocDown, true);
            this.el.innerHTML = '';
            this.el.classList.remove('stdr', 'stdr-open');
            delete this.el._stdr;
        }

        /* ---------- build ---------- */

        _build() {
            const o = this.opts, t = o.texts, id = 'stdr' + this._uid;
            const alignCls = o.align === 'right' ? ' stdr-align-right' : '';
            this.el.classList.add('stdr');
            this.el.innerHTML = `
                <div class="stdr-input ${esc(o.inputClass || '')}" tabindex="0" role="button"
                     aria-haspopup="dialog" aria-expanded="false" aria-controls="${id}-panel">
                    <span class="stdr-text"></span><span class="stdr-icon">${CALENDAR_ICON}</span>
                </div>
                ${o.fromName ? `<input type="hidden" class="stdr-hidden-from" name="${esc(o.fromName)}">` : ''}
                ${o.toName ? `<input type="hidden" class="stdr-hidden-to" name="${esc(o.toName)}">` : ''}
                <div class="stdr-panel${alignCls}" id="${id}-panel" role="dialog">
                    ${this._presetList.length ? '<div class="stdr-presets"></div>' : ''}
                    <div class="stdr-body">
                        <div class="stdr-months"></div>
                        <div class="stdr-manual">
                            <input type="text" class="stdr-type stdr-type-from ${esc(o.typeClass || '')}" placeholder="${esc(t.placeholder)}"
                                   maxlength="10" autocomplete="off" inputmode="numeric" aria-label="from">
                            <span>${esc(t.separator)}</span>
                            <input type="text" class="stdr-type stdr-type-to ${esc(o.typeClass || '')}" placeholder="${esc(t.placeholder)}"
                                   maxlength="10" autocomplete="off" inputmode="numeric" aria-label="to">
                        </div>
                        <div class="stdr-note">${esc(this._noteText())}</div>
                        <div class="stdr-error" role="alert"></div>
                        <div class="stdr-actions">
                            <button type="button" class="stdr-btn stdr-cancel ${esc(o.cancelClass || '')}">${esc(t.cancel)}</button>
                            <button type="button" class="stdr-btn stdr-apply ${esc(o.applyClass || '')}">${esc(t.apply)}</button>
                        </div>
                    </div>
                </div>`;

            const q = sel => this.el.querySelector(sel);
            this._display = q('.stdr-input');
            this._textEl = q('.stdr-text');
            this._panel = q('.stdr-panel');
            this._presetsEl = q('.stdr-presets');
            this._monthsEl = q('.stdr-months');
            this._typeFrom = q('.stdr-type-from');
            this._typeTo = q('.stdr-type-to');
            this._errorEl = q('.stdr-error');
            this._hiddenFrom = q('.stdr-hidden-from');
            this._hiddenTo = q('.stdr-hidden-to');

            if (this._presetsEl) {
                this._presetsEl.innerHTML = this._presetList
                    .map((p, i) => `<button type="button" class="stdr-preset" data-preset="${i}">${esc(p.label)}</button>`)
                    .join('');
            }
        }

        _bind() {
            // ปิดเมื่อคลิกนอกกล่อง (ใช้ pointerdown เพราะ click บนวันที่จะ re-render ทำให้ target หลุดจาก DOM)
            this._onDocDown = e => { if (this.isOpen() && !this.el.contains(e.target)) this.close(); };
            document.addEventListener('pointerdown', this._onDocDown, true);

            this._display.addEventListener('click', () => this.toggle());
            this.el.addEventListener('keydown', e => {
                if (e.target === this._display && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) {
                    e.preventDefault();
                    e.key === 'ArrowDown' ? this.open() : this.toggle();
                } else if (e.key === 'Escape' && this.isOpen()) {
                    e.preventDefault();
                    this.close();
                    this._display.focus();
                }
            });

            this._panel.addEventListener('click', e => {
                const nav = e.target.closest('[data-nav]');
                if (nav) { this._navigate(+nav.getAttribute('data-nav')); return; }

                const day = e.target.closest('.stdr-day');
                if (day && !day.classList.contains('stdr-disabled')) { this._pickDay(parseISO(day.getAttribute('data-date'))); return; }

                const preset = e.target.closest('[data-preset]');
                if (preset) { this._pickPreset(+preset.getAttribute('data-preset')); return; }

                if (e.target.closest('.stdr-cancel')) { this.close(); return; }
                if (e.target.closest('.stdr-apply')) this._apply();
            });

            // แสดงช่วงที่กำลังจะเลือกตอนเลื่อนเมาส์ (หลังเลือกวันแรกแล้ว)
            this._monthsEl.addEventListener('mouseover', e => {
                const day = e.target.closest('.stdr-day');
                this._preview(day && !day.classList.contains('stdr-disabled') ? parseISO(day.getAttribute('data-date')) : null);
            });
            this._monthsEl.addEventListener('mouseleave', () => this._preview(null));

            [this._typeFrom, this._typeTo].forEach(inp => {
                inp.addEventListener('input', () => { inp.classList.remove('is-invalid'); this._clearError(); this._syncTyped(); });
                inp.addEventListener('blur', () => {
                    const d = parseDMY(inp.value);
                    if (d) inp.value = formatDMY(d);
                    if (inp.value.trim() !== '') this._flagTyped(this._readTyped());
                });
                inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); this._apply(); } });
            });
        }

        /* ---------- limits ---------- */

        _limits() { return { min: toDate(this.opts.minDate), max: toDate(this.opts.maxDate) }; }

        _inLimits(d, lim) { return (!lim.min || d >= lim.min) && (!lim.max || d <= lim.max); }

        // ระหว่างเลือกวันสุดท้าย: ปิดวันที่ทำให้ช่วงเกิน maxRangeDays (วันก่อนวันแรกยังกดได้ = เริ่มใหม่)
        _selectable(d, lim) {
            if (!this._inLimits(d, lim)) return false;
            const max = this.opts.maxRangeDays, s = this._tmpStart;
            if (max && s && !this._tmpEnd && d > s && dayCount(s, d) > max) return false;
            return true;
        }

        // บีบช่วงให้อยู่ใน min/max และไม่เกิน maxRangeDays
        _fit(s, e) {
            const lim = this._limits();
            const clamp = d => (lim.min && d < lim.min) ? new Date(lim.min) : (lim.max && d > lim.max) ? new Date(lim.max) : new Date(d);
            s = clamp(s); e = clamp(e);
            if (s > e) s = new Date(e);
            const max = this.opts.maxRangeDays;
            if (max && dayCount(s, e) > max) s = addDays(e, -(max - 1));
            return [s, e];
        }

        _initialRange() {
            let s = toDate(this.opts.startDate), e = toDate(this.opts.endDate);
            if (!s && !e) { e = today(); s = addMonths(e, -1); }
            s = s || e; e = e || s;
            if (s > e) [s, e] = [e, s];
            return this._fit(s, e);
        }

        /* ---------- panel state ---------- */

        _loadTemp() {
            this._tmpStart = new Date(this.from);
            this._tmpEnd = new Date(this.to);
            this._view = this._viewFor(this._tmpStart, this._tmpEnd);
            this._clearError();
            this._render();
            this._fillTyped();
        }

        // เดือนซ้ายสุดที่จะแสดง: เห็นวันแรกเสมอ และไม่เลื่อนเลย maxDate
        _viewFor(s, e) {
            const lim = this._limits(), n = this.opts.calendars;
            const anchor = lim.max || e || s;
            const lastView = new Date(anchor.getFullYear(), anchor.getMonth() - (n - 1), 1);
            let m = firstOfMonth(s);
            if (m > lastView) m = lastView;
            if (lim.min && m < firstOfMonth(lim.min)) m = firstOfMonth(lim.min);
            return m;
        }

        _navigate(dir) {
            this._view = new Date(this._view.getFullYear(), this._view.getMonth() + dir, 1);
            this._renderMonths();
        }

        _pickDay(d) {
            if (!d) return;
            const s = this._tmpStart, e = this._tmpEnd;
            if (!s || e || d < s) { this._tmpStart = d; this._tmpEnd = null; }
            else this._tmpEnd = d;
            this._clearError();
            this._render();
            this._fillTyped();
        }

        _pickPreset(i) {
            const p = this._presetList[i];
            if (!p) return;
            const r = p.range(today()) || [];
            let s = toDate(r[0]), e = toDate(r[1]);
            if (!s || !e) return;
            if (s > e) [s, e] = [e, s];
            [this._tmpStart, this._tmpEnd] = this._fit(s, e);
            this._view = this._viewFor(this._tmpStart, this._tmpEnd);
            this._clearError();
            this._render();
            this._fillTyped();
        }

        _apply() {
            const t = this.opts.texts;
            if (!this._syncTyped()) { this._flagTyped(this._readTyped()); return this._error(t.errInvalid); }
            if (!this._tmpStart) return this._error(t.errRequired);
            const from = new Date(this._tmpStart);
            const to = new Date(this._tmpEnd || this._tmpStart);
            const max = this.opts.maxRangeDays;
            if (max && dayCount(from, to) > max) return this._error(t.errMaxRange.replace('{n}', max));

            this.from = from;
            this.to = to;
            this._sync();
            this.close();
            this._display.focus();

            if (typeof this.opts.onApply === 'function') this.opts.onApply(new Date(from), new Date(to), this);
            this.el.dispatchEvent(new CustomEvent('stdr:apply', {
                bubbles: true,
                detail: { from: new Date(from), to: new Date(to), fromISO: formatISO(from), toISO: formatISO(to), picker: this }
            }));
        }

        /* ---------- typed dates ---------- */

        // ช่อง "ถึง" ว่าง = วันเดียวกับ "จาก"
        _readTyped() {
            const lim = this._limits();
            const s = parseDMY(this._typeFrom.value);
            const e = this._typeTo.value.trim() === '' ? s : parseDMY(this._typeTo.value);
            const ok = d => !!d && this._inLimits(d, lim);
            const fromOk = ok(s);
            return { s, e, fromOk, toOk: ok(e) && (!fromOk || e >= s) };
        }

        _flagTyped(r) {
            this._typeFrom.classList.toggle('is-invalid', !r.fromOk);
            this._typeTo.classList.toggle('is-invalid', !r.toOk);
        }

        // วันที่พิมพ์ถูกต้อง → กลายเป็นช่วงที่เลือกบนปฏิทิน
        _syncTyped() {
            const r = this._readTyped();
            if (!r.fromOk || !r.toOk) return false;
            if (sameDay(r.s, this._tmpStart) && sameDay(r.e, this._tmpEnd)) return true;
            this._tmpStart = r.s;
            this._tmpEnd = r.e;
            this._view = this._viewFor(r.s, r.e);
            this._render();
            return true;
        }

        _fillTyped() {
            const s = this._tmpStart, e = this._tmpEnd || s;
            this._typeFrom.value = formatDMY(s);
            this._typeTo.value = formatDMY(e);
            this._typeFrom.classList.remove('is-invalid');
            this._typeTo.classList.remove('is-invalid');
        }

        /* ---------- render ---------- */

        _render() {
            this._renderMonths();
            this._markPreset();
        }

        _renderMonths() {
            const o = this.opts, t = o.texts, lim = this._limits(), n = o.calendars;
            const months = [];
            for (let i = 0; i < n; i++) months.push(new Date(this._view.getFullYear(), this._view.getMonth() + i, 1));
            const canPrev = !lim.min || months[0] > firstOfMonth(lim.min);
            const canNext = !lim.max || months[n - 1] < firstOfMonth(lim.max);
            const ws = ((o.weekStart % 7) + 7) % 7;
            const weekdays = o.weekdays.slice(ws).concat(o.weekdays.slice(0, ws));
            const now = today();

            this._monthsEl.innerHTML = months.map((m, idx) => {
                const offset = (m.getDay() - ws + 7) % 7;
                const gridStart = new Date(m.getFullYear(), m.getMonth(), 1 - offset);
                let rows = '';
                for (let w = 0; w < 6; w++) {
                    rows += '<tr>';
                    for (let i = 0; i < 7; i++) {
                        const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + w * 7 + i);
                        rows += `<td><div class="${this._dayClass(d, m.getMonth(), lim, now)}" data-date="${formatISO(d)}">${d.getDate()}</div></td>`;
                    }
                    rows += '</tr>';
                }
                const prev = idx === 0 && canPrev;
                const next = idx === n - 1 && canNext;
                return `
                    <div class="stdr-month">
                        <div class="stdr-month-head">
                            <button type="button" class="stdr-nav${prev ? '' : ' stdr-hidden'}" ${prev ? 'data-nav="-1"' : 'tabindex="-1"'} aria-label="${esc(t.prevMonth)}">‹</button>
                            <span>${esc(o.months[m.getMonth()])} ${m.getFullYear()}</span>
                            <button type="button" class="stdr-nav${next ? '' : ' stdr-hidden'}" ${next ? 'data-nav="1"' : 'tabindex="-1"'} aria-label="${esc(t.nextMonth)}">›</button>
                        </div>
                        <table class="stdr-grid">
                            <thead><tr>${weekdays.map(w => `<th>${esc(w)}</th>`).join('')}</tr></thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>`;
            }).join('');
        }

        _dayClass(d, month, lim, now) {
            const c = ['stdr-day'], s = this._tmpStart, e = this._tmpEnd;
            if (d.getMonth() !== month) c.push('stdr-out');
            if (sameDay(d, now)) c.push('stdr-today');
            if (!this._selectable(d, lim)) c.push('stdr-disabled');
            if (sameDay(d, s)) c.push('stdr-selected', 'stdr-start');
            if (sameDay(d, e)) c.push('stdr-selected', 'stdr-end');
            if (s && e && d > s && d < e) c.push('stdr-inrange');
            return c.join(' ');
        }

        _preview(h) {
            const s = this._tmpStart;
            const active = !!(h && s && !this._tmpEnd && h > s);
            this._monthsEl.querySelectorAll('.stdr-day').forEach(cell => {
                let on = false;
                if (active && !cell.classList.contains('stdr-disabled')) {
                    const d = parseISO(cell.getAttribute('data-date'));
                    on = d > s && d <= h;
                }
                cell.classList.toggle('stdr-preview', on);
            });
        }

        // ไฮไลต์ preset ที่ตรงกับช่วงที่เลือกอยู่
        _markPreset() {
            if (!this._presetsEl) return;
            const s = this._tmpStart, e = this._tmpEnd, now = today();
            this._presetList.forEach((p, i) => {
                let match = false;
                if (s && e) {
                    const r = p.range(now) || [];
                    const ps = toDate(r[0]), pe = toDate(r[1]);
                    if (ps && pe) {
                        const [fs, fe] = this._fit(ps <= pe ? ps : pe, ps <= pe ? pe : ps);
                        match = sameDay(fs, s) && sameDay(fe, e);
                    }
                }
                const btn = this._presetsEl.querySelector(`[data-preset="${i}"]`);
                if (btn) btn.classList.toggle('stdr-active', match);
            });
        }

        _sync() {
            this._textEl.textContent = this._displayText();
            if (this._hiddenFrom) this._hiddenFrom.value = formatISO(this.from);
            if (this._hiddenTo) this._hiddenTo.value = formatISO(this.to);
        }

        _displayText() {
            if (typeof this.opts.formatDisplay === 'function') return this.opts.formatDisplay(new Date(this.from), new Date(this.to), this);
            return `${formatDMY(this.from)} ${this.opts.texts.separator} ${formatDMY(this.to)}`;
        }

        _noteText() {
            const o = this.opts, t = o.texts;
            if (o.note === false || o.note === null) return '';
            if (typeof o.note === 'string' && o.note !== 'auto') return o.note;
            const parts = [];
            if (o.maxRangeDays) parts.push(t.noteMaxRange.replace('{n}', o.maxRangeDays));
            const min = toDate(o.minDate), now = today();
            if (min && min <= now) parts.push(t.noteBack.replace('{n}', dayCount(min, now)));
            return parts.join(' · ');
        }

        _error(msg) {
            if (typeof this.opts.onError === 'function') this.opts.onError(msg, this);
            else this._errorEl.textContent = msg;
            return false;
        }

        _clearError() { this._errorEl.textContent = ''; }

        // align: 'auto' → ถ้ากล่องล้นขอบขวาของจอ ให้ชิดขวาแทน, ถ้ายังล้นก็เลื่อนให้อยู่ในจอ
        _position() {
            if (this.opts.align !== 'auto') return;
            const p = this._panel, vw = document.documentElement.clientWidth, gap = 8;
            p.style.left = '';
            p.classList.remove('stdr-align-right');
            if (p.getBoundingClientRect().right <= vw - gap) return;
            p.classList.add('stdr-align-right');
            if (p.getBoundingClientRect().left >= gap) return;
            p.classList.remove('stdr-align-right');
            const r = p.getBoundingClientRect();
            const shift = Math.max(0, Math.min(r.right - (vw - gap), r.left - gap));
            p.style.left = (-shift) + 'px';
        }

        _resolvePresets() {
            const list = this.opts.presets;
            if (!Array.isArray(list)) return [];
            return list.map(item => {
                if (typeof item === 'string') {
                    if (!PRESETS[item]) { console.warn('STDateRange: ไม่รู้จัก preset "' + item + '"'); return null; }
                    return { label: PRESETS[item].label, range: PRESETS[item].range };
                }
                if (item && item.key && PRESETS[item.key]) {
                    return { label: item.label || PRESETS[item.key].label, range: PRESETS[item.key].range };
                }
                if (item && typeof item.range === 'function') return { label: item.label || '', range: item.range };
                return null;
            }).filter(Boolean);
        }
    }

    /* ---------- static ---------- */
    STDateRange.version = '1.0.0';
    STDateRange.defaults = DEFAULTS;
    STDateRange.presets = PRESETS;
    STDateRange.get = target => {
        const el = typeof target === 'string' ? document.querySelector(target) : target;
        return (el && el._stdr) || null;
    };
    STDateRange.utils = { formatDMY, formatISO, parseDMY, parseISO, toDate, addDays, addMonths, dayCount, today };

    return STDateRange;
});
