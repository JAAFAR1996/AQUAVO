import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const api = read("client/src/lib/api.ts");
const products = read("server/routes/products.ts");
const searchIndex = read("client/src/components/search/index.ts");

describe("search lifecycle session integrity", () => {
  it("sends the canonical client session with the active smart-search path", () => {
    expect(api).toContain("fetchSmartSearch");
    expect(api).toContain("sid=${encodeURIComponent(getClientSessionId())}");
    expect(products).toContain("resolveClientSessionId(req, req.query.sid)");
  });

  it("does not expose the obsolete autocomplete path that called a removed endpoint", () => {
    expect(searchIndex).not.toContain("SearchAutocomplete");
    expect(existsSync(join(process.cwd(), "client/src/components/search/search-autocomplete.tsx"))).toBe(false);
  });
});
