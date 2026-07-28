/**
 * AUTO ORDER PROCESSOR — quarantine guard.
 *
 * `AutoOrderProcessor.processScheduledOrders()` is legacy code that cannot
 * work: it inserts `priceAtTime` and `totalAmount`, neither of which is a
 * column (`price_at_purchase` / `total` are), omits the NOT NULL `total_price`,
 * writes no cost snapshot at all, and uses `db.insert` outside a transaction so
 * a partial failure would leave orphan rows.
 *
 * It was quarantined by an earlier fix. This file proves the quarantine is
 * still airtight, because "it's disabled" is a claim that decays silently.
 *
 * It is NOT a third production order path and must never be reported as one.
 * Active paths: storefront checkout, and manual/WhatsApp invoices.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");
const source = read("server/services/auto-order-processor.ts");

describe("auto order processor stays quarantined", () => {
  it("throws when invoked, rather than silently doing nothing", async () => {
    const { AutoOrderProcessor } = await import("../services/auto-order-processor.js");
    await expect(new AutoOrderProcessor().processScheduledOrders()).rejects.toThrow(/QUARANTINED/);
  });

  it("the quarantine is unconditional — no flag, env var or argument reopens it", () => {
    const body = source.slice(source.indexOf("async processScheduledOrders"));
    const upToThrow = body.slice(0, body.indexOf("QUARANTINED") + 40);
    // A conditional guard could be bypassed by config. The throw must be the
    // first thing the method does.
    expect(upToThrow).not.toMatch(/process\.env/);
    expect(upToThrow).not.toMatch(/featureFlag|isEnabled|allowAuto/i);
    expect(upToThrow).toMatch(/throw new Error/);
  });

  it("is not reachable from any route, scheduler, queue or cron", () => {
    // Wiring it anywhere would let broken inserts reach production.
    for (const file of [
      "server/routes.ts",
      "server/index.ts",
      "server/routes/ai-advanced.ts",
    ]) {
      let src = "";
      try { src = read(file); } catch { continue; }
      expect(src, `${file} must not call processScheduledOrders`)
        .not.toMatch(/processScheduledOrders\s*\(/);
    }
  });

  it("no cron/scheduler registration mentions it", () => {
    // server/cron is the scheduler surface; a registration here would run it
    // without any route being involved.
    const cronFiles = ["server/cron/index.ts", "server/cron.ts"];
    for (const f of cronFiles) {
      let src = "";
      try { src = read(f); } catch { continue; }
      expect(src).not.toMatch(/processScheduledOrders/);
    }
  });

  it("still carries the deprecation marker explaining WHY", () => {
    // If someone deletes the explanation, the next reader may "fix" the throw.
    expect(source).toMatch(/@deprecated\s+QUARANTINED/);
  });
});
