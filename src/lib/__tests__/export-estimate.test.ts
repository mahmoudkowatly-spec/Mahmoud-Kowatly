import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import { buildEstimateWorkbook, readImageSize, rowHeightForText, type LineItem } from "../export-estimate";

const meta = {
  orgName: "جهة",
  projectTitle: "مشروع تجريبي",
  governorate: "قنا",
  refNumber: "123",
  premiumPercent: 10,
};

const items: LineItem[] = [
  { id: 1, code: "01/01/02/04", desc: "بند اعتيادي أول", unit: "م3", rate: 200, qty: 3 },
  { id: 2, code: "01/02/01/01", desc: "بند اعتيادي ثان", unit: "م2", rate: 50, qty: 4 },
  { id: 3, code: "06/01/01/20", desc: "بند كهرباء", unit: "عدد", rate: 1000, qty: 1, section: "electrical" },
];

function pngDataUrl(width: number, height: number): string {
  const b = new Uint8Array(33);
  b.set([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82]);
  const dv = new DataView(b.buffer);
  dv.setUint32(16, width);
  dv.setUint32(20, height);
  return `data:image/png;base64,${Buffer.from(b).toString("base64")}`;
}

describe("rowHeightForText", () => {
  it("keeps a minimum height for short text", () => {
    expect(rowHeightForText("بند قصير")).toBe(34);
  });
  it("grows with the length of the description", () => {
    const short = rowHeightForText("ا".repeat(100));
    const long = rowHeightForText("ا".repeat(600));
    expect(long).toBeGreaterThan(short);
  });
  it("never exceeds Excel's row height limit", () => {
    expect(rowHeightForText("ا".repeat(5000))).toBeLessThanOrEqual(409);
  });
  it("counts explicit line breaks", () => {
    expect(rowHeightForText("س\nس\nس\nس\nس")).toBeGreaterThan(34);
  });
});

describe("readImageSize", () => {
  it("reads PNG dimensions from the header", () => {
    const b64 = pngDataUrl(320, 120).split(",")[1];
    const bytes = Uint8Array.from(Buffer.from(b64, "base64"));
    expect(readImageSize(bytes, "png")).toEqual({ width: 320, height: 120 });
  });
});

