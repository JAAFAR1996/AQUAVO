import { sql } from "drizzle-orm";
import { getDb } from "../db.js";

const PROVIDER = "alwaseet";
const API_BASE = "https://api.alwaseet-iq.net/v1/merchant";
const CACHE_TTL_MS = 2 * 60 * 1000;
const MERCHANT_DISCOVERY_CACHE_MS = 60 * 1000;
const NEGATIVE_DISCOVERY_TTL_MS = 90 * 1000;
const DISCOVERY_BEFORE_MS = 12 * 60 * 60 * 1000;
const DISCOVERY_AFTER_MS = 14 * 24 * 60 * 60 * 1000;
const PROBABLE_TIME_MAX_SCORE_MS = 5 * 24 * 60 * 60 * 1000;
const PROBABLE_TIME_MARGIN_MS = 6 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 5_000;

export interface AquavoTrackingOrder {
  id: string;
  orderNumber: string | null;
  customerPhone: string | null | undefined;
  customerName?: string | null | undefined;
  total: unknown;
  roundedTotal?: unknown;
  createdAt: Date;
}

export interface AlWaseetOrder {
  id: string;
  qrId: string | null;
  clientName: string;
  clientMobile: string;
  clientMobile2: string;
  price: number | null;
  statusId: string | null;
  status: string;
  merchantNotes: string;
  issueNotes: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface PublicCarrierTracking {
  carrier: "الوسيط";
  status: string;
  statusId: string | null;
  hasIssue: boolean;
  providerUpdatedAt: string | null;
  lastSyncedAt: string;
  source: "alwaseet";
}

export type MatchConfidence = "exact" | "high";
export type MatchMethod =
  | "order_number_note_phone"
  | "phone_amount"
  | "phone_amount_name"
  | "phone_amount_nearest_time"
  | "phone_amount_name_nearest_time";

export interface MatchResult {
  order: AlWaseetOrder;
  method: MatchMethod;
  confidence: MatchConfidence;
}

type Row = Record<string, unknown>;
type ApiEnvelope = {
  status?: boolean;
  errNum?: string;
  msg?: string;
  data?: unknown;
};

let cachedToken: string | null = null;
let loginInFlight: Promise<string> | null = null;
let merchantOrdersCache: { fetchedAt: number; orders: AlWaseetOrder[] } | null = null;
let merchantOrdersInFlight: Promise<AlWaseetOrder[]> | null = null;
const negativeDiscoveryCache = new Map<string, number>();

function rowsOf(result: unknown): Row[] {
  if (Array.isArray(result)) return result as Row[];
  const rows = (result as { rows?: Row[] } | null)?.rows;
  return Array.isArray(rows) ? rows : [];
}

function digitsOnly(value: unknown): string {
  const arabicIndic = "٠١٢٣٤٥٦٧٨٩";
  const easternArabic = "۰۱۲۳۴۵۶۷۸۹";
  return String(value ?? "")
    .replace(/[٠-٩]/g, (digit) => String(arabicIndic.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String(easternArabic.indexOf(digit)))
    .replace(/\D/g, "");
}

/** Canonical Iraqi mobile representation: 964 + the 10-digit subscriber number. */
export function normalizeIraqPhone(value: unknown): string | null {
  let digits = digitsOnly(value);
  if (!digits) return null;

  if (digits.startsWith("00964")) digits = digits.slice(2);
  if (digits.startsWith("9640")) digits = `964${digits.slice(4)}`;
  if (digits.startsWith("0") && digits.length === 11) digits = `964${digits.slice(1)}`;
  if (digits.startsWith("7") && digits.length === 10) digits = `964${digits}`;

  return /^9647\d{9}$/.test(digits) ? digits : null;
}

export function normalizeArabicText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("ar-IQ")
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/[ىی]/g, "ي")
    .replace(/ک/g, "ك")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Al-Waseet may return a human-language sentinel in issue_notes when no issue
 * exists. Keep those values out of the public warning flag.
 */
export function hasRealIssueNote(value: unknown): boolean {
  const normalized = normalizeArabicText(value);
  if (!normalized) return false;
  const noIssueSentinels = new Set([
    "لا يوجد",
    "لا توجد",
    "لايوجد",
    "ماكو",
    "بدون",
    "none",
    "no issue",
    "no issues",
    "na",
    "n a",
    "null",
    "0",
  ]);
  return !noIssueSentinels.has(normalized);
}

function toIqd(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(String(value).replace(/,/g, ""));
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed);
}

function parseBaghdadDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  // Al-Waseet examples are timezone-less Iraq-local timestamps. Make that
  // interpretation explicit instead of depending on the server's timezone.
  const simple = raw.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})$/);
  const candidate = simple ? `${simple[1]}T${simple[2]}+03:00` : raw;
  const date = new Date(candidate);
  return Number.isNaN(date.getTime()) ? null : date;
}

function textValue(row: Row, ...keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (value != null) return String(value).trim();
  }
  return "";
}

export function parseAlWaseetOrder(input: unknown): AlWaseetOrder | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const row = input as Row;
  const id = textValue(row, "id");
  if (!id) return null;

  return {
    id,
    qrId: textValue(row, "qr_id") || null,
    clientName: textValue(row, "client_name"),
    clientMobile: textValue(row, "client_mobile", "mobile"),
    clientMobile2: textValue(row, "client_mobile2", "mobile2"),
    price: toIqd(row.price),
    statusId: textValue(row, "status_id") || null,
    status: textValue(row, "status") || "حالة الشحنة قيد التحديث",
    merchantNotes: textValue(row, "merchant_notes"),
    issueNotes: textValue(row, "issue_notes"),
    createdAt: parseBaghdadDate(row.created_at ?? row.merchant_created_at),
    updatedAt: parseBaghdadDate(row.updated_at),
  };
}

function providerPhones(order: AlWaseetOrder): string[] {
  return [normalizeIraqPhone(order.clientMobile), normalizeIraqPhone(order.clientMobile2)]
    .filter((value): value is string => Boolean(value));
}

function payableAmounts(order: AquavoTrackingOrder): Set<number> {
  // AQUAVO total includes delivery; roundedTotal is the actual COD after Iraqi
  // denomination rounding/cashback when that flow applies. Exact values only.
  const values = [toIqd(order.roundedTotal), toIqd(order.total)]
    .filter((value): value is number => value != null);
  return new Set(values);
}

function isWithinDiscoveryWindow(localCreatedAt: Date, providerCreatedAt: Date | null): boolean {
  if (!providerCreatedAt) return true;
  const delta = providerCreatedAt.getTime() - localCreatedAt.getTime();
  return delta >= -DISCOVERY_BEFORE_MS && delta <= DISCOVERY_AFTER_MS;
}

function notesContainOrderNumber(notes: string, orderNumber: string | null): boolean {
  if (!orderNumber || !notes) return false;
  return normalizeArabicText(notes).includes(normalizeArabicText(orderNumber));
}

/**
 * Provider records are normally created after the AQUAVO order. A small
 * pre-order window remains allowed for clock/data quirks, but those candidates
 * receive a penalty when resolving a rare duplicate.
 */
function temporalMatchScore(localCreatedAt: Date, providerCreatedAt: Date): number {
  const delta = providerCreatedAt.getTime() - localCreatedAt.getTime();
  return delta >= 0 ? delta : DISCOVERY_BEFORE_MS + Math.abs(delta);
}

/**
 * Resolve a rare same-phone/same-COD collision only when timing creates a clear
 * winner. Missing timestamps or a small lead are intentionally left ambiguous.
 */
function chooseClearNearestByTime(
  localCreatedAt: Date,
  candidates: AlWaseetOrder[],
): AlWaseetOrder | null {
  if (candidates.length < 2 || candidates.some((candidate) => !candidate.createdAt)) return null;

  const ranked = candidates
    .map((candidate) => ({
      candidate,
      score: temporalMatchScore(localCreatedAt, candidate.createdAt as Date),
    }))
    .sort((a, b) => a.score - b.score);

  const best = ranked[0];
  const runnerUp = ranked[1];
  if (!best || !runnerUp) return null;
  if (best.score > PROBABLE_TIME_MAX_SCORE_MS) return null;
  if (runnerUp.score - best.score < PROBABLE_TIME_MARGIN_MS) return null;
  return best.candidate;
}

