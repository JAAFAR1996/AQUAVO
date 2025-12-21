/// <reference types="vite/client" />

type RawEnv = ImportMetaEnv & {
  VITE_SITE_URL?: string;
  VITE_R2_PUBLIC_URL?: string;
  VITE_PLAUSIBLE_DOMAIN?: string;
  VITE_PLAUSIBLE_SCRIPT_URL?: string;
  VITE_PWA_ENABLED?: string | boolean;
  VITE_SHOW_INSTALL_PROMPT?: string | boolean;
  VITE_OFFLINE_MODE_ENABLED?: string | boolean;
  VITE_AR_MODEL_URL?: string;
};

const rawEnv: RawEnv = import.meta.env;

const parseBoolean = (value: string | boolean | undefined, defaultValue = false) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return defaultValue;
};

const trimOrEmpty = (value?: string) => (value ?? "").trim();

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, "");

export const clientEnv = {
  siteUrl:
    trimOrEmpty(rawEnv.VITE_SITE_URL) ||
    (typeof window !== "undefined" ? window.location.origin : ""),
  r2PublicUrl: trimOrEmpty(rawEnv.VITE_R2_PUBLIC_URL),
  plausible: {
    domain: trimOrEmpty(rawEnv.VITE_PLAUSIBLE_DOMAIN),
    scriptUrl: trimOrEmpty(rawEnv.VITE_PLAUSIBLE_SCRIPT_URL),
  },
  pwa: {
    enabled: parseBoolean(rawEnv.VITE_PWA_ENABLED, false),
    showInstallPrompt: parseBoolean(rawEnv.VITE_SHOW_INSTALL_PROMPT, false),
    offlineModeEnabled: parseBoolean(rawEnv.VITE_OFFLINE_MODE_ENABLED, false),
  },
  arModelUrl: trimOrEmpty(rawEnv.VITE_AR_MODEL_URL),
};

export function buildApiUrl(path: string): string {
  // Always use relative paths in the browser (client-side) to ensure we hit the same origin
  // This behaves better with cookies/sessions and proxies (e.g. Vercel)
  if (typeof window !== "undefined") {
    return path;
  }

  const base = clientEnv.siteUrl ? normalizeBaseUrl(clientEnv.siteUrl) : "";
  if (!base || /^https?:\/\//i.test(path)) {
    return path;
  }
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}

export function resolveAssetUrl(path: string): string {
  if (!path) return path;
  if (/^(https?:)?\/\//i.test(path) || path.startsWith("data:")) return path;
  if (clientEnv.r2PublicUrl) {
    const base = normalizeBaseUrl(clientEnv.r2PublicUrl);
    return `${base}/${path.replace(/^\//, "")}`;
  }
  return path;
}

let initialized = false;

export function initializeClientEnvSideEffects() {
  if (initialized) return;
  initialized = true;

  if (typeof document !== "undefined") {
    document.documentElement.dataset.pwaOffline = String(clientEnv.pwa.offlineModeEnabled);
    document.documentElement.dataset.showInstallPrompt = String(clientEnv.pwa.showInstallPrompt);
  }

  if (
    typeof document !== "undefined" &&
    clientEnv.plausible.domain &&
    clientEnv.plausible.scriptUrl
  ) {
    const script = document.createElement("script");
    script.defer = true;
    script.setAttribute("data-domain", clientEnv.plausible.domain);
    script.src = clientEnv.plausible.scriptUrl;
    document.head.appendChild(script);
  }

  if (typeof navigator !== "undefined" && "serviceWorker" in navigator && clientEnv.pwa.enabled) {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Swallow errors if service worker is not present; optional feature.
    });
  }
}
