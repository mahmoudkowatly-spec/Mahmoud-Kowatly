export type Section = "ordinary" | "sanitary" | "electrical";

export const SECTION_LABELS: Record<Section, string> = {
  ordinary: "أعمال اعتيادية",
  sanitary: "أعمال صحية",
  electrical: "أعمال كهربائية",
};

/** GEA codes: starting with 06/6 = electrical, 05/5 = sanitary, else ordinary. */
export function sectionOf(code: string, explicit?: Section): Section {
  if (explicit) return explicit;
  const c = code.trim();
  if (/^0?6/.test(c)) return "electrical";
  if (/^0?5/.test(c)) return "sanitary";
  return "ordinary";
}

export const SECTION_ORDER: readonly Section[] = ["ordinary", "sanitary", "electrical"];

export const SECTION_TITLES: Record<
  Section,
  { ordinal: string; heading: string; subtotalLabel: string }
> = {
  ordinary: {
    ordinal: "أولاً",
    heading: "الأعمال الاعتيادية",
    subtotalLabel: "إجمالي الأعمال الاعتيادية",
  },
  sanitary: {
    ordinal: "ثانياً",
    heading: "الأعمال الصحية",
    subtotalLabel: "إجمالي الأعمال الصحية",
  },
  electrical: {
    ordinal: "ثالثاً",
    heading: "الأعمال الكهربائية",
    subtotalLabel: "إجمالي الأعمال الكهربائية",
  },
};

function tokenizeCode(code: string): { hasDigits: boolean; parts: string[] } {
  const trimmed = code.trim();
  const hasDigits = /\d/.test(trimmed);
  if (!hasDigits) return { hasDigits: false, parts: [trimmed] };
  const parts = trimmed
    .split(/[\/\-.\s\\]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  return { hasDigits: true, parts };
}

/** Compares GEA item codes numerically segment-by-segment; non-numeric custom codes sort after coded items. */
export function compareItemCodes(a: string, b: string): number {
  const ta = tokenizeCode(a);
  const tb = tokenizeCode(b);
  if (ta.hasDigits !== tb.hasDigits) return ta.hasDigits ? -1 : 1;
  if (!ta.hasDigits) return a.trim().localeCompare(b.trim(), "ar");

  const len = Math.min(ta.parts.length, tb.parts.length);
  for (let i = 0; i < len; i++) {
    const pa = ta.parts[i];
    const pb = tb.parts[i];
    const aNum = /^\d+$/.test(pa);
    const bNum = /^\d+$/.test(pb);
    if (aNum && bNum) {
      const diff = Number(pa) - Number(pb);
      if (diff !== 0) return diff;
    } else if (aNum !== bNum) {
      return aNum ? -1 : 1;
    } else {
      const cmp = pa.localeCompare(pb, "ar");
      if (cmp !== 0) return cmp;
    }
  }
  if (ta.parts.length !== tb.parts.length) return ta.parts.length - tb.parts.length;
  return a.trim().localeCompare(b.trim(), "ar");
}

/** Sorts items by Excel section order (ordinary -> sanitary -> electrical), then by item code ascending. */
export function sortEstimateItems<T extends { code: string; section?: Section }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => {
    const sa = SECTION_ORDER.indexOf(sectionOf(a.code, a.section));
    const sb = SECTION_ORDER.indexOf(sectionOf(b.code, b.section));
    if (sa !== sb) return sa - sb;
    return compareItemCodes(a.code, b.code);
  });
}

export type EstimateSectionGroup<T> = {
  section: Section;
  ordinal: string;
  heading: string;
  subtotalLabel: string;
  items: (T & { seq: number })[];
  subtotal: number;
};

/** Groups sorted items into non-empty Excel-ordered sections with continuous 1-based serial numbers and subtotals. */
export function groupEstimateBySection<
  T extends { code: string; qty: number; rate: number; section?: Section },
>(items: readonly T[]): EstimateSectionGroup<T>[] {
  const sorted = sortEstimateItems(items);
  const bySection: Record<Section, T[]> = {
    ordinary: [],
    sanitary: [],
    electrical: [],
  };
  for (const item of sorted) {
    bySection[sectionOf(item.code, item.section)].push(item);
  }

  let seq = 1;
  const groups: EstimateSectionGroup<T>[] = [];
  for (const section of SECTION_ORDER) {
    const arr = bySection[section];
    if (!arr.length) continue;
    const titledItems = arr.map((item) => ({ ...item, seq: seq++ }));
    const subtotal = arr.reduce((sum, item) => sum + item.qty * item.rate, 0);
    groups.push({
      section,
      ...SECTION_TITLES[section],
      items: titledItems,
      subtotal,
    });
  }
  return groups;
}

