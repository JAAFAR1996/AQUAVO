const CHUNK_RELOAD_KEY = "aq_chunk_reload_at";
const RELOAD_COOLDOWN_MS = 60_000;

const DYNAMIC_IMPORT_PATTERNS = [
  "failed to fetch dynamically imported module",
  "importing a module script failed",
  "error loading dynamically imported module",
  "failed to fetch module script",
  "chunkloaderror",
  "loading chunk",
];

function errorMessage(value: unknown): string {
  if (value instanceof Error) return value.message;
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "message" in value) {
    return String((value as { message?: unknown }).message ?? "");
  }
  return "";
}

export function isDynamicImportError(value: unknown): boolean {
  const message = errorMessage(value).toLowerCase();
  return DYNAMIC_IMPORT_PATTERNS.some((pattern) => message.includes(pattern));
}

function recentlyReloaded(): boolean {
  try {
    const last = Number(window.sessionStorage.getItem(CHUNK_RELOAD_KEY) ?? "0");
    return Number.isFinite(last) && Date.now() - last < RELOAD_COOLDOWN_MS;
  } catch {
    return false;
  }
}

function markReload(): void {
  try {
    window.sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
  } catch {
    // Session storage can be unavailable in private/sandboxed contexts.
  }
}

/**
 * A deploy can remove an old hashed Vite chunk while a user still has the
 * previous application shell open. Reloading once gets the current shell and
 * its new chunk graph. The cooldown prevents a bad network from causing a
 * reload loop.
 */
export function recoverFromDynamicImportError(value: unknown): boolean {
  if (typeof window === "undefined" || !isDynamicImportError(value)) return false;
  if (recentlyReloaded()) return false;

  markReload();
  window.location.reload();
  return true;
}

export function installChunkLoadRecovery(): () => void {
  if (typeof window === "undefined") return () => undefined;

  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    if (recoverFromDynamicImportError(event.reason)) {
      event.preventDefault();
    }
  };

  const onWindowError = (event: ErrorEvent) => {
    const candidate = event.error ?? event.message;
    if (recoverFromDynamicImportError(candidate)) {
      event.preventDefault();
    }
  };

  window.addEventListener("unhandledrejection", onUnhandledRejection);
  window.addEventListener("error", onWindowError);

  return () => {
    window.removeEventListener("unhandledrejection", onUnhandledRejection);
    window.removeEventListener("error", onWindowError);
  };
}
