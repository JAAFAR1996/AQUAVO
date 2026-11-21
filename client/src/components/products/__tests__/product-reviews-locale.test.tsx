import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { bootstrapI18n, i18next } from "@/i18n";
import { LOCALES, type Locale } from "@shared/i18n/locales";
import { ProductReviews } from "../product-reviews";

const localeState = vi.hoisted(() => ({ locale: "ar" as "ar" | "en" | "ckb" }));
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/i18n/locale-context", () => ({
  useLocale: () => ({ locale: localeState.locale, dir: LOCALES[localeState.locale].dir, intl: LOCALES[localeState.locale].intl }),
}));

const reviewDate = "2026-11-20T12:00:00Z";
afterEach(async () => {
  cleanup();
  vi.unstubAllGlobals();
  localeState.locale = "ar";
  await bootstrapI18n("ar");
});

describe("review interface locale", () => {
  it.each(["ar", "en", "ckb"] as Locale[])("uses %s labels, direction and date formatting without translating the customer text", async locale => {
    localeState.locale = locale;
    await bootstrapI18n(locale);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify([{
      id: "review-fixture", author: "Fixture Customer", rating: 5,
      comment: "Original customer text", createdAt: reviewDate,
    }]), { status: 200, headers: { "Content-Type": "application/json" } })));
    const { container } = render(<ProductReviews productId="fixture-product" productName="Fixture Product" />);
    expect(await screen.findByText("Original customer text")).toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute("dir", LOCALES[locale].dir);
    expect(container.querySelector("#guest-name")).toHaveAttribute("dir", LOCALES[locale].dir);
    expect(container.querySelector("#review-title")).toHaveAttribute("dir", LOCALES[locale].dir);
    expect(container.querySelector("#review-comment")).toHaveAttribute("dir", LOCALES[locale].dir);
    expect(screen.getByRole("button", { name: i18next.t("pages:product-reviews.s1") })).toBeInTheDocument();
    const expectedDate = new Date(reviewDate).toLocaleDateString(LOCALES[locale].intl, { year: "numeric", month: "long", day: "numeric" });
    expect(screen.getByText(expectedDate)).toBeInTheDocument();
  });
});
