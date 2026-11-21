import { lazy } from "react";
import { i18next, loadLocaleNamespaces, type DeferredArabicNamespace } from "./index";
import { DEFAULT_LOCALE, parseLocale } from "@shared/i18n/locales";

/** Keep module-level translations and Arabic fallback ready before evaluation. */
type LazyComponent = Awaited<ReturnType<Parameters<typeof lazy>[0]>>["default"];

export function lazyWithTranslations<Component extends LazyComponent>(
  namespaces: readonly DeferredArabicNamespace[],
  load: () => Promise<{ default: Component }>,
) {
  return lazy(async () => {
    await loadLocaleNamespaces(parseLocale(i18next.language) ?? DEFAULT_LOCALE, namespaces);
    return load();
  });
}
