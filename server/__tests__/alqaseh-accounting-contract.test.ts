import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

const migrationPath = "migrations/20260825_alqaseh_online_accounting.sql";

describe("Al-Qaseh accounting contract", () => {
  it("routes verified Al-Qaseh deliveries to bank custody and a capture event", () => {
    const sql = read(migrationPath);

    expect(sql).toContain("FROM public.payments");
    expect(sql).toContain("v_payment_method='alqaseh'");
    expect(sql).toContain("v_payment.status,''))<>'completed'");
    expect(sql).toContain("NEW.payment_status,''))<>'paid'");
    expect(sql).toContain("v_payment.amount<>v_gross");
    expect(sql).toContain("v_cash_custody:='bank'");
    expect(sql).toContain("NEW.id,'capture','completed',v_gross,'IQD','alqaseh','alqaseh'");
    expect(sql).toContain("'delivery:'||NEW.id||':alqaseh_capture'");
    expect(sql).toContain("'payment_method','alqaseh'");
  });

  it("preserves COD accounting only for non-online orders", () => {
    const sql = read(migrationPath);

    expect(sql).toContain("ELSE\n    v_event_key:='delivery:'||NEW.id||':cod_received'");
    expect(sql).toContain("NEW.id,'cod_received','completed',v_gross,'IQD','cod'");
    expect(sql).toContain("v_payment_method NOT IN ('cod','cash_on_delivery','cache_on_delivery')");
  });

  it("posts online collections to bank and keeps them out of carrier cash custody", () => {
    const sql = read(migrationPath);

    expect(sql).toContain("f.cash_custody='bank'");
    expect(sql).toContain("VALUES(v_entry_id,v_line,'1010',f.gross_collected,'دفعة إلكترونية محصلة عبر بوابة الدفع'");
    expect(sql).toContain("إثبات بيع مدفوع إلكترونياً عند التسليم");
  });

  it("keeps general dashboard revenue aware of capture events", () => {
    const dashboard = read("server/services/dashboard-truth.ts");
    expect(dashboard).toContain("event_type IN ('capture','cod_received','adjustment')");
  });
});
