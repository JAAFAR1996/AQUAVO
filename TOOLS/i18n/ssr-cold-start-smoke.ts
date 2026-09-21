/**
 * Runtime smoke test for the low-memory Vercel SSR function.
 *
 * Run after pnpm run build so api/_html-template.js has been generated.
 * DATABASE_URL is deliberately removed: static locale routes must cold-start
 * and render without a database connection.
 */
delete process.env.DATABASE_URL;

type MockResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  setHeader(name: string, value: unknown): MockResponse;
  status(code: number): MockResponse;
  send(value: unknown): MockResponse;
  end(value?: unknown): MockResponse;
};

function mockResponse(): MockResponse {
  return {
    statusCode: 200,
    headers: {},
    body: "",
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = String(value);
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    send(value) {
      this.body = String(value ?? "");
      return this;
    },
    end(value) {
      if (value !== undefined) this.body = String(value);
      return this;
    },
  };
}

const beforeImport = process.memoryUsage().heapUsed;
const { default: handler } = await import("../../api/ssr-meta.js");
const afterImport = process.memoryUsage().heapUsed;

const cases = [
  ["/", "ar"],
  ["/en", "en"],
  ["/ckb", "ckb"],
  ["/products", "ar"],
  ["/en/products", "en"],
  ["/ckb/products", "ckb"],
] as const;

for (const [url, locale] of cases) {
  const req = { url, headers: { accept: "text/html" } } as any;
  const res = mockResponse();
  await handler(req, res as any);

  if (res.statusCode !== 200) {
    throw new Error(`${url}: expected HTTP 200, got ${res.statusCode}`);
  }
  if (/Server Error|FUNCTION_INVOCATION_FAILED/i.test(res.body)) {
    throw new Error(`${url}: SSR returned a runtime failure marker`);
  }
  if (!/<html\b|<!doctype\b/i.test(res.body)) {
    throw new Error(`${url}: SSR did not return an HTML document`);
  }
  if (res.headers["content-language"] !== locale) {
    throw new Error(
      `${url}: expected Content-Language ${locale}, got ${res.headers["content-language"] ?? "<missing>"}`,
    );
  }
}

const afterRequests = process.memoryUsage().heapUsed;
const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1);
console.log(
  `SSR cold-start smoke passed: import heap ${mb(beforeImport)} -> ${mb(afterImport)} MiB; after locale requests ${mb(afterRequests)} MiB`,
);
