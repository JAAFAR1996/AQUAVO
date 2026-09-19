import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { z } from "zod";

/**
 * Wayl.io payment client.
 *
 * Source of truth (researched, not guessed):
 *  - https://docs.thewayl.com (integration guide)
 *  - https://api.thewayl.com/reference (Scalar/OpenAPI reference, indexed via Context7
 *    as /websites/api_thewayl_reference)
 *  - Cross-checked against a real working Wayl integration
 *    (github.com/Mohammedalilgrh/wayl-ecommerce-store) that uses the same header name,
 *    endpoint paths and webhook signature scheme as the official reference.
 *
 * Confirmed facts:
 *  - Single API host: https://api.thewayl.com (no separate sandbox host; a `env`
 *    field of "live" or "test" on each request selects the mode).
 *  - Auth: `X-WAYL-AUTHENTICATION: <merchant API key>` header on every request.
 *    The key is issued by Wayl (email jisr@wayl.io) or found in the merchant dashboard.
 *    There is no publicly published sandbox key (unlike some other gateways) — a real
 *    key is required even for env="test".
 *  - POST /api/v1/links creates a payment link. Body: env, referenceId, total,
 *    currency, customParameter, lineItem[], webhookUrl, webhookSecret, redirectionUrl.
 *  - GET /api/v1/links/{referenceId} retrieves a link's current state — this is the
 *    authoritative server-side verification call (never trust the webhook body alone).
 *  - GET /api/v1/verify-auth-key checks the API key is valid.
 *  - POST /api/v1/refunds initiates a refund on a paid order (reason >= 100 chars).
 *  - Webhooks are signed: header `x-wayl-signature-256` = HMAC-SHA256(rawBody, webhookSecret) as hex.
 *
 *  - Link responses (https://wayl.io/docs) are `{ message, data: { referenceId, id, code,
 *    total (string), currency, type, paymentMethod, status, completedAt, createdAt,
 *    updatedAt, url, webhookUrl, redirectionUrl } }`. The hosted checkout URL is
 *    `data.url`. Responses are validated with a strict Zod schema; anything that does
 *    not match fails closed with a WaylApiError.
 */

export type WaylEnvironment = "live" | "test";

export interface WaylLineItem {
  label: string;
  amount: number;
  type: "increase" | "decrease";
}

export interface WaylCreateLinkInput {
  referenceId: string;
  total: number;
  currency: string;
  customParameter?: string;
  lineItem?: WaylLineItem[];
  webhookUrl?: string;
  webhookSecret?: string;
  redirectionUrl?: string;
}

export interface WaylLink {
  id: string;
  referenceId: string;
  status: string;
  total: number;
  currency: string;
  url: string;
  paymentMethod: string | null;
  completedAt: string | null;
}

interface WaylConfig {
  environment: WaylEnvironment;
  apiBaseUrl: string;
  apiKey: string;
}

const DEFAULT_API_BASE_URL = "https://api.thewayl.com";
const stripTrailingSlash = (value: string) => value.replace(/\/+$/, "");

/**
 * Resolves the `env` value sent to Wayl. Per https://wayl.io/docs, use "test"
 * while testing and switch to "live" only when going live:
 *  - outside production, a missing WAYL_ENV defaults to "test" — a non-production
 *    environment never silently takes live payments;
 *  - in production, WAYL_ENV=live is mandatory; missing, "test" or any other
 *    value fails closed so checkout reports online payment as unavailable.
 * Any value other than "test"/"live" is a configuration error everywhere.
 */
export function resolveWaylEnvironment(
  rawWaylEnv: string | undefined = process.env.WAYL_ENV,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): WaylEnvironment {
  const requested = rawWaylEnv?.trim().toLowerCase() ?? "";
  const isProduction = nodeEnv === "production";

  if (requested === "") {
    if (isProduction) {
      throw new Error("Wayl configuration error: WAYL_ENV is missing. Production requires WAYL_ENV=live explicitly; online payment is disabled.");
    }
    return "test";
  }
  if (requested !== "test" && requested !== "live") {
    throw new Error(`Wayl configuration error: WAYL_ENV="${rawWaylEnv}" is invalid. Use "test" or "live".`);
  }
  if (isProduction && requested !== "live") {
    throw new Error("Wayl configuration error: production requires WAYL_ENV=live explicitly; WAYL_ENV=test is refused and online payment is disabled.");
  }
  return requested;
}

let configLoadLogged = false;

