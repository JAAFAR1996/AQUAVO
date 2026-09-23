import type { NextFunction, Request, Response } from "express";
import {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_COOKIE_NAME,
  LOCALE_HEADER_NAME,
  parseLocale,
  type Locale,
} from "../../shared/i18n/locales.js";

declare global {
  namespace Express {
    interface Request {
      /** Resolved customer locale for this request. Always a supported locale. */
      locale: Locale;
    }
  }
}

function cookieValue(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

/**
 * Resolve the request locale. Precedence: explicit `?locale=` query,
 * `X-Locale` header (sent by the storefront on every call), the `aq_locale`
 * cookie (an explicit past choice), then Arabic. `Accept-Language` is
 * deliberately not consulted: it is a hint for a first-visit banner at most,
 * never a reason to answer in a language the customer did not pick.
 */
export function resolveRequestLocale(req: Pick<Request, "query" | "headers">): Locale {
  const fromQuery = parseLocale(typeof req.query?.locale === "string" ? req.query.locale : undefined);
  if (fromQuery) return fromQuery;
  const headerRaw = req.headers[LOCALE_HEADER_NAME];
  const fromHeader = parseLocale(Array.isArray(headerRaw) ? headerRaw[0] : headerRaw);
  if (fromHeader) return fromHeader;
  const fromCookie = parseLocale(cookieValue(req.headers.cookie, LOCALE_COOKIE_NAME));
  if (fromCookie) return fromCookie;
  return DEFAULT_LOCALE;
}

export function localeMiddleware(req: Request, res: Response, next: NextFunction): void {
  req.locale = resolveRequestLocale(req);
  res.setHeader("Content-Language", LOCALES[req.locale].languageTag);
  // API JSON is never CDN-cached today, but make the dependency explicit so a
  // future cache layer can never hand an English payload to an Arabic request.
  res.vary(LOCALE_HEADER_NAME);
  res.vary("Cookie");
  next();
}
