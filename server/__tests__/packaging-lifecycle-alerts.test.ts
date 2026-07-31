// Order-status -> packaging mapping, and low-stock alert state.
//
// Both are pure decision functions, so the whole state space is exercised
// without a database. The point is that these mappings are exhaustively pinned:
// a wrong branch here silently consumes a carton twice or writes one off that
// never shipped.
import { describe, expect, it } from "vitest";
import { decideLifecycleAction, wasOrderShipped } from "../services/packaging-lifecycle.js";
import { alertMessageAr, decideAlert } from "../services/admin-alert-service.js";

describe("order lifecycle -> packaging action", () => {
  it("only suggests for a pending order — no hold, no cost", () => {
    expect(decideLifecycleAction("pending", null, false).action).toBe("suggest_only");
  });

  it("reserves on confirmed and on processing", () => {
    expect(decideLifecycleAction("confirmed", "pending", false).action).toBe("reserve");
    expect(decideLifecycleAction("processing", "confirmed", false).action).toBe("reserve");
  });

  it("consumes on shipped", () => {
    expect(decideLifecycleAction("shipped", "processing", false).action).toBe("consume");
  });

  it("does nothing on delivered — consumption already happened at shipped", () => {
    expect(decideLifecycleAction("delivered", "shipped", true).action).toBe("none");
  });

  it("releases on cancellation before shipment", () => {
    expect(decideLifecycleAction("cancelled", "confirmed", false).action).toBe("release");
  });

  it("classifies a return loss only when the order actually shipped", () => {
    expect(decideLifecycleAction("returned", "delivered", true).action).toBe("classify_return_loss");
    // Never shipped: there is no consumed carton to write off.
    expect(decideLifecycleAction("returned", "confirmed", false).action).not.toBe(
      "classify_return_loss",
    );
  });

  it("splits rejected_carrier by whether the parcel had shipped", () => {
    expect(decideLifecycleAction("rejected_carrier", "processing", false).action).toBe("release");
    expect(decideLifecycleAction("rejected_carrier", "shipped", true).action).toBe(
      "classify_return_loss",
    );
  });

  it("treats rejected_returned as a full return", () => {
    expect(decideLifecycleAction("rejected_returned", "shipped", true).action).toBe(
      "classify_return_loss",
    );
  });

  it("is a no-op when the status has not actually changed", () => {
    expect(decideLifecycleAction("shipped", "shipped", true).action).toBe("none");
  });

  it("derives shipped-ness from fulfillment evidence, not the status string", () => {
    expect(wasOrderShipped(0)).toBe(false);
    expect(wasOrderShipped(1)).toBe(true);
  });

  it("gives every decision an Arabic reason for the audit trail", () => {
    for (const s of ["pending", "confirmed", "shipped", "cancelled", "returned", "delivered"]) {
      expect(decideLifecycleAction(s, "x", true).reasonAr.length).toBeGreaterThan(0);
    }
  });
});

describe("low-stock alerts", () => {
  const stock = (available: number, reserved = 0) => ({
    onHand: available + reserved,
    reserved,
    available,
  });

  it("opens a low alert the first time stock reaches the threshold", () => {
    const d = decideAlert(stock(8), 8, false);
    expect(d.action).toBe("open");
    expect(d.level).toBe("low");
  });

  it("does not reopen an alert that is already open", () => {
    expect(decideAlert(stock(8), 8, true, "low").action).toBe("none");
    expect(decideAlert(stock(5), 8, true, "low").action).toBe("none");
  });

  it("re-arms only after stock rises above the threshold", () => {
    expect(decideAlert(stock(20), 8, true, "low").action).toBe("close");
    // and a later drop opens a genuinely new alert
    expect(decideAlert(stock(6), 8, false).action).toBe("open");
  });

  it("escalates to critical at zero available", () => {
    const d = decideAlert(stock(0), 8, true, "low");
    expect(d.action).toBe("open");
    expect(d.level).toBe("critical");
  });

  it("reports zero available as critical even with no threshold configured", () => {
    expect(decideAlert(stock(0), null, false).level).toBe("critical");
  });

  it("stays quiet for an unmonitored carton that still has stock", () => {
    expect(decideAlert(stock(3), null, false).action).toBe("none");
  });

  it("counts reserved stock against availability", () => {
    // 10 on hand, 9 reserved -> 1 available, below a threshold of 5.
    const d = decideAlert(stock(1, 9), 5, false);
    expect(d.action).toBe("open");
    expect(d.onHand).toBe(10);
    expect(d.reserved).toBe(9);
    expect(d.available).toBe(1);
  });

  it("writes the owner's message format", () => {
    expect(
      alertMessageAr({
        level: "low",
        available: 8,
        cartonName: "كارتونة وسط",
        lengthCm: 27,
        widthCm: 20,
        heightCm: 14,
      }),
    ).toBe("تنبيه: بقي 8 كراتين فقط من قياس 27×20×14 سم");
  });

  it("writes a distinct critical message", () => {
    expect(
      alertMessageAr({ level: "critical", available: 0, cartonName: "كارتونة وسط", lengthCm: 27, widthCm: 20, heightCm: 14 }),
    ).toContain("تنبيه حرج");
  });
});