/** The adjustment on the grand total is either a premium (علاوة, added) or a discount (خصم, subtracted). */
export type AdjustmentMode = "premium" | "discount";

export function adjustmentLabels(mode: AdjustmentMode) {
  return mode === "discount"
    ? { pct: "نسبة الخصم", value: "إجمالي قيمة الخصم", before: "الإجمالي قبل الخصم", short: "الخصم" }
    : { pct: "نسبة العلاوة", value: "إجمالي قيمة العلاوة", before: "الإجمالي قبل العلاوة", short: "العلاوة" };
}

/** Turns a percent magnitude + mode into the signed percent that computeTotals expects (discount = negative). */
export function signedPercent(percent: number, mode: AdjustmentMode = "premium"): number {
  const magnitude = Number.isFinite(percent) ? Math.abs(percent) : 0;
  return mode === "discount" ? -magnitude : magnitude;
}

export type Totals =Record<Section, number> & { grand: number; premium: number; net: number };

/**
 * `premiumPercent` is the signed adjustment: positive = نسبة العلاوة (added to the grand total),
 * negative = discount (subtracted). `premium` is signed the same way, so net = grand + premium.
 */
export function computeTotals(
  items: { code: string; qty: number; rate: number; section?: Section }[],
  premiumPercent: number,
): Totals {
  const t = { ordinary: 0, sanitary: 0, electrical: 0 };
  for (const i of items) t[sectionOf(i.code, i.section)] += i.qty * i.rate;
  const grand = t.ordinary + t.sanitary + t.electrical;
  const premium = grand * ((premiumPercent || 0) / 100);
  return { ...t, grand, premium, net: grand + premium };
}

const ONES = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة", "عشرة",
  "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
const TENS = ["", "", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
const HUNDREDS = ["", "مائة", "مائتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];

function below1000(n: number): string {
  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (h) parts.push(HUNDREDS[h]);
  if (r) {
    if (r < 20) parts.push(ONES[r]);
    else {
      const o = r % 10;
      const t = Math.floor(r / 10);
      parts.push(o ? `${ONES[o]} و${TENS[t]}` : TENS[t]);
    }
  }
  return parts.join(" و");
}

const SCALES: [number, string, string, string, string][] = [
  // value, singular, dual, plural(3-10), accusative singular (11+)
  [1e9, "مليار", "ملياران", "مليارات", "مليار"],
  [1e6, "مليون", "مليونان", "ملايين", "مليون"],
  [1e3, "ألف", "ألفان", "آلاف", "ألف"],
];

function intToWords(n: number): string {
  if (n === 0) return "صفر";
  const parts: string[] = [];
  let rest = n;
  for (const [v, one, two, plural, acc] of SCALES) {
    const c = Math.floor(rest / v);
    rest %= v;
    if (!c) continue;
    if (c === 1) parts.push(one);
    else if (c === 2) parts.push(two);
    else if (c <= 10) parts.push(`${below1000(c)} ${plural}`);
    else parts.push(`${below1000(c)} ${acc}`);
  }
  if (rest) parts.push(below1000(rest));
  return parts.join(" و");
}

/** Counted noun: exactly 1 -> "جنيه واحد", exactly 2 -> "جنيهان", otherwise "<number> <noun>". */
function counted(n: number, noun: string, dual: string): string {
  if (n === 1) return `${noun} واحد`;
  if (n === 2) return dual;
  return `${intToWords(n)} ${noun}`;
}

/** Arabic tafqeet for EGP amounts, e.g. "فقط وقدره ... جنيه مصري و ... قرش لا غير". */
export function tafqeet(amount: number): string {
  const rounded = Math.round(Math.max(0, amount) * 100) / 100;
  const pounds = Math.floor(rounded);
  const piasters = Math.round((rounded - pounds) * 100);
  let s = `فقط وقدره ${counted(pounds, "جنيه", "جنيهان")}`;
  s += pounds === 2 ? " مصريان" : " مصري";
  if (piasters) s += ` و${counted(piasters, "قرش", "قرشان")}`;
  return s + " لا غير";
}

export function fmt(n: number) {
  return n.toLocaleString("ar-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
