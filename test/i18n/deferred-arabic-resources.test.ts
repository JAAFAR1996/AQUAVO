import { beforeEach, describe, expect, it, vi } from "vitest";

// Use an independent runtime: the general component-test setup intentionally
// preloads every dictionary and would conceal a broken first navigation.
vi.mock("i18next", async (original) => {
  const actual = await original<typeof import("i18next")>();
  return { ...actual, default: actual.createInstance() };
});

const { i18next, loadArabicNamespaces, bootstrapI18n, loadLocaleNamespaces } = await import("../../client/src/i18n");

beforeEach(async () => {
  i18next.removeResourceBundle("ar", "guides");
  i18next.removeResourceBundle("ar", "tools");
  i18next.removeResourceBundle("en", "tools");
  i18next.removeResourceBundle("en", "guides");
  i18next.removeResourceBundle("ckb", "tools");
  i18next.removeResourceBundle("ckb", "guides");
  await i18next.changeLanguage("ar");
  vi.restoreAllMocks();
});

describe("Arabic dictionaries at feature boundaries", () => {
  it.each(["en", "ckb"] as const)("defers feature namespaces for %s and registers them before module evaluation", async (locale) => {
    await bootstrapI18n(locale);
    expect(i18next.language).toBe(locale);
    expect(i18next.hasResourceBundle(locale, "home")).toBe(true);
    expect(i18next.hasResourceBundle(locale, "tools")).toBe(false);
    expect(i18next.hasResourceBundle(locale, "guides")).toBe(false);
    await loadLocaleNamespaces(locale, ["tools"]);
    expect(i18next.hasResourceBundle(locale, "tools")).toBe(true);
    expect(i18next.hasResourceBundle("ar", "tools")).toBe(true);
    expect(i18next.hasResourceBundle(locale, "guides")).toBe(false);
    expect(i18next.t("tools:VisualAnalyzer.s1")).not.toBe("VisualAnalyzer.s1");
  });
  it("keeps home copy ready without downloading guides or tools", () => {
    expect(i18next.hasResourceBundle("ar", "home")).toBe(true);
    expect(i18next.t("home:hero.title")).not.toBe("hero.title");
    expect(i18next.hasResourceBundle("ar", "guides")).toBe(false);
    expect(i18next.hasResourceBundle("ar", "tools")).toBe(false);
  });

  it("loads the complete original dictionary once for concurrent consumers", async () => {
    const registered = vi.spyOn(i18next, "addResourceBundle");
    await Promise.all([loadArabicNamespaces(["guides"]), loadArabicNamespaces(["guides"])]);
    const { default: source } = await import("../../client/src/locales/ar/guides.json");
    expect(i18next.getResourceBundle("ar", "guides")).toEqual(source);
    expect(registered).toHaveBeenCalledTimes(1);
    expect(i18next.hasResourceBundle("ar", "tools")).toBe(false);
  });

  it("retains active-language copy while making Arabic fallback available", async () => {
    i18next.addResourceBundle("en", "tools", { "VisualAnalyzer": { s1: "Translated label" } });
    await i18next.changeLanguage("en");
    await loadArabicNamespaces(["tools"]);
    const { default: source } = await import("../../client/src/locales/ar/tools.json");
    expect(i18next.language).toBe("en");
    expect(i18next.t("tools:VisualAnalyzer.s1")).toBe("Translated label");
    expect(i18next.t("tools:VisualAnalyzer.s2")).toBe(source.VisualAnalyzer.s2);
  });

  it("does not cache a rejected load as a successful registration", async () => {
    const register = vi.spyOn(i18next, "addResourceBundle");
    register.mockImplementationOnce(() => { throw new Error("registration interrupted"); });
    await expect(loadArabicNamespaces(["tools"])).rejects.toThrow("registration interrupted");
    expect(i18next.hasResourceBundle("ar", "tools")).toBe(false);
    await loadArabicNamespaces(["tools"]);
    expect(i18next.hasResourceBundle("ar", "tools")).toBe(true);
  });
});
