import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { FALLBACK_AUTHOR_NAME, displayAuthorName } from "../../shared/author-name";

/**
 * Measured on production: 11 of 81 published posts emit
 * author: {"@type":"Person","name":"شريمب 🦐"} in Article schema, and the same
 * string appears in the visible byline and the markdown view. The remaining 70
 * use "AQUAVO Team".
 *
 * An emoji is not part of a name, so it is wrong in schema.org Person.name, and
 * AQUAVO's content rules forbid emoji outright. These tests pin the sanitiser
 * and pin that every surface which renders an author actually routes through
 * it, so a new render site cannot quietly reintroduce the raw value.
 */

describe("author name sanitisation", () => {
  it("strips emoji while keeping the actual name", () => {
    expect(displayAuthorName("شريمب 🦐")).toBe("شريمب");
    expect(displayAuthorName("AQUAVO Team")).toBe("AQUAVO Team");
  });

  it("keeps non-latin letters intact", () => {
    expect(displayAuthorName("فريق AQUAVO")).toBe("فريق AQUAVO");
  });

  it("handles compound emoji, variation selectors and joiners", () => {
    expect(displayAuthorName("Sam 👨‍👩‍👧 ✔️")).toBe("Sam");
  });

  it("falls back rather than emitting an empty name", () => {
    expect(displayAuthorName("🦐")).toBe(FALLBACK_AUTHOR_NAME);
    expect(displayAuthorName("")).toBe(FALLBACK_AUTHOR_NAME);
    expect(displayAuthorName(null)).toBe(FALLBACK_AUTHOR_NAME);
    expect(displayAuthorName(undefined)).toBe(FALLBACK_AUTHOR_NAME);
  });

  it("never invents a different name", () => {
    for (const name of ["Ali Hassan", "شريمب", "AQUAVO Team"]) {
      expect(displayAuthorName(name)).toBe(name);
    }
  });

  it("routes every author render site through the sanitiser", () => {
    // Anything that prints post.author must sanitise it first. Reading the real
    // sources keeps this honest if a new surface is added later.
    const files = [
      "api/blog-ssr.ts",
      "api/ssr-meta.ts",
      "api/_ssr-preview-source.ts",
      "api/_seo-preview-shell.tsx",
    ];
    for (const file of files) {
      const source = readFileSync(resolve(process.cwd(), file), "utf8");
      // articleAuthorEntity is a sanitising route: both of its branches run
      // the name through displayAuthorName. A file that uses only that one is
      // still sanitising every byline it renders.
      expect(
        ["displayAuthorName", "articleAuthorEntity", "authorBylineText"].some((route) =>
          source.includes(route),
        ),
        `${file} should sanitise the author`,
      ).toBe(true);
      // Every line that touches post.author must also sanitise on that line. A
      // bare truthiness guard is fine, but only alongside the sanitised render.
      for (const line of source.split(String.fromCharCode(10))) {
        if (!line.includes("post.author")) continue;
        // BlogByline and authorBylineText are sanitising routes too: each
        // renders the name through displayAuthorName, or through
        // articleAuthorEntity, which itself does.
        expect(
          ["displayAuthorName", "articleAuthorEntity", "authorBylineText", "BlogByline"].some((route) =>
            line.includes(route),
          ),
          `${file} renders post.author raw: ${line.trim()}`,
        ).toBe(true);
      }
    }
  });
});
