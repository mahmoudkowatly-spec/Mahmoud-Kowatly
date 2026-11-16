import ExcelJS from "exceljs";
import { sectionOf as baseSection, tafqeet, type Section } from "./estimate-utils";

export type LineItem = {
  id: number;
  code: string;
  desc: string;
  unit: string;
  rate: number;
  qty: number;
  section?: Section;
};

export type EstimateMeta = {
  orgName: string;
  projectTitle: string;
  governorate: string;
  refNumber: string;
  discountPercent: number;
  logoDataUrl?: string; // base64 data URL
};

const GREEN = "FF7BAE7F";
const PEACH = "FFF4C7A3";
const GRAY = "FFD9D9D9";
const YELLOW = "FFFFFF00";
const BORDER = { style: "thin" as const, color: { argb: "FF000000" } };
const box = { top: BORDER, left: BORDER, right: BORDER, bottom: BORDER };

export async function buildEstimateWorkbook(items: LineItem[], meta: EstimateMeta): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "GEA Estimator";
  wb.views = [{ x: 0, y: 0, width: 20000, height: 15000, firstSheet: 0, activeTab: 0, visibility: "visible" }];

  // Group + totals
  const groups = {
    ordinary: items.filter((i) => baseSection(i.code, i.section) === "ordinary"),
    sanitary: items.filter((i) => baseSection(i.code, i.section) === "sanitary"),
    electrical: items.filter((i) => baseSection(i.code, i.section) === "electrical"),
  };
  const sum = (arr: LineItem[]) => arr.reduce((s, x) => s + x.qty * x.rate, 0);
  const totOrd = sum(groups.ordinary);
  const totSan = sum(groups.sanitary);
  const totEle = sum(groups.electrical);
  const grand = totOrd + totSan + totEle;
  const discountVal = grand * (meta.discountPercent / 100);
  const finalTotal = grand - discountVal;

  // ============ SHEET 1: COVER ============
  const cover = wb.addWorksheet("الغلاف", {
    views: [{ rightToLeft: true, showGridLines: false }],
    pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 1, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 } },
  });
  cover.columns = [
    { width: 22 }, // A القيمة/left
    { width: 55 }, // B وصف
    { width: 10 }, // C م
  ];

  // Logo + header block (rows 1..6)
  if (meta.logoDataUrl) {
    try {
      const [head, b64] = meta.logoDataUrl.split(",");
      const ext = head.includes("png") ? "png" : head.includes("jpeg") || head.includes("jpg") ? "jpeg" : "png";
      const imgId = wb.addImage({ base64: b64, extension: ext });
      cover.addImage(imgId, { tl: { col: 0, row: 0 }, ext: { width: 180, height: 180 } });
    } catch { /* ignore */ }
  }
  for (let r = 1; r <= 6; r++) cover.getRow(r).height = 28;

  const setCell = (addr: string, value: any, fill?: string, opts: Partial<ExcelJS.Style> = {}) => {
    const c = cover.getCell(addr);
    c.value = value;
    c.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl", wrapText: true, ...(opts.alignment || {}) };
    c.font = { name: "Arial", size: 12, bold: true, ...(opts.font || {}) };
    c.border = box;
    if (fill) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
  };

  cover.mergeCells("B1:C1"); setCell("B1", meta.orgName || "—", GREEN);
  cover.mergeCells("B2:C3"); setCell("B2", meta.projectTitle || "—", PEACH);
  cover.mergeCells("B4:C4"); setCell("B4", meta.governorate ? `المحافظة : ${meta.governorate}` : "", PEACH);
  cover.mergeCells("B5:C5"); setCell("B5", "", undefined);
  cover.mergeCells("B6:C6"); setCell("B6", meta.refNumber ? `رقم تعريفى: ${meta.refNumber}` : "");

  // Summary table header row 8
  cover.getRow(8).height = 32;
  setCell("A8", "إجمالى البند", GRAY);
  setCell("B8", "بيان الأعمال", GRAY);
  setCell("C8", "مسلسل", GRAY);

  const rows: [string, string, number][] = [
    ["اولا", "اجمالي الاعمال الاعتيادية", totOrd],
    ["ثانيا", "اجمالي الاعمال الصحية", totSan],
    ["ثالثا", "اجمالي الاعمال الكهربائية", totEle],
  ];
  let r = 9;
  for (const [ord, label, val] of rows) {
    cover.getRow(r).height = 30;
    setCell(`A${r}`, val, undefined, { font: { name: "Arial", size: 12, bold: true }, alignment: { horizontal: "center", vertical: "middle" } });
    cover.getCell(`A${r}`).numFmt = "#,##0.00";
    setCell(`B${r}`, label);
    setCell(`C${r}`, ord);
    r++;
  }

  cover.getRow(r).height = 32;
  setCell(`A${r}`, grand, GRAY, { font: { name: "Arial", size: 13, bold: true } });
  cover.getCell(`A${r}`).numFmt = "#,##0.00";
  cover.mergeCells(`B${r}:C${r}`); setCell(`B${r}`, "الإجمـــــــــــــالى", GRAY, { font: { name: "Arial", size: 13, bold: true } });
  r++;

  cover.getRow(r).height = 28;
  setCell(`A${r}`, meta.discountPercent / 100, undefined, { font: { name: "Arial", size: 12, bold: true } });
  cover.getCell(`A${r}`).numFmt = "0.0000%";
  cover.mergeCells(`B${r}:C${r}`); setCell(`B${r}`, "نسبة الخصم المقدمة من المقاول");
  r++;

  cover.getRow(r).height = 28;
  setCell(`A${r}`, discountVal, undefined, { font: { name: "Arial", size: 12, bold: true } });
  cover.getCell(`A${r}`).numFmt = "#,##0.00";
  cover.mergeCells(`B${r}:C${r}`); setCell(`B${r}`, "إجمالي قيمة الخصم المقدمة من المقاول");
  r++;

  cover.getRow(r).height = 34;
  setCell(`A${r}`, finalTotal, YELLOW, { font: { name: "Arial", size: 14, bold: true } });
  cover.getCell(`A${r}`).numFmt = "#,##0.00";
  cover.mergeCells(`B${r}:C${r}`); setCell(`B${r}`, "الإجمـــــــــــــالى العـــــــــام", GRAY, { font: { name: "Arial", size: 14, bold: true } });
  r++;

  cover.getRow(r).height = 40;
  cover.mergeCells(`A${r}:C${r}`);
  setCell(`A${r}`, tafqeet(finalTotal), undefined, { font: { name: "Arial", size: 12, bold: true } });
  r++;

  // Note
  cover.getRow(r).height = 120;
  setCell(
    `A${r}`,
    "تم توصيف البنود بجميع مشتملاتها والبنود المحملة على البند وفى حالة عدم تنفيذ احد البنود المحملة على البند يتم عمل خصم نسبة على فئة البند الاجمالية فى مستخلص الاعمال وذلك طبقا للحالة على الطبيعة وبالاتفاق مع مهندس الاشراف بعد الرجوع الى المكتب الفنى",
    undefined,
    { font: { name: "Arial", size: 10, bold: false }, alignment: { horizontal: "right", vertical: "middle", wrapText: true, readingOrder: "rtl" } },
  );
  cover.mergeCells(`A${r}:B${r}`);
  setCell(`C${r}`, "ملحوظة", undefined, { font: { name: "Arial", size: 12, bold: true } });

  // ============ SHEET 2: DETAILS ============
  const det = wb.addWorksheet("تفاصيل البنود", {
    views: [{ rightToLeft: true, showGridLines: false }],
    pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 } },
  });
  det.columns = [
    { width: 16 }, // A القيمة
    { width: 12 }, // B الفئة
    { width: 10 }, // C الكمية
    { width: 10 }, // D الوحدة
    { width: 60 }, // E بيان الأعمال (full desc)
    { width: 14 }, // F رقم البند
    { width: 6 },  // G م
  ];

  // Title row
  det.getRow(1).height = 34;
  det.mergeCells("A1:B1"); det.getCell("A1").value = meta.refNumber ? `رقم تعريفى: ${meta.refNumber}` : "";
  det.mergeCells("C1:G1"); det.getCell("C1").value = `${meta.projectTitle}${meta.governorate ? " - " + meta.governorate : ""}`;
  for (const a of ["A1", "C1"]) {
    const c = det.getCell(a);
    c.font = { name: "Arial", size: 13, bold: true };
    c.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl" };
    c.border = box;
  }

  // Column headers
  const headers = ["القيمة", "الفئة", "كمية", "الوحدة", "بيان الأعمال", "رقم البند", "م"];
  det.getRow(3).height = 30;
  headers.forEach((h, i) => {
    const c = det.getRow(3).getCell(i + 1);
    c.value = h;
    c.font = { name: "Arial", size: 12, bold: true };
    c.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl", wrapText: true };
    c.border = box;
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GRAY } };
  });

  let seq = 1;
  let rowIdx = 4;
  const writeSection = (label: string, arr: LineItem[], total: number) => {
    if (!arr.length) return;
    for (const it of arr) {
      const row = det.getRow(rowIdx);
      row.height = 34;
      row.getCell(1).value = it.qty * it.rate;
      row.getCell(1).numFmt = "#,##0.00";
      row.getCell(2).value = it.rate;
      row.getCell(2).numFmt = "#,##0.00";
      row.getCell(3).value = it.qty;
      row.getCell(4).value = it.unit;
      row.getCell(5).value = it.desc;
      row.getCell(6).value = it.code;
      row.getCell(7).value = seq++;
      for (let i = 1; i <= 7; i++) {
        const c = row.getCell(i);
        c.border = box;
        c.font = { name: "Arial", size: 10, bold: i === 1 };
        c.alignment = {
          horizontal: i === 5 ? "right" : "center",
          vertical: "middle",
          wrapText: true,
          readingOrder: "rtl",
        };
      }
      rowIdx++;
    }
    // Section subtotal
    const sub = det.getRow(rowIdx);
    sub.height = 32;
    sub.getCell(1).value = total;
    sub.getCell(1).numFmt = "#,##0.00";
    det.mergeCells(rowIdx, 2, rowIdx, 7);
    sub.getCell(2).value = label;
    for (let i = 1; i <= 7; i++) {
      const c = sub.getCell(i);
      c.border = box;
      c.font = { name: "Arial", size: 12, bold: true, underline: i !== 1 };
      c.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl" };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GRAY } };
    }
    rowIdx++;
  };

  writeSection("اجمالي الاعمال الاعتيادية", groups.ordinary, totOrd);
  writeSection("اجمالي الاعمال الصحية", groups.sanitary, totSan);
  writeSection("اجمالي الاعمال الكهربائية", groups.electrical, totEle);

  // Grand total row
  const gt = det.getRow(rowIdx);
  gt.height = 36;
  gt.getCell(1).value = grand;
  gt.getCell(1).numFmt = "#,##0.00";
  det.mergeCells(rowIdx, 2, rowIdx, 7);
  gt.getCell(2).value = "الإجمــــــــــــالى";
  for (let i = 1; i <= 7; i++) {
    const c = gt.getCell(i);
    c.border = box;
    c.font = { name: "Arial", size: 13, bold: true };
    c.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl" };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GRAY } };
  }

  // Repeat header on each printed page
  det.pageSetup.printTitlesRow = "1:3";

  return wb;
}

export async function generateEstimateExcelBlob(items: LineItem[], meta: EstimateMeta): Promise<Blob> {
  const wb = await buildEstimateWorkbook(items, meta);
  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export async function exportEstimate(items: LineItem[], meta: EstimateMeta) {
  const blob = await generateEstimateExcelBlob(items, meta);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `مقايسة-${meta.projectTitle || "مشروع"}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
