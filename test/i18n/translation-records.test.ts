import type { Pool } from "@neondatabase/serverless";
import { describe, expect, it, vi } from "vitest";
import { loadEntityTranslationRecords } from "../../api/_translation-records.js";

describe("SEO translation database projection", () => {
  it("maps the actual Drizzle array response into per-entity locale evidence", async () => {
    const query = vi.fn(async () => ({ rows: [
      ["p1", "en", { name: "Filter", description: "Aquarium filter" }, "reviewed", "hash-1"],
      ["p1", "ckb", { name: "پاڵاوتن" }, "machine", "hash-1"],
      ["p1", "unknown", {}, "reviewed", "hash-1"],
    ] }));
    const records = await loadEntityTranslationRecords({ query } as unknown as Pool, "product", ["p1", "p1"]);

    expect(records).toEqual([
      { entityType: "product", entityId: "p1", locale: "en", data: { name: "Filter", description: "Aquarium filter" }, status: "reviewed", sourceHash: "hash-1" },
      { entityType: "product", entityId: "p1", locale: "ckb", data: { name: "پاڵاوتن" }, status: "machine", sourceHash: "hash-1" },
    ]);
    expect(query).toHaveBeenCalledOnce();
  });

  it("fails closed when translation storage is unavailable", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const query = vi.fn().mockRejectedValue(new Error("database unavailable"));
      await expect(loadEntityTranslationRecords({ query } as unknown as Pool, "blog_post", ["b1"])).resolves.toEqual([]);
      await expect(loadEntityTranslationRecords(null, "product", ["p1"])).resolves.toEqual([]);
      expect(log).toHaveBeenCalledOnce();
    } finally {
      log.mockRestore();
    }
  });
});