/**
 * Match policy:
 * - explicit AQUAVO order number + exact phone is exact;
 * - one exact phone + COD candidate is exact;
 * - duplicate phone + COD candidates may be linked as high confidence using an
 *   exact normalized name or a clearly separated nearest creation time;
 * - if those signals still cannot distinguish the records, do not guess.
 */
export function matchAlWaseetOrder(
  local: AquavoTrackingOrder,
  providerOrders: AlWaseetOrder[],
  claimedProviderIds: ReadonlySet<string> = new Set(),
): MatchResult | null {
  const phone = normalizeIraqPhone(local.customerPhone);
  if (!phone) return null;

  const eligible = providerOrders.filter((provider) =>
    !claimedProviderIds.has(provider.id)
    && providerPhones(provider).includes(phone)
    && isWithinDiscoveryWindow(local.createdAt, provider.createdAt),
  );

  const noteMatches = eligible.filter((provider) => notesContainOrderNumber(provider.merchantNotes, local.orderNumber));
  if (noteMatches.length === 1) {
    return {
      order: noteMatches[0],
      method: "order_number_note_phone",
      confidence: "exact",
    };
  }
  if (noteMatches.length > 1) return null;

  const amounts = payableAmounts(local);
  if (amounts.size === 0) return null;

  const exact = eligible.filter((provider) => provider.price != null && amounts.has(provider.price));
  if (exact.length === 1) {
    return {
      order: exact[0],
      method: "phone_amount",
      confidence: "exact",
    };
  }
  if (exact.length === 0) return null;

  const localName = normalizeArabicText(local.customerName);
  const nameMatches = localName
    ? exact.filter((provider) => normalizeArabicText(provider.clientName) === localName)
    : [];

  if (nameMatches.length === 1) {
    return {
      order: nameMatches[0],
      method: "phone_amount_name",
      confidence: "high",
    };
  }

  const timingPool = nameMatches.length > 1 ? nameMatches : exact;
  const nearest = chooseClearNearestByTime(local.createdAt, timingPool);
  if (!nearest) return null;

  return {
    order: nearest,
    method: nameMatches.length > 1
      ? "phone_amount_name_nearest_time"
      : "phone_amount_nearest_time",
    confidence: "high",
  };
}

function trackingEnabled(): boolean {
  return process.env.ALWASEET_TRACKING_ENABLED?.trim().toLowerCase() === "true"
    && Boolean(process.env.ALWASEET_USERNAME?.trim())
    && Boolean(process.env.ALWASEET_PASSWORD?.trim());
}

async function fetchEnvelope(url: URL, init?: RequestInit): Promise<{ httpStatus: number; body: ApiEnvelope }> {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  let body: ApiEnvelope = {};
  try {
    body = await response.json() as ApiEnvelope;
  } catch {
    throw new Error("ALWASEET_INVALID_JSON");
  }
  return { httpStatus: response.status, body };
}

async function login(): Promise<string> {
  if (cachedToken) return cachedToken;
  if (loginInFlight) return loginInFlight;

  loginInFlight = (async () => {
    const username = process.env.ALWASEET_USERNAME?.trim();
    const password = process.env.ALWASEET_PASSWORD?.trim();
    if (!username || !password) throw new Error("ALWASEET_NOT_CONFIGURED");

    const form = new FormData();
    form.set("username", username);
    form.set("password", password);

    const { httpStatus, body } = await fetchEnvelope(new URL(`${API_BASE}/login`), {
      method: "POST",
      body: form,
    });
    const token = body.data && typeof body.data === "object"
      ? String((body.data as Row).token ?? "").trim()
      : "";

    if (httpStatus >= 400 || body.status !== true || !token) {
      throw new Error(`ALWASEET_LOGIN_FAILED:${body.errNum ?? httpStatus}`);
    }
    cachedToken = token;
    return token;
  })();

  try {
    return await loginInFlight;
  } finally {
    loginInFlight = null;
  }
}

function looksLikeAuthFailure(httpStatus: number, body: ApiEnvelope): boolean {
  if (httpStatus === 401 || httpStatus === 403) return true;
  const message = `${body.errNum ?? ""} ${body.msg ?? ""}`.toLowerCase();
  return body.status === false && /(token|auth|login|unauthor|صلاحية|مصادق)/i.test(message);
}

