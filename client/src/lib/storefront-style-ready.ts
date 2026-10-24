/** Preserve styles for interactive states and routes before the first React commit. */
export function waitForStorefrontStyles(): Promise<void> {
  const links = document.querySelectorAll<HTMLLinkElement>("link[data-aq-deferred-style]");
  return Promise.all(Array.from(links, (link) => new Promise<void>((resolve) => {
    const ready = () => {
      link.media = "all";
      link.removeEventListener("load", ready);
      link.removeEventListener("error", ready);
      resolve();
    };
    // Cached responses may finish before this module evaluates. A failed CSS
    // request must not indefinitely prevent the application's error recovery.
    if (link.sheet || link.dataset.aqStyleReady) { ready(); return; }
    link.addEventListener("load", ready, { once: true });
    link.addEventListener("error", ready, { once: true });
  }))).then(() => undefined);
}