export function getWaylConfig(): WaylConfig {
  const environment = resolveWaylEnvironment();

  const apiKey = process.env.WAYL_API_KEY?.trim();
  if (!apiKey) {
    // Unlike Al-Qaseh, Wayl has no publicly published sandbox credential — a real
    // merchant API key (from the Wayl dashboard) is required even in test mode.
    throw new Error("Wayl configuration is incomplete. Set WAYL_API_KEY (and optionally WAYL_ENV=test for sandbox transactions).");
  }

  const apiBaseUrl = stripTrailingSlash(process.env.WAYL_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL);
  if (!configLoadLogged) {
    // Once per process. Never the key, never the header — only booleans and mode names.
    configLoadLogged = true;
    console.log(`[AQUAVO Wayl] configuration loaded | environment: ${environment} | api key present: true | api host: ${apiBaseUrl}`);
  }
  return { environment, apiBaseUrl, apiKey };
}

/**
 * Stable, secret-free reason codes for why online payment is (un)available.
 * Logged server-side; the public availability endpoint only ever returns
 * `{ available: boolean }`.
 */
export type WaylReadinessReason =
  | "WAYL_CONFIG_VALID"
  | "WAYL_API_KEY_MISSING"
  | "WAYL_ENV_MISSING"
  | "WAYL_ENV_INVALID"
  | "WAYL_ENV_NOT_LIVE_IN_PRODUCTION"
  | "WAYL_AUTH_FAILED"
  | "WAYL_RATE_LIMITED"
  | "WAYL_SERVICE_ERROR"
  | "WAYL_NETWORK_FAILED"
  | "WAYL_ACCOUNT_NOT_LIVE_ENABLED"
  | "UNKNOWN_CONFIG_ERROR";

export interface WaylReadiness {
  available: boolean;
  reason: WaylReadinessReason;
  checks: {
    configValid: boolean;
    authValid: boolean;
    /** null when the link probe is disabled (WAYL_READINESS_PROBE=off). */
    storeVerified: boolean | null;
  };
}

export function classifyWaylConfigError(error: unknown): WaylReadinessReason {
  const message = error instanceof Error ? error.message : String(error);
  if (/WAYL_API_KEY/.test(message)) return "WAYL_API_KEY_MISSING";
  if (/WAYL_ENV is missing/.test(message)) return "WAYL_ENV_MISSING";
  if (/requires WAYL_ENV=live/.test(message)) return "WAYL_ENV_NOT_LIVE_IN_PRODUCTION";
  if (/WAYL_ENV=.* is invalid/.test(message)) return "WAYL_ENV_INVALID";
  return "UNKNOWN_CONFIG_ERROR";
}

/**
 * Observed on 2026-09-18 against the production API: an authenticated key whose
 * store has not completed Wayl's verification gets HTTP 403
 * "Store must be verified to create payment links…" from POST /api/v1/links in
 * BOTH env=live and env=test. No read-only endpoint exposes that state.
 */
export function isWaylStoreVerificationError(error: unknown): boolean {
  return error instanceof WaylApiError && error.status === 403 && /verif/i.test(error.message);
}

function classifyProviderFailure(error: unknown): WaylReadinessReason {
  if (error instanceof WaylApiError) {
    if (error.status === 401 || error.status === 403) return "WAYL_AUTH_FAILED";
    if (error.status === 429) return "WAYL_RATE_LIMITED";
    if (error.status === 502 && /Unable to reach Wayl/.test(error.message)) return "WAYL_NETWORK_FAILED";
    if (error.status >= 500) return "WAYL_SERVICE_ERROR";
  }
  return "WAYL_NETWORK_FAILED";
}

export class WaylApiError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "WaylApiError";
    this.status = status;
    this.details = details;
  }
}

function shouldRetry(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { message: text.slice(0, 500) };
  }
}

