// Host for the Preview Add-to-Cart concepts (A = Tray, B = Dock).
//
// Listens for the preview add event, coalesces rapid adds into ONE surface
// (never a swarm of clones), auto-dismisses without blocking the page, and
// respects prefers-reduced-motion. Renders nothing when the selected concept is
// "current" — so the live/production experience is completely untouched.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ADD_TO_CART_EVENT,
  FLAG_CHANGE_EVENT,
  getCartConcept,
  isCommerceMotionPreviewHost,
  type AddToCartPreviewDetail,
  type ConceptChoice,
} from "@/lib/commerce-motion/preview-flags";
import { AddToCartTray } from "./add-to-cart-tray";
import { AddToCartDock } from "./add-to-cart-dock";

const DISMISS_MS = 4800;
const EXIT_MS = 320;

export function CommerceMotionOverlay() {
  const [concept, setConcept] = useState<ConceptChoice>("current");
  const [mounted, setMounted] = useState(false); // present in the DOM
  const [leaving, setLeaving] = useState(false); // true → animate out, then unmount
  const [item, setItem] = useState<AddToCartPreviewDetail | null>(null);
  const [addedCount, setAddedCount] = useState(1);
  const [thumbs, setThumbs] = useState<string[]>([]);

  const dismissTimer = useRef<number | null>(null);
  const exitTimer = useRef<number | null>(null);
  const mountedRef = useRef(false);
  mountedRef.current = mounted;

  const clearTimers = useCallback(() => {
    if (dismissTimer.current !== null) { window.clearTimeout(dismissTimer.current); dismissTimer.current = null; }
  }, []);

  const beginExit = useCallback(() => {
    clearTimers();
    setLeaving(true);
    if (exitTimer.current !== null) window.clearTimeout(exitTimer.current);
    exitTimer.current = window.setTimeout(() => setMounted(false), EXIT_MS);
  }, [clearTimers]);

  const armDismiss = useCallback(() => {
    clearTimers();
    dismissTimer.current = window.setTimeout(beginExit, DISMISS_MS);
  }, [clearTimers, beginExit]);

  // Keep the selected concept in sync (panel writes to sessionStorage).
  useEffect(() => {
    if (!isCommerceMotionPreviewHost()) return;
    const sync = () => setConcept(getCartConcept());
    sync();
    window.addEventListener(FLAG_CHANGE_EVENT, sync);
    return () => window.removeEventListener(FLAG_CHANGE_EVENT, sync);
  }, []);

  // Listen for real adds and coalesce into one surface.
  useEffect(() => {
    if (!isCommerceMotionPreviewHost()) return;
    const onAdd = (e: Event) => {
      if (getCartConcept() === "current") return; // production experience: do nothing
      const detail = (e as CustomEvent<AddToCartPreviewDetail>).detail;
      if (!detail) return;
      if (exitTimer.current !== null) { window.clearTimeout(exitTimer.current); exitTimer.current = null; }
      setItem(detail);
      setThumbs((prev) => (detail.image ? [detail.image, ...prev.filter((t) => t !== detail.image)].slice(0, 3) : prev));
      setAddedCount((prev) => (mountedRef.current ? prev + 1 : 1));
      setLeaving(false);
      setMounted(true); // enters immediately on mount (initial → shown)
      armDismiss();
    };
    window.addEventListener(ADD_TO_CART_EVENT, onAdd);
    return () => window.removeEventListener(ADD_TO_CART_EVENT, onAdd);
  }, [armDismiss]);

  useEffect(() => () => {
    clearTimers();
    if (exitTimer.current !== null) window.clearTimeout(exitTimer.current);
  }, [clearTimers]);

  const openCart = useCallback(() => {
    window.dispatchEvent(new CustomEvent("aqv:open-cart"));
    beginExit();
  }, [beginExit]);
  const pause = useCallback(() => clearTimers(), [clearTimers]);
  const resume = useCallback(() => { if (mountedRef.current && !leaving) armDismiss(); }, [armDismiss, leaving]);

  if (!isCommerceMotionPreviewHost() || concept === "current" || !mounted || !item) return null;

  return concept === "A" ? (
    <AddToCartTray
      item={item}
      addedCount={addedCount}
      show={!leaving}
      onViewCart={openCart}
      onContinue={beginExit}
      onPause={pause}
      onResume={resume}
    />
  ) : (
    <AddToCartDock
      item={item}
      thumbs={thumbs}
      addedCount={addedCount}
      show={!leaving}
      onViewCart={openCart}
      onPause={pause}
      onResume={resume}
    />
  );
}
