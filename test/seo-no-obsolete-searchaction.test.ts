import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("website structured data", () => {
  it("keeps WebSite identity but does not emit the retired sitelinks SearchAction anywhere", () => {
    const canonical = read("api/_seo-structured-data.ts");
    expect(canonical).toContain('"@type": "WebSite"');
    expect(canonical).toContain('publisher: { "@id": `${AQUAVO_BASE_URL}/#organization` }');

    for (const path of [
      "api/_seo-structured-data.ts",
      "api/ssr-meta.ts",
      "server/ssr-meta.ts",
      "client/src/components/seo/meta-tags.tsx",
    ]) {
      const source = read(path);
      expect(source, path).not.toContain('"@type": "SearchAction"');
      expect(source, path).not.toContain("search_term_string");
    }
  });
});
