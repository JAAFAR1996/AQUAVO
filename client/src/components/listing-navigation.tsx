import { Fragment, useLayoutEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { splitLocaleFromPath } from "@shared/i18n/locales";
import { getNavigationEntry, readListingSnapshot, subscribeNavigation } from "@/lib/listing-navigation";

/** Each visit owns its own local filters, even when two entries share a URL. */
export function ListingNavigationBoundary({ children }: { children: ReactNode }) {
  const entry = useSyncExternalStore(subscribeNavigation, getNavigationEntry, getNavigationEntry);
  // A replace updates the same visit (for example the shareable food filter).
  // A push always gets a fresh key, including a push to the same URL.
  return <Fragment key={entry.key}>{children}</Fragment>;
}

/** One owner for route scroll behavior, independent of page-view analytics. */
export function NavigationScrollReset() {
  const entry = useSyncExternalStore(subscribeNavigation, getNavigationEntry, getNavigationEntry);
  const previousRef = useRef(entry);
  useLayoutEffect(() => {
    const previous = previousRef.current;
    previousRef.current = entry;
    if (entry.type === "replace" && previous.key === entry.key
      && previous.url.split("?")[0] === entry.url.split("?")[0]) return;
    const { path } = splitLocaleFromPath(entry.url.split("?")[0]);
    const kind = path === "/products" ? "products" : path === "/search" ? "search" : undefined;
    if (kind && readListingSnapshot(kind, entry)) return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [entry]);
  return null;
}