async function authenticatedRequest(path: string, init?: RequestInit, retryAuth = true): Promise<unknown[]> {
  const token = await login();
  const url = new URL(`${API_BASE}/${path}`);
  url.searchParams.set("token", token);

  const { httpStatus, body } = await fetchEnvelope(url, init);
  if (looksLikeAuthFailure(httpStatus, body) && retryAuth) {
    cachedToken = null;
    return authenticatedRequest(path, init, false);
  }
  if (httpStatus >= 400 || body.status !== true || !Array.isArray(body.data)) {
    throw new Error(`ALWASEET_API_FAILED:${body.errNum ?? httpStatus}`);
  }
  return body.data;
}

async function fetchMerchantOrders(): Promise<AlWaseetOrder[]> {
  const data = await authenticatedRequest("merchant-orders", { method: "GET" });
  return data.map(parseAlWaseetOrder).filter((order): order is AlWaseetOrder => Boolean(order));
}

async function getMerchantOrders(): Promise<AlWaseetOrder[]> {
  if (merchantOrdersCache && Date.now() - merchantOrdersCache.fetchedAt < MERCHANT_DISCOVERY_CACHE_MS) {
    return merchantOrdersCache.orders;
  }
  if (merchantOrdersInFlight) return merchantOrdersInFlight;

  merchantOrdersInFlight = (async () => {
    const orders = await fetchMerchantOrders();
    merchantOrdersCache = { fetchedAt: Date.now(), orders };
    return orders;
  })();

  try {
    return await merchantOrdersInFlight;
  } finally {
    merchantOrdersInFlight = null;
  }
}

async function getOrdersByIds(ids: string[]): Promise<AlWaseetOrder[]> {
  if (ids.length === 0) return [];
  const safeIds = ids.slice(0, 25);
  const form = new FormData();
  form.set("ids", safeIds.join(","));
  const data = await authenticatedRequest("get-orders-by-ids-bulk", { method: "POST", body: form });
  return data.map(parseAlWaseetOrder).filter((order): order is AlWaseetOrder => Boolean(order));
}

function asIso(value: unknown): string | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function publicSnapshot(row: Row): PublicCarrierTracking | null {
  const status = String(row.provider_status ?? "").trim();
  const lastSyncedAt = asIso(row.last_synced_at);
  if (!status || !lastSyncedAt) return null;
  return {
    carrier: "الوسيط",
    status,
    statusId: row.provider_status_id == null ? null : String(row.provider_status_id),
    hasIssue: row.has_issue === true,
    providerUpdatedAt: asIso(row.provider_updated_at),
    lastSyncedAt,
    source: "alwaseet",
  };
}

async function readLink(orderId: string): Promise<Row | null> {
  const db = getDb();
  if (!db) return null;
  const result = await db.execute(sql`
    SELECT provider_order_id,provider_qr_id,provider_status_id,provider_status,
           has_issue,provider_created_at,provider_updated_at,last_synced_at,
           match_method,match_confidence
    FROM public.order_carrier_tracking
    WHERE order_id=${orderId} AND provider=${PROVIDER}
    LIMIT 1
  `);
  return rowsOf(result)[0] ?? null;
}

function cacheIsFresh(row: Row): boolean {
  const synced = row.last_synced_at instanceof Date
    ? row.last_synced_at
    : new Date(String(row.last_synced_at ?? ""));
  return !Number.isNaN(synced.getTime()) && Date.now() - synced.getTime() < CACHE_TTL_MS;
}

async function updateSnapshot(orderId: string, provider: AlWaseetOrder): Promise<PublicCarrierTracking | null> {
  const db = getDb();
  if (!db) return null;
  const result = await db.execute(sql`
    UPDATE public.order_carrier_tracking
    SET provider_qr_id=COALESCE(${provider.qrId},provider_qr_id),
        provider_status_id=${provider.statusId},
        provider_status=${provider.status},
        has_issue=${hasRealIssueNote(provider.issueNotes)},
        provider_created_at=COALESCE(${provider.createdAt},provider_created_at),
        provider_updated_at=${provider.updatedAt},
        last_synced_at=clock_timestamp(),
        updated_at=clock_timestamp()
    WHERE order_id=${orderId} AND provider=${PROVIDER}
    RETURNING provider_status_id,provider_status,has_issue,provider_updated_at,last_synced_at
  `);
  return publicSnapshot(rowsOf(result)[0] ?? {});
}

