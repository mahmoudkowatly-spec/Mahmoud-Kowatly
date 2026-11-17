import { describe, it, expect } from "vitest";
import { computeTotals, sectionOf, tafqeet } from "../estimate-utils";

describe("estimate rules", () => {
  it("classifies codes 5/05 as sanitary, 6/06 as electrical", () => {
    expect(sectionOf("5-2-1")).toBe("sanitary");
    expect(sectionOf("05/01/02/02")).toBe("sanitary");
    expect(sectionOf("6010151")).toBe("electrical");
    expect(sectionOf("06/01/01/20")).toBe("electrical");
    expect(sectionOf("1-1-2-4")).toBe("ordinary");
    expect(sectionOf("مستجد", "electrical")).toBe("electrical");
  });
  it("applies discount percent to grand total", () => {
    const t = computeTotals([{ code: "1", qty: 10, rate: 100 }, { code: "6", qty: 1, rate: 1000 }], 10);
    expect(t.grand).toBe(2000);
    expect(t.discount).toBe(200);
    expect(t.net).toBe(1800);
  });
  it("writes amount in Arabic words", () => {
    expect(tafqeet(1250)).toBe("فقط وقدره ألف ومائتان وخمسون جنيه مصري لا غير");
    expect(tafqeet(750000.5)).toBe("فقط وقدره سبعمائة وخمسون ألف جنيه مصري وخمسون قرش لا غير");
  });
});
