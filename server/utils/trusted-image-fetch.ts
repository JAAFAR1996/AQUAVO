import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import { request } from "node:https";
import type { IncomingMessage } from "node:http";
import { OperationalError } from "../middleware/error-handler.js";

export const MAX_ANALYSIS_IMAGE_BYTES = 5 * 1024 * 1024;
export const ANALYSIS_IMAGE_TIMEOUT_MS = 10_000;

const blockedV4 = new BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
  ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24],
  ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const) blockedV4.addSubnet(address, prefix, "ipv4");
const globalV6 = new BlockList();
globalV6.addSubnet("2000::", 3, "ipv6");
const blockedV6 = new BlockList();
blockedV6.addSubnet("2001::", 23, "ipv6");
blockedV6.addSubnet("2001:db8::", 32, "ipv6");
blockedV6.addSubnet("2002::", 16, "ipv6");

export function isPublicImageAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return !blockedV4.check(address, "ipv4");
  return family === 6 && globalV6.check(address, "ipv6") && !blockedV6.check(address, "ipv6");
}

/** Only storefront-owned media, never arbitrary internet URLs or Cloudinary fetch URLs. */
export function validateTrustedImageUrl(value: string, env: NodeJS.ProcessEnv = process.env): URL {
  let url: URL;
  try { url = new URL(value); } catch { throw new OperationalError("رابط الصورة غير صالح", 400); }
  if (url.protocol !== "https:" || url.username || url.password || url.hash || (url.port && url.port !== "443")) {
    throw new OperationalError("ارفع الصورة مباشرة أو استخدم رابط صورة من المتجر", 400);
  }
  let trusted = false;
  if (env.CLOUDFLARE_CDN_URL) {
    try {
      const cdn = new URL(env.CLOUDFLARE_CDN_URL);
      const prefix = cdn.pathname.replace(/\/+$/, "") + "/";
      trusted = cdn.protocol === "https:" && url.origin === cdn.origin && url.pathname.startsWith(prefix);
    } catch { /* Invalid configuration fails closed. */ }
  }
  const cloud = env.CLOUDINARY_CLOUD_NAME;
  if (cloud && /^[A-Za-z0-9_-]+$/.test(cloud)) {
    trusted ||= url.hostname === "res.cloudinary.com" && url.pathname.startsWith("/" + cloud + "/image/upload/");
  }
  if (!trusted || isIP(url.hostname.replace(/^\[|\]$/g, ""))) {
    throw new OperationalError("ارفع الصورة مباشرة أو استخدم رابط صورة من المتجر", 400);
  }
  return url;
}

export function detectAnalysisImageType(buffer: Buffer): "image/jpeg" | "image/png" | "image/gif" | "image/webp" | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return "image/png";
  if (buffer.length >= 6 && /^(GIF87a|GIF89a)$/.test(buffer.subarray(0, 6).toString("ascii"))) return "image/gif";
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;
}

export async function readAnalysisImage(response: IncomingMessage): Promise<{ base64: string; mimeType: string }> {
  const size = Number(response.headers["content-length"]);
  if (Number.isFinite(size) && size > MAX_ANALYSIS_IMAGE_BYTES) {
    response.destroy();
    throw new OperationalError("حجم الصورة أكبر من 5 ميغابايت", 400);
  }
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const part of response) {
    const chunk = Buffer.isBuffer(part) ? part : Buffer.from(part);
    bytes += chunk.length;
    if (bytes > MAX_ANALYSIS_IMAGE_BYTES) {
      response.destroy();
      throw new OperationalError("حجم الصورة أكبر من 5 ميغابايت", 400);
    }
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);
  const mimeType = detectAnalysisImageType(buffer);
  if (!mimeType) throw new OperationalError("الملف مو صورة مدعومة. استخدم JPEG أو PNG أو GIF أو WebP", 400);
  const declared = String(response.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
  if (declared && declared !== mimeType && declared !== "application/octet-stream") {
    throw new OperationalError("نوع ملف الصورة غير مطابق", 400);
  }
  return { base64: buffer.toString("base64"), mimeType };
}

export async function fetchTrustedAnalysisImage(value: string) {
  const url = validateTrustedImageUrl(value);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ANALYSIS_IMAGE_TIMEOUT_MS);
  const aborted = new Promise<never>((_, reject) => {
    controller.signal.addEventListener("abort", () => reject(new OperationalError("انتهى وقت تحميل الصورة، حاول مرة ثانية", 408)), { once: true });
  });
  try {
    const addresses = await Promise.race([lookup(url.hostname, { all: true, verbatim: true }), aborted]);
    if (!addresses.length || addresses.some(({ address }) => !isPublicImageAddress(address))) {
      throw new OperationalError("رابط الصورة غير مسموح", 400);
    }
    const chosen = addresses[0];
    const response = await Promise.race([new Promise<IncomingMessage>((resolve, reject) => {
      const req = request(url, {
        method: "GET", agent: false, signal: controller.signal, family: chosen.family,
        // Pin the validated address: a second DNS lookup cannot rebind to a private host.
        lookup: (_host, _options, callback) => callback(null, chosen.address, chosen.family),
        headers: { Accept: "image/jpeg,image/png,image/gif,image/webp", "Accept-Encoding": "identity" },
      }, resolve);
      req.on("error", reject);
      req.end();
    }), aborted]);
    // No redirects, including redirects between two allowed hostnames.
    if (response.statusCode !== 200) {
      response.destroy();
      throw new OperationalError("تعذر تحميل الصورة من هذا الرابط، ارفعها مباشرة", 400);
    }
    return await Promise.race([readAnalysisImage(response), aborted]);
  } finally { clearTimeout(timer); }
}
