(() => {
  const currentScript = document.currentScript;
  const src = currentScript && currentScript.getAttribute("data-entry");
  if (!src) return;

  let loaded = false;

  const load = () => {
    if (loaded) return;
    loaded = true;

    const script = document.createElement("script");
    script.type = "module";
    script.crossOrigin = "anonymous";
    script.src = src;
    document.head.appendChild(script);
  };

  const schedule = () => {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(load, { timeout: 1200 });
      return;
    }

    window.setTimeout(load, 1200);
  };

  window.setTimeout(schedule, 1800);
  ["pointerdown", "keydown", "touchstart"].forEach((eventName) => {
    window.addEventListener(eventName, load, { once: true, passive: true });
  });
})();
