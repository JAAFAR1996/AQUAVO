import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

type MockResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  status(code: number): MockResponse;
  setHeader(name: string, value: string | number | readonly string[]): MockResponse;
  send(value: unknown): MockResponse;
  end(value?: unknown): MockResponse;
};

function createResponse(): MockResponse {
  return {
    statusCode: 200,
    headers: {},
    body: "",
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = Array.isArray(value) ? value.join(", ") : String(value);
      return this;
    },
    send(value) {
      this.body = typeof value === "string" ? value : JSON.stringify(value);
      return this;
    },
    end(value) {
      if (value !== undefined) this.body = typeof value === "string" ? value : JSON.stringify(value);
      return this;
    },
  };
}

async function invoke(
  handler: (req: any, res: any) => Promise<void>,
  url: string,
  host = "seo-runtime-smoke.vercel.app",
) {
  const response = createResponse();
  await handler(
    {
      url,
      method: "GET",
      headers: {
        host,
        "x-forwarded-host": host,
        accept: "text/html",
      },
      query: {},
      cookies: {},
    },
    response,
  );
  return response;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const runtimePath = resolve(process.cwd(), "generated/ssr-preview-runtime.js");
assert(existsSync(runtimePath), "Generated semantic runtime does not exist; run pnpm build first");

const runtimeUrl = `${pathToFileURL(runtimePath).href}?smoke=${Date.now()}`;
const runtime = await import(runtimeUrl);
assert(typeof runtime.default === "function", "Generated semantic runtime has no default handler");

const guide = await invoke(runtime.default, "/guides/filter-choice");
assert(guide.statusCode === 200, `Guide smoke route returned ${guide.statusCode}`);
assert(guide.headers["x-aquavo-ssr-mode"] === "guide-content-v3", "Guide did not use semantic v3 runtime");
assert(guide.headers["x-robots-tag"]?.includes("noindex"), "Preview guide is not protected with noindex");
assert(guide.body.includes("<h1>"), "Guide initial HTML has no H1");
assert(guide.body.includes("اختيار الفلتر"), "Guide initial HTML is missing answer content");
assert(guide.body.includes('rel="canonical"'), "Guide initial HTML has no canonical");

const missing = await invoke(runtime.default, "/__aquavo_missing_runtime_smoke__");
assert(missing.statusCode === 404, `Missing route returned ${missing.statusCode}, expected 404`);
assert(missing.headers["x-aquavo-ssr-mode"] === "semantic-404-v3", "Missing route did not use semantic 404 runtime");
assert(missing.headers["x-robots-tag"] === "noindex, follow", "Missing route robots header is incorrect");
assert(!missing.body.includes('rel="canonical"'), "Missing route contains a canonical link");
assert(!missing.body.includes("application/ld+json"), "Missing route contains structured data");

const legacyGuide = await invoke(runtime.default, "/guides/aquarium-filter-guide");
assert(legacyGuide.statusCode === 308, `Legacy guide returned ${legacyGuide.statusCode}, expected 308`);
assert(legacyGuide.headers.location === "/guides/filter-choice", "Legacy guide redirect target is incorrect");

const productionEntryPath = resolve(process.cwd(), "api/ssr-preview.ts");
assert(existsSync(productionEntryPath), "Production SSR entry does not exist");
const entryUrl = `${pathToFileURL(productionEntryPath).href}?entry-smoke=${Date.now()}`;
const productionEntry = await import(entryUrl);
assert(typeof productionEntry.default === "function", "Production entry has no default handler");

const previousVercelEnv = process.env.VERCEL_ENV;
process.env.VERCEL_ENV = "production";
try {
  const duplicateHost = await invoke(
    productionEntry.default,
    "/products/houyi-stainless-shunt?variant=4-port",
    "aquavo.vercel.app",
  );
  assert(duplicateHost.statusCode === 308, `Duplicate production host returned ${duplicateHost.statusCode}`);
  assert(
    duplicateHost.headers.location === "https://www.aquavoiq.com/products/houyi-stainless-shunt?variant=4-port",
    "Duplicate production host did not preserve the canonical path and query",
  );
  assert(duplicateHost.headers["x-robots-tag"] === "noindex, follow", "Duplicate host redirect robots header is incorrect");

  const canonicalHost = await invoke(
    productionEntry.default,
    "/guides/filter-choice",
    "www.aquavoiq.com",
  );
  assert(canonicalHost.statusCode === 200, `Canonical production host returned ${canonicalHost.statusCode}`);
  assert(canonicalHost.headers["x-robots-tag"]?.startsWith("index"), "Canonical production host is not indexable");
  assert(canonicalHost.headers["last-modified"] === "Tue, 04 Aug 2026 00:00:00 GMT", "Canonical response has no release freshness header");
} finally {
  if (previousVercelEnv === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = previousVercelEnv;
}

console.log("Generated semantic SSR runtime and canonical-host smoke checks passed.");
