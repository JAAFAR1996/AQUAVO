import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import i18next from "i18next";
import type toolsLocale from "@/locales/ar/tools.json";
import { AccountEmailVerification } from "./account-email-verification";

type VerificationLabel = keyof (typeof toolsLocale)["fish-breeding-calculator"]["emailVerification"];
const label = (name: VerificationLabel) => i18next.t(`tools:fish-breeding-calculator.emailVerification.${name}`);
const json = (body: object, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("explicit account email confirmation", () => {
  it("only reads on opening, then sends and confirms on separate clicks without sending the plan", async () => {
    const verified = vi.fn();
    vi.mocked(fetch).mockResolvedValueOnce(json({ verified: false }))
      .mockResolvedValueOnce(json({ verified: false, retryAfterSeconds: 60 }))
      .mockResolvedValueOnce(json({ verified: true }));
    render(<AccountEmailVerification email="owner@example.test" onVerified={verified} />);
    const send = await screen.findByRole("button", { name: label("sendCode") });
    expect(fetch).toHaveBeenCalledTimes(1); expect(vi.mocked(fetch).mock.calls[0][1]?.method).toBe("GET");
    expect(verified).not.toHaveBeenCalledWith("owner@example.test");
    fireEvent.click(send);
    const input = await screen.findByLabelText(label("codeLabel"));
    const confirm = screen.getByRole("button", { name: label("confirm") });
    fireEvent.change(input, { target: { value: "١٢٣٤٥٦٧" } }); expect(confirm).toBeDisabled();
    fireEvent.change(input, { target: { value: "١٢٣٤٥٦٧٨" } }); expect(input).toHaveValue("12345678");
    fireEvent.click(confirm);
    await screen.findByText(label("verified"));
    expect(verified).toHaveBeenCalledWith("owner@example.test");
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(vi.mocked(fetch).mock.calls[1][1]).toMatchObject({ method: "POST", body: "{}", credentials: "include" });
    expect(vi.mocked(fetch).mock.calls[2][1]).toMatchObject({ method: "POST", body: '{"code":"12345678"}' });
    expect(vi.mocked(fetch).mock.calls.every(call => String(call[0]).includes("/verification"))).toBe(true);
  });

  it("shows failed sending without success or a confirmation input", async () => {
    const verified = vi.fn();
    vi.mocked(fetch).mockResolvedValueOnce(json({ verified: false })).mockResolvedValueOnce(json({ message: "PRIVATE_PROVIDER_ERROR" }, 503));
    render(<AccountEmailVerification email="owner@example.test" onVerified={verified} />);
    fireEvent.click(await screen.findByRole("button", { name: label("sendCode") }));
    await screen.findByRole("alert");
    expect(screen.getByRole("alert")).toHaveTextContent(label("unavailable"));
    expect(screen.queryByLabelText(label("codeLabel"))).not.toBeInTheDocument();
    expect(screen.queryByText(/PRIVATE_PROVIDER_ERROR/)).not.toBeInTheDocument();
    expect(verified).not.toHaveBeenCalledWith("owner@example.test");
  });

  it("checks an already verified account without sending and revokes stale UI state on an email change", async () => {
    const verified = vi.fn();
    vi.mocked(fetch).mockResolvedValueOnce(json({ verified: true })).mockResolvedValueOnce(json({ verified: false }));
    const view = render(<AccountEmailVerification email="owner@example.test" onVerified={verified} />);
    await screen.findByText(label("verified")); expect(verified).toHaveBeenLastCalledWith("owner@example.test");
    view.rerender(<AccountEmailVerification email="replacement@example.test" onVerified={verified} />);
    await screen.findByRole("button", { name: label("sendCode") });
    await waitFor(() => expect(verified).toHaveBeenLastCalledWith(null));
    expect(vi.mocked(fetch).mock.calls.every(call => call[1]?.method === "GET")).toBe(true);
  });

  it("restores an unexpired code entry after reopening without requesting another email", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(json({ verified: false, codePending: true, retryAfterSeconds: 35 }));
    render(<AccountEmailVerification email="owner@example.test" onVerified={vi.fn()} />);
    await screen.findByLabelText(label("codeLabel"));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetch).mock.calls[0][1]?.method).toBe("GET");
    expect(screen.getByRole("button", { name: i18next.t("tools:fish-breeding-calculator.emailVerification.resendIn", { seconds: 35 }) })).toBeDisabled();
  });
});
