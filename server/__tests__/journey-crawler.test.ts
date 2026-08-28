import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { describe, expect, it, vi } from "vitest";

import { JOURNEY_STEPS } from "../../shared/journey-steps";

/**
 * /journey is the aquarium-setup wizard. Its answers and suggestions only exist
 * once React runs and a person makes choices, so there is nothing to prerender
 * — a static render of it needs a QueryClientProvider and would show an
 * unanswered form.
 *
 * What the tool covers is fixed, though, and a crawler was told none of it: 19
 * substantive words against 197 in the browser. The step outline is real,
 * already exists as a constant, and describes the page honestly, so the crawler
 * route lists it.
 *
 * The list is shared rather than copied: the client wizard builds its UI from
 * the same entries, so a renamed step cannot appear in one place only.
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

describe("/journey tells a crawler what the wizard covers", () => {
  it("lists every step, in order", async () => {
    const { html, status } = await crawl("/journey");
    expect(status).toBe(200);
    // Scope to the ordered list: several step words ("المياه", "الأسماك") also
    // occur in the head and in product-category names elsewhere in the document.
    const list = html.match(/<ol>([\s\S]*?)<\/ol>/);
    expect(list, "expected an ordered list of steps").not.toBeNull();
    let cursor = -1;
    for (const step of JOURNEY_STEPS) {
      const at = list![1].indexOf(step.title);
      expect(at, `missing step ${step.title}`).toBeGreaterThan(-1);
      expect(at, `step ${step.title} is out of order`).toBeGreaterThan(cursor);
      cursor = at;
    }
  });

  it("counts the steps from the list rather than stating a number", async () => {
    const { html } = await crawl("/journey");
    expect(html).toContain(`${JOURNEY_STEPS.length} خطوات`);
  });

  it("keeps one source of truth for the step titles", () => {
    // The wizard must build its steps from the shared outline. If the titles are
    // re-typed in the client, the crawler and the UI can disagree.
    const constants = readFileSync(
      resolve(process.cwd(), "client/src/components/journey/constants.ts"),
      "utf8",
    );
    expect(constants).toContain("JOURNEY_STEPS");
    for (const step of JOURNEY_STEPS) {
      expect(constants, `${step.title} should not be re-typed in the client`).not.toContain(
        `title: "${step.title}"`,
      );
    }
  });

  it("does not pretend the wizard has been filled in", async () => {
    const { html } = await crawl("/journey");
    // No fabricated recommendation, plan or result belongs in a static view of
    // an unanswered form.
    expect(html).not.toMatch(/خطتك جاهزة|النتيجة النهائية|حوضك المقترح/);
  });
});
