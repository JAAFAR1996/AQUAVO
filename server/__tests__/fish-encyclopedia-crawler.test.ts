import type { VercelRequest, VercelResponse } from "@vercel/node";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * /fish-encyclopedia showed a visitor ~1,680 words of real species data and a
 * crawler 17. The page reads /api/fish at runtime, which is backed by the
 * fish_species table, so nothing was in the crawler HTML.
 *
 * A build-time static render was tried and rejected: with no data it produces
 * "أكثر من 0 نوع" — a literal zero count — which would publish something untrue.
 * The crawler route instead queries the same table the API reads, at request
 * time, so the species a crawler sees are the species the app serves and future
 * rows propagate on their own.
 *
 * These tests pin both halves: real data renders, and an empty or failing query
 * degrades to the honest summary rather than announcing zero species.
 */

const QUERY = vi.fn();
vi.mock("@neondatabase/serverless", () => ({
  neonConfig: {},
  Pool: class {
    query = QUERY;
  },
}));

process.env.DATABASE_URL ??= "postgres://user:pass@localhost:5432/db";

const SPECIES = [
  {
    id: "neon-tetra",
    commonName: "Neon Tetra",
    arabicName: "تترا نيون",
    scientificName: "Paracheirodon innesi",
    family: "Characidae",
    origin: "أمريكا الجنوبية",
    temperament: "peaceful",
    careLevel: "beginner",
    minTankSize: 40,
    description: "سمكة صغيرة مسالمة تعيش في مجموعات وتحتاج ماء لين ومستقر.",
  },
  {
    id: "betta",
    commonName: "Betta",
    arabicName: "بيتا",
    scientificName: "Betta splendens",
    family: "Osphronemidae",
    origin: "جنوب شرق آسيا",
    temperament: "semi-aggressive",
    careLevel: "beginner",
    minTankSize: 20,
    description: "ذكر البيتا لا يتحمل ذكراً آخر في نفس الحوض.",
  },
];

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

function substantiveWords(html: string): number {
  const body = html.split("</head>")[1] ?? html;
  const main = body.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  return (main ? main[1] : body)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean).length;
}

afterEach(() => QUERY.mockReset());

describe("/fish-encyclopedia serves crawlers the real species data", () => {
  it("renders the species the database actually holds", async () => {
    QUERY.mockResolvedValue({ rows: SPECIES });
    const { html, status } = await crawl("/fish-encyclopedia");
    expect(status).toBe(200);
    for (const fish of SPECIES) {
      expect(html, `missing ${fish.arabicName}`).toContain(fish.arabicName);
      expect(html, `missing ${fish.scientificName}`).toContain(fish.scientificName);
    }
    expect(substantiveWords(html)).toBeGreaterThan(60);
  });

  it("takes the count from the data rather than stating one", async () => {
    QUERY.mockResolvedValue({ rows: SPECIES });
    const { html } = await crawl("/fish-encyclopedia");
    // The count must be derived from the rows, not written into the template.
    expect(html).toContain(`تضم الموسوعة ${SPECIES.length} نوعاً`);
    // The rejected static render published "أكثر من 0 نوع".
    expect(html).not.toMatch(/أكثر من\s*0\s*نوع/);
    expect(html).not.toMatch(/\b0\s*نوع/);
  });

  it("never announces zero species when the table is empty", async () => {
    QUERY.mockResolvedValue({ rows: [] });
    const { html, status } = await crawl("/fish-encyclopedia");
    expect(status).toBe(200);
    expect(html).not.toMatch(/\b0\s*نوع/);
    expect(html).not.toMatch(/أكثر من\s*0/);
    // Falls back to the honest summary rather than an empty list.
    expect(html).toContain("موسوعة أسماك الزينة");
  });

  it("degrades to the summary when the query fails", async () => {
    QUERY.mockRejectedValue(new Error("connection refused"));
    const { html, status } = await crawl("/fish-encyclopedia");
    expect(status).toBe(200);
    expect(html).toContain("موسوعة أسماك الزينة");
    expect(html).not.toMatch(/\b0\s*نوع/);
  });

  it("keeps the page honest about not selling live fish", async () => {
    QUERY.mockResolvedValue({ rows: SPECIES });
    const { html } = await crawl("/fish-encyclopedia");
    // AQUAVO sells equipment, not animals. An encyclopedia listing species must
    // not read as a catalogue: no price, no add-to-cart, no availability.
    expect(html).not.toMatch(/د\.ع|السعر|أضف إلى السلة|متوفر للبيع/);
  });

  it("leaves unknown routes on their 404", async () => {
    QUERY.mockResolvedValue({ rows: [] });
    const { status } = await crawl("/not-a-real-page-at-all");
    expect(status).toBe(404);
  });
});