describe("estimate workbook", () => {
  it("writes formulas with cached results that match the totals", async () => {
    const wb = await buildEstimateWorkbook(items, meta);
    const det = wb.getWorksheet("تفاصيل البنود")!;
    const cover = wb.getWorksheet("الغلاف")!;

    // row 4 banner; rows 5,6 ordinary + subtotal 7; row 8 banner; row 9 electrical + subtotal 10; grand 11
    expect(det.getCell("A4").value).toBe("أولاً: الأعمال الاعتيادية (2)");
    expect(det.getCell("G5").value).toEqual({ formula: "F5*E5", result: 600 });
    expect(det.getCell("G7").value).toEqual({ formula: "SUM(G5:G6)", result: 800 });
    expect(det.getCell("A7").value).toBe("إجمالي الأعمال الاعتيادية");
    expect(det.getCell("A8").value).toBe("ثالثاً: الأعمال الكهربائية (1)");
    expect(det.getCell("G10").value).toEqual({ formula: "SUM(G9:G9)", result: 1000 });
    expect(det.getCell("G11").value).toEqual({ formula: "G7+G10", result: 1800 });

    expect(cover.getCell("A9").value).toEqual({ formula: "'تفاصيل البنود'!G7", result: 800 });
    expect(cover.getCell("A10").value).toBe(0); // no sanitary items
    expect(cover.getCell("A11").value).toEqual({ formula: "'تفاصيل البنود'!G10", result: 1000 });
    expect(cover.getCell("A12").value).toEqual({ formula: "SUM(A9:A11)", result: 1800 });
    expect(cover.getCell("A13").value).toBeCloseTo(0.1);
    expect(cover.getCell("A14").value).toEqual({ formula: "A12*A13", result: 180 });
    expect(cover.getCell("A15").value).toEqual({ formula: "A12+A14", result: 1980 });
  });

  it("exports a discount as a subtraction with discount labels", async () => {
    const wb = await buildEstimateWorkbook(items, { ...meta, premiumPercent: -10 });
    const cover = wb.getWorksheet("الغلاف")!;
    expect(cover.getCell("B13").value).toBe("نسبة الخصم");
    expect(cover.getCell("B14").value).toBe("إجمالي قيمة الخصم");
    expect(cover.getCell("A13").value).toBeCloseTo(0.1); // shown as a positive percent
    expect(cover.getCell("A14").value).toEqual({ formula: "A12*A13", result: 180 });
    expect(cover.getCell("A15").value).toEqual({ formula: "A12-A14", result: 1620 });
  });

  it("gives long descriptions taller rows", async () => {
    const long: LineItem[] = [{ ...items[0], desc: "وصف طويل جدا ".repeat(60) }];
    const wb = await buildEstimateWorkbook(long, meta);
    const det = wb.getWorksheet("تفاصيل البنود")!;
    expect(det.getRow(5).height).toBeGreaterThan(100); // row 4 is the section banner
  });

  it("survives a write/read round trip with formulas intact", async () => {
    const wb = await buildEstimateWorkbook(items, meta);
    const buf = await wb.xlsx.writeBuffer();
    const back = new ExcelJS.Workbook();
    await back.xlsx.load(buf);
    const cover = back.getWorksheet("الغلاف")!;
    expect(cover.getCell("A15").value).toMatchObject({ formula: "A12+A14", result: 1980 });
  });

  it("handles an empty estimate and a missing premium", async () => {
    const wb = await buildEstimateWorkbook([], { ...meta, premiumPercent: NaN });
    const cover = wb.getWorksheet("الغلاف")!;
    // ExcelJS does not keep a cached result of 0; Excel recalculates on open anyway.
    expect(cover.getCell("A12").value).toMatchObject({ formula: "SUM(A9:A11)" });
    expect(cover.getCell("A13").value).toBe(0);
  });

  it("keeps the logo's aspect ratio inside the cover header", async () => {
    const wb = await buildEstimateWorkbook(items, { ...meta, logoDataUrl: pngDataUrl(600, 300) });
    const cover = wb.getWorksheet("الغلاف")!;
    const [img] = cover.getImages();
    expect(img).toBeDefined();
    const ext = (img.range as { ext: { width: number; height: number } }).ext;
    expect(ext.width).toBe(150);
    expect(ext.height).toBe(75);
  });

  it("skips a logo it cannot read instead of breaking the export", async () => {
    const wb = await buildEstimateWorkbook(items, { ...meta, logoDataUrl: "data:image/webp;base64,AAAA" });
    expect(wb.getWorksheet("الغلاف")!.getImages()).toHaveLength(0);
  });

  it("sorts items by section and code in the exported details sheet", async () => {
    const unordered: LineItem[] = [
      { id: 1, code: "06/02/01/01", desc: "كهرباء ثاني", unit: "عدد", rate: 100, qty: 1 },
      { id: 2, code: "01/02/01/01", desc: "اعتيادي ثاني", unit: "م2", rate: 50, qty: 1 },
      { id: 3, code: "05/01/02/02", desc: "صحي أول", unit: "عدد", rate: 80, qty: 1 },
      { id: 4, code: "01/01/02/04", desc: "اعتيادي أول", unit: "م3", rate: 200, qty: 1 },
    ];
    const wb = await buildEstimateWorkbook(unordered, meta);
    const det = wb.getWorksheet("تفاصيل البنود")!;
    // 4 banner, 5-6 ordinary, 7 subtotal, 8 banner, 9 sanitary, 10 subtotal, 11 banner, 12 electrical
    expect(det.getCell("B5").value).toBe("01/01/02/04");
    expect(det.getCell("B6").value).toBe("01/02/01/01");
    expect(det.getCell("B9").value).toBe("05/01/02/02");
    expect(det.getCell("B12").value).toBe("06/02/01/01");
  });
});
