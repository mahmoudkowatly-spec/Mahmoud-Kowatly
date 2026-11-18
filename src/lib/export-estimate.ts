import ExcelJS from "exceljs";
import { computeTotals, sectionOf as baseSection, tafqeet, type Section } from "./estimate-utils";

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
  premiumPercent: number; // نسبة العلاوة, added to the grand total
  logoDataUrl?: string; // base64 data URL
};

const GREEN = "FF7BAE7F";
const PEACH = "FFF4C7A3";
const GRAY = "FFD9D9D9";
const YELLOW = "FFFFFF00";
const BORDER = { style: "thin" as const, color: { argb: "FF000000" } };
const box = { top: BORDER, left: BORDER, right: BORDER, bottom: BORDER };

const DETAILS_SHEET = "تفاصيل البنود";

// ---------- Row height for wrapped descriptions ----------

const DESC_CHARS_PER_LINE = 55; // column E is 60 wide; kept conservative so text is never clipped
const LINE_HEIGHT = 13; // pt, for Arial 10
const MIN_ROW_HEIGHT = 34;
const MAX_ROW_HEIGHT = 409; // Excel's hard limit is 409.5

/** Row height (pt) needed to show `text` wrapped in a column of ~`charsPerLine` characters. */
export function rowHeightForText(text: string, charsPerLine = DESC_CHARS_PER_LINE): number {
  const lines = String(text ?? "")
    .split(/\r?\n/)
    .reduce((n, part) => n + Math.max(1, Math.ceil(part.length / charsPerLine)), 0);
  return Math.min(MAX_ROW_HEIGHT, Math.max(MIN_ROW_HEIGHT, lines * LINE_HEIGHT + 8));
}

// ---------- Logo handling (keep aspect ratio, only formats Excel supports) ----------

type LogoExt = "png" | "jpeg" | "gif";
type PreparedLogo = { base64: string; ext: LogoExt; width: number; height: number };

function parseDataUrl(url: string): { ext: LogoExt; base64: string } | null {
  const m = /^data:image\/(png|jpe?g|gif);base64,(.+)$/i.exec(url.trim());
  if (!m) return null;
  const t = m[1].toLowerCase();
  return { ext: t === "png" ? "png" : t === "gif" ? "gif" : "jpeg", base64: m[2] };
}

/** Reads pixel size straight from the file header, so no DOM is needed. */
export function readImageSize(bytes: Uint8Array, ext: LogoExt): { width: number; height: number } | null {
  if (ext === "png") {
    if (bytes.length < 24) return null;
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { width: dv.getUint32(16), height: dv.getUint32(20) };
  }
  if (ext === "gif") {
    if (bytes.length < 10) return null;
    return { width: bytes[6] | (bytes[7] << 8), height: bytes[8] | (bytes[9] << 8) };
  }
  // jpeg: walk the segments until a start-of-frame marker
  let i = 2;
  while (i + 9 < bytes.length) {
    if (bytes[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = bytes[i + 1];
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: (bytes[i + 5] << 8) | bytes[i + 6], width: (bytes[i + 7] << 8) | bytes[i + 8] };
    }
    i += 2 + ((bytes[i + 2] << 8) | bytes[i + 3]);
  }
  return null;
}

