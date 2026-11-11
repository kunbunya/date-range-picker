# STDateRange — JS Date Range Picker

Date range picker ที่แยกออกมาจากหน้า `Views/WMSReport/PickProfileReport.cshtml` ให้เป็น library ใช้ซ้ำได้ทุกหน้า

- ปฏิทิน 2 เดือน + Presets (Today, Yesterday, This Week, 1 Months, 2 Months …)
- พิมพ์วันที่ได้ (`dd/mm/yyyy`, `d/m/yyyy`, `dd-mm-yyyy`, `dd.mm.yyyy`, `ddmmyyyy`)
- จำกัดวันที่เลือกได้ (`minDate` / `maxDate`) และความยาวช่วง (`maxRangeDays`)
- กด Apply / Cancel, คลิกนอกกล่องเพื่อปิด, ปุ่ม Esc / Enter
- **ไม่ต้องใช้ jQuery** ไม่ต้องใช้ Bootstrap (แต่ใช้ class ของ Bootstrap 5 ได้ทันที)
- ใช้ได้หลายตัวในหน้าเดียว (โค้ดเดิมใช้ id ตายตัว + ตัวแปร global ทำให้ใช้ได้แค่ตัวเดียว)

## ไฟล์

```
wwwroot/lib/st-daterange/
├── st-daterange.js     ← library
├── st-daterange.css    ← หน้าตา
├── demo.html           ← ตัวอย่าง 4 แบบ (เปิดใน browser ได้เลย)
└── README.md
```

---

## 1. ติดตั้ง

ใส่ใน `Views/Shared/_Layout.cshtml` (ใช้ได้ทุกหน้า) หรือเฉพาะหน้าที่ใช้:

```html
<link rel="stylesheet" href="~/lib/st-daterange/st-daterange.css" asp-append-version="true" />
<script src="~/lib/st-daterange/st-daterange.js" asp-append-version="true"></script>
```

> ชื่อ global คือ `STDateRange` จึงไม่ชนกับ `daterangepicker` (jQuery plugin) ที่มีอยู่แล้วใน `wwwroot/daterangepicker`

## 2. ใช้งานเร็ว ๆ

```html
<div id="dateRange"></div>

<script>
    const dateRange = new STDateRange('#dateRange');

    // ตอนค้นหา
    const { from, to } = dateRange.getISO();   // '2026-10-11', '2026-11-11'
</script>
```

ค่าเริ่มต้นคือย้อนหลัง 1 เดือนถึงวันนี้ ใส่ `<div>` ว่าง ๆ ไว้แล้ว library จะสร้างช่อง input และปฏิทินให้เอง

---

## 3. ตัวอย่าง: เปลี่ยนหน้า PickProfileReport มาใช้ library

### HTML — จากเดิม ~20 บรรทัด เหลือบรรทัดเดียว

```html
<div class="col-xl-3">
    <label class="fw-bold form-label">DATE RANGE: <span>*</span></label>
    <div id="dateRange"></div>
</div>
```

ลบ CSS ส่วน `/* ---- date range picker ... ---- */` (บรรทัด 53–270) และ JS ส่วน `DATE RANGE PICKER` (บรรทัด 375–619) ออกได้ทั้งหมด

### JS

```js
const dateRange = new STDateRange('#dateRange', {
    inputClass: 'form-control form-control-lg',
    minDate: -89,          // ย้อนหลังได้ 90 วัน (วันนี้ - 89)
    maxDate: 0,            // ถึงวันนี้
    maxRangeDays: 90       // ช่วงไม่เกิน 90 วัน
    // startDate/endDate ไม่ใส่ = ย้อนหลัง 1 เดือน ถึงวันนี้ (เหมือนเดิม)
});
```

แล้วแทนที่ `state.dateFrom` / `state.dateTo` / `fmtDateISO(...)` ในโค้ดเดิม:

