import { describe, expect, it } from "vitest";
import { sanitizeAlWaseetProviderMessage } from "../services/alwaseet-tracking-runtime.js";

describe("Al-Waseet provider diagnostics", () => {
  it("keeps a short provider error message useful", () => {
    expect(sanitizeAlWaseetProviderMessage("لا تملك صلاحية عرض الطلبات")).toBe("لا تملك صلاحية عرض الطلبات");
  });

  it("redacts token, phone, email, URL and long numeric identifiers", () => {
    const value = sanitizeAlWaseetProviderMessage(
      "token=@@abcdefghijklmnopqrstuvwx phone +9647701234567 email user@example.com https://example.com/path order 123456789",
    );

    expect(value).not.toContain("abcdefghijklmnopqrstuvwx");
    expect(value).not.toContain("7701234567");
    expect(value).not.toContain("user@example.com");
    expect(value).not.toContain("https://");
    expect(value).not.toContain("123456789");
    expect(value).toContain("[redacted]");
    expect(value).toContain("[phone]");
    expect(value).toContain("[email]");
    expect(value).toContain("[url]");
  });
});
