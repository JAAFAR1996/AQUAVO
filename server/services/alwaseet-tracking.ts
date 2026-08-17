import { sql } from "drizzle-orm";
import { getDb } from "../db.js";

const PROVIDER = "alwaseet";
const API_BASE = "https://api.alwaseet-iq.net/v1/merchant";
const DIAGNOSTIC_KEY = "integration.alwaseet.last_diagnostic";
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

export type MatchFailureReason =
  | "invalid_phone"
  | "no_phone_candidate"
  | "missing_payable_amount"
  | "no_amount_candidate"
  | "ambiguous_order_number_note"
  | "ambiguous";

export interface MatchAnalysis {
  match: MatchResult | null;
  reason: MatchFailureReason | null;
  phoneCandidateCount: number;
  amountCandidateCount: number;
}

type Row = Record<string, unknown>;
type ApiEnvelope = {
  status?: boolean;
  errNum?: string;
  msg?: string;
  data?: unknown;
};

type DiagnosticStatus =
  | "disabled"
  | "api_error"
  | "no_match"
  | "matched"
  | "match_conflict"
  | "refresh_error"
  | "resolver_error";

interface DiagnosticInput {
  status: DiagnosticStatus;
  code: string;
  orderId: string;
  providerOrderCount?: number;
  phoneCandidateCount?: number;
  amountCandidateCount?: number;
}

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

function temporalMatchScore(localCreatedAt: Date, providerCreatedAt: Date): number {
  const delta = providerCreatedAt.getTime() - localCreatedAt.getTime();
  return delta >= 0 ? delta : DISCOVERY_BEFORE_MS + Math.abs(delta);
}

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

export function analyzeAlWaseetMatch(
  local: AquavoTrackingOrder,
  providerOrders: AlWaseetOrder[],
  claimedProviderIds: ReadonlySet<string> = new Set(),
): MatchAnalysis {
  const phone = normalizeIraqPhone(local.customerPhone);
  if (!phone) {
    return { match: null, reason: "invalid_phone", phoneCandidateCount: 0, amountCandidateCount: 0 };
  }

  const eligible = providerOrders.filter((provider) =>
    !claimedProviderIds.has(provider.id)
    && providerPhones(provider).includes(phone)
    && isWithinDiscoveryWindow(local.createdAt, provider.createdAt),
  );

  if (eligible.length === 0) {
    return { match: null, reason: "no_phone_candidate", phoneCandidateCount: 0, amountCandidateCount: 0 };
  }

  const noteMatches = eligible.filter((provider) =>
    notesContainOrderNumber(provider.merchantNotes, local.orderNumber),
  );
  if (noteMatches.length === 1) {
    return {
      match: { order: noteMatches[0], method: "order_number_note_phone", confidence: "exact" },
      reason: null,
      phoneCandidateCount: eligible.length,
      amountCandidateCount: 0,
    };
  }
  if (noteMatches.length > 1) {
    return {
      match: null,
      reason: "ambiguous_order_number_note",
      phoneCandidateCount: eligible.length,
      amountCandidateCount: 0,
    };
  }

  const amounts = payableAmounts(local);
  if (amounts.size === 0) {
    return {
      match: null,
      reason: "missing_payable_amount",
      phoneCandidateCount: eligible.length,
      amountCandidateCount: 0,
    };
  }

  const exact = eligible.filter((provider) => provider.price != null && amounts.has(provider.price));
  if (exact.length === 1) {
    return {
      match: { order: exact[0], method: "phone_amount", confidence: "exact" },
      reason: null,
      phoneCandidateCount: eligible.length,
      amountCandidateCount: 1,
    };
  }
  if (exact.length === 0) {
    return {
      match: null,
      reason: "no_amount_candidate",
      phoneCandidateCount: eligible.length,
      amountCandidateCount: 0,
    };
  }

  const localName = normalizeArabicText(local.customerName);
  const nameMatches = localName
    ? exact.filter((provider) => normalizeArabicText(provider.clientName) === localName)
    : [];

  if (nameMatches.length === 1) {
    return {
      match: { order: nameMatches[0], method: "phone_amount_name", confidence: "high" },
      reason: null,
      phoneCandidateCount: eligible.length,
      amountCandidateCount: exact.length,
    };
  }

  const timingPool = nameMatches.length > 1 ? nameMatches : exact;
  const nearest = chooseClearNearestByTime(local.createdAt, timingPool);
  if (!nearest) {
    return {
      match: null,
      reason: "ambiguous",
      phoneCandidateCount: eligible.length,
      amountCandidateCount: exact.length,
    };
  }

  return {
    match: {
      order: nearest,
      method: nameMatches.length > 1
        ? "phone_amount_name_nearest_time"
        : "phone_amount_nearest_time",
      confidence: "high",
    },
    reason: null,
    phoneCandidateCount: eligible.length,
    amountCandidateCount: exact.length,
  };
}

export function matchAlWaseetOrder(
  local: AquavoTrackingOrder,
  providerOrders: AlWaseetOrder[],
  claimedProviderIds: ReadonlySet<string> = new Set(),
): MatchResult | null {
  return analyzeAlWaseetMatch(local, providerOrders, claimedProviderIds).match;
}