```js
function requireFilters() {
    if (!$("#SCHEMA").val()) { /* ... เหมือนเดิม ... */ }
    return true;            // date range มีค่าเสมอ ไม่ต้องเช็กแล้ว
}

function searchData() {
    if (!requireFilters()) return;
    const d = dateRange.getISO();
    var jsonObj = {
        Schema: $("#SCHEMA").val(),
        FromDate: d.from,
        ToDate: d.to,
        Sku: $("#SKU").val() || [],
        Type: $("#TYPE").val() || []
    };
    // ... เหมือนเดิม
}

function prepareExport() {
    // ...
    const d = dateRange.getISO();
    $("#exportFromDate").val(d.from);
    $("#exportToDate").val(d.to);
    // ...
}

function resetSearch() {
    // ...
    dateRange.reset();      // แทน state.dateFrom = monthsAgo(1) ... updateDateDisplay()
    // ...
}
```

### ถ้า date range อยู่ใน `<form>` เดียวกับปุ่ม submit

ให้ library สร้าง hidden input ให้เอง ไม่ต้อง copy ค่าเอง:

```html
<form asp-action="ExportToExcel" method="post">
    <div id="dateRange"></div>
    <button type="submit">Export</button>
</form>

<script>
    new STDateRange('#dateRange', { fromName: 'FromDate', toName: 'ToDate' });
</script>
```

Controller จะได้ `FromDate` / `ToDate` เป็น `yyyy-MM-dd` → bind เข้า `DateTime` ได้เลย

---

## 4. Options

| Option | ค่าเริ่มต้น | คำอธิบาย |
|---|---|---|
| `startDate` | `null` | วันเริ่มต้นตอนโหลด (ไม่ใส่ทั้งคู่ = ย้อนหลัง 1 เดือนถึงวันนี้) |
| `endDate` | `null` | วันสิ้นสุดตอนโหลด |
| `minDate` | `null` | วันแรกที่เลือกได้ (`null` = ไม่จำกัด) |
| `maxDate` | `null` | วันสุดท้ายที่เลือกได้ (`null` = ไม่จำกัด) |
| `maxRangeDays` | `null` | ความยาวช่วงสูงสุด (นับรวมวันแรกและวันสุดท้าย) |
| `calendars` | `2` | แสดงปฏิทิน `1` หรือ `2` เดือน |
| `weekStart` | `0` | คอลัมน์แรกของปฏิทิน `0` = อาทิตย์, `1` = จันทร์ |
| `presets` | `['today','yesterday','thisWeek','last1Month','last2Months']` | ปุ่มลัดด้านซ้าย, `false` = ซ่อน (ดูข้อ 5) |
| `align` | `'auto'` | `'auto'` / `'left'` / `'right'` (auto = ถ้าล้นจอจะชิดขวาเอง) |
| `inputClass` | `'form-control'` | class ของช่องแสดงวันที่ เช่น `'form-control form-control-lg'` |
| `typeClass` | `'form-control'` | class ของช่องพิมพ์วันที่ในกล่อง |
| `applyClass` | `'btn btn-primary'` | class ปุ่ม Apply |
| `cancelClass` | `'btn btn-outline-secondary'` | class ปุ่ม Cancel |
| `fromName` / `toName` | `null` | ชื่อ hidden input (`yyyy-mm-dd`) สำหรับ submit form |
| `note` | `'auto'` | ข้อความใต้ช่องพิมพ์: `'auto'` = สร้างจาก limit, ใส่ข้อความเอง, หรือ `false` = ซ่อน |
| `weekdays` | `['Su',…,'Sa']` | ชื่อวัน (เริ่มวันอาทิตย์เสมอ) เช่น `['อา','จ','อ','พ','พฤ','ศ','ส']` |
| `months` | `['Jan',…,'Dec']` | ชื่อเดือน |
| `texts` | (ภาษาไทย) | ข้อความทั้งหมด (ดูด้านล่าง) |
| `formatDisplay` | `null` | `(from, to, picker) => string` กำหนดข้อความในช่องเอง |
| `onApply` | `null` | `(from, to, picker) => {}` เรียกเมื่อผู้ใช้กด Apply สำเร็จ |
| `onError` | `null` | `(message, picker) => {}` ไม่ใส่ = แสดงข้อความสีแดงในกล่อง, ถ้าอยากใช้ alert/SweetAlert ใส่ตรงนี้ |

