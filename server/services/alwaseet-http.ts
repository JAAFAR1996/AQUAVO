import { randomBytes } from "node:crypto";
import { request as httpsRequest } from "node:https";
import { HttpsProxyAgent } from "https-proxy-agent";

const ALWASEET_API_HOST = "api.alwaseet-iq.net";
const MAX_RESPONSE_BYTES = 16 * 1024 * 1024;

export const ALWASEET_STATIC_EGRESS_NOT_CONFIGURED = "ALWASEET_STATIC_EGRESS_NOT_CONFIGURED";
export const ALWASEET_STATIC_EGRESS_INVALID = "ALWASEET_STATIC_EGRESS_INVALID";

function fixieProxyUrl(): string {
  const raw = process.env.FIXIE_URL?.trim();
  if (!raw) throw new Error(ALWASEET_STATIC_EGRESS_NOT_CONFIGURED);

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(ALWASEET_STATIC_EGRESS_INVALID);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(ALWASEET_STATIC_EGRESS_INVALID);
  }

  return raw;
}

export function alWaseetStaticEgressConfigurationError(): string | null {
  try {
    fixieProxyUrl();
    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === ALWASEET_STATIC_EGRESS_INVALID) return ALWASEET_STATIC_EGRESS_INVALID;
    return ALWASEET_STATIC_EGRESS_NOT_CONFIGURED;
  }
}

function escapeDispositionName(value: string): string {
  return value.replace(/["\\\r\n]/g, "_");
}

function serializeBody(body: RequestInit["body"], headers: Headers): Buffer | undefined {
  if (body == null) return undefined;

  if (body instanceof FormData) {
    const boundary = `----aquavo-${randomBytes(12).toString("hex")}`;
    const chunks: Buffer[] = [];

    body.forEach((value, name) => {
      if (typeof value !== "string") {
        throw new Error("ALWASEET_UNSUPPORTED_MULTIPART_VALUE");
      }
      chunks.push(Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${escapeDispositionName(name)}"\r\n\r\n${value}\r\n`,
        "utf8",
      ));
    });
    chunks.push(Buffer.from(`--${boundary}--\r\n`, "utf8"));

    const payload = Buffer.concat(chunks);
    headers.set("Content-Type", `multipart/form-data; boundary=${boundary}`);
    headers.set("Content-Length", String(payload.length));
    return payload;
  }

  if (body instanceof URLSearchParams) {
    const payload = Buffer.from(body.toString(), "utf8");
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/x-www-form-urlencoded;charset=UTF-8");
    }
    headers.set("Content-Length", String(payload.length));
    return payload;
  }

  if (typeof body === "string") {
    const payload = Buffer.from(body, "utf8");
    headers.set("Content-Length", String(payload.length));
    return payload;
  }

  if (body instanceof ArrayBuffer) {
    const payload = Buffer.from(body);
    headers.set("Content-Length", String(payload.length));
    return payload;
  }

  if (ArrayBuffer.isView(body)) {
    const payload = Buffer.from(body.buffer, body.byteOffset, body.byteLength);
    headers.set("Content-Length", String(payload.length));
    return payload;
  }

  throw new Error("ALWASEET_UNSUPPORTED_REQUEST_BODY");
}

/**
 * Send an Al-Waseet API request through Fixie only.
 *
 * This transport deliberately has no direct-network fallback. When FIXIE_URL is
 * absent or invalid, the request fails closed so Al-Waseet never sees a dynamic
 * Vercel egress address that is outside the merchant allowlist.
 */
export async function requestAlWaseetJson<T>(
  url: URL,
  init: RequestInit | undefined,
  timeoutMs: number,
): Promise<{ httpStatus: number; body: T }> {
  if (url.protocol !== "https:" || url.hostname !== ALWASEET_API_HOST) {
    throw new Error("ALWASEET_TARGET_NOT_ALLOWED");
  }

  const proxyUrl = fixieProxyUrl();
  const headers = new Headers(init?.headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  headers.set("Accept-Encoding", "identity");

  const payload = serializeBody(init?.body, headers);
  const agent = new HttpsProxyAgent(proxyUrl);

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      agent.destroy();
      callback();
    };
    const fail = (error: Error) => finish(() => reject(error));

    const req = httpsRequest(url, {
      method: init?.method ?? (payload ? "POST" : "GET"),
      headers: Object.fromEntries(headers.entries()),
      agent,
    }, (res) => {
      const chunks: Buffer[] = [];
      let received = 0;

      res.on("data", (chunk: Buffer | Uint8Array | string) => {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        received += buffer.length;
        if (received > MAX_RESPONSE_BYTES) {
          res.destroy(new Error("ALWASEET_RESPONSE_TOO_LARGE"));
          return;
        }
        chunks.push(buffer);
      });

      res.on("error", fail);
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf8");
        let body: T;
        try {
          body = JSON.parse(raw) as T;
        } catch {
          fail(new Error("ALWASEET_INVALID_JSON"));
          return;
        }

        finish(() => resolve({
          httpStatus: res.statusCode ?? 0,
          body,
        }));
      });
    });

    req.on("error", fail);
    req.setTimeout(timeoutMs, () => {
      const error = new Error("ALWASEET_TIMEOUT");
      error.name = "TimeoutError";
      req.destroy(error);
    });

    if (payload) req.write(payload);
    req.end();
  });
}