function trackingEnabled(): boolean {
  return process.env.ALWASEET_TRACKING_ENABLED?.trim().toLowerCase() === "true"
    && Boolean(process.env.ALWASEET_USERNAME?.trim())
    && Boolean(process.env.ALWASEET_PASSWORD?.trim());
}

function safeErrorCode(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  const known = message.match(/^(ALWASEET_(?:LOGIN_FAILED|API_FAILED)):(\w[\w.-]{0,40})$/);
  if (known) return `${known[1]}:${known[2]}`;
  if (message === "ALWASEET_INVALID_JSON" || message === "ALWASEET_NOT_CONFIGURED") return message;
  const name = error instanceof Error ? error.name : "";
  if (name === "TimeoutError" || name === "AbortError") return "ALWASEET_TIMEOUT";
  return "ALWASEET_NETWORK_OR_UNKNOWN";
}

async function recordDiagnostic(input: DiagnosticInput): Promise<void> {
  const payload = {
    provider: PROVIDER,
    status: input.status,
    code: input.code,
    orderId: input.orderId,
    providerOrderCount: input.providerOrderCount ?? null,
    phoneCandidateCount: input.phoneCandidateCount ?? null,
    amountCandidateCount: input.amountCandidateCount ?? null,
    at: new Date().toISOString(),
  };

  // Safe for runtime logs: no credentials, tokens, URLs, customer PII, amounts,
  // or raw provider messages are included.
  console.info("[alwaseet-tracking]", JSON.stringify(payload));

  const db = getDb();
  if (!db) return;
  try {
    const value = JSON.stringify(payload);
    await db.execute(sql`
      INSERT INTO public.settings(key,value,updated_at)
      VALUES(${DIAGNOSTIC_KEY},${value},clock_timestamp())
      ON CONFLICT(key) DO UPDATE
      SET value=EXCLUDED.value,updated_at=EXCLUDED.updated_at
    `);
  } catch {
    // Diagnostics must never affect customer tracking.
  }
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
  } catch (error) {
    await recordDiagnostic({
      status: "refresh_error",
      code: safeErrorCode(error),
      orderId,
    });
    return publicSnapshot(link);
  }
}

async function discover(order: AquavoTrackingOrder): Promise<PublicCarrierTracking | null> {
  const negativeUntil = negativeDiscoveryCache.get(order.id) ?? 0;
  if (negativeUntil > Date.now()) return null;

  let providerOrders: AlWaseetOrder[] = [];
  try {
    const [orders, claimed] = await Promise.all([
      getMerchantOrders(),
      claimedProviderIds(order.id),
    ]);
    providerOrders = orders;
    const analysis = analyzeAlWaseetMatch(order, providerOrders, claimed);

    if (!analysis.match) {
      negativeDiscoveryCache.set(order.id, Date.now() + NEGATIVE_DISCOVERY_TTL_MS);
      await recordDiagnostic({
        status: "no_match",
        code: analysis.reason ?? "unknown_no_match",
        orderId: order.id,
        providerOrderCount: providerOrders.length,
        phoneCandidateCount: analysis.phoneCandidateCount,
        amountCandidateCount: analysis.amountCandidateCount,
      });
      return null;
    }

    negativeDiscoveryCache.delete(order.id);
    const snapshot = await insertMatch(order.id, analysis.match);
    await recordDiagnostic({
      status: snapshot ? "matched" : "match_conflict",
      code: snapshot ? analysis.match.method : "provider_order_already_claimed",
      orderId: order.id,
      providerOrderCount: providerOrders.length,
      phoneCandidateCount: analysis.phoneCandidateCount,
      amountCandidateCount: analysis.amountCandidateCount,
    });
    return snapshot;
  } catch (error) {
    negativeDiscoveryCache.set(order.id, Date.now() + NEGATIVE_DISCOVERY_TTL_MS);
    await recordDiagnostic({
      status: "api_error",
      code: safeErrorCode(error),
      orderId: order.id,
      providerOrderCount: providerOrders.length || undefined,
    });
    return null;
  }
}

/**
 * Public tracking resolver. It is intentionally fail-open: Al-Waseet downtime,
 * missing credentials, or a not-yet-matchable sticker must never break AQUAVO's
 * own order tracking page.
 */
export async function resolveAlWaseetTracking(order: AquavoTrackingOrder): Promise<PublicCarrierTracking | null> {
  const db = getDb();
  if (!db) return null;

  if (!trackingEnabled()) {
    await recordDiagnostic({
      status: "disabled",
      code: "ALWASEET_NOT_CONFIGURED_OR_DISABLED",
      orderId: order.id,
    });
    return null;
  }

  try {
    const link = await readLink(order.id);
    if (link) {
      if (cacheIsFresh(link)) return publicSnapshot(link);
      return refreshLinked(order.id, link);
    }
    return discover(order);
  } catch (error) {
    await recordDiagnostic({
      status: "resolver_error",
      code: safeErrorCode(error),
      orderId: order.id,
    });
    return null;
  }
}