### รูปแบบวันที่ที่รับได้ (`startDate`, `endDate`, `minDate`, `maxDate`, `setRange`)

| ค่า | ความหมาย |
|---|---|
| `0` | วันนี้ |
| `-89` | วันนี้ − 89 วัน |
| `new Date(2026, 0, 1)` | Date object |
| `'2026-01-01'` | yyyy-mm-dd |
| `'01/01/2026'` | dd/mm/yyyy |
| `() => new Date(...)` | function (คำนวณใหม่ทุกครั้ง เปิดหน้าค้างข้ามวันก็ยังถูก) |

ตัวเลขและ function คำนวณจาก "วันนี้" ทุกครั้งที่ใช้

### texts

```js
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
}
```

ใส่เฉพาะตัวที่อยากเปลี่ยนได้ เช่น `texts: { apply: 'ตกลง', cancel: 'ยกเลิก' }`

---

## 5. Presets

### Preset สำเร็จรูป

| key | label | ช่วง |
|---|---|---|
| `today` | Today | วันนี้ |
| `yesterday` | Yesterday | เมื่อวาน |
| `thisWeek` | This Week | วันจันทร์ของสัปดาห์นี้ – วันนี้ |
| `last7Days` | Last 7 Days | 7 วันล่าสุด |
| `last30Days` | Last 30 Days | 30 วันล่าสุด |
| `thisMonth` | This Month | วันที่ 1 ของเดือนนี้ – วันนี้ |
| `lastMonth` | Last Month | เดือนที่แล้วทั้งเดือน |
| `last1Month` | 1 Months | ย้อนหลัง 1 เดือน – วันนี้ |
| `last2Months` | 2 Months | ย้อนหลัง 2 เดือน – วันนี้ |
| `last3Months` | 3 Months | ย้อนหลัง 3 เดือน – วันนี้ |

### เปลี่ยนชื่อ / เขียนเอง

```js
new STDateRange('#dateRange', {
    presets: [
        'today',
        { key: 'last7Days', label: '7 วันล่าสุด' },               // เปลี่ยนชื่อ
        { label: 'ปีนี้', range: t => [new Date(t.getFullYear(), 0, 1), t] }  // เขียนเอง (t = วันนี้)
    ]
});
```

Preset ที่เกิน `minDate` / `maxDate` / `maxRangeDays` จะถูกตัดให้อยู่ในช่วงอัตโนมัติ  
ปุ่ม preset ที่ตรงกับช่วงที่เลือกอยู่จะถูกไฮไลต์ให้เอง

---

## 6. Methods

```js
const dr = new STDateRange('#dateRange', { ... });

dr.getRange();          // { from: Date, to: Date }
dr.getISO();            // { from: '2026-10-11', to: '2026-11-11' }
dr.getText();           // '11/10/2026 ถึง 11/11/2026'
dr.getDayCount();       // 32

dr.setRange('2026-11-01', '2026-11-11');   // ตั้งค่าจากโค้ด (ถูกบีบให้อยู่ใน limit)
dr.setRange(-6, 0);                         // 7 วันล่าสุด
dr.reset();             // กลับไปค่าตอนสร้าง

dr.open();  dr.close();  dr.toggle();  dr.isOpen();
dr.destroy();           // ลบ picker ออก

STDateRange.get('#dateRange');   // หา instance จาก element
```

