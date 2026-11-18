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

export type Totals = Record<Section, number> & { grand: number; discount: number; net: number };

export function computeTotals(
  items: { code: string; qty: number; rate: number; section?: Section }[],
  discountPercent: number,
): Totals {
  const t = { ordinary: 0, sanitary: 0, electrical: 0 };
  for (const i of items) t[sectionOf(i.code, i.section)] += i.qty * i.rate;
  const grand = t.ordinary + t.sanitary + t.electrical;
  const discount = grand * ((discountPercent || 0) / 100);
  return { ...t, grand, discount, net: grand - discount };
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