async function insertMatch(orderId: string, match: MatchResult): Promise<PublicCarrierTracking | null> {
  const db = getDb();
  if (!db) return null;
  const provider = match.order;

  try {
    const result = await db.execute(sql`
      INSERT INTO public.order_carrier_tracking(
        order_id,provider,provider_order_id,provider_qr_id,
        provider_status_id,provider_status,has_issue,
        provider_created_at,provider_updated_at,last_synced_at,
        match_method,match_confidence
      ) VALUES (
        ${orderId},${PROVIDER},${provider.id},${provider.qrId},
        ${provider.statusId},${provider.status},${hasRealIssueNote(provider.issueNotes)},
        ${provider.createdAt},${provider.updatedAt},clock_timestamp(),
        ${match.method},${match.confidence}
      )
      ON CONFLICT(order_id,provider) DO NOTHING
      RETURNING provider_status_id,provider_status,has_issue,provider_updated_at,last_synced_at
    `);
    const inserted = rowsOf(result)[0];
    if (inserted) return publicSnapshot(inserted);
  } catch (error) {
    // A unique(provider,provider_order_id) race means another AQUAVO order already
    // claimed this carrier record. Never reassign it implicitly.
    const code = String((error as { code?: unknown } | null)?.code ?? "");
    if (code !== "23505") throw error;
  }

  const existing = await readLink(orderId);
  return existing ? publicSnapshot(existing) : null;
}

async function claimedProviderIds(orderId: string): Promise<Set<string>> {
  const db = getDb();
  if (!db) return new Set();
  const result = await db.execute(sql`
    SELECT provider_order_id
    FROM public.order_carrier_tracking
    WHERE provider=${PROVIDER} AND order_id<>${orderId}
  `);
  return new Set(rowsOf(result).map((row) => String(row.provider_order_id ?? "")).filter(Boolean));
}

async function refreshLinked(orderId: string, link: Row): Promise<PublicCarrierTracking | null> {
  const providerOrderId = String(link.provider_order_id ?? "").trim();
  if (!providerOrderId) return publicSnapshot(link);

  try {
    const [fresh] = await getOrdersByIds([providerOrderId]);
    if (!fresh || fresh.id !== providerOrderId) return publicSnapshot(link);
    return await updateSnapshot(orderId, fresh) ?? publicSnapshot(link);
  } catch {
    return publicSnapshot(link);
  }
}

async function discover(order: AquavoTrackingOrder): Promise<PublicCarrierTracking | null> {
  const negativeUntil = negativeDiscoveryCache.get(order.id) ?? 0;
  if (negativeUntil > Date.now()) return null;

  try {
    const [providerOrders, claimed] = await Promise.all([
      getMerchantOrders(),
      claimedProviderIds(order.id),
    ]);
    const match = matchAlWaseetOrder(order, providerOrders, claimed);
    if (!match) {
      negativeDiscoveryCache.set(order.id, Date.now() + NEGATIVE_DISCOVERY_TTL_MS);
      return null;
    }
    negativeDiscoveryCache.delete(order.id);
    return await insertMatch(order.id, match);
  } catch {
    negativeDiscoveryCache.set(order.id, Date.now() + NEGATIVE_DISCOVERY_TTL_MS);
    return null;
  }
}

/**
 * Public tracking resolver. It is intentionally fail-open: Al-Waseet downtime,
 * missing credentials, or a not-yet-matchable sticker must never break AQUAVO's
 * own order tracking page.
 */
export async function resolveAlWaseetTracking(order: AquavoTrackingOrder): Promise<PublicCarrierTracking | null> {
  if (!trackingEnabled() || !getDb()) return null;

  try {
    const link = await readLink(order.id);
    if (link) {
      if (cacheIsFresh(link)) return publicSnapshot(link);
      return refreshLinked(order.id, link);
    }
    return discover(order);
  } catch {
    return null;
  }
}
