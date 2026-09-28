import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "migrations/0091_retire_legacy_logistics_event_bus.sql"),
  "utf8",
);

describe("0091 legacy logistics event guard", () => {
  it("requires the lifecycle migration before guarding old runtimes", () => {
    expect(migration).toContain("0091_REQUIRES_ACTIVE_0090");
    expect(migration).toContain("0090_customer_lifecycle_integrity");
  });

  it("fails new legacy logistics events closed at the database boundary", () => {
    expect(migration).toContain("BEFORE INSERT OR UPDATE OF event_type,status");
    expect(migration).toContain("NEW.event_type='new_order_received'");
    expect(migration).toContain("NEW.status='pending'");
    expect(migration).toContain("LEGACY_LOGISTICS_CONSUMER_RETIRED_2026_09_28");
  });

  it("also closes any backlog produced by an old deployment", () => {
    expect(migration).toContain("UPDATE public.event_bus");
    expect(migration).toContain("WHERE event_type='new_order_received'");
  });
});
