import { describe, expect, it } from "vitest";
import {
  hasRealIssueNote,
  matchAlWaseetOrder,
  normalizeArabicText,
  normalizeIraqPhone,
  parseAlWaseetOrder,
  type AquavoTrackingOrder,
  type AlWaseetOrder,
} from "../services/alwaseet-tracking.js";

function local(overrides: Partial<AquavoTrackingOrder> = {}): AquavoTrackingOrder {
  return {
    id: "aquavo-1",
    orderNumber: "FH-260817-ABC123",
    customerPhone: "0770 123 4567",
    customerName: "أحمد علي",
    total: "24750",
    roundedTotal: "25000",
    createdAt: new Date("2026-08-17T10:00:00+03:00"),
    ...overrides,
  };
}

function provider(overrides: Partial<AlWaseetOrder> = {}): AlWaseetOrder {
  return {
    id: "waseet-1",
    qrId: "38799216",
    clientName: "أحمد علي",
    clientMobile: "+9647701234567",
    clientMobile2: "",
    price: 25000,
    statusId: "1",
    status: "تم الاستلام من قبل المندوب",
    merchantNotes: "",
    issueNotes: "",
    createdAt: new Date("2026-08-17T12:00:00+03:00"),
    updatedAt: new Date("2026-08-17T12:15:00+03:00"),
    ...overrides,
  };
}

describe("normalizeIraqPhone", () => {
  it.each([
    ["07701234567", "9647701234567"],
    ["+9647701234567", "9647701234567"],
    ["009647701234567", "9647701234567"],
    ["7701234567", "9647701234567"],
    ["٠٧٧٠١٢٣٤٥٦٧", "9647701234567"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeIraqPhone(input)).toBe(expected);
  });
});

describe("provider text semantics", () => {
  it("normalizes Persian Arabic glyph variants used in Waseet examples", () => {
    expect(normalizeArabicText("لا یوجد")).toBe("لا يوجد");
  });

  it.each(["", "لا يوجد", "لا یوجد", "لا توجد", "-", "none", "N/A", "0"])(
    "does not flag a no-issue sentinel: %s",
    (value) => {
      expect(hasRealIssueNote(value)).toBe(false);
    },
  );

  it("flags an actual driver issue note", () => {
    expect(hasRealIssueNote("الزبون لا يجيب على الهاتف")).toBe(true);
  });
});

describe("parseAlWaseetOrder", () => {
  it("treats timezone-less provider timestamps as Baghdad local time", () => {
    const parsed = parseAlWaseetOrder({
      id: "44",
      client_mobile: "+9647701234567",
      price: "25000",
      status: "تم الاستلام",
      created_at: "2026-08-17 12:00:00",
      updated_at: "2026-08-17 13:00:00",
    });

    expect(parsed?.createdAt?.toISOString()).toBe("2026-08-17T09:00:00.000Z");
    expect(parsed?.updatedAt?.toISOString()).toBe("2026-08-17T10:00:00.000Z");
  });
});

describe("matchAlWaseetOrder", () => {
  it("auto-links one exact phone + payable amount candidate", () => {
    const match = matchAlWaseetOrder(local(), [provider()]);
    expect(match?.order.id).toBe("waseet-1");
    expect(match?.method).toBe("phone_amount");
    expect(match?.confidence).toBe("exact");
  });

  it("accepts the unrounded local total as an exact payable candidate", () => {
    const match = matchAlWaseetOrder(local(), [provider({ price: 24750 })]);
    expect(match?.order.id).toBe("waseet-1");
    expect(match?.confidence).toBe("exact");
  });

  it("never links a mismatched phone", () => {
    const match = matchAlWaseetOrder(local(), [provider({ clientMobile: "+9647719999999" })]);
    expect(match).toBeNull();
  });

  it("never links a mismatched amount", () => {
    const match = matchAlWaseetOrder(local(), [provider({ price: 26000 })]);
    expect(match).toBeNull();
  });

  it("uses a unique exact normalized name as a high-confidence tie-breaker", () => {
    const match = matchAlWaseetOrder(local(), [
      provider({ id: "waseet-1", clientName: "شخص آخر" }),
      provider({ id: "waseet-2", clientName: "احمد علي" }),
    ]);
    expect(match?.order.id).toBe("waseet-2");
    expect(match?.method).toBe("phone_amount_name");
    expect(match?.confidence).toBe("high");
  });

  it("uses a clearly nearer creation time for a rare duplicate phone + amount", () => {
    const match = matchAlWaseetOrder(local({ customerName: null }), [
      provider({ id: "waseet-1", createdAt: new Date("2026-08-17T12:00:00+03:00") }),
      provider({ id: "waseet-2", createdAt: new Date("2026-08-18T12:00:00+03:00") }),
    ]);
    expect(match?.order.id).toBe("waseet-1");
    expect(match?.method).toBe("phone_amount_nearest_time");
    expect(match?.confidence).toBe("high");
  });

  it("uses nearest time inside repeated exact-name candidates when the lead is clear", () => {
    const match = matchAlWaseetOrder(local(), [
      provider({ id: "waseet-1", clientName: "احمد علي", createdAt: new Date("2026-08-17T12:00:00+03:00") }),
      provider({ id: "waseet-2", clientName: "أحمد علي", createdAt: new Date("2026-08-18T12:00:00+03:00") }),
    ]);
    expect(match?.order.id).toBe("waseet-1");
    expect(match?.method).toBe("phone_amount_name_nearest_time");
    expect(match?.confidence).toBe("high");
  });

  it("stays ambiguous when duplicate candidates are too close in time", () => {
    const match = matchAlWaseetOrder(local({ customerName: null }), [
      provider({ id: "waseet-1", createdAt: new Date("2026-08-17T12:00:00+03:00") }),
      provider({ id: "waseet-2", createdAt: new Date("2026-08-17T14:00:00+03:00") }),
    ]);
    expect(match).toBeNull();
  });

  it("stays ambiguous when a duplicate candidate is missing its creation timestamp", () => {
    const match = matchAlWaseetOrder(local({ customerName: null }), [
      provider({ id: "waseet-1", createdAt: new Date("2026-08-17T12:00:00+03:00") }),
      provider({ id: "waseet-2", createdAt: null }),
    ]);
    expect(match).toBeNull();
  });

  it("does not choose a time-only probable candidate when even the best is too far away", () => {
    const match = matchAlWaseetOrder(local({ customerName: null }), [
      provider({ id: "waseet-1", createdAt: new Date("2026-08-23T12:00:00+03:00") }),
      provider({ id: "waseet-2", createdAt: new Date("2026-08-27T12:00:00+03:00") }),
    ]);
    expect(match).toBeNull();
  });

  it("prefers an exact AQUAVO order number in merchant notes when phone matches", () => {
    const match = matchAlWaseetOrder(local(), [
      provider({ id: "waseet-1", price: 26000, merchantNotes: "طلب FH-260817-ABC123" }),
    ]);
    expect(match?.order.id).toBe("waseet-1");
    expect(match?.method).toBe("order_number_note_phone");
    expect(match?.confidence).toBe("exact");
  });

  it("does not steal a provider order already claimed by another AQUAVO order", () => {
    const match = matchAlWaseetOrder(local(), [provider()], new Set(["waseet-1"]));
    expect(match).toBeNull();
  });

  it("rejects provider orders far outside the discovery window", () => {
    const match = matchAlWaseetOrder(local(), [
      provider({ createdAt: new Date("2026-09-15T12:00:00+03:00") }),
    ]);
    expect(match).toBeNull();
  });
});
