import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { describe, expect, it, vi } from "vitest";

import { GALLERY_ENTRY_TERMS, GALLERY_PRIZES } from "../../shared/gallery-terms";

/**
 * /community-gallery is two things at once. The gallery is customer submissions
 * read from /api/gallery behind an auth context — it cannot be rendered
 * statically, and other people's photos are not what this URL should be indexed
 * for. How the competition works is fixed and published, and a crawler was
 * shown neither: 20 substantive words against 114 in the browser.
 *
 * The terms and prizes are shared with the page rather than copied, so the two
 * cannot disagree, and the decorative emoji stay in the component instead of
 * entering published content.
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

describe("/community-gallery publishes how the competition works", () => {
  it("lists every entry term and prize", async () => {
    const { html, status } = await crawl("/community-gallery");
    expect(status).toBe(200);
    // React escapes quotes in the markup, so compare against decoded text.
    const decoded = html.replace(/&quot;/g, '"').replace(/&#x27;|&apos;/g, "'").replace(/&amp;/g, "&");
    for (const term of GALLERY_ENTRY_TERMS) {
      expect(decoded, `missing term: ${term}`).toContain(term);
    }
    for (const prize of GALLERY_PRIZES) {
      expect(decoded, `missing prize: ${prize}`).toContain(prize);
    }
  });

  it("keeps the rules in one place", () => {
    // The page must render the shared list rather than its own copy.
    const page = readFileSync(
      resolve(process.cwd(), "client/src/pages/community-gallery.tsx"),
      "utf8",
    );
    expect(page).toContain("GALLERY_ENTRY_TERMS");
    expect(page).toContain("GALLERY_PRIZES");
    for (const term of GALLERY_ENTRY_TERMS) {
      expect(page, `${term} should not be re-typed in the page`).not.toContain(`<span>${term}</span>`);
    }
  });

  it("publishes no emoji", async () => {
    const { html } = await crawl("/community-gallery");
    const body = html.split("</head>")[1] ?? "";
    const main = body.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? "";
    expect(main).not.toMatch(
      new RegExp("[\\p{Extended_Pictographic}]", "u"),
    );
  });

  it("does not invent submissions or a winner", async () => {
    const { html } = await crawl("/community-gallery");
    // The gallery contents are customer data and must not be implied here.
    expect(html).not.toMatch(/الفائز هذا الشهر|صورة الفائز|أفضل حوض لشهر/);
  });

  it("keeps exactly one h1", async () => {
    const { html } = await crawl("/community-gallery");
    expect((html.match(/<h1[\s>]/gi) || []).length).toBe(1);
  });
});
