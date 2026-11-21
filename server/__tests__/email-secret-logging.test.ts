import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const provider = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("resend", () => ({ Resend: class { emails = { send: provider.send }; } }));
import { sendEmail } from "../utils/email.js";

beforeEach(() => {
  vi.stubEnv("RESEND_API_KEY", "synthetic-unused-key");
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
  provider.send.mockReset();
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("secret-bearing email logs", () => {
  it.each(["provider error", "provider exception"])("omits recipient, token and message body from %s logs", async failure => {
    const secret = "12345678 PRIVATE_EMAIL_BODY";
    if (failure === "provider error") provider.send.mockResolvedValue({ error: { message: secret } });
    else provider.send.mockRejectedValue(new Error(secret));
    expect(await sendEmail({ to: "private@example.test", subject: "Verification", text: secret, html: secret, sensitive: true })).toBe(false);
    const logs = JSON.stringify([...vi.mocked(console.error).mock.calls, ...vi.mocked(console.log).mock.calls]);
    expect(logs).not.toMatch(/12345678|PRIVATE_EMAIL_BODY|private@example/);
    expect(provider.send.mock.calls[0][0]).not.toHaveProperty("sensitive");
  });
});
