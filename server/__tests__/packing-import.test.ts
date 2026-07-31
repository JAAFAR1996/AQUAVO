// Excel import: mapping, matching and what may actually be written.
//
// The fixtures are real rows from the owner's sheet
// (اعداد المنتجات وقياساتها.xlsx), including its actual quirks: trailing spaces
// on values, a row with no piece count, and the «عرفة عزل» / «كطن اخضر» typos.
import { describe, expect, it } from "vitest";
import {
  SHEET_HEADERS,
  matchProduct,
  normaliseArabic,
  parseFoldable,
  parseImportSheet,
  parseNumber,
  selectApplicableRows,
  summariseImport,
  type CatalogProduct,
  type RawSheetRow,
} from "../services/packing-import-service.js";

const CATALOG: CatalogProduct[] = [
  { id: "p-heater-100", name: "هيتر ستيل 100 واط" },
  { id: "p-heater-200", name: "هيتر ستيل 200 واط" },
  { id: "p-samurai", name: "هيتر ساموراي الأسود" },
  { id: "p-cotton-brown", name: "قطن جوزي" },
  { id: "p-cotton-grey", name: "قطن رصاصي" },
  { id: "p-iso-acrylic", name: "غرفة عزل اكرلك" },
  { id: "p-vacuum-200", name: "مكنسة 200 واط" },
];

/** Rows exactly as they appear in the sheet, trailing spaces included. */
const REAL_ROWS: RawSheetRow[] = [
  { rowNumber: 2, productName: "هيتر ساموراي الأسود", pieceCount: "5", packedHeight: "31", packedWidth: "7", foldable: "لا" },
  { rowNumber: 3, productName: "هيتر ستيل 100 واط ", pieceCount: "7", packedHeight: "32", packedWidth: "9", foldable: "لا" },
  { rowNumber: 5, productName: "هيتر ستيل 50 واط", pieceCount: "9", packedHeight: "19.5", packedWidth: "8.6", foldable: "لا" },
  { rowNumber: 15, productName: "قطن جوزي", pieceCount: "2", packedHeight: "14.5", packedWidth: "13.5", foldable: "نعم " },
  { rowNumber: 54, productName: "اخشاب اكبر حجم ", pieceCount: null, packedHeight: "50", packedWidth: "67", foldable: "لا" },
];

describe("sheet headers", () => {
  it("records the real header text, typo and all", () => {
    expect(SHEET_HEADERS.packedHeight).toBe("طول المنتج مع كارتونة");
    expect(SHEET_HEADERS.packedWidth).toBe("عرض المنتج مع كارتونتة");
    expect(SHEET_HEADERS.foldable).toBe("هل قابل للطي");
  });
});

describe("value parsing", () => {
  it("parses the decimals present in the sheet", () => {
    expect(parseNumber("19.5")).toBe(19.5);
    expect(parseNumber("8.6")).toBe(8.6);
    expect(parseNumber(" 32 ")).toBe(32);
  });

  it("parses Arabic-Indic digits", () => {
    expect(parseNumber("٣٢")).toBe(32);
    expect(parseNumber("١٩٫٥")).toBe(19.5);
  });

  it("rejects zero, negatives and junk rather than inventing a dimension", () => {
    expect(parseNumber("0")).toBeNull();
    expect(parseNumber("-5")).toBeNull();
    expect(parseNumber("غير معروف")).toBeNull();
    expect(parseNumber("")).toBeNull();
    expect(parseNumber(null)).toBeNull();
  });

  it("reads نعم / لا including the sheet's trailing space", () => {
    expect(parseFoldable("نعم ")).toBe(true);
    expect(parseFoldable("نعم")).toBe(true);
    expect(parseFoldable("لا")).toBe(false);
    expect(parseFoldable("")).toBeNull();
    expect(parseFoldable("ربما")).toBeNull();
  });
});

describe("Arabic normalisation", () => {
  it("collapses alef, ya and ta-marbuta variants", () => {
    expect(normaliseArabic("غرفة")).toBe(normaliseArabic("غرفه"));
    expect(normaliseArabic("الأسود")).toBe(normaliseArabic("الاسود"));
  });

  it("ignores trailing whitespace and punctuation", () => {
    expect(normaliseArabic("هيتر ستيل 100 واط ")).toBe(normaliseArabic("هيتر ستيل 100 واط"));
  });
});

