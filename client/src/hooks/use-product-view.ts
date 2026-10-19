import { useEffect, useRef } from "react";
import { recordProductView } from "@/lib/api";
import { getClientSessionId } from "@/lib/client-session";
import { isTrackingAllowed } from "@/lib/tracking-environment";

/** Record a loaded product page when its tab is visible, independently of data fetching. */
export function useProductView(productId: string | undefined): void {
  const recordedProducts = useRef(new Set<string>());

  useEffect(() => {
    if (!productId || !isTrackingAllowed()) return;

    const recordVisibleView = () => {
      if (document.visibilityState !== "visible" || recordedProducts.current.has(productId)) return;

      const clientSessionId = getClientSessionId();
      if (clientSessionId === "cs_unavailable" || !/^cs_[A-Za-z0-9_]{1,64}$/.test(clientSessionId)) return;

      // React effect replays, stock refreshes and tab focus must not add votes.
      // The server's 30-day ranking also deduplicates by product and session.
      recordedProducts.current.add(productId);
      void recordProductView(productId, clientSessionId).catch(() => {
        // Permit another attempt when the shopper next makes the tab visible.
        recordedProducts.current.delete(productId);
      });
    };

    recordVisibleView();
    document.addEventListener("visibilitychange", recordVisibleView);
    return () => document.removeEventListener("visibilitychange", recordVisibleView);
  }, [productId]);
}
