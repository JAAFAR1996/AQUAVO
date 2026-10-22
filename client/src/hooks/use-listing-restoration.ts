import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  getNavigationEntry,
  readListingSnapshot,
  saveListingSnapshot,
  subscribeBeforeNavigation,
  subscribeNavigation,
  type ListingPosition,
} from "@/lib/listing-navigation";

type ListingRestorationOptions = {
  kind: "products" | "search";
  state: unknown;
  ready: boolean;
  contentKey: string;
};

const ITEM_SELECTOR = "[data-listing-item]";
const SCROLL_KEYS = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " ", "Enter"]);

function items(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(ITEM_SELECTOR));
}

function capturePosition(container: HTMLElement | null, preferredId?: string): ListingPosition {
  const y = Math.max(0, window.scrollY);
  const visibleItems = container ? items(container).filter(item => {
    const rect = item.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < window.innerHeight;
  }) : [];
  const anchor = visibleItems.find(item => item.dataset.listingItem === preferredId) ?? visibleItems[0];
  const id = anchor?.dataset.listingItem;
  return id && anchor ? { y, anchor: { id, offset: anchor.getBoundingClientRect().top } } : { y };
}

/** Restore only a returning history entry, after its actual results have rendered. */
export function useListingRestoration({ kind, state, ready, contentKey }: ListingRestorationOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const entry = useSyncExternalStore(subscribeNavigation, getNavigationEntry, getNavigationEntry);
  const [snapshot] = useState(() => readListingSnapshot(kind, entry));
  const [isRestoring, setIsRestoring] = useState(Boolean(snapshot));
  const pendingRef = useRef(Boolean(snapshot));
  const stateRef = useRef(state);
  const stopAttemptRef = useRef<() => void>(() => undefined);
  const preferredRef = useRef<{ id: string; at: number } | undefined>(undefined);

  useLayoutEffect(() => { stateRef.current = state; }, [state]);

  useLayoutEffect(() => {
    const capture = () => {
      // A second navigation while results are still loading must not replace
      // the saved destination with the loading screen's zero scroll offset.
      const preferred = preferredRef.current;
      const position = pendingRef.current && snapshot
        ? snapshot.position
        : capturePosition(containerRef.current, preferred && Date.now() - preferred.at < 1500 ? preferred.id : undefined);
      saveListingSnapshot(entry, kind, stateRef.current, position);
    };
    const unsubscribe = subscribeBeforeNavigation(capture);
    const container = containerRef.current;
    const rememberClickedItem = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>(ITEM_SELECTOR) : null;
      const id = target?.dataset.listingItem;
      if (id) preferredRef.current = { id, at: Date.now() };
    };
    container?.addEventListener("click", rememberClickedItem, true);
    return () => {
      unsubscribe();
      container?.removeEventListener("click", rememberClickedItem, true);
    };
  }, [entry, kind, snapshot]);

  useLayoutEffect(() => {
    if (!snapshot) return;
    const cancel = () => {
      if (!pendingRef.current) return;
      pendingRef.current = false;
      stopAttemptRef.current();
      setIsRestoring(false);
    };
    const onKeyDown = (event: KeyboardEvent) => { if (SCROLL_KEYS.has(event.key)) cancel(); };
    // User intent always wins, including a swipe or filter change while the
    // returning page is waiting for a slow request.
    window.addEventListener("wheel", cancel, { passive: true });
    window.addEventListener("touchmove", cancel, { passive: true });
    window.addEventListener("pointerdown", cancel, true);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("wheel", cancel);
      window.removeEventListener("touchmove", cancel);
      window.removeEventListener("pointerdown", cancel, true);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [snapshot]);

  useLayoutEffect(() => {
    if (!snapshot || !ready || !pendingRef.current) return;
    let active = true;
    let frame = 0;
    let stableFrames = 0;
    let previousTarget: number | undefined;
    let observer: ResizeObserver | undefined;
    let deadline = 0;

    const stop = () => {
      active = false;
      window.cancelAnimationFrame(frame);
      window.clearTimeout(deadline);
      observer?.disconnect();
      window.removeEventListener("resize", schedule);
    };
    const finish = () => {
      stop();
      pendingRef.current = false;
      setIsRestoring(false);
    };
    const attempt = (lastAttempt = false) => {
      frame = 0;
      if (!active || !pendingRef.current) return;
      const container = containerRef.current;
      if (!container) {
        if (lastAttempt) finish();
        return;
      }
      const anchor = snapshot.position.anchor;
      const element = anchor ? items(container).find(item => item.dataset.listingItem === anchor.id) : undefined;
      const desired = Math.max(0, element && anchor
        ? window.scrollY + element.getBoundingClientRect().top - anchor.offset
        : snapshot.position.y);
      const maxScroll = Math.max(0,
        Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) - window.innerHeight);
      const target = Math.min(desired, maxScroll);
      if (Math.abs(window.scrollY - target) > 1) window.scrollTo({ top: target, left: 0, behavior: "instant" });
      const reached = Math.abs(window.scrollY - target) <= 2;
      stableFrames = reached && previousTarget !== undefined && Math.abs(previousTarget - target) <= 1
        ? stableFrames + 1 : 0;
      previousTarget = target;
      if (lastAttempt || (reached && stableFrames >= 2 && desired <= maxScroll + 2 && document.fonts?.status !== "loading")) {
        finish();
      } else if (desired <= maxScroll + 2 && document.fonts?.status !== "loading") {
        schedule();
      }
      // An initially short document is retried by ResizeObserver, not by a
      // fixed delay that assumes images, fonts and results are already ready.
    };
    function schedule() {
      if (active && !frame) frame = window.requestAnimationFrame(() => attempt());
    }

    stopAttemptRef.current = stop;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(schedule);
      if (containerRef.current) observer.observe(containerRef.current);
      observer.observe(document.body);
    }
    window.addEventListener("resize", schedule);
    void document.fonts?.ready.then(schedule);
    // If an item was removed or the viewport changed, settle at the closest
    // available position instead of keeping automatic loading blocked forever.
    deadline = window.setTimeout(() => attempt(true), 5000);
    attempt();
    return stop;
  }, [snapshot, ready, contentKey]);

  return { containerRef, isRestoring };
}
