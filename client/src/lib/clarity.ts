const CLARITY_PROJECT_ID = "xex9h97l0y";
const PRODUCTION_ORIGIN = "https://www.aquavoiq.com";
const CLARITY_SCRIPT_ID = "aquavo-clarity";

declare global {
  interface Window {
    clarity?: (...args: unknown[]) => void;
  }
}

let clarityInitialized = false;

function isProductionOrigin() {
  return typeof window !== "undefined" && window.location.origin === PRODUCTION_ORIGIN;
}

export function initClarity() {
  if (clarityInitialized || typeof window === "undefined" || typeof document === "undefined") return;
  if (!isProductionOrigin()) return;

  if (document.getElementById(CLARITY_SCRIPT_ID)) {
    clarityInitialized = true;
    return;
  }

  window.clarity =
    window.clarity ||
    function clarityQueue(...args: unknown[]) {
      ((window.clarity as unknown as { q?: unknown[] }).q =
        (window.clarity as unknown as { q?: unknown[] }).q || []).push(args);
    };

  const script = document.createElement("script");
  script.id = CLARITY_SCRIPT_ID;
  script.type = "text/javascript";
  script.async = true;
  script.src = `https://www.clarity.ms/tag/${CLARITY_PROJECT_ID}`;
  document.head.appendChild(script);

  clarityInitialized = true;
}
