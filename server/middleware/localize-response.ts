/**
 * Router-level localization of JSON responses.
 *
 * Product and blog routers return the same handful of shapes from many
 * handlers (lists, single records, `variants`, `suggestions`, cached payloads).
 * Rather than remembering to call the localizer in every handler, and in every
 * handler added later, the router installs this once: it wraps `res.json`,
 * finds product / post records in the payload and merges the request locale's
 * translations over them before the bytes leave the process.
 *
 * Arabic requests are untouched (no query, no allocation). Caches inside the
 * handlers keep storing the Arabic payload; localization happens on the way out.
 *
 * `category` is deliberately left as the Arabic canonical string: it is the
 * URL/filter identity. The client renders it through localizeCategoryName().
 */
import type { NextFunction, Request, Response } from "express";
import { DEFAULT_LOCALE, type Locale } from "../../shared/i18n/locales.js";
import { localizeBlogCategories, localizeBlogPosts, localizeProducts } from "../services/content-localizer.js";

type AnyRecord = Record<string, unknown>;

function isRecord(v: unknown): v is AnyRecord {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function looksLikeProduct(v: unknown): v is AnyRecord & { id: string } {
  return isRecord(v) && typeof v.id === "string" && typeof v.slug === "string" && typeof v.name === "string" && "price" in v;
}

function looksLikePost(v: unknown): v is AnyRecord & { id: string } {
  return isRecord(v) && typeof v.id === "string" && typeof v.slug === "string" && typeof v.title === "string" && "excerpt" in v;
}

function looksLikeBlogCategory(v: unknown): v is { id: string; name: string; description?: string | null } {
  return isRecord(v) && typeof v.id === "string" && typeof v.name === "string" && "slug" in v && !("price" in v);
}

async function localizeValue(value: unknown, locale: Locale, missing: Set<string>): Promise<unknown> {
  if (Array.isArray(value)) {
    if (value.length && value.every(looksLikeProduct)) {
      const r = await localizeProducts(value, locale);
      r.missing.forEach((id) => missing.add(id));
      return r.items;
    }
    if (value.length && value.every(looksLikePost)) {
      const r = await localizeBlogPosts(value, locale);
      r.missing.forEach((id) => missing.add(id));
      return r.items;
    }
    if (value.length && value.every(looksLikeBlogCategory)) {
      return localizeBlogCategories(value, locale);
    }
    return Promise.all(value.map((v) => localizeValue(v, locale, missing)));
  }
  if (looksLikeProduct(value)) {
    const r = await localizeProducts([value], locale);
    r.missing.forEach((id) => missing.add(id));
    return r.items[0];
  }
  if (looksLikePost(value)) {
    const r = await localizeBlogPosts([value], locale);
    r.missing.forEach((id) => missing.add(id));
    return r.items[0];
  }
  if (isRecord(value)) {
    const out: AnyRecord = {};
    for (const [k, v] of Object.entries(value)) out[k] = await localizeValue(v, locale, missing);
    return out;
  }
  return value;
}

export function localizeJsonResponses(req: Request, res: Response, next: NextFunction): void {
  const locale = req.locale ?? DEFAULT_LOCALE;
  if (locale === DEFAULT_LOCALE) return next();
  const original = res.json.bind(res);
  res.json = ((body: unknown) => {
    const missing = new Set<string>();
    localizeValue(body, locale, missing)
      .then((localized) => {
        res.setHeader("X-Content-Locale", locale);
        if (missing.size > 0) res.setHeader("X-Translation-Missing", String(missing.size));
        const payload = isRecord(localized) && !Array.isArray(localized) && missing.size > 0
          ? { ...localized, translationMissing: [...missing] }
          : localized;
        original(payload);
      })
      .catch((err) => {
        console.error("[i18n] response localization failed, serving Arabic", err);
        original(body);
      });
    return res;
  }) as Response["json"];
  next();
}
