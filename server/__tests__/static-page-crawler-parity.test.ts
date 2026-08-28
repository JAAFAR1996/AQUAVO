import type { VercelRequest, VercelResponse } from "@vercel/node";
import { describe, expect, it, vi } from "vitest";

import crawlerHandler from "../../api/_ssr-preview-source";
import { PRERENDERED_PAGES } from "../../api/_prerendered-pages";
import { STATIC_COPY } from "../../api/_ssr-preview-source";

/**
 * These routes rendered real content for a person and almost nothing for a
 * crawler. Comparing the <main> landmark on both sides on production:
 *
 *   /terms            crawler  16 words   browser 479
 *   /sustainability   crawler  20 words   browser 242
 *   /privacy-policy   crawler  20 words   browser 235
 *   /return-policy    crawler  19 words   browser 188
 *   /fish-finder      crawler  24 words   browser 161
 *   /why-aquavo       crawler  20 words   browser 108
 *   /shipping         crawler  34 words   browser  82
 *
 * The crawler shell served a breadcrumb, an H1 and a one-sentence summary, so
 * most of its ~100 body words were navigation. These tests assert the crawler
 * now receives the page's actual prose, and — just as importantly — that the
 * business facts which only ever appeared in the shell copy are still there.
 */

const GOOGLEBOT = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

async function crawl(path: string): Promise<{ html: string; status: number }> {
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
    headers: { accept: "text/html", host: "www.aquavoiq.com", "user-agent": GOOGLEBOT },
  } as unknown as VercelRequest;
  await (crawlerHandler as (q: VercelRequest, r: VercelResponse) => Promise<void>)(
    req,
    response as unknown as VercelResponse,
  );
  return { html, status };
}

/** Words inside <main>, excluding nav/footer — the same measure used on production. */
function substantiveWords(html: string): number {
  const body = html.split("</head>")[1] ?? html;
  const main = body.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  const text = (main ? main[1] : body)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.split(" ").filter(Boolean).length;
}

const PATHS = Object.keys(PRERENDERED_PAGES);

describe("static pages expose their real content to a crawler", () => {
  it("guards the pages that were measured as thin", () => {
    expect(PATHS.length).toBeGreaterThanOrEqual(10);
    for (const path of ["/terms", "/privacy-policy", "/return-policy", "/shipping", "/sustainability"]) {
      expect(PATHS, `${path} should be prerendered`).toContain(path);
    }
  });

  it("serves substantially more than a heading and one sentence", async () => {
    for (const path of PATHS) {
      const { html, status } = await crawl(path);
      expect(status, `${path} status`).toBe(200);
      // The old shell produced 16-34 substantive words on these routes.
      expect(substantiveWords(html), `${path} substantive words`).toBeGreaterThan(60);
    }
  });

  it("serves the page's own prose, not a generated summary", async () => {
    // Sentences taken from the real components. If the crawler output stops
    // carrying them, it has drifted back to the summary-only shell.
    const proof: Record<string, string> = {
      "/shipping": "تشوف المبلغ كاملاً قبل التأكيد",
      "/return-policy": "ضمان الأجهزة ما ينطبق إلا على منتج معتمد",
      "/privacy-policy": "هاي الصفحة تشرح شنو نجمع من بياناتك",
      "/terms": "بالوصول إلى هذا الموقع واستخدامه، فإنك توافق",
      "/sustainability": "نؤتمن على أرواح",
      "/why-aquavo": "AQUAVO",
    };
    for (const [path, phrase] of Object.entries(proof)) {
      const { html } = await crawl(path);
      expect(html, `${path} should carry its own copy`).toContain(phrase);
    }
  });

  it("keeps exactly one h1", async () => {
    for (const path of PATHS) {
      const { html } = await crawl(path);
      const count = (html.match(/<h1[\s>]/gi) || []).length;
      expect(count, `${path} h1 count`).toBe(1);
    }
  });

  it("still publishes the business facts that only the shell carried", async () => {
    // /fish-finder's summary is the only place a crawler is told AQUAVO does
    // not sell live fish. Appending page content must not displace it.
    const { html } = await crawl("/fish-finder");
    expect(html).toContain(STATIC_COPY["/fish-finder"].summary);
    for (const path of PATHS) {
      const copy = STATIC_COPY[path];
      if (!copy) continue;
      const { html: pageHtml } = await crawl(path);
      expect(pageHtml, `${path} lost its shell summary`).toContain(copy.summary);
      for (const paragraph of copy.paragraphs ?? []) {
        expect(pageHtml, `${path} lost a shell paragraph`).toContain(paragraph);
      }
    }
  });

  it("does not leak head artefacts or duplicate structured data into the body", () => {
    for (const [path, html] of Object.entries(PRERENDERED_PAGES)) {
      expect(html, `${path} script`).not.toMatch(/<script/i);
      expect(html, `${path} ld+json`).not.toMatch(/application\/ld\+json/i);
      expect(html, `${path} h1`).not.toMatch(/<h1[\s>]/i);
    }
  });

  it("leaves unknown routes on their 404", async () => {
    const { status } = await crawl("/definitely-not-a-real-page");
    expect(status).toBe(404);
  });
});
