import { sql } from "drizzle-orm";
import { getDb } from "../db.js";
import {
  analyzeAlWaseetMatch,
  hasRealIssueNote,
  parseAlWaseetOrder,
  type AlWaseetOrder,
  type AquavoTrackingOrder,
  type MatchResult,
  type PublicCarrierTracking,
} from "./alwaseet-tracking.js";

const PROVIDER = "alwaseet";
const API_BASE = "https://api.alwaseet-iq.net/v1/merchant";
const DIAGNOSTIC_KEY = "integration.alwaseet.last_diagnostic";
const CACHE_TTL_MS = 2 * 60 * 1000;
const MERCHANT_DISCOVERY_CACHE_MS = 60 * 1000;
const NEGATIVE_DISCOVERY_TTL_MS = 90 * 1000;
const REQUEST_TIMEOUT_MS = 5_000;

type Row = Record<string, unknown>;
type ApiEnvelope = {
  status?: boolean;
  errNum?: string | number;
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

type AuthProbe = "not_run" | "statuses_ok" | "statuses_failed" | "fresh_login_retry_failed";

interface DiagnosticInput {
  status: DiagnosticStatus;
  code: string;
  orderId: string;
  endpoint?: string;
  httpStatus?: number;
  providerMessage?: string;
  authProbe?: AuthProbe;
  providerOrderCount?: number;
  phoneCandidateCount?: number;
  amountCandidateCount?: number;
}

class AlWaseetProviderError extends Error {
  readonly endpoint: string;
  readonly httpStatus: number;
  readonly errNum: string;
  readonly providerMessage: string;
  authProbe: AuthProbe = "not_run";

  constructor(input: {
    endpoint: string;
    httpStatus: number;
    errNum: unknown;
    providerMessage: unknown;
    prefix?: "ALWASEET_LOGIN_FAILED" | "ALWASEET_API_FAILED";
  }) {
    const errNum = String(input.errNum ?? input.httpStatus).trim() || String(input.httpStatus);
    super(`${input.prefix ?? "ALWASEET_API_FAILED"}:${errNum}`);
    this.name = "AlWaseetProviderError";
    this.endpoint = input.endpoint;
    this.httpStatus = input.httpStatus;
    this.errNum = errNum;
    this.providerMessage = sanitizeAlWaseetProviderMessage(input.providerMessage);
  }
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

/**
 * Preserve enough of Al-Waseet's documented `msg` field for diagnostics while
 * stripping tokens, URLs, customer contact data and long identifiers.
 */
export function sanitizeAlWaseetProviderMessage(value: unknown): string {
  let message = String(value ?? "").normalize("NFKC").replace(/\s+/g, " ").trim();
  if (!message) return "";

  message = message
    .replace(/https?:\/\/\S+/gi, "[url]")
    .replace(/\btoken\s*[=:]\s*[^\s,;]+/gi, "token=[redacted]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/(?:\+?964|00964|0)?7\d{9}/g, "[phone]")
    .replace(/\b\d{7,}\b/g, "[number]")
    .replace(/[@A-Za-z0-9._-]{24,}/g, "[secret]")
    .trim();

  return message.slice(0, 180);
}

function trackingEnabled(): boolean {
  return process.env.ALWASEET_TRACKING_ENABLED?.trim().toLowerCase() === "true"
    && Boolean(process.env.ALWASEET_USERNAME?.trim())
    && Boolean(process.env.ALWASEET_PASSWORD?.trim());
}

function safeErrorDetails(error: unknown): Pick<DiagnosticInput, "code" | "endpoint" | "httpStatus" | "providerMessage" | "authProbe"> {
  if (error instanceof AlWaseetProviderError) {
    return {
      code: error.message,
      endpoint: error.endpoint,
      httpStatus: error.httpStatus,
      providerMessage: error.providerMessage || undefined,
      authProbe: error.authProbe,
    };
  }

  const message = error instanceof Error ? error.message : "";
  if (message === "ALWASEET_INVALID_JSON" || message === "ALWASEET_NOT_CONFIGURED") {
    return { code: message };
  }
  const name = error instanceof Error ? error.name : "";
  if (name === "TimeoutError" || name === "AbortError") return { code: "ALWASEET_TIMEOUT" };
  return { code: "ALWASEET_NETWORK_OR_UNKNOWN" };
}

async function recordDiagnostic(input: DiagnosticInput): Promise<void> {
  const payload = {
    provider: PROVIDER,
    status: input.status,
    code: input.code,
    orderId: input.orderId,
    endpoint: input.endpoint ?? null,
    httpStatus: input.httpStatus ?? null,
    providerMessage: input.providerMessage ?? null,
    authProbe: input.authProbe ?? "not_run",
    providerOrderCount: input.providerOrderCount ?? null,
    phoneCandidateCount: input.phoneCandidateCount ?? null,
    amountCandidateCount: input.amountCandidateCount ?? null,
    at: new Date().toISOString(),
  };

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
  const headers = new Headers(init?.headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");

  const response = await fetch(url, {
    ...init,
    headers,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  try {
    return { httpStatus: response.status, body: await response.json() as ApiEnvelope };
  } catch {
    throw new Error("ALWASEET_INVALID_JSON");
  }
}

async function login(forceFresh = false): Promise<string> {
  if (forceFresh) cachedToken = null;
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
      throw new AlWaseetProviderError({
        endpoint: "login",
        httpStatus,
        errNum: body.errNum,
        providerMessage: body.msg,
        prefix: "ALWASEET_LOGIN_FAILED",
      });
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
  return body.status === false && /(token|auth|login|unauthor|صلاحية|مصادق|تسجيل دخول)/i.test(message);
}

async function requestArrayWithToken(path: string, token: string, init?: RequestInit): Promise<unknown[]> {
  const url = new URL(`${API_BASE}/${path}`);
  url.searchParams.set("token", token);
  const { httpStatus, body } = await fetchEnvelope(url, init);

  if (httpStatus >= 400 || body.status !== true || !Array.isArray(body.data)) {
    throw new AlWaseetProviderError({
      endpoint: path,
      httpStatus,
      errNum: body.errNum,
      providerMessage: body.msg,
    });
  }
  return body.data;
}

async function authenticatedArray(path: string, init?: RequestInit, allowAuthRetry = true): Promise<unknown[]> {
  const token = await login();
  const url = new URL(`${API_BASE}/${path}`);
  url.searchParams.set("token", token);
  const { httpStatus, body } = await fetchEnvelope(url, init);

  if (looksLikeAuthFailure(httpStatus, body) && allowAuthRetry) {
    const freshToken = await login(true);
    return requestArrayWithToken(path, freshToken, init);
  }
  if (httpStatus >= 400 || body.status !== true || !Array.isArray(body.data)) {
    throw new AlWaseetProviderError({
      endpoint: path,
      httpStatus,
      errNum: body.errNum,
      providerMessage: body.msg,
    });
  }
  return body.data;
}

async function probeStatusesWithCurrentToken(): Promise<boolean> {
  const token = await login();
  try {
    await requestArrayWithToken("statuses", token, { method: "GET" });
    return true;
  } catch {
    return false;
  }
}

async function fetchMerchantOrders(): Promise<AlWaseetOrder[]> {
  try {
    const data = await authenticatedArray("merchant-orders", { method: "GET" });
    return data.map(parseAlWaseetOrder).filter((order): order is AlWaseetOrder => Boolean(order));
  } catch (error) {
    if (!(error instanceof AlWaseetProviderError) || error.endpoint !== "merchant-orders") throw error;

    // The official docs specify errNum + msg but do not publish a complete
    // errNum dictionary. Probe another documented endpoint using the same token.
    if (await probeStatusesWithCurrentToken()) {
      error.authProbe = "statuses_ok";
      throw error;
    }

    try {
      const freshToken = await login(true);
      const data = await requestArrayWithToken("merchant-orders", freshToken, { method: "GET" });
      return data.map(parseAlWaseetOrder).filter((order): order is AlWaseetOrder => Boolean(order));
    } catch (retryError) {
      if (retryError instanceof AlWaseetProviderError) retryError.authProbe = "fresh_login_retry_failed";
      throw retryError;
    }
  }
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
  const form = new FormData();
  form.set("ids", ids.slice(0, 25).join(","));
  const data = await authenticatedArray("get-orders-by-ids-bulk", { method: "POST", body: form });
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
    await recordDiagnostic({ status: "refresh_error", orderId, ...safeErrorDetails(error) });
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
      orderId: order.id,
      providerOrderCount: providerOrders.length || undefined,
      ...safeErrorDetails(error),
    });
    return null;
  }
}

/**
 * Provider-contract-hardened runtime resolver. It remains fail-open: Al-Waseet
 * outages or account/API restrictions never break AQUAVO's own tracking page.
 */
export async function resolveAlWaseetTrackingRuntime(order: AquavoTrackingOrder): Promise<PublicCarrierTracking | null> {
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
    await recordDiagnostic({ status: "resolver_error", orderId: order.id, ...safeErrorDetails(error) });
    return null;
  }
}
