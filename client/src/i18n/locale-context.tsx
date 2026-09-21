/**
 * Locale provider for the storefront.
 *
 * - Reads the locale from the URL prefix (the URL is the source of truth so
 *   every page is independently addressable and crawlable).
 * - Keeps <html lang dir> in sync so layout direction is semantic, not CSS.
 * - Remembers an explicit choice in a cookie (sent to the API too) and in the
 *   signed-in user's preferences.
 * - Switching locale rewrites only the prefix of the current URL and keeps
 *   query string, React state, cart and session untouched.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Router, useLocation } from "wouter";
import {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_COOKIE_MAX_AGE_SECONDS,
  LOCALE_COOKIE_NAME,
  SUPPORTED_LOCALES,
  localizePath,
  parseLocale,
  splitLocaleFromPath,
  type Locale,
  type TextDirection,
} from "@shared/i18n/locales";
import { bootstrapI18n } from "./index";

export interface LocaleContextValue {
  locale: Locale;
  dir: TextDirection;
  /** Prefix wouter uses as `base`; "" for Arabic. */
  prefix: string;
  /** Build the URL of any logical path in the current locale. */
  href: (logicalPath: string) => string;
  /** Switch language while staying on the same logical page. */
  setLocale: (locale: Locale) => void;
  /** Intl locale string for formatters. */
  intl: string;
  /** True once the active locale's bundles are loaded. */
  ready: boolean;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function readLocaleCookie(): Locale | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE_NAME}=([^;]*)`));
  return match ? parseLocale(decodeURIComponent(match[1])) : null;
}

export function writeLocaleCookie(locale: Locale): void {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; Max-Age=${LOCALE_COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;
}

export function applyDocumentLocale(locale: Locale): void {
  if (typeof document === "undefined") return;
  const def = LOCALES[locale];
  const root = document.documentElement;
  root.setAttribute("lang", locale);
  root.setAttribute("dir", def.dir);
  root.dataset.locale = locale;
  ensureLocaleFonts(locale);
  document.body?.setAttribute("dir", def.dir);
  document.getElementById("root")?.setAttribute("dir", def.dir);
}

/**
 * Cairo, the brand font, lacks five Sorani letters (verified by
 * TOOLS/i18n/check-font-coverage.mjs). Kurdish pages load Vazirmatn on
 * demand; other locales never pay for it.
 */
const KURDISH_FONT_ID = "aq-font-ckb";
const KURDISH_FONT_HREF = "https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;700&display=swap";
export function ensureLocaleFonts(locale: Locale): void {
  if (typeof document === "undefined" || locale !== "ckb") return;
  if (document.getElementById(KURDISH_FONT_ID)) return;
  const link = document.createElement("link");
  link.id = KURDISH_FONT_ID;
  link.rel = "stylesheet";
  link.href = KURDISH_FONT_HREF;
  document.head.appendChild(link);
}

export function currentLocaleFromWindow(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  return splitLocaleFromPath(window.location.pathname).locale;
}

interface ProviderProps {
  children: ReactNode;
  /** Called after the user explicitly picks a language (persist to profile, analytics). */
  onExplicitChange?: (locale: Locale) => void;
}

export function LocaleProvider({ children, onExplicitChange }: ProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(() => currentLocaleFromWindow());
  const [ready, setReady] = useState(false);

  // Bundles for the URL locale were loaded by main.tsx before the app was
  // imported; keep <html lang dir> in sync and mark ready.
  useEffect(() => {
    applyDocumentLocale(locale);
    void bootstrapI18n(locale).then(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Follow the URL (back/forward, in-app navigation across prefixes).
  useEffect(() => {
    const sync = () => {
      const next = currentLocaleFromWindow();
      setLocaleState((prev) => (prev === next ? prev : next));
    };
    window.addEventListener("popstate", sync);
    window.addEventListener("pushState", sync);
    window.addEventListener("replaceState", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("pushState", sync);
      window.removeEventListener("replaceState", sync);
    };
  }, []);

  useEffect(() => {
    applyDocumentLocale(locale);
    void bootstrapI18n(locale).then(() => setReady(true));
  }, [locale]);

  const setLocale = useCallback(
    (next: Locale) => {
      if (!SUPPORTED_LOCALES.includes(next)) return;
      writeLocaleCookie(next);
      onExplicitChange?.(next);
      if (next === locale) return;
      const target = localizePath(window.location.pathname + window.location.search + window.location.hash, next);
      // A full navigation, not pushState: the new locale's bundles must be in
      // place before any module evaluates (module-level copy uses i18next.t),
      // and the URL, query string, cookie session, cart and wishlist storage
      // all survive a navigation. The customer lands on the same logical page.
      window.location.assign(target);
    },
    [locale, onExplicitChange],
  );

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      dir: LOCALES[locale].dir,
      prefix: LOCALES[locale].urlPrefix,
      href: (logicalPath: string) => localizePath(logicalPath, locale),
      setLocale,
      intl: LOCALES[locale].intl,
      ready,
    }),
    [locale, setLocale, ready],
  );

  return (
    <LocaleContext.Provider value={value}>
      <Router base={value.prefix} key={value.prefix}>
        {children}
      </Router>
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    // Tests and isolated renders: behave as Arabic at the root.
    return {
      locale: DEFAULT_LOCALE,
      dir: "rtl",
      prefix: "",
      href: (p) => p,
      setLocale: () => undefined,
      intl: LOCALES[DEFAULT_LOCALE].intl,
      ready: true,
    };
  }
  return ctx;
}

/**
 * Locale-aware absolute navigation for code that cannot go through wouter
 * (window.location.href assignments, history.replaceState with a literal path).
 */
export function useLocalizedNavigate(): (logicalPath: string, options?: { replace?: boolean }) => void {
  const [, navigate] = useLocation();
  return useCallback((logicalPath, options) => navigate(logicalPath, options), [navigate]);
}
