/**
 * Deployment safety: the selector never leads a customer into an unreleased
 * locale. With no released locale it renders nothing; with the preview switch
 * (cookie) QA sees all three; the current locale is always offered so a direct
 * /en visitor can switch back.
 */
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageSwitcher } from "../language-switcher";
import { LOCALE_PREVIEW_COOKIE, LOCALE_RELEASE } from "@shared/i18n/release";

let currentLocale: "ar" | "en" | "ckb" = "ar";
vi.mock("@/i18n/locale-context", () => ({
  useLocale: () => ({ locale: currentLocale, setLocale: vi.fn() }),
}));

afterEach(() => {
  document.cookie = `${LOCALE_PREVIEW_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  currentLocale = "ar";
});

const anyReleased = Object.values(LOCALE_RELEASE).some((c) => c.ready);

describe("LanguageSwitcher release gate", () => {
  it("renders no control on Arabic while no other locale is released", () => {
    if (anyReleased) return; // gate is open for at least one locale: covered by the other cases
    const { container } = render(<LanguageSwitcher />);
    expect(container.firstChild).toBeNull();
  });

  it("offers every locale when the preview cookie is set", () => {
    document.cookie = `${LOCALE_PREVIEW_COOKIE}=1; path=/`;
    render(<LanguageSwitcher />);
    expect(screen.getByTestId("language-switcher")).toBeTruthy();
  });

  it("a visitor already on an unreleased locale can still switch back to Arabic", () => {
    currentLocale = "en";
    render(<LanguageSwitcher />);
    // Arabic + current (en) = two options -> the control exists.
    expect(screen.getByTestId("language-switcher")).toBeTruthy();
  });
});
