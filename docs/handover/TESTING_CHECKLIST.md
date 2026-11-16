# Testing Checklist

## Automated
`bunx vitest run` — covers `sectionOf`, `computeTotals` (sections, discount, net) and `tafqeet`.

## Manual
- [ ] Page loads, catalog loaded (search works) with no console errors.
- [ ] Search `1-1-2-4`, `1/1/2/4`, `01/01/02/04` → same item (هدم مباني طوب ني), rate 200.
- [ ] Search Arabic words with/without hamza (`اسمنت` / `أسمنت`) → same results.
- [ ] Section chips filter results.
- [ ] Enter adds first result; Esc clears.
- [ ] Adding same item twice → qty 2, "مضاف" badge shown.
- [ ] Edit qty → value = qty × rate; totals update.
- [ ] Discount 10% on grand 1,000 → discount 100, net 900; tafqeet "فقط وقدره تسعمائة جنيه مصري لا غير".
- [ ] Custom item with section electrical appears in electrical total.
- [ ] Move up/down, delete, sort by section, serial numbers renumber.
- [ ] New / duplicate / delete / switch project; reload page → data persists.
- [ ] Export JSON then import it → identical project.
- [ ] Logo upload shows in print view and Excel cover.
- [ ] Excel export: 2 sheets, colors, section subtotals, grand total, tafqeet; totals match screen.
- [ ] PDF: print dialog shows A4 cover + details with colors.
- [ ] Mobile width (360px) usable.
