import { lazy } from "react";
import { loadArabicNamespaces, type DeferredArabicNamespace } from "./index";

/** Keep module-level translations and Arabic fallback ready before evaluation. */
type LazyComponent = Awaited<ReturnType<Parameters<typeof lazy>[0]>>["default"];

export function lazyWithTranslations<Component extends LazyComponent>(
  namespaces: readonly DeferredArabicNamespace[],
  load: () => Promise<{ default: Component }>,
) {
  return lazy(async () => {
    await loadArabicNamespaces(namespaces);
    return load();
  });
}
