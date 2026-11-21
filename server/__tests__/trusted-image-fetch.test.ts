import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Readable } from "node:stream";
import type { IncomingMessage } from "node:http";

const mocks = vi.hoisted(() => ({ lookup: vi.fn(), request: vi.fn() }));
vi.mock("node:dns/promises", () => ({ lookup: mocks.lookup, default: { lookup: mocks.lookup } }));
vi.mock("node:https", () => ({ request: mocks.request, default: { request: mocks.request } }));
import { fetchTrustedAnalysisImage, isPublicImageAddress, validateTrustedImageUrl, readAnalysisImage,
  MAX_ANALYSIS_IMAGE_BYTES, ANALYSIS_IMAGE_TIMEOUT_MS } from "../utils/trusted-image-fetch.js";

const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0]);
function response(chunks: Buffer[], headers: Record<string, string> = {}, statusCode = 200) {
  return Object.assign(Readable.from(chunks), { headers, statusCode }) as unknown as IncomingMessage;
}
beforeEach(() => {
  vi.stubEnv("CLOUDFLARE_CDN_URL", "https://media.example.com/uploads");
  vi.stubEnv("CLOUDINARY_CLOUD_NAME", "owned-cloud");
  mocks.lookup.mockReset().mockResolvedValue([{ address: "104.16.1.1", family: 4 }]);
  mocks.request.mockReset();
});
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });

describe("trusted media fetch boundary", () => {
  it.each(["http://media.example.com/uploads/a.png", "https://127.0.0.1/a.png", "https://media.example.com.evil.test/uploads/a.png",
    "https://user:password@media.example.com/uploads/a.png", "https://media.example.com:8080/uploads/a.png",
    "https://media.example.com/outside/a.png", "https://res.cloudinary.com/other/image/upload/a.png",
    "https://res.cloudinary.com/owned-cloud/image/fetch/https://internal/a.png"])("rejects unowned or unsafe URL %s", url => {
    expect(() => validateTrustedImageUrl(url)).toThrow();
  });
  it("accepts only owned upload namespaces", () => {
    expect(validateTrustedImageUrl("https://media.example.com/uploads/a.png").hostname).toBe("media.example.com");
    expect(validateTrustedImageUrl("https://res.cloudinary.com/owned-cloud/image/upload/v1/a.png").pathname).toContain("/image/upload/");
  });
  it.each(["127.0.0.1", "10.0.0.1", "169.254.169.254", "100.64.1.1", "192.168.1.1", "::1", "::ffff:127.0.0.1", "fc00::1", "fe80::1", "2001:db8::1"])("rejects nonpublic IP %s", address => {
    expect(isPublicImageAddress(address)).toBe(false);
  });
  it("rejects mixed public/private DNS answers before opening a socket", async () => {
    mocks.lookup.mockResolvedValue([{ address: "104.16.1.1", family: 4 }, { address: "10.0.0.1", family: 4 }]);
    await expect(fetchTrustedAnalysisImage("https://media.example.com/uploads/a.png")).rejects.toThrow();
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it("pins the checked address, preserves the TLS hostname and reads validated bytes", async () => {
    mocks.request.mockImplementation((url: URL, options: { lookup: (host: string, opts: object, callback: (error: null, address: string, family: number) => void) => void }, callback: (message: IncomingMessage) => void) => {
      expect(url.hostname).toBe("media.example.com");
      const pinned = vi.fn(); options.lookup(url.hostname, {}, pinned);
      expect(pinned).toHaveBeenCalledWith(null, "104.16.1.1", 4);
      return { on: vi.fn(), end: () => callback(response([png], { "content-type": "image/png" })) };
    });
    await expect(fetchTrustedAnalysisImage("https://media.example.com/uploads/a.png"))
      .resolves.toEqual({ base64: png.toString("base64"), mimeType: "image/png" });
    expect(mocks.lookup).toHaveBeenCalledTimes(1);
  });
  it("does not follow redirects", async () => {
    mocks.request.mockImplementation((_url: URL, _options: unknown, callback: (message: IncomingMessage) => void) => ({
      on: vi.fn(), end: () => callback(response([], { location: "http://127.0.0.1/" }, 302)),
    }));
    await expect(fetchTrustedAnalysisImage("https://media.example.com/uploads/a.png")).rejects.toThrow();
    expect(mocks.request).toHaveBeenCalledTimes(1);
  });
  it("enforces the timeout while DNS is still unresolved", async () => {
    vi.useFakeTimers(); mocks.lookup.mockReturnValue(new Promise(() => {}));
    const result = expect(fetchTrustedAnalysisImage("https://media.example.com/uploads/a.png")).rejects.toMatchObject({ statusCode: 408 });
    await vi.advanceTimersByTimeAsync(ANALYSIS_IMAGE_TIMEOUT_MS);
    await result;
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it("bounds streamed bytes even without a Content-Length", async () => {
    await expect(readAnalysisImage(response([png, Buffer.alloc(MAX_ANALYSIS_IMAGE_BYTES)]))).rejects.toThrow();
  });
  it("rejects non-images and mismatched declarations", async () => {
    await expect(readAnalysisImage(response([Buffer.from("<html>secret</html>")], { "content-type": "image/png" }))).rejects.toThrow();
    await expect(readAnalysisImage(response([png], { "content-type": "image/jpeg" }))).rejects.toThrow();
  });
});
