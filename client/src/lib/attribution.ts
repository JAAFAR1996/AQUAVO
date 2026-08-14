/**
 * ACQUISITION IDENTITY — the durable link from an ad click to a session to (eventually) an order.
 *
 * WHY THIS EXISTS
 * ---------------
 * Growth OS established that AQUAVO can measure spend and delivery but not outcome: attribution
 * coverage sits at 5%, and `capi.mjs` reports NO_JOIN_KEY. The reason is narrower than "fbclid is
 * missing" — a claim that was itself wrong and has been retracted. posthog-js already captures
 * `fbclid`, `gclid` and the UTM set automatically on 599–913 pageviews a month. What does not exist is
 * anything DURABLE that survives the trip from the landing page to the order record.
 *
 * `aq_sid` is that durable thing. It is a random opaque id, minted once per browser and kept in
 * localStorage, carrying no personal data and encoding nothing about the person. It is a join key and
 * only a join key.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO
 * ----------------------------------
 * It does not attempt to attribute anything by itself. Timestamp proximity is not attribution, and a
 * session id that never reaches the order row buys nothing. Writing `aq_sid` onto the order is a
 * production schema change and is prepared separately, awaiting approval — until that lands, this
 * module makes the join POSSIBLE rather than claiming it EXISTS.
 *
 * PRIVACY
 * -------
 * Everything here is campaign metadata and an opaque random id. No phone, no email, no name, no address,
 * no message text, no form input. The storefront's own PII guard doctrine applies: if a value could
 * identify a person, it does not belong in an analytics property.
 */

const SID_KEY = "aq_sid";
const FIRST_TOUCH_KEY = "aq_first_touch";
const LAST_TOUCH_KEY = "aq_last_touch";

/** Campaign parameters worth carrying. All are OUR OWN labels or standard ad-platform click ids. */
const TRACKED_PARAMS = [
  "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
  "fbclid", "gclid", "ttclid", "igshid",
  "aq_campaign_id", "aq_adset_id", "aq_ad_id",
  "aq_creative_id", "aq_concept_id", "aq_hypothesis_id", "aq_experiment_id",
] as const;

type TouchRecord = Record<string, string> & { at?: string };

function safeGet(key: string): string | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
  } catch (_) { return null; }
}

function safeSet(key: string, value: string): void {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
  } catch (_) { /* private mode — degrade to a per-page-load id rather than throwing */ }
}

function randomId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
      const b = new Uint8Array(16);
      crypto.getRandomValues(b);
      return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
    }
  } catch (_) { /* fall through */ }
  // Last resort. Only reached when no crypto source exists at all.
  return `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * The browser's durable acquisition id. Minted on first use and never rotated, because a join key that
 * changes is not a join key.
 */
export function getSessionId(): string {
  const existing = safeGet(SID_KEY);
  if (existing) return existing;
  const fresh = randomId();
  safeSet(SID_KEY, fresh);
  return fresh;
}

/** Campaign parameters present in the current URL, if any. */
function readCurrentTouch(): TouchRecord | null {
  if (typeof window === "undefined") return null;
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(window.location.search);
  } catch (_) { return null; }

  const touch: TouchRecord = {};
  for (const name of TRACKED_PARAMS) {
    const value = params.get(name);
    // Bound the length: a query parameter is attacker-controlled, and an analytics property is not the
    // place to find out how long it can be.
    if (value) touch[name] = value.slice(0, 200);
  }
  if (Object.keys(touch).length === 0) return null;
  touch.at = new Date().toISOString();
  return touch;
}

function readStoredTouch(key: string): TouchRecord | null {
  const raw = safeGet(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as TouchRecord) : null;
  } catch (_) { return null; }
}

/**
 * Record campaign parameters from the current URL. Call once per page load, as early as possible.
 *
 * First touch is written once and never overwritten — it answers "what brought this browser to AQUAVO
 * originally". Last touch is overwritten on every campaign-bearing visit — it answers "what brought
 * them back this time". Keeping both is the difference between crediting the campaign that acquired a
 * customer and the campaign that happened to be last.
 */
export function captureAttributionFromUrl(): void {
  getSessionId(); // ensure the id exists from the very first pageview
  const touch = readCurrentTouch();
  if (!touch) return;
  if (!safeGet(FIRST_TOUCH_KEY)) safeSet(FIRST_TOUCH_KEY, JSON.stringify(touch));
  safeSet(LAST_TOUCH_KEY, JSON.stringify(touch));
}

/**
 * Attribution properties to attach to an analytics event.
 *
 * Flat, snake_cased and prefixed so they are queryable in PostHog without unpacking a nested object.
 * Absent parameters are omitted rather than sent as null, so "we never saw a campaign" and "the
 * campaign was empty" stay distinguishable in the data.
 */
export function attributionProperties(): Record<string, unknown> {
  const props: Record<string, unknown> = { aq_sid: getSessionId() };

  const last = readStoredTouch(LAST_TOUCH_KEY);
  if (last) {
    for (const [k, v] of Object.entries(last)) {
      if (k === "at") { props.attribution_last_touch_at = v; continue; }
      props[k] = v;
    }
  }
  const first = readStoredTouch(FIRST_TOUCH_KEY);
  if (first) {
    if (first.at) props.attribution_first_touch_at = first.at;
    if (first.utm_source) props.first_touch_utm_source = first.utm_source;
    if (first.utm_campaign) props.first_touch_utm_campaign = first.utm_campaign;
    if (first.aq_campaign_id) props.first_touch_aq_campaign_id = first.aq_campaign_id;
  }
  return props;
}

/**
 * The subset that should travel with an ORDER, for the day the order record can carry it.
 *
 * Separate from `attributionProperties()` because an analytics event and a business record have
 * different lifetimes and different review standards: this is the shape the prepared Neon migration
 * expects, and it is intentionally small.
 */
export function orderAttributionPayload(): Record<string, string> {
  const out: Record<string, string> = { aq_sid: getSessionId() };
  const last = readStoredTouch(LAST_TOUCH_KEY);
  const first = readStoredTouch(FIRST_TOUCH_KEY);
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "fbclid",
                     "aq_campaign_id", "aq_adset_id", "aq_ad_id",
                     "aq_creative_id", "aq_concept_id", "aq_hypothesis_id", "aq_experiment_id"]) {
    const v = last?.[key] ?? first?.[key];
    if (v) out[key] = v;
  }
  return out;
}

/** Test seam. Not used by application code. */
export function __resetAttributionForTests(): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(SID_KEY);
      localStorage.removeItem(FIRST_TOUCH_KEY);
      localStorage.removeItem(LAST_TOUCH_KEY);
    }
  } catch (_) { /* ignore */ }
}
