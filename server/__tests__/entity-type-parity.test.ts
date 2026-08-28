import type { VercelRequest, VercelResponse } from "@vercel/node";
import { describe, expect, it, vi } from "vitest";

// The homepage published its site entity as Organization while
// buildEntityStructuredData — which the crawler path and every other browser
// page go through — published it as OnlineStore, both under the same @id
// .../#organization. Google reads one entity from two nodes that disagreed
// about its type, and the homepage, where the entity is most authoritative,
// was the one making the weaker claim.
//
// OnlineStore is a subtype of Organization, so aligning narrows the claim
// rather than widening it, and says nothing the site did not already say on
// every other page.

vi.mock("@neondatabase/serverless", () => ({
  neonConfig: {},
  Pool: vi.fn().mockImplementation(function FakePool() {
    return { query: vi.fn(async () => ({ rows: [] })) };
  }),
}));

process.env.DATABASE_URL ||= "postgres://test-user:test-pass@localhost:5432/test-db";

import handler from "../../api/ssr-meta";
import { buildEntityStructuredData } from "../../api/_seo-structured-data";

async function render(path: string): Promise<string> {
  let body = "";
  const res = {
    setHeader: vi.fn(),
    status: vi.fn(() => res),
    send: vi.fn((value: unknown) => {
      body = String(value);
      return res;
    }),
    end: vi.fn(() => res),
  };
  await handler(
    { url: path, headers: { host: "www.aquavoiq.com", accept: "text/html" } } as unknown as VercelRequest,
    res as unknown as VercelResponse,
  );
  return body;
}

const nodes = (html: string): Record<string, unknown>[] => {
  const out: Record<string, unknown>[] = [];
  for (const [, raw] of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    const parsed = JSON.parse(raw);
    for (const node of Array.isArray(parsed) ? parsed : [parsed]) out.push(node as Record<string, unknown>);
  }
  return out;
};

const ORG_ID = "https://www.aquavoiq.com/#organization";
const orgNodes = (html: string) => nodes(html).filter((n) => n["@id"] === ORG_ID);

describe("one entity, one type", () => {
  it("declares the homepage's site entity as OnlineStore", async () => {
    const found = orgNodes(await render("/"));
    expect(found).toHaveLength(1);
    expect(found[0]["@type"]).toBe("OnlineStore");
  });

  it("agrees with the type the canonical entity builder publishes", async () => {
    const canonical = (buildEntityStructuredData() as Record<string, unknown>[]).find(
      (n) => n["@id"] === ORG_ID,
    );
    expect(canonical, "the canonical builder no longer defines #organization").toBeDefined();
    const homepage = orgNodes(await render("/"))[0];
    expect(homepage["@type"]).toBe(canonical!["@type"]);
  });

  it("still supplies exactly one #organization on the homepage", async () => {
    // The homepage brings its own, so withSiteEntities must not add a second.
    expect(orgNodes(await render("/"))).toHaveLength(1);
  });

  it("keeps every other page agreeing on the same single entity", async () => {
    for (const path of ["/products", "/shipping", "/terms", "/deals"]) {
      const found = orgNodes(await render(path));
      expect(found, `${path} defines ${found.length} #organization nodes`).toHaveLength(1);
      expect(found[0]["@type"], `${path} disagrees on the entity type`).toBe("OnlineStore");
    }
  });
});
