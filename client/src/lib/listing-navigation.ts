/**
 * Browse state belongs to a history entry, not to a global /products cache.
 * Install after Wouter has loaded and before React mounts. Wrapping its history
 * methods lets us capture the outgoing DOM BEFORE Wouter notifies React.
 */
export const LISTING_ENTRY_KEY = "__aqListingEntry";
const STORAGE_KEY = "aq_listing_history_v1";
const MAX_SNAPSHOTS = 30;
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type NavigationEntry = Readonly<{
  key: string;
  url: string;
  type: "initial" | "push" | "replace" | "pop";
}>;

export type ListingPosition = {
  y: number;
  anchor?: { id: string; offset: number };
};

type ListingSnapshot = {
  version: 1;
  key: string;
  url: string;
  kind: string;
  savedAt: number;
  state: unknown;
  position: ListingPosition;
};

const listeners = new Set<() => void>();
const beforeNavigation = new Set<() => void>();
const snapshots = new Map<string, ListingSnapshot>();
let currentEntry: NavigationEntry | undefined;
let installed = false;
let sequence = 0;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function currentUrl(): string {
  return typeof window === "undefined" ? "/" : window.location.pathname + window.location.search;
}

function newKey(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${++sequence}`;
}

function stateKey(state: unknown): string | undefined {
  if (!record(state)) return undefined;
  const key = state[LISTING_ENTRY_KEY];
  return typeof key === "string" && key.length <= 100 ? key : undefined;
}

function withKey(state: unknown, key: string, previous?: unknown): Record<string, unknown> {
  return {
    ...(record(previous) ? previous : {}),
    ...(record(state) ? state : {}),
    [LISTING_ENTRY_KEY]: key,
  };
}

function validPosition(value: unknown): value is ListingPosition {
  if (!record(value) || typeof value.y !== "number" || !Number.isFinite(value.y) || value.y < 0) return false;
  if (value.anchor === undefined) return true;
  return record(value.anchor) && typeof value.anchor.id === "string" && value.anchor.id.length <= 300
    && typeof value.anchor.offset === "number" && Number.isFinite(value.anchor.offset);
}

function validSnapshot(value: unknown): value is ListingSnapshot {
  return record(value) && value.version === 1 && typeof value.key === "string"
    && typeof value.url === "string" && typeof value.kind === "string"
    && typeof value.savedAt === "number" && Number.isFinite(value.savedAt)
    && Date.now() - value.savedAt < MAX_AGE_MS && validPosition(value.position);
}

function trimSnapshots(): void {
  for (const [key, snapshot] of snapshots) {
    if (Date.now() - snapshot.savedAt >= MAX_AGE_MS) snapshots.delete(key);
  }
  while (snapshots.size > MAX_SNAPSHOTS) snapshots.delete(snapshots.keys().next().value!);
}

function persistSnapshots(): void {
  trimSnapshots();
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...snapshots.values()]));
  } catch {
    // Private mode, quota limits, or blocked storage: the in-memory copy still works.
  }
}

function captureOutgoing(): void {
  for (const capture of beforeNavigation) {
    try { capture(); } catch { /* Optional restoration must never block navigation. */ }
  }
  persistSnapshots();
}

function publish(): void {
  for (const listener of listeners) listener();
}

export function getNavigationEntry(): NavigationEntry {
  // Isolated component tests and SSR do not run the browser entrypoint.
  currentEntry ??= { key: "initial", url: currentUrl(), type: "initial" };
  return currentEntry;
}

export function subscribeNavigation(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function subscribeBeforeNavigation(capture: () => void): () => void {
  beforeNavigation.add(capture);
  return () => { beforeNavigation.delete(capture); };
}

export function readListingSnapshot(kind: string, entry = getNavigationEntry()): ListingSnapshot | undefined {
  if (entry.type !== "pop" && entry.type !== "initial") return undefined;
  const snapshot = snapshots.get(entry.key);
  return snapshot && validSnapshot(snapshot) && snapshot.url === entry.url && snapshot.kind === kind
    ? snapshot : undefined;
}

export function readListingState<T>(kind: string, validate: (value: unknown) => T | undefined): T | undefined {
  const snapshot = readListingSnapshot(kind);
  if (!snapshot) return undefined;
  try {
    const state = validate(snapshot.state);
    if (state !== undefined) return state;
  } catch { /* Discard invalid state together with its now-unrelated position. */ }
  snapshots.delete(snapshot.key);
  return undefined;
}

export function saveListingSnapshot(
  entry: NavigationEntry, kind: string, state: unknown, position: ListingPosition,
): void {
  if (!validPosition(position)) return;
  snapshots.delete(entry.key);
  snapshots.set(entry.key, { version: 1, key: entry.key, url: entry.url, kind, savedAt: Date.now(), state, position });
  trimSnapshots();
}

export function installListingNavigation(): () => void {
  if (typeof window === "undefined" || installed) return () => undefined;
  installed = true;
  try {
    const stored: unknown = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? "[]");
    if (Array.isArray(stored)) for (const value of stored) if (validSnapshot(value)) snapshots.set(value.key, value);
  } catch { /* Keep navigation working even with corrupt or inaccessible storage. */ }
  trimSnapshots();

  const history = window.history;
  const pushState = history.pushState;
  const replaceState = history.replaceState;
  const previousRestoration = history.scrollRestoration;
  history.scrollRestoration = "manual";
  const initialKey = stateKey(history.state) ?? newKey();
  currentEntry = { key: initialKey, url: currentUrl(), type: "initial" };
  try { replaceState.call(history, withKey(history.state, initialKey), ""); } catch { /* Memory fallback. */ }

  const navigate = (type: "push" | "replace", data: unknown, unused: string, url?: string | URL | null) => {
    const outgoing = getNavigationEntry();
    const nextUrl = url == null ? currentUrl() : (() => {
      const target = new URL(url, window.location.href);
      return target.pathname + target.search;
    })();
    const changesEntry = type === "push" || nextUrl !== outgoing.url;
    if (changesEntry) captureOutgoing();
    const key = type === "push" ? newKey() : outgoing.key;
    // Update before Wouter's wrapped method dispatches its synchronous event.
    if (changesEntry) currentEntry = { key, url: nextUrl, type };
    try {
      (type === "push" ? pushState : replaceState).call(
        history, withKey(data, key, type === "replace" ? history.state : undefined), unused, url,
      );
    } catch (error) {
      currentEntry = outgoing;
      throw error;
    }
    if (changesEntry) publish();
  };

  const wrappedPush: History["pushState"] = (data: unknown, unused, url) => navigate("push", data, unused, url);
  const wrappedReplace: History["replaceState"] = (data: unknown, unused, url) => navigate("replace", data, unused, url);
  history.pushState = wrappedPush;
  history.replaceState = wrappedReplace;

  const onPop = () => {
    captureOutgoing();
    const key = stateKey(history.state) ?? newKey();
    currentEntry = { key, url: currentUrl(), type: "pop" };
    if (!stateKey(history.state)) {
      try { replaceState.call(history, withKey(history.state, key), ""); } catch { /* Memory fallback. */ }
    }
    publish();
  };
  const onVisibility = () => { if (document.visibilityState === "hidden") captureOutgoing(); };
  // Capture phase runs before Wouter's popstate subscriber can replace the DOM.
  window.addEventListener("popstate", onPop, true);
  window.addEventListener("pagehide", captureOutgoing);
  document.addEventListener("visibilitychange", onVisibility);

  return () => {
    captureOutgoing();
    window.removeEventListener("popstate", onPop, true);
    window.removeEventListener("pagehide", captureOutgoing);
    document.removeEventListener("visibilitychange", onVisibility);
    if (history.pushState === wrappedPush) history.pushState = pushState;
    if (history.replaceState === wrappedReplace) history.replaceState = replaceState;
    history.scrollRestoration = previousRestoration;
    installed = false;
    currentEntry = undefined;
    snapshots.clear();
  };
}
