import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHash, timingSafeEqual } from "node:crypto";

const EXPECTED_TOKEN_SHA256 = "860519fa11d0e563c14a2791abfa011363fed9081d741d506e872e403c0fe2fd";

function tokenMatches(value: unknown): boolean {
  const token = typeof value === "string" ? value : "";
  const actual = createHash("sha256").update(token).digest();
  const expected = Buffer.from(EXPECTED_TOKEN_SHA256, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (!tokenMatches(req.query.token)) return res.status(404).json({ error: "Not found" });

  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) return res.status(503).json({ error: "CRON_SECRET_MISSING" });

  try {
    const upstream = await fetch("https://www.aquavoiq.com/api/cron/customer-messaging", {
      method: "GET",
      headers: { Authorization: `Bearer ${cronSecret}` },
      signal: AbortSignal.timeout(55_000),
    });
    const body = await upstream.text();
    res.status(upstream.status);
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json");
    return res.send(body);
  } catch {
    return res.status(502).json({ error: "WORKER_INVOCATION_FAILED" });
  }
}
