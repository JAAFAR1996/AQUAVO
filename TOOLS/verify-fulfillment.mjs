#!/usr/bin/env node
// Independent, READ-ONLY fulfillment integrity check against any database.
//
//   DATABASE_URL=postgres://... node tools/verify-fulfillment.mjs
//
// Issues SELECTs only — it never writes, so it is safe to point at a read-only
// connection, a Neon child branch, or a production read replica. Exits 0 when
// every invariant holds, 1 when a CRITICAL invariant is violated.
//
// The output contains identifiers and counts only; no customer PII is ever read.
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { register } = require("tsx/esm/api");
register();

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required. Refusing to guess a connection.");
  process.exit(2);
}

const { Pool, neonConfig } = await import("@neondatabase/serverless");
const { drizzle } = await import("drizzle-orm/neon-serverless");
const ws = (await import("ws")).default;
neonConfig.webSocketConstructor = ws;

const schema = await import("../shared/schema.ts");
const { verifyFulfillmentIntegrity, formatVerificationReport } =
  await import("../server/services/fulfillment-verifier.ts");

const pool = new Pool({ connectionString: url.replace(/[&?]channel_binding=require/g, "") });
const db = drizzle(pool, { schema });

try {
  const report = await verifyFulfillmentIntegrity(db);
  console.log(formatVerificationReport(report));
  process.exitCode = report.ok ? 0 : 1;
} finally {
  await pool.end();
}
