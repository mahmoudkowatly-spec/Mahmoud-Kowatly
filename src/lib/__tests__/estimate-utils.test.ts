import { describe, it, expect } from "vitest";
import { adjustmentLabels, computeTotals, sectionOf, signedPercent, tafqeet } from "../estimate-utils";

describe("estimate rules", () => {
  it("classifies codes 5/05 as sanitary, 6/06 as electrical", () => {
    expect(sectionOf("5-2-1")).toBe("sanitary");
    expect(sectionOf("05/01/02/02")).toBe("sanitary");
    expect(sectionOf("6010151")).toBe("electrical");
    expect(sectionOf("06/01/01/20")).toBe("electrical");
    expect(sectionOf("1-1-2-4")).toBe("ordinary");
    expect(sectionOf("مستجد", "electrical")).toBe("electrical");
  });
  it("adds the premium (نسبة العلاوة) percent on top of the grand total", () => {
    const t = computeTotals([{ code: "1", qty: 10, rate: 100 }, { code: "6", qty: 1, rate: 1000 }], 10);
    expect(t.grand).toBe(2000);
    expect(t.premium).toBe(200);
    expect(t.net).toBe(2200);
  });
  it("subtracts when the signed percent is negative (discount mode)", () => {
    const items = [{ code: "1", qty: 10, rate: 100 }, { code: "6", qty: 1, rate: 1000 }];
    const t = computeTotals(items, signedPercent(10, "discount"));
    expect(t.premium).toBe(-200);
    expect(t.net).toBe(1800);
  });
  it("signedPercent ignores the sign typed by the user and handles bad input", () => {
    expect(signedPercent(10)).toBe(10);
    expect(signedPercent(-10)).toBe(10);
    expect(signedPercent(10, "discount")).toBe(-10);
    expect(signedPercent(NaN, "discount")).toBeCloseTo(0);
  });
  it("labels follow the mode", () => {
    expect(adjustmentLabels("premium").pct).toBe("نسبة العلاوة");
    expect(adjustmentLabels("discount").pct).toBe("نسبة الخصم");
    expect(adjustmentLabels("discount").value).toBe("إجمالي قيمة الخصم");
  });
  it("treats an empty premium as zero", () => {
    const t = computeTotals([{ code: "1", qty: 1, rate: 100 }], NaN);
    expect(t.premium).toBe(0);
    expect(t.net).toBe(100);
  });
  it("writes amount in Arabic words", () => {
    expect(tafqeet(1250)).toBe("فقط وقدره ألف ومائتان وخمسون جنيه مصري لا غير");
    expect(tafqeet(750000.5)).toBe("فقط وقدره سبعمائة وخمسون ألف جنيه مصري وخمسون قرش لا غير");
  });
  it("uses singular/dual forms for exactly 1 or 2 pounds/piasters", () => {
    expect(tafqeet(1)).toBe("فقط وقدره جنيه واحد مصري لا غير");
    expect(tafqeet(2)).toBe("فقط وقدره جنيهان مصريان لا غير");
    expect(tafqeet(5.01)).toBe("فقط وقدره خمسة جنيه مصري وقرش واحد لا غير");
    expect(tafqeet(5.02)).toBe("فقط وقدره خمسة جنيه مصري وقرشان لا غير");
  });
});