async function waylRequest<T>(
  path: string,
  init: RequestInit = {},
  policy: { attempts?: number; timeoutMs?: number } = {},
): Promise<T> {
  const config = getWaylConfig();
  const url = `${config.apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const attempts = Math.max(1, policy.attempts ?? 3);
  const timeoutMs = Math.max(1_000, policy.timeoutMs ?? 10_000);

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        headers: {
          Accept: "application/json",
          "X-WAYL-AUTHENTICATION": config.apiKey,
          ...(init.body ? { "Content-Type": "application/json" } : {}),
          ...(init.headers || {}),
        },
        signal: AbortSignal.timeout(timeoutMs),
      });

      const body = await parseResponseBody(response);
      if (response.ok) return body as T;

      if (attempt < attempts - 1 && shouldRetry(response.status)) {
        const backoffMs = 300 * 2 ** attempt + Math.floor(Math.random() * 150);
        await sleep(backoffMs);
        continue;
      }

      const providerMessage =
        body && typeof body === "object" && "message" in body && typeof (body as any).message === "string"
          ? (body as any).message
          : `Wayl returned HTTP ${response.status}`;
      throw new WaylApiError(providerMessage, response.status, body);
    } catch (error) {
      if (error instanceof WaylApiError) throw error;
      if (attempt < attempts - 1) {
        const backoffMs = 300 * 2 ** attempt + Math.floor(Math.random() * 150);
        await sleep(backoffMs);
        continue;
      }
      const message = error instanceof Error ? error.message : "Unknown network error";
      throw new WaylApiError(`Unable to reach Wayl: ${message}`, 502);
    }
  }

  throw new WaylApiError("Unable to reach Wayl", 502);
}

/**
 * Documented statuses (https://wayl.io/docs): Created, Pending, Processing, Complete,
 * Delivered, Cancelled, Rejected, Returned. Only "Complete" is documented as the
 * successful-payment state. Unknown strings are still accepted here so a newly
 * introduced provider state cannot break verification; the order-payment service
 * decides what (if anything) they mean and never treats them as paid.
 */
export const WAYL_LINK_STATUSES = [
  "Created",
  "Pending",
  "Processing",
  "Complete",
  "Delivered",
  "Cancelled",
  "Rejected",
  "Returned",
] as const;
export type WaylLinkStatus = (typeof WAYL_LINK_STATUSES)[number];

// `total` is documented as a string in link responses ("same digits you sent;
// serialized as text in JSON") and as a number in webhook bodies. Accept both.
const totalSchema = z.union([z.string(), z.number()]).transform((value, ctx) => {
  const parsed = typeof value === "number" ? value : Number(value.trim());
  if (!Number.isFinite(parsed) || parsed < 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "total is not a finite non-negative number" });
    return z.NEVER;
  }
  return parsed;
});

// Exact documented `data` object of POST /api/v1/links (201) and
// GET /api/v1/links/{referenceId} (200). Extra keys are tolerated (Wayl may add
// fields) but every field we rely on must be present and correctly typed.
const waylLinkDataSchema = z.object({
  referenceId: z.string().min(1),
  id: z.string().min(1),
  code: z.string().nullable().optional(),
  total: totalSchema,
  currency: z.string().min(1),
  type: z.string().nullable().optional(),
  paymentMethod: z.string().nullable().optional(),
  status: z.string().min(1),
  completedAt: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
  url: z.string().url(),
  webhookUrl: z.string().nullable().optional(),
  redirectionUrl: z.string().nullable().optional(),
});

const waylLinkEnvelopeSchema = z.object({
  message: z.string().optional(),
  data: waylLinkDataSchema,
});

function parseLinkResponse(raw: unknown): WaylLink {
  const parsed = waylLinkEnvelopeSchema.safeParse(raw);
  if (!parsed.success) {
    // Fail closed. The issues list names the offending path; the raw body is kept
    // on the error for server-side diagnostics and is never sent to the client.
    throw new WaylApiError(
      `Wayl link response did not match the documented schema: ${parsed.error.issues
        .map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`)
        .join("; ")}`,
      502,
      raw,
    );
  }
  const { data } = parsed.data;
  return {
    id: data.id,
    referenceId: data.referenceId,
    status: data.status,
    total: data.total,
    currency: data.currency,
    url: data.url,
    paymentMethod: data.paymentMethod ?? null,
    completedAt: data.completedAt ?? null,
  };
}

