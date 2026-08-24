import { setTimeout as sleep } from "node:timers/promises";

export type AlqasehEnvironment = "sandbox" | "production";
export type AlqasehPaymentStatus =
  | "prepared"
  | "revoked"
  | "failed"
  | "retried"
  | "succeeded"
  | "expired"
  | "duplicated"
  | "declined"
  | "unknown";

export interface AlqasehCreatePaymentInput {
  amount: number;
  currency: string;
  description: string;
  orderId: string;
  redirectUrl: string;
  webhookUrl?: string;
  country?: string;
  email?: string;
  nonce?: string;
  customData?: Record<string, unknown>;
}

export interface AlqasehCreatePaymentResponse {
  payment_id: string;
  token: string;
}

export interface AlqasehPaymentContext {
  amount: number;
  approval_code?: string;
  country?: string;
  created_at?: string;
  currency: string;
  custom_data?: Record<string, unknown> | null;
  description?: string;
  merchant_email?: string;
  nonce?: string;
  order_id: string;
  payment_id: string;
  payment_status: AlqasehPaymentStatus;
  rc?: string;
  redirect_url?: string;
  rrn?: string;
  terminal_id?: string;
  timestamp?: string;
  token?: string;
  transaction_type?: string;
  updated_at?: string;
  webhook_url?: string;
}

interface AlqasehConfig {
  environment: AlqasehEnvironment;
  apiBaseUrl: string;
  payBaseUrl: string;
  clientId: string;
  clientSecret: string;
}

const SANDBOX_API_BASE_URL = "https://api-test.alqaseh.com/v1";
const SANDBOX_PAY_BASE_URL = "https://pay-test.alqaseh.com/pay";
// Public sandbox credentials published by Al-Qaseh documentation.
const SANDBOX_CLIENT_ID = "public_test";
const SANDBOX_CLIENT_SECRET = "Lr10yWWmm1dXLoI7VgXCrQVnlq13c1G0";

const stripTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export function getAlqasehConfig(): AlqasehConfig {
  const environment: AlqasehEnvironment =
    process.env.ALQASEH_ENV?.toLowerCase() === "production" ? "production" : "sandbox";

  if (environment === "sandbox") {
    return {
      environment,
      apiBaseUrl: stripTrailingSlash(process.env.ALQASEH_API_BASE_URL || SANDBOX_API_BASE_URL),
      payBaseUrl: stripTrailingSlash(process.env.ALQASEH_PAY_BASE_URL || SANDBOX_PAY_BASE_URL),
      clientId: process.env.ALQASEH_CLIENT_ID || SANDBOX_CLIENT_ID,
      clientSecret: process.env.ALQASEH_CLIENT_SECRET || SANDBOX_CLIENT_SECRET,
    };
  }

  const apiBaseUrl = process.env.ALQASEH_API_BASE_URL?.trim();
  const payBaseUrl = process.env.ALQASEH_PAY_BASE_URL?.trim();
  const clientId = process.env.ALQASEH_CLIENT_ID?.trim();
  const clientSecret = process.env.ALQASEH_CLIENT_SECRET?.trim();

  if (!apiBaseUrl || !payBaseUrl || !clientId || !clientSecret) {
    throw new Error(
      "Al-Qaseh production configuration is incomplete. Set ALQASEH_API_BASE_URL, ALQASEH_PAY_BASE_URL, ALQASEH_CLIENT_ID and ALQASEH_CLIENT_SECRET."
    );
  }

  return {
    environment,
    apiBaseUrl: stripTrailingSlash(apiBaseUrl),
    payBaseUrl: stripTrailingSlash(payBaseUrl),
    clientId,
    clientSecret,
  };
}

export class AlqasehApiError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "AlqasehApiError";
    this.status = status;
    this.details = details;
  }
}

function basicAuthorization(clientId: string, clientSecret: string): string {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString("base64")}`;
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

async function alqasehRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const config = getAlqasehConfig();
  const url = `${config.apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const attempts = 3;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        headers: {
          Accept: "application/json",
          Authorization: basicAuthorization(config.clientId, config.clientSecret),
          ...(init.body ? { "Content-Type": "application/json" } : {}),
          ...(init.headers || {}),
        },
        signal: AbortSignal.timeout(10_000),
      });

      const body = await parseResponseBody(response);
      if (response.ok) return body as T;

      if (attempt < attempts - 1 && shouldRetry(response.status)) {
        const backoffMs = 300 * 2 ** attempt + Math.floor(Math.random() * 150);
        await sleep(backoffMs);
        continue;
      }

      const providerMessage =
        body && typeof body === "object" && "err" in body && typeof (body as any).err === "string"
          ? (body as any).err
          : `Al-Qaseh returned HTTP ${response.status}`;
      throw new AlqasehApiError(providerMessage, response.status, body);
    } catch (error) {
      if (error instanceof AlqasehApiError) throw error;
      if (attempt < attempts - 1) {
        const backoffMs = 300 * 2 ** attempt + Math.floor(Math.random() * 150);
        await sleep(backoffMs);
        continue;
      }
      const message = error instanceof Error ? error.message : "Unknown network error";
      throw new AlqasehApiError(`Unable to reach Al-Qaseh: ${message}`, 502);
    }
  }

  throw new AlqasehApiError("Unable to reach Al-Qaseh", 502);
}

export async function createAlqasehPayment(
  input: AlqasehCreatePaymentInput,
): Promise<AlqasehCreatePaymentResponse> {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("Payment amount must be a positive number");
  }
  if (!input.orderId || input.orderId.length > 250) {
    throw new Error("Al-Qaseh order_id is required and must be at most 250 characters");
  }

  const body = {
    amount: input.amount,
    currency: input.currency.toUpperCase(),
    description: input.description,
    order_id: input.orderId,
    redirect_url: input.redirectUrl,
    transaction_type: "Retail",
    ...(input.webhookUrl ? { webhook_url: input.webhookUrl } : {}),
    ...(input.country ? { country: input.country } : {}),
    ...(input.email ? { email: input.email } : {}),
    ...(input.nonce ? { nonce: input.nonce } : {}),
    ...(input.customData ? { custom_data: input.customData } : {}),
  };

  return alqasehRequest<AlqasehCreatePaymentResponse>("/egw/payments/create", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getAlqasehPayment(paymentId: string): Promise<AlqasehPaymentContext> {
  if (!paymentId?.trim()) throw new Error("paymentId is required");
  return alqasehRequest<AlqasehPaymentContext>(
    `/egw/payments/${encodeURIComponent(paymentId.trim())}`,
    { method: "GET" },
  );
}

export function getAlqasehHostedPaymentUrl(token: string): string {
  if (!token?.trim()) throw new Error("payment token is required");
  const { payBaseUrl } = getAlqasehConfig();
  return `${payBaseUrl}/${encodeURIComponent(token.trim())}`;
}