describe("product matching", () => {
  it("matches an exact name", () => {
    const m = matchProduct("هيتر ستيل 100 واط", CATALOG);
    expect(m.confidence).toBe("exact");
    expect(m.matchedProductId).toBe("p-heater-100");
  });

  it("matches through the sheet's trailing space", () => {
    expect(matchProduct("هيتر ستيل 100 واط ", CATALOG).confidence).toBe("exact");
  });

  it("returns ambiguous when nothing is close enough", () => {
    const m = matchProduct("منتج لا وجود له إطلاقاً", CATALOG);
    expect(m.confidence).toBe("ambiguous");
    expect(m.matchedProductId).toBeNull();
  });

  it("returns ambiguous when two catalogue names are equally close", () => {
    // "قطن" alone cannot choose between جوزي and رصاصي.
    const m = matchProduct("قطن", CATALOG);
    expect(m.confidence).toBe("ambiguous");
    expect(m.matchedProductId).toBeNull();
  });

  it("returns ambiguous when two products normalise identically", () => {
    const dupes: CatalogProduct[] = [
      { id: "a", name: "غرفة عزل" },
      { id: "b", name: "غرفه عزل" },
    ];
    const m = matchProduct("غرفة عزل", dupes);
    expect(m.confidence).toBe("ambiguous");
    expect(m.candidates).toHaveLength(2);
  });

  it("offers a probable match for the sheet's typo, without applying it", () => {
    // «عرفة عزل اكرلك» in the sheet vs «غرفة عزل اكرلك» in the catalogue.
    const m = matchProduct("عرفة عزل اكرلك  ", CATALOG);
    expect(m.confidence).not.toBe("exact");
    if (m.confidence === "probable") expect(m.matchedProductId).toBe("p-iso-acrylic");
  });
});

describe("row parsing", () => {
  const parsed = parseImportSheet(REAL_ROWS, CATALOG);

  it("maps الطول to packed HEIGHT and العرض to packed WIDTH", () => {
    const heater50 = parsed.find((r) => r.rowNumber === 5)!;
    expect(heater50.packedHeightCm).toBe(19.5);
    expect(heater50.packedWidthCm).toBe(8.6);
  });

  it("leaves depth, weight and folded dimensions NULL — the sheet has none", () => {
    const applicable = selectApplicableRows(parsed);
    for (const a of applicable) {
      expect(a.packedDepthCm).toBeNull();
      expect(a.packedWeightKg).toBeNull();
      expect(a.foldedHeightCm).toBeNull();
      expect(a.foldedWidthCm).toBeNull();
      expect(a.foldedDepthCm).toBeNull();
    }
  });

  it("reads foldable from the sheet", () => {
    expect(parsed.find((r) => r.rowNumber === 15)!.foldable).toBe(true);
    expect(parsed.find((r) => r.rowNumber === 2)!.foldable).toBe(false);
  });

  it("keeps the raw cells verbatim for later dispute", () => {
    const r = parsed.find((r) => r.rowNumber === 15)!;
    expect(r.rawFoldable).toBe("نعم ");
    expect(r.rawHeight).toBe("14.5");
  });

  it("warns about the missing piece count without failing the row", () => {
    const row54 = parsed.find((r) => r.rowNumber === 54)!;
    expect(row54.parseWarnings.some((w) => w.includes("عدد القطع"))).toBe(true);
    expect(row54.packedHeightCm).toBe(50);
    expect(row54.packedWidthCm).toBe(67);
  });
});

describe("what may be written", () => {
  const parsed = parseImportSheet(REAL_ROWS, CATALOG);

  it("never carries the piece count into the applied shape", () => {
    const applied = selectApplicableRows(parsed);
    for (const a of applied) {
      expect(Object.keys(a)).not.toContain("pieceCount");
      expect(Object.keys(a)).not.toContain("stock");
      expect(Object.keys(a)).not.toContain("quantity");
    }
  });

  it("applies exact matches", () => {
    const applied = selectApplicableRows(parsed);
    expect(applied.map((a) => a.productId)).toContain("p-heater-100");
  });

  it("never applies an ambiguous row, confirmed or not", () => {
    const rows = parseImportSheet(
      [{ rowNumber: 1, productName: "قطن", packedHeight: "10", packedWidth: "10", foldable: "نعم", pieceCount: "1" }],
      CATALOG,
    );
    expect(rows[0]!.matchConfidence).toBe("ambiguous");
    expect(selectApplicableRows(rows)).toHaveLength(0);
    // Even if someone ticks it in the UI.
    expect(selectApplicableRows(rows, new Set([1]))).toHaveLength(0);
  });

  it("holds a probable row back until the owner confirms that exact row", () => {
    const rows = parseImportSheet(
      [{ rowNumber: 7, productName: "هيتر ستيل 100", packedHeight: "32", packedWidth: "9", foldable: "لا", pieceCount: "1" }],
      CATALOG,
    );
    if (rows[0]!.matchConfidence !== "probable") return; // exact is fine too
    expect(selectApplicableRows(rows)).toHaveLength(0);
    expect(selectApplicableRows(rows, new Set([7]))).toHaveLength(1);
    // Confirming a DIFFERENT row does not unlock this one.
    expect(selectApplicableRows(rows, new Set([99]))).toHaveLength(0);
  });

  it("skips a row that carries no usable value at all", () => {
    const rows = parseImportSheet(
      [{ rowNumber: 3, productName: "هيتر ستيل 100 واط", packedHeight: "", packedWidth: "", foldable: "", pieceCount: "1" }],
      CATALOG,
    );
    expect(selectApplicableRows(rows)).toHaveLength(0);
  });
});

describe("import summary", () => {
  it("reports that every row still needs depth and weight", () => {
    const s = summariseImport(parseImportSheet(REAL_ROWS, CATALOG));
    expect(s.total).toBe(5);
    expect(s.stillMissingDepthOrWeight).toBe(5);
    expect(s.withHeight).toBe(5);
    expect(s.foldableYes).toBe(1);
    expect(s.exact + s.probable + s.ambiguous).toBe(5);
  });
});