export async function createWaylLink(input: WaylCreateLinkInput): Promise<WaylLink> {
  if (!Number.isFinite(input.total) || input.total <= 0) {
    throw new Error("Payment total must be a positive number");
  }
  if (!input.referenceId || input.referenceId.length > 250) {
    throw new Error("Wayl referenceId is required and must be at most 250 characters");
  }

  const config = getWaylConfig();
  const body = {
    env: config.environment,
    referenceId: input.referenceId,
    total: input.total,
    currency: input.currency.toUpperCase(),
    ...(input.customParameter ? { customParameter: input.customParameter } : {}),
    ...(input.lineItem ? { lineItem: input.lineItem } : {}),
    ...(input.webhookUrl ? { webhookUrl: input.webhookUrl } : {}),
    ...(input.webhookSecret ? { webhookSecret: input.webhookSecret } : {}),
    ...(input.redirectionUrl ? { redirectionUrl: input.redirectionUrl } : {}),
  };

  let raw: unknown;
  try {
    // Creating a link is not idempotent at the provider. Never retry the POST
    // automatically: one successful request whose response is lost must not be
    // repeated. Wayl link creation can also take longer than the auth probe, so
    // allow a longer provider timeout here.
    raw = await waylRequest<unknown>("/api/v1/links", {
      method: "POST",
      body: JSON.stringify(body),
    }, { attempts: 1, timeoutMs: 30_000 });
  } catch (error) {
    // A timeout/network/5xx can leave the outcome uncertain: the provider may
    // already have created the link. Recover by reading the exact referenceId
    // instead of issuing a duplicate POST.
    if (error instanceof WaylApiError && error.status >= 500) {
      console.warn(`[AQUAVO Wayl] create-link outcome uncertain for ${input.referenceId}; checking existing link before failing`);
      try {
        const existingRaw = await waylRequest<unknown>(
          `/api/v1/links/${encodeURIComponent(input.referenceId)}`,
          { method: "GET" },
          { attempts: 2, timeoutMs: 15_000 },
        );
        const existing = parseLinkResponse(existingRaw);
        if (existing.referenceId === input.referenceId) {
          console.log(`[AQUAVO Wayl] recovered existing link after uncertain create outcome for ${input.referenceId}`);
          return existing;
        }
      } catch (recoveryError) {
        console.warn(
          `[AQUAVO Wayl] create-link recovery lookup failed for ${input.referenceId}:`,
          recoveryError instanceof Error ? recoveryError.message : recoveryError,
        );
      }
    }
    throw error;
  }

  const link = parseLinkResponse(raw);
  if (link.referenceId !== input.referenceId) {
    throw new WaylApiError("Wayl echoed a different referenceId than the one requested", 502);
  }
  return link;
}

export async function getWaylLinkByReferenceId(referenceId: string): Promise<WaylLink> {
  const normalized = referenceId?.trim();
  if (!normalized) throw new Error("referenceId is required");
  const raw = await waylRequest<unknown>(`/api/v1/links/${encodeURIComponent(normalized)}`, { method: "GET" });
  return parseLinkResponse(raw);
}

/**
 * Webhook signature check per https://wayl.io/docs: HMAC-SHA256 over the exact raw
 * request body, hex digest, compared with the `x-wayl-signature-256` header using a
 * constant-time comparison. `rawBody` must be the bytes as received — never a
 * re-serialisation of the parsed JSON.
 */
export function verifyWaylWebhookSignature(rawBody: Buffer, signatureHeader: unknown, secret: string): boolean {
  if (typeof signatureHeader !== "string" || !signatureHeader || !secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const provided = signatureHeader.trim().toLowerCase().replace(/^sha256=/, "");
  if (!/^[0-9a-f]{64}$/.test(provided)) return false;
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(provided, "hex"));
}

export async function verifyWaylAuthKey(): Promise<boolean> {
  try {
    await waylRequest<unknown>("/api/v1/verify-auth-key", { method: "GET" });
    return true;
  } catch {
    return false;
  }
}

const READINESS_SUCCESS_TTL_MS = 15 * 60_000;
const READINESS_FAILURE_TTL_MS = 2 * 60_000;
const STORE_UNVERIFIED_COOLDOWN_MS = 15 * 60_000;

let readinessCache: { value: WaylReadiness; expiresAt: number } | null = null;
let storeUnverifiedUntil = 0;

export function resetWaylReadinessCache(): void {
  readinessCache = null;
  storeUnverifiedUntil = 0;
}

/** Called by checkout when a real link creation was refused for an unverified store. */
export function noteWaylStoreVerificationFailure(now = Date.now()): void {
  storeUnverifiedUntil = now + STORE_UNVERIFIED_COOLDOWN_MS;
  readinessCache = null;
}

function probeEnabled(): boolean {
  // In production, availability must not create disposable payment links just to
  // decide whether to show the payment option. Wayl's documented flow is:
  // validate authentication, then create the real link when the customer submits.
  // The real checkout path already fails closed on an unverified merchant.
  if (process.env.NODE_ENV === "production") return false;

  const raw = process.env.WAYL_READINESS_PROBE?.trim().toLowerCase();
  return !(raw === "off" || raw === "0" || raw === "false");
}

/**
 * The only way to learn whether Wayl will actually issue links for this merchant
 * is to ask for one. The probe is the smallest documented link (1000 IQD minimum),
 * uses only fields present in Wayl's current create-link documentation, is
 * invalidated immediately, and is never shown to a customer.
 */