/** Re-encodes any browser-readable image (webp, svg, ...) as PNG. Returns null outside the browser or on failure. */
function toPngDataUrl(url: string): Promise<string | null> {
  if (typeof document === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        if (!w || !h) return resolve(null);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

const LOGO_MAX_W = 150; // column A is ~159px wide, stay inside it
const LOGO_MAX_H = 200; // rows 1-6 are 6 x 28pt tall

async function prepareLogo(dataUrl: string): Promise<PreparedLogo | null> {
  let parsed = parseDataUrl(dataUrl);
  if (!parsed) {
    const png = await toPngDataUrl(dataUrl);
    parsed = png ? parseDataUrl(png) : null;
  }
  if (!parsed) return null;
  const bytes = Uint8Array.from(atob(parsed.base64), (c) => c.charCodeAt(0));
  const size = readImageSize(bytes, parsed.ext);
  if (!size || !size.width || !size.height) return null;
  const scale = Math.min(LOGO_MAX_W / size.width, LOGO_MAX_H / size.height, 1);
  return {
    base64: parsed.base64,
    ext: parsed.ext,
    width: Math.round(size.width * scale),
    height: Math.round(size.height * scale),
  };
}

// ---------- Workbook ----------

export async function buildEstimateWorkbook(items: LineItem[], meta: EstimateMeta): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "GEA Estimator";
  wb.views = [{ x: 0, y: 0, width: 20000, height: 15000, firstSheet: 0, activeTab: 0, visibility: "visible" }];
  wb.calcProperties = { fullCalcOnLoad: true }; // make Excel recompute the formulas when the file opens

  const premiumPercent = Number.isFinite(meta.premiumPercent) ? meta.premiumPercent : 0;
  const totals = computeTotals(items, premiumPercent);

  const groups = {
    ordinary: items.filter((i) => baseSection(i.code, i.section) === "ordinary"),
    sanitary: items.filter((i) => baseSection(i.code, i.section) === "sanitary"),
    electrical: items.filter((i) => baseSection(i.code, i.section) === "electrical"),
  };

  // Sheet order: cover first, details second. Details is filled first because the cover points at its cells.
  const cover = wb.addWorksheet("الغلاف", {
    views: [{ rightToLeft: true, showGridLines: false }],
    pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 1, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 } },
  });
  const det = wb.addWorksheet(DETAILS_SHEET, {
    views: [{ rightToLeft: true, showGridLines: false }],
    pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 } },
  });

  // ============ SHEET 2: DETAILS ============
  det.columns = [
    { width: 16 }, // A القيمة
    { width: 12 }, // B الفئة
    { width: 10 }, // C الكمية
    { width: 10 }, // D الوحدة
    { width: 60 }, // E بيان الأعمال (full desc)
    { width: 14 }, // F رقم البند
    { width: 6 },  // G م
  ];

  det.getRow(1).height = 34;
  det.mergeCells("A1:B1"); det.getCell("A1").value = meta.refNumber ? `رقم تعريفى: ${meta.refNumber}` : "";
  det.mergeCells("C1:G1"); det.getCell("C1").value = `${meta.projectTitle}${meta.governorate ? " - " + meta.governorate : ""}`;
  for (const a of ["A1", "C1"]) {
    const c = det.getCell(a);
    c.font = { name: "Arial", size: 13, bold: true };
    c.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl" };
    c.border = box;
  }

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
  const subtotalRows: Partial<Record<Section, number>> = {};

  const writeSection = (key: Section, label: string, arr: LineItem[], total: number) => {
    if (!arr.length) return;
    const firstRow = rowIdx;
    for (const it of arr) {
      const row = det.getRow(rowIdx);
      row.height = rowHeightForText(it.desc);
      row.getCell(1).value = { formula: `B${rowIdx}*C${rowIdx}`, result: it.qty * it.rate };
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
    const lastRow = rowIdx - 1;

    const sub = det.getRow(rowIdx);
    sub.height = 32;
    sub.getCell(1).value = { formula: `SUM(A${firstRow}:A${lastRow})`, result: total };
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
    subtotalRows[key] = rowIdx;
    rowIdx++;
  };

  writeSection("ordinary", "اجمالي الاعمال الاعتيادية", groups.ordinary, totals.ordinary);
  writeSection("sanitary", "اجمالي الاعمال الصحية", groups.sanitary, totals.sanitary);
  writeSection("electrical", "اجمالي الاعمال الكهربائية", groups.electrical, totals.electrical);

  const presentSubtotals = (["ordinary", "sanitary", "electrical"] as Section[])
    .map((k) => subtotalRows[k])
    .filter((r): r is number => r !== undefined);

  const gt = det.getRow(rowIdx);
  gt.height = 36;
  gt.getCell(1).value = presentSubtotals.length
    ? { formula: presentSubtotals.map((r) => `A${r}`).join("+"), result: totals.grand }
    : 0;
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

  det.pageSetup.printTitlesRow = "1:3";

  // ============ SHEET 1: COVER ============
  cover.columns = [
    { width: 22 }, // A القيمة/left
    { width: 55 }, // B وصف
    { width: 10 }, // C م
  ];

  if (meta.logoDataUrl) {
    try {
      const logo = await prepareLogo(meta.logoDataUrl);
      if (logo) {
        const imgId = wb.addImage({ base64: logo.base64, extension: logo.ext });
        cover.addImage(imgId, { tl: { col: 0, row: 0 }, ext: { width: logo.width, height: logo.height } });
      }
    } catch { /* a bad logo must never block the export */ }
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

  cover.getRow(8).height = 32;
  setCell("A8", "إجمالى البند", GRAY);
  setCell("B8", "بيان الأعمال", GRAY);
  setCell("C8", "مسلسل", GRAY);

  const sheetRef = `'${DETAILS_SHEET}'`;
  const rows: [string, string, Section, number][] = [
    ["اولا", "اجمالي الاعمال الاعتيادية", "ordinary", totals.ordinary],
    ["ثانيا", "اجمالي الاعمال الصحية", "sanitary", totals.sanitary],
    ["ثالثا", "اجمالي الاعمال الكهربائية", "electrical", totals.electrical],
  ];
  const firstSummaryRow = 9;
  let r = firstSummaryRow;
  for (const [ord, label, key, val] of rows) {
    cover.getRow(r).height = 30;
    const subRow = subtotalRows[key];
    setCell(`A${r}`, subRow ? { formula: `${sheetRef}!A${subRow}`, result: val } : 0, undefined, { font: { name: "Arial", size: 12, bold: true }, alignment: { horizontal: "center", vertical: "middle" } });
    cover.getCell(`A${r}`).numFmt = "#,##0.00";
    setCell(`B${r}`, label);
    setCell(`C${r}`, ord);
    r++;
  }
  const lastSummaryRow = r - 1;

  const grandRow = r;
  cover.getRow(r).height = 32;
  setCell(`A${r}`, { formula: `SUM(A${firstSummaryRow}:A${lastSummaryRow})`, result: totals.grand }, GRAY, { font: { name: "Arial", size: 13, bold: true } });
  cover.getCell(`A${r}`).numFmt = "#,##0.00";
  cover.mergeCells(`B${r}:C${r}`); setCell(`B${r}`, "الإجمـــــــــــــالى", GRAY, { font: { name: "Arial", size: 13, bold: true } });
  r++;

  const pctRow = r;
  cover.getRow(r).height = 28;
  setCell(`A${r}`, premiumPercent / 100, undefined, { font: { name: "Arial", size: 12, bold: true } });
  cover.getCell(`A${r}`).numFmt = "0.00%";
  cover.mergeCells(`B${r}:C${r}`); setCell(`B${r}`, "نسبة العلاوة");
  r++;

  const premiumRow = r;
  cover.getRow(r).height = 28;
  setCell(`A${r}`, { formula: `A${grandRow}*A${pctRow}`, result: totals.premium }, undefined, { font: { name: "Arial", size: 12, bold: true } });
  cover.getCell(`A${r}`).numFmt = "#,##0.00";
  cover.mergeCells(`B${r}:C${r}`); setCell(`B${r}`, "إجمالي قيمة العلاوة");
  r++;

  cover.getRow(r).height = 34;
  setCell(`A${r}`, { formula: `A${grandRow}+A${premiumRow}`, result: totals.net }, YELLOW, { font: { name: "Arial", size: 14, bold: true } });
  cover.getCell(`A${r}`).numFmt = "#,##0.00";
  cover.mergeCells(`B${r}:C${r}`); setCell(`B${r}`, "الإجمـــــــــــــالى العـــــــــام", GRAY, { font: { name: "Arial", size: 14, bold: true } });
  r++;

  // The amount in words is plain text: Excel cannot spell Arabic numbers, so it reflects the amount at export time.
  cover.getRow(r).height = 40;
  cover.mergeCells(`A${r}:C${r}`);
  setCell(`A${r}`, tafqeet(totals.net), undefined, { font: { name: "Arial", size: 12, bold: true } });
  r++;

  cover.getRow(r).height = 120;
  setCell(
    `A${r}`,
    "تم توصيف البنود بجميع مشتملاتها والبنود المحملة على البند وفى حالة عدم تنفيذ احد البنود المحملة على البند يتم عمل خصم نسبة على فئة البند الاجمالية فى مستخلص الاعمال وذلك طبقا للحالة على الطبيعة وبالاتفاق مع مهندس الاشراف بعد الرجوع الى المكتب الفنى",
    undefined,
    { font: { name: "Arial", size: 10, bold: false }, alignment: { horizontal: "right", vertical: "middle", wrapText: true, readingOrder: "rtl" } },
  );
  cover.mergeCells(`A${r}:B${r}`);
  setCell(`C${r}`, "ملحوظة", undefined, { font: { name: "Arial", size: 12, bold: true } });

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
