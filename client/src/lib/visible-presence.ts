type PresenceCallbacks = {
  enter: () => void;
  heartbeat: () => void;
  leave: () => void;
};

/** Keep presence alive only while this route's document is visible and active. */
export function startVisiblePresence(callbacks: PresenceCallbacks): () => void {
  let enterTimer: number | undefined;
  let heartbeatTimer: number | undefined;
  let active = false;
  let pageActive = true;
  let disposed = false;

  const canSend = () =>
    !disposed && pageActive && document.visibilityState === "visible";

  const stop = () => {
    const wasActive = active;
    active = false;
    window.clearTimeout(enterTimer);
    window.clearInterval(heartbeatTimer);
    enterTimer = undefined;
    heartbeatTimer = undefined;
    if (wasActive) callbacks.leave();
  };

  const start = () => {
    if (!canSend() || active) return;
    active = true;

    // Preserve the existing enter debounce and heartbeat cadence.
    enterTimer = window.setTimeout(() => {
      enterTimer = undefined;
      if (active && canSend()) callbacks.enter();
    }, 300);
    heartbeatTimer = window.setInterval(() => {
      // Also guard queued callbacks if the browser's lifecycle event is delayed.
      if (!canSend()) {
        stop();
        return;
      }
      if (active) callbacks.heartbeat();
    }, 20_000);
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === "visible") start();
    else stop();
  };
  const onPageHide = () => {
    // A page retained in the back/forward cache must pause too.
    pageActive = false;
    stop();
  };
  const onPageShow = () => {
    pageActive = true;
    start();
  };

  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("pagehide", onPageHide);
  window.addEventListener("pageshow", onPageShow);
  start();

  return () => {
    disposed = true;
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("pagehide", onPageHide);
    window.removeEventListener("pageshow", onPageShow);
    stop();
  };
}
