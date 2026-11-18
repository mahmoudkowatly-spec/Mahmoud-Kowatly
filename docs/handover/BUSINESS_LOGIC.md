# Business Logic (exact rules from the code)

Sources: `src/lib/estimate-utils.ts`, `src/lib/export-estimate.ts`, `src/routes/index.tsx`.

## 1. Catalog item
`public/data/items.json` — array of:
```ts
{ id: number; code: string; desc: string; unit: string; rate: number; part: string; page: number;
  section: "ordinary" | "sanitary" | "electrical" }
```
Codes use the 2026 format `01/01/02/04`. `section` comes from the "التصنيف" column of the
source Excel price list. Rate is EGP per unit.

## 2. Section classification — `sectionOf(code, explicit?)`
1. If an explicit section is given (catalog `section` field, or the section chosen for a custom item) → use it.
2. Else code starting with `6` → electrical; starting with `5` → sanitary; otherwise → ordinary.
   (Fallback kept from the 2023 catalog; all 2026 items carry an explicit section.)

Labels: ordinary = أعمال اعتيادية, sanitary = أعمال صحية, electrical = أعمال كهربائية.

## 3. Calculations — `computeTotals(items, premiumPercent)`
> Updated: the adjustment is now **نسبة العلاوة (premium, added)** by default, with an optional
> **خصم (discount, subtracted)** mode chosen with the علاوة / خصم buttons next to the percent field.
> The stored project field is still called `discountPercent` (the percent magnitude, >= 0) so older
> saved projects load; the new optional `adjustmentMode` ("premium" | "discount") says how it applies.
> `computeTotals` receives a signed percent (`signedPercent(percent, mode)`: discount = negative).
```
line value        = qty × rate
section subtotal  = Σ line value of items in that section
grand             = ordinary + sanitary + electrical
premium           = grand × (premiumPercent / 100)       (empty/NaN percent → 0)
net               = grand + premium
```
No rounding is applied in calculations; rounding happens only on display
(`fmt`: ar-EG locale, exactly 2 decimals) and in Excel (`#,##0.00`).
There is no discount — only the single premium (علاوة) percentage, which is added.
The Excel export recomputes the same values independently with identical formulas.

## 4. Arabic amount in words — `tafqeet(amount)`
- amount clamped to ≥ 0, rounded to 2 decimals.
- pounds = integer part; piasters = round(fraction × 100).
- Output: `فقط وقدره <pounds words> جنيه مصري[ و<piasters words> قرش] لا غير`.
- Scales: مليار/مليون/ألف. Count 1 → singular, 2 → dual (ألفان…), 3–10 → plural (آلاف, ملايين, مليارات), 11+ → singular (ألف).
- Below 1000: hundreds (مائة, مائتان, ثلاثمائة…), 1–19 direct words, 20–99 as "<ones> و<tens>". Parts joined with " و". 0 → "صفر".

## 5. Search
- Normalization: unify إأآا→ا, ى→ي, ة→ه; strip harakat and tatweel; collapse spaces; lowercase.
- Code normalization: `-`, `\`, `/`, `.` → `/`, leading zeros removed per segment (so `1-1-2-4` = `01/01/02/04`).
- Pool is filtered by the selected section chip (الكل / اعتيادية / صحية / كهربائية).
- Score: exact code +100, code prefix +60, code contains +40; if every query word is in the description or code +10 + number of words.
- Stops collecting after 800 hits, sorts by score desc, shows top 100.
- Enter adds the first result, Escape clears the query.

## 6. Estimate (BOQ) management
- Adding an item already in the estimate increases its qty by 1; otherwise adds with qty 1.
- Qty editable directly and with +/− buttons; rows can be deleted and moved up/down.
- "ترتيب حسب القسم" sorts rows ordinary → sanitary → electrical (stable within section).
- Serial number (م) = row position, recalculated automatically.
- Custom item ("بند مستجد"): free description, unit, rate, qty (default 1), chosen section;
  stored with `code: "مستجد"`, `custom: true`, negative id `-Date.now()`.
- Rates are copied into the estimate at add time; updating the catalog does not change existing rows.

## 7. Projects & persistence
- localStorage key `gea_projects_v2` = `{ projects: Project[], activeId }`. Old key `gea_estimate_v1` is migrated once.
- Project fields: id, updatedAt, projectName, clientName, orgName, governorate, refNumber,
  discountPercent, logoDataUrl (base64), estimate (LineItem[]).
- Actions: new, duplicate, delete, switch, export project to JSON file, import from JSON file.

## 8. Excel export — `exportEstimate(items, meta)` (exceljs)
Sheet 1 "الغلاف" (RTL, A4 portrait, fit to 1 page): logo top-left (180×180 px), org name row (green
`FF7BAE7F`), project title (peach `FFF4C7A3`), governorate, reference number; summary table with
gray header (`FFD9D9D9`): اولا اعتيادية / ثانيا صحية / ثالثا كهربائية, الإجمالي, discount %
(`0.0000%`), discount value, final total (yellow `FFFFFF00`), and the tafqeet row.
Sheet 2 "تفاصيل البنود": columns القيمة | الفئة | كمية | الوحدة | بيان الأعمال (full description) |
رقم البند | م, grouped by section with section subtotal rows and a grand total; header row repeats on each printed page.

## 9. PDF / print
"PDF" button calls `window.print()`. A print-only layout (Tailwind `print:` classes + `@page A4, 10mm`
in `styles.css`, `print-color-adjust: exact`) renders the cover (logo, org, project, summary,
discount, tafqeet) then the detail table. The user picks "Save as PDF" in the browser dialog.
