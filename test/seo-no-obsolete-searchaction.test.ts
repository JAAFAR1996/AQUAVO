import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("crawler website structured data", () => {
  it("keeps WebSite identity but does not emit the retired sitelinks SearchAction", () => {
    const source = read("api/_seo-structured-data.ts");

    expect(source).toContain('"@type": "WebSite"');
    expect(source).toContain('publisher: { "@id": `${AQUAVO_BASE_URL}/#organization` }');
    expect(source).not.toContain('"@type": "SearchAction"');
    expect(source).not.toContain("search_term_string");
  });
});
