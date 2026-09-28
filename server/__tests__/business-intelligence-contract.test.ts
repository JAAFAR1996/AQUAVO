import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

describe("AQUAVO Business Operating System wiring", () => {
  it("ships governed migration and rollback", () => {
    const migration = readFileSync("migrations/0090_business_operating_system.sql", "utf8");
    const rollback = readFileSync("migrations/0090_business_operating_system_rollback.sql", "utf8");
    for (const name of [
      "business_metric_definitions",
      "business_marketing_daily",
      "business_daily_snapshots",
      "business_event_log",
      "business_findings",
    ]) {
      expect(migration).toContain(name);
      expect(rollback).toContain(name);
    }
    expect(migration).toContain("schema_migrations");
  });

  it("keeps legacy costs explicitly reconstructed instead of silently exact", () => {
    const service = readFileSync("server/services/business-intelligence.ts", "utf8");
    expect(service).toContain("opening_inventory_snapshot");
    expect(service).toContain("accounting_order_id IS NOT NULL THEN 'exact' ELSE 'estimated'");
    expect(service).toContain("marketingDataPresent");
    expect(service).toContain("business_marketing_daily");
    expect(service).toContain('day === baghdadDay(-1)');
  });

  it("is protected, mounted, scheduled, visible, and MCP-readable", () => {
    const route = readFileSync("server/routes/business-intelligence.ts", "utf8");
    const routes = readFileSync("server/routes.ts", "utf8");
    const cron = readFileSync("server/routes/cron.ts", "utf8");
    const admin = readFileSync("client/src/pages/admin-dashboard.tsx", "utf8");
    const mcp = readFileSync("server/routes/mcp.ts", "utf8");
    expect(route).toContain("requireAccountingAdmin");
    expect(route).toContain('router.get("/assessment"');
    expect(routes).toContain("/api/admin/business-intelligence");
    expect(cron).toContain("refreshBusinessSnapshot");
    expect(admin).toContain("business-intelligence");
    expect(mcp).toContain("get_business_overview");
    expect(mcp).toContain("get_business_assessment");
  });
});