`setRange()` และ `reset()` **ไม่** เรียก `onApply` (ตั้งใจไว้ ไม่ให้ไปยิงค้นหาซ้ำตอนกดล้างข้อมูล)

## 7. Events

นอกจาก `onApply` ยังฟัง DOM event ได้ (bubble ขึ้นไปถึง document):

```js
document.getElementById('dateRange').addEventListener('stdr:apply', e => {
    console.log(e.detail.fromISO, e.detail.toISO);   // มี from, to, fromISO, toISO, picker
});

// jQuery
$('#dateRange').on('stdr:apply', e => searchData());
```

ตัวอย่าง: กด Apply แล้วค้นหาทันที

```js
new STDateRange('#dateRange', { onApply: () => searchData() });
```

## 8. Utils

```js
const U = STDateRange.utils;
U.formatDMY(date);        // '11/11/2026'
U.formatISO(date);        // '2026-11-11'
U.parseDMY('11/11/2026'); // Date | null
U.parseISO('2026-11-11'); // Date | null
U.addDays(date, -7);
U.addMonths(date, -1);    // 31 มี.ค. − 1 เดือน = 28/29 ก.พ.
U.dayCount(from, to);
U.today();
```

## 9. ปรับสี

ใช้ CSS variables ทั้งหมดตั้งต้นที่ `.stdr` เปลี่ยนทั้งเว็บหรือเฉพาะตัวได้:

```css
.stdr {                      /* ทั้งเว็บ */
    --stdr-primary: #198754;
    --stdr-primary-dark: #146c43;
    --stdr-range-bg: #d1e7dd;
    --stdr-chip-bg: #e8f5ee;
}
#dateRange { --stdr-z: 2000; }  /* เฉพาะตัว เช่นอยู่ใน modal */
```

ตัวแปรที่มี: `--stdr-primary`, `--stdr-primary-dark`, `--stdr-range-bg`, `--stdr-chip-bg`, `--stdr-hover-bg`, `--stdr-border`, `--stdr-muted`, `--stdr-text`, `--stdr-danger`, `--stdr-panel-width`, `--stdr-z`

---

## 10. สิ่งที่ต่างจากโค้ดเดิมใน PickProfileReport

| เรื่อง | เดิม | library |
|---|---|---|
| ใช้หลายตัวในหน้าเดียว | ไม่ได้ (id ตายตัว, ตัวแปร global `state`, `cal`, `TODAY`) | ได้ |
| ปุ่ม ‹ › ใน `<form>` | ไม่มี `type="button"` → กดแล้ว submit form | แก้แล้ว |
| ย้อนหลัง 1 เดือนจากวันที่ 31 | `setMonth` ล้นเดือน (31 มี.ค. → 3 มี.ค.) | ได้ 28/29 ก.พ. |
| วันนี้ (`TODAY`) | คำนวณครั้งเดียวตอนโหลดหน้า | คำนวณใหม่ทุกครั้ง |
| เลือกวันสุดท้ายเกิน 90 วัน | กดได้ แล้วค่อย alert ตอน Apply | วันที่เกินถูกปิดไว้ตั้งแต่ตอนเลือก |
| แจ้งเตือน | `alert()` | ข้อความสีแดงในกล่อง (หรือกำหนด `onError` เอง) |
| คีย์บอร์ด | ไม่มี | Enter/Space เปิด, Esc ปิด, Enter ในช่องพิมพ์ = Apply |
| จอเล็ก | กล่องกว้าง 560px ล้นจอ | presets ขึ้นด้านบน ปฏิทินเรียงลง |
| ตำแหน่งกล่อง | ชิดซ้ายเสมอ | ถ้าล้นขอบขวาจะชิดขวาเอง |
| Event listener | ผูกใหม่ทุกครั้งที่ render | ใช้ delegation ผูกครั้งเดียว |
| Hover | — | แสดงช่วงที่กำลังจะเลือกตอนเลื่อนเมาส์ |
