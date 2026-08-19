import { describe, expect, it } from "vitest";
import {
  DELIVERY_CARE_ISSUE_BUTTON_TEXT,
  DELIVERY_CARE_ISSUE_PAYLOAD,
  DELIVERY_CARE_OK_BUTTON_TEXT,
  DELIVERY_CARE_OK_PAYLOAD,
  getDeliveryCareAutoReplyText,
  resolveDeliveryCareReplyChoice,
} from "../services/whatsapp-delivery-care-contract.js";

describe("WhatsApp delivery-care quick reply contract", () => {
  it("maps the two stable Meta payloads to the intended outcomes", () => {
    expect(resolveDeliveryCareReplyChoice(DELIVERY_CARE_OK_PAYLOAD, "")).toBe("delivered_ok");
    expect(resolveDeliveryCareReplyChoice(DELIVERY_CARE_ISSUE_PAYLOAD, "")).toBe("delivery_issue");
  });

  it("accepts the configured button text as a provider compatibility fallback", () => {
    expect(resolveDeliveryCareReplyChoice("", DELIVERY_CARE_OK_BUTTON_TEXT)).toBe("delivered_ok");
    expect(resolveDeliveryCareReplyChoice("", DELIVERY_CARE_ISSUE_BUTTON_TEXT)).toBe("delivery_issue");
  });

  it("does not turn arbitrary customer text into an automation trigger", () => {
    expect(resolveDeliveryCareReplyChoice("unknown", "مرحبا")).toBeNull();
  });

  it("keeps the approved automatic response copy exact", () => {
    expect(getDeliveryCareAutoReplyText("delivered_ok")).toBe(
      "تتهنى بطلبك أستاذ، وإذا احتجت أي مساعدة بأي منتج، دزلنا بأي وقت.",
    );
    expect(getDeliveryCareAutoReplyText("delivery_issue")).toBe(
      "أكيد أستاذ، كللنا شنو الملاحظة بالطلب حتى نتابعها وياك.",
    );
  });
});
