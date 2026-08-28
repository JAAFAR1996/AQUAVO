import type { VercelRequest, VercelResponse } from "@vercel/node";
import { describe, expect, it, vi } from "vitest";

import browserHandler from "../../api/ssr-meta";
import crawlerHandler from "../../api/_ssr-preview-source";
import { SPA_GUIDE_PAGES } from "../../api/_guides-content-spa";

/**
 * The 15 guides ported in _guides-content-spa.ts have their own React
 * implementations in client/src/pages, wired to routes in App.tsx. Registering
 * them as canonical guides fixed the crawler 404, but api/ssr-meta.ts — the
 * browser path — renders any *resolvable* guide as a complete server document,
 * so a person visiting one stopped getting the React page entirely: no #root to
 * mount into, and the bespoke design replaced by the generic guide template.
 *
 * Measured on production after that deploy, /guides/algae-control in Chrome:
 *   h1 "السيطرة على طحالب الحوض" (server template), no #root element at all
 * where before it was:
 *   h1 "الظل الأخضر" (React page), #root present
 *
 * So the two audiences are split deliberately here: a crawler gets the full
 * server-rendered content (that is the whole point of the port), and a browser
 * gets the SPA shell so React renders the page that was actually designed.
 * Both still describe the same page — meta and Article/BreadcrumbList for these
 * routes come from GUIDE_META in ssr-meta.
 */

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<void> | void;

const CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const GOOGLEBOT = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

async function render(handler: Handler, path: string, userAgent: string) {
  let body = "";
  let status = 200;
  const response = {
    setHeader: vi.fn(),
    status: vi.fn((code: number) => {
      status = code;
      return response;
    }),
    send: vi.fn((value: unknown) => {
      body = String(value);
      return response;
    }),
    end: vi.fn((value?: unknown) => {
      if (value !== undefined) body = String(value);
      return response;
    }),
  };
  const req = {
    url: path,
    headers: { accept: "text/html", host: "www.aquavoiq.com", "user-agent": userAgent },
  } as unknown as VercelRequest;
  await handler(req, response as unknown as VercelResponse);
  return { body, status };
}

const SPA_GUIDE_PATHS = Object.keys(SPA_GUIDE_PAGES);

describe("SPA-backed guides keep their React page for people", () => {
  it("guards a non-trivial set of routes", () => {
    expect(SPA_GUIDE_PATHS.length).toBe(15);
  });

  it("serves a browser the SPA shell, not the server guide document", async () => {
    for (const path of SPA_GUIDE_PATHS) {
      const { body, status } = await render(browserHandler as Handler, path, CHROME);
      expect(status, `${path} status`).toBe(200);
      expect(body, `${path} must keep the React mount point`).toContain('id="root"');
      // The server guide template renders the ported h1 directly into the body.
      // Its presence means React never gets to render the designed page.
      expect(
        body.includes(`<h1>${SPA_GUIDE_PAGES[path].h1}</h1>`),
        `${path} must not be replaced by the server guide document`,
      ).toBe(false);
    }
  });

  it("still serves a crawler the full ported content", async () => {
    for (const path of SPA_GUIDE_PATHS) {
      const { body, status } = await render(crawlerHandler as Handler, path, GOOGLEBOT);
      expect(status, `${path} crawler status`).toBe(200);
      expect(body, `${path} crawler h1`).toContain(SPA_GUIDE_PAGES[path].h1);
      expect(body, `${path} crawler FAQ`).toContain("FAQPage");
      expect(body, `${path} crawler canonical`).toContain(`https://www.aquavoiq.com${path}`);
    }
  });

  it("still gives a browser the guide's own title and Article schema", async () => {
    for (const path of SPA_GUIDE_PATHS) {
      const { body } = await render(browserHandler as Handler, path, CHROME);
      expect(body, `${path} browser Article`).toContain("Article");
      expect(body, `${path} browser robots`).toContain("index, follow");
    }
  });
});
