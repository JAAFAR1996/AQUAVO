import type { Pool } from "@neondatabase/serverless";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { productSourceFields, sourceHash, type TranslationRecord } from "../../shared/i18n/content";
import { LOCALE_RELEASE } from "../../shared/i18n/release";

const loadRecords = vi.hoisted(() => vi.fn());
vi.mock("../../api/_translation-records", () => ({ loadEntityTranslationRecords: loadRecords }));

import { translatedLocalesByEntity } from "../../api/_sitemap-i18n";

const pool = {} as Pool;
const originalRelease = { en: LOCALE_RELEASE.en.ready, ckb: LOCALE_RELEASE.ckb.ready };
const source = productSourceFields({
  name: "منتج", description: "وصف", subcategory: "معدات",
  specifications: { benefits: ["فائدة"], "قياس": "20 سم" },
  variants: [{ id: "v1", label: "10 سم" }],
});
const record: TranslationRecord = {
  entityType: "product", entityId: "p1", locale: "en", status: "reviewed", sourceHash: sourceHash(source),
  data: {
    name: "Product", description: "Description", subcategory: "Equipment",
    specifications: { benefits: ["Benefit"], labelled: { "قياس": { label: "Size", value: "20 cm" } } },
    variantLabels: { v1: "10 cm" },
  },
};

beforeEach(() => {
  loadRecords.mockReset().mockResolvedValue([]);
  LOCALE_RELEASE.en.ready = true;
  LOCALE_RELEASE.ckb.ready = true;
});

afterEach(() => {
  LOCALE_RELEASE.en.ready = originalRelease.en;
  LOCALE_RELEASE.ckb.ready = originalRelease.ckb;
  vi.restoreAllMocks();
});

describe("sitemap entity translation gate", () => {
  it("requires current, complete reviewed data, not only a reviewed status", async () => {
    const ids = ["reviewed", "machine", "outdated", "partial", "missing"];
    const fields = Object.fromEntries(ids.map((id) => [id, source]));
    loadRecords.mockResolvedValue([
      { ...record, entityId: "reviewed" },
      { ...record, entityId: "machine", status: "machine" },
      { ...record, entityId: "outdated", sourceHash: "previous-source" },
      { ...record, entityId: "partial", data: { ...record.data, variantLabels: {} } },
    ]);
    const result = await translatedLocalesByEntity(pool, "product", ids, fields);
    expect(result.get("reviewed")).toEqual(["ar", "en"]);
    for (const id of ids.slice(1)) expect(result.get(id), id).toEqual(["ar"]);
  });

  it("does not query or advertise an entity with no current source fields", async () => {
    loadRecords.mockResolvedValue([record]);
    const result = await translatedLocalesByEntity(pool, "product", ["p1"], {});
    expect(loadRecords).not.toHaveBeenCalled();
    expect(result.get("p1")).toEqual(["ar"]);
  });

  it("does not reuse another entity's reviewed translation", async () => {
    loadRecords.mockResolvedValue([record]);
    const result = await translatedLocalesByEntity(pool, "product", ["p1", "p2"], { p1: source, p2: source });
    expect(result.get("p1")).toEqual(["ar", "en"]);
    expect(result.get("p2")).toEqual(["ar"]);
  });

  it("retains the release gate and canonical locale order", async () => {
    loadRecords.mockResolvedValue([{ ...record, locale: "ckb" }, record]);
    let result = await translatedLocalesByEntity(pool, "product", ["p1"], { p1: source });
    expect(result.get("p1")).toEqual(["ar", "en", "ckb"]);
    LOCALE_RELEASE.en.ready = false;
    result = await translatedLocalesByEntity(pool, "product", ["p1"], { p1: source });
    expect(result.get("p1")).toEqual(["ar", "ckb"]);
  });

  it("keeps the Arabic sitemap available when translation lookup fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    loadRecords.mockRejectedValue(new Error("translation store unavailable"));
    const result = await translatedLocalesByEntity(pool, "product", ["p1"], { p1: source });
    expect(result.get("p1")).toEqual(["ar"]);
  });
});
