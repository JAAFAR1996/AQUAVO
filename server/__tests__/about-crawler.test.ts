import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { describe, expect, it, vi } from "vitest";

import { AQUAVO_ENTITY } from "../../shared/seo-contract";

/**
 * /about served a crawler 63 words and a visitor 412. The page content is now
 * appended, but the crawler shell is the *only* place three business facts are
 * published — the registered legal name, that there is no walk-in shop, and
 * that AQUAVO sells no live animals. None of them appears on the React page.
 *
 * So the content is added beneath the disclosures rather than replacing them,
 * and these tests exist to make that irreversible: if a later change swaps the
 * shell copy out for the page content, the facts assertions fail.
 */

vi.mock("@neondatabase/serverless", () => ({
  neonConfig: {},
  Pool: vi.fn().mockImplementation(function FakePool() {
    return { query: vi.fn(async () => ({ rows: [] })) };
  }),
}));

process.env.DATABASE_URL ||= "postgres://test-user:test-pass@localhost:5432/test-db";

async function crawl(path: string): Promise<{ html: string; status: number }> {
  const handler = (await import("../../api/_ssr-preview-source")).default;
  let html = "";
  let status = 200;
  const response = {
    setHeader: vi.fn(),
    status: vi.fn((code: number) => {
      status = code;
      return response;
    }),
    send: vi.fn((value: unknown) => {
      html = String(value);
      return response;
    }),
    end: vi.fn((value?: unknown) => {
      if (value !== undefined) html = String(value);
      return response;
    }),
  };
  const req = {
    url: path,
    headers: {
      accept: "text/html",
      host: "www.aquavoiq.com",
      "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    },
  } as unknown as VercelRequest;
  await (handler as (q: VercelRequest, r: VercelResponse) => Promise<void>)(
    req,
    response as unknown as VercelResponse,
  );
  return { html, status };
}

describe("/about keeps its disclosures and gains its page", () => {
  it("still publishes the registered legal name", async () => {
    const { html, status } = await crawl("/about");
    expect(status).toBe(200);
    expect(html).toContain(AQUAVO_ENTITY.legalName);
  });

  it("still says there is no walk-in shop", async () => {
    const { html } = await crawl("/about");
    expect(html).toContain("لا يوجد محل لاستقبال الزبائن");
  });

  it("still says AQUAVO sells no live animals", async () => {
    const { html } = await crawl("/about");
    expect(html).toContain("لا يبيع أسماكاً أو كائنات أو نباتات حية");
  });

  it("now also carries the page a visitor reads", async () => {
    const { html } = await crawl("/about");
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/about.tsx"), "utf8");
    // A sentence taken from the real component, so the assertion tracks the page
    // rather than a copy of it.
    const sentence = source.match(/>([^<>{}]{40,120})</)?.[1]?.trim();
    expect(sentence, "expected a quotable sentence in about.tsx").toBeTruthy();
    expect(html).toContain(sentence!);
  });

  it("keeps exactly one h1", async () => {
    const { html } = await crawl("/about");
    expect((html.match(/<h1[\s>]/gi) || []).length).toBe(1);
  });
});

describe("/fish-compatibility has a heading for its readers", () => {
  it("uses an h1 for the page title, with the same styling", () => {
    const source = readFileSync(
      resolve(process.cwd(), "client/src/components/fish/compatibility-calculator.tsx"),
      "utf8",
    );
    // The visual is class-driven, so promoting the tag changes semantics only.
    expect(source).toContain('<h1 className="text-2xl font-bold">كاشف توافقية الأسماك</h1>');
    expect(source).not.toContain('<h2 className="text-2xl font-bold">كاشف توافقية الأسماك</h2>');
  });

  it("still gives the crawler exactly one h1", async () => {
    // The prerender demotes a page's own h1 so the shell keeps ownership.
    const { html } = await crawl("/fish-compatibility");
    expect((html.match(/<h1[\s>]/gi) || []).length).toBe(1);
  });
});
