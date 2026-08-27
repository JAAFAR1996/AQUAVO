import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// #156 replaced the inline `isPartOf: { "@type": "WebSite", ... }` literal with
// a reference to the canonical #website node — but it only looked in
// api/ssr-meta.ts, and its guard only read that one file. api/blog-ssr.ts
// carried the same literal and was missed, so /blog/* kept serving two WebSite
// nodes to browsers after the fix shipped: one anonymous, one canonical.
//
// The lesson is the scope of the check, not the one file. A builder anywhere
// under api/ can describe the site a second time, so this reads all of them.

const here = dirname(fileURLToPath(import.meta.url));
const apiDir = resolve(here, "../../api");

function sourceFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      found.push(...sourceFiles(full));
    } else if (/\.tsx?$/.test(entry)) {
      found.push(full);
    }
  }
  return found;
}

const files = sourceFiles(apiDir);
// A literal WebSite object under `isPartOf`, as opposed to an `@id` reference.
const INLINE_WEBSITE = /isPartOf:\s*\{\s*"@type":\s*"WebSite"/g;

describe("no builder describes the site a second time", () => {
  it("has source files to check", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("never inlines a WebSite under isPartOf, anywhere under api/", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const hits = readFileSync(file, "utf8").match(INLINE_WEBSITE) ?? [];
      if (hits.length > 0) offenders.push(`${file.slice(apiDir.length + 1)} (${hits.length})`);
    }
    expect(offenders, `inline WebSite in: ${offenders.join(", ")}`).toEqual([]);
  });

  it("still declares isPartOf somewhere, pointing at #website", () => {
    const refs = files.reduce(
      (n, file) => n + (readFileSync(file, "utf8").match(/isPartOf:\s*\{\s*"@id":/g) ?? []).length,
      0,
    );
    expect(refs).toBeGreaterThan(0);
  });
});
