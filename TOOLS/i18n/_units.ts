/**
 * Deterministic unit-word normalisation for technical values the models leave
 * in Arabic ("50 غرام", "2–6 ملم"). Only unit words directly attached to a
 * number are touched; prose is never rewritten here.
 */
const UNITS: Array<{ ar: RegExp; en: string; ckb: string }> = [
  { ar: /(\d)\s*(?:كغم|كيلو ?غرام|كيلوغرام|كجم)/g, en: "$1 kg", ckb: "$1 کگم" },
  { ar: /(\d)\s*(?:غرام|غم|جرام|جم)\b/g, en: "$1 g", ckb: "$1 گرام" },
  { ar: /(\d)\s*(?:ملم|مم|مليمتر)/g, en: "$1 mm", ckb: "$1 ملم" },
  { ar: /(\d)\s*(?:سم|سنتيمتر|سنتمتر)/g, en: "$1 cm", ckb: "$1 سم" },
  { ar: /(\d)\s*(?:متر|م)(?![\p{Script=Arabic}])/gu, en: "$1 m", ckb: "$1 مەتر" },
  { ar: /(\d)\s*(?:لتر\/ساعة|لتر\/س|ل\/س)/g, en: "$1 L/h", ckb: "$1 لیتر/کاتژمێر" },
  { ar: /(\d)\s*(?:لتر|لترات)/g, en: "$1 L", ckb: "$1 لیتر" },
  { ar: /(\d)\s*(?:مل|مليلتر|ملل)(?![\p{Script=Arabic}])/gu, en: "$1 ml", ckb: "$1 مل" },
  { ar: /(\d)\s*(?:واط|وات)/g, en: "$1 W", ckb: "$1 وات" },
  { ar: /(\d)\s*(?:فولت|ڤۆڵت)/g, en: "$1 V", ckb: "$1 ڤۆڵت" },
  { ar: /(\d)\s*(?:درجة مئوية|درجة|°م)/g, en: "$1 °C", ckb: "$1 پلەی سەدی" },
  { ar: /(\d)\s*(?:قطعة|قطع)/g, en: "$1 pcs", ckb: "$1 پارچە" },
  { ar: /(\d)\s*(?:بوصة|انش|إنش)/g, en: "$1 in", ckb: "$1 ئینچ" },
];

export function normalizeUnits(s: string, locale: "en" | "ckb"): string {
  let out = s;
  for (const u of UNITS) out = out.replace(u.ar, locale === "en" ? u.en : u.ckb);
  return out;
}

export function normalizeUnitsDeep<T>(value: T, locale: "en" | "ckb"): T {
  if (typeof value === "string") return normalizeUnits(value, locale) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => normalizeUnitsDeep(v, locale)) as unknown as T;
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, normalizeUnitsDeep(v, locale)])) as T;
  return value;
}