async function probeLinkCreation(): Promise<void> {
  const referenceId = `aquavo-readiness-${randomUUID()}`;
  await createWaylLink({
    referenceId,
    total: 1000,
    currency: "IQD",
    customParameter: "AQUAVO readiness probe - not a customer order",
    lineItem: [{ label: "AQUAVO readiness probe", amount: 1000, type: "increase" }],
  });
  try {
    await waylRequest<unknown>(`/api/v1/links/${encodeURIComponent(referenceId)}/invalidate`, { method: "POST" });
  } catch (error) {
    // The link expires on its own after one minute; invalidation is tidiness only.
    console.warn("[AQUAVO Wayl] readiness probe link could not be invalidated:", error instanceof Error ? error.message : error);
  }
}

/**
 * Layered readiness: local configuration → GET /api/v1/verify-auth-key →
 * (optional) live link probe. Distinguishes "configured", "authenticated" and
 * "merchant may take payments" instead of collapsing everything into `false`.
 * Results are cached per process so the checkout page does not hit Wayl on
 * every render.
 */
export async function checkWaylReadiness(now = Date.now()): Promise<WaylReadiness> {
  if (readinessCache && readinessCache.expiresAt > now) return readinessCache.value;

  const unavailable = (reason: WaylReadinessReason, checks: WaylReadiness["checks"], ttl = READINESS_FAILURE_TTL_MS): WaylReadiness => {
    const value: WaylReadiness = { available: false, reason, checks };
    if (ttl > 0) readinessCache = { value, expiresAt: now + ttl };
    return value;
  };

  let config: WaylConfig;
  try {
    config = getWaylConfig();
  } catch (error) {
    // Configuration is cheap to re-evaluate and can change only with a new
    // deployment, so it is not cached.
    return unavailable(classifyWaylConfigError(error), { configValid: false, authValid: false, storeVerified: false }, 0);
  }

  try {
    await waylRequest<unknown>("/api/v1/verify-auth-key", { method: "GET" });
    console.log("[AQUAVO Wayl] auth check: success");
  } catch (error) {
    const reason = classifyProviderFailure(error);
    const status = error instanceof WaylApiError ? error.status : "n/a";
    console.error(`[AQUAVO Wayl] auth check: failed | reason: ${reason} | http: ${status}`);
    return unavailable(reason, { configValid: true, authValid: false, storeVerified: false });
  }

  if (!probeEnabled()) {
    const value: WaylReadiness = { available: true, reason: "WAYL_CONFIG_VALID", checks: { configValid: true, authValid: true, storeVerified: null } };
    readinessCache = { value, expiresAt: now + READINESS_SUCCESS_TTL_MS };
    return value;
  }

  if (storeUnverifiedUntil > now) {
    return unavailable("WAYL_ACCOUNT_NOT_LIVE_ENABLED", { configValid: true, authValid: true, storeVerified: false }, storeUnverifiedUntil - now);
  }

  try {
    await probeLinkCreation();
  } catch (error) {
    if (isWaylStoreVerificationError(error)) {
      console.error(`[AQUAVO Wayl] live merchant check: store not verified at Wayl (env=${config.environment}); online payment disabled until Wayl completes verification`);
      storeUnverifiedUntil = now + STORE_UNVERIFIED_COOLDOWN_MS;
      return unavailable("WAYL_ACCOUNT_NOT_LIVE_ENABLED", { configValid: true, authValid: true, storeVerified: false }, STORE_UNVERIFIED_COOLDOWN_MS);
    }
    const reason = classifyProviderFailure(error);
    console.error(`[AQUAVO Wayl] live merchant check: failed | reason: ${reason} | ${error instanceof Error ? error.message : error}`);
    return unavailable(reason, { configValid: true, authValid: true, storeVerified: false });
  }

  console.log(`[AQUAVO Wayl] live merchant check: success (env=${config.environment})`);
  const value: WaylReadiness = { available: true, reason: "WAYL_CONFIG_VALID", checks: { configValid: true, authValid: true, storeVerified: true } };
  readinessCache = { value, expiresAt: now + READINESS_SUCCESS_TTL_MS };
  return value;
}

export async function createWaylRefund(referenceId: string, amount: number, reason: string): Promise<unknown> {
  if (reason.length < 100) {
    throw new Error("Wayl refund reason must be at least 100 characters (documented requirement)");
  }
  return waylRequest<unknown>("/api/v1/refunds", {
    method: "POST",
    body: JSON.stringify({ referenceId, amount, reason }),
  });
}
