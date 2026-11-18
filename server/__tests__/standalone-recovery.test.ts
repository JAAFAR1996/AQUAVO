import { afterEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { renderLocalFallbackHtml, serveStatic } from "../static.js";
const TEMPLATE = '<html><head><title>__META_TITLE__</title></head><body><div id="root"></div></body></html>';
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
function app() {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  const instance = express(); serveStatic(instance); return instance;
}
describe("standalone recovery", () => {
  it("labels preview HTML and removes the label at production cutover", () => {
    vi.stubEnv("RECOVERY_PREVIEW", "true");
    expect(renderLocalFallbackHtml(TEMPLATE, "/products")).toContain("نسخة فحص — الطلبات هنا تجريبية");
    expect(renderLocalFallbackHtml(TEMPLATE, "/guides")).toContain('id="aquavo-recovery-preview"');
    vi.stubEnv("RECOVERY_PREVIEW", "false");
    expect(renderLocalFallbackHtml(TEMPLATE, "/products")).not.toContain('id="aquavo-recovery-preview"');
  });
  it("serves only the pinned same-origin font, caches it, and marks previews noindex", async () => {
    vi.stubEnv("RECOVERY_PREVIEW", "true");
    const fetchMock = vi.fn().mockResolvedValue(new Response("wOFFtest-font"));
    vi.stubGlobal("fetch", fetchMock);
    const instance = app();
    const first = await request(instance).get("/fonts/aquavo-noto-sans-arabic-400.woff?url=https://example.invalid");
    expect(first.status).toBe(200);
    expect(first.headers["content-type"]).toContain("font/woff");
    expect(first.headers["cache-control"]).toBe("public, max-age=31536000, immutable");
    expect(first.headers["x-robots-tag"]).toBe("noindex, nofollow");
    expect(fetchMock).toHaveBeenCalledWith("https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-arabic@5.0.13/files/noto-sans-arabic-arabic-400-normal.woff", expect.objectContaining({ redirect: "error", signal: expect.any(AbortSignal) }));
    await request(instance).get("/fonts/aquavo-noto-sans-arabic-400.woff").expect(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("rejects an oversized upstream font without caching a failed response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("wOFFbad-font", { headers: { "content-length": String(2 * 1024 * 1024) } })));
    const response = await request(app()).get("/fonts/aquavo-noto-sans-arabic-700.woff");
    expect(response.status).toBe(502);
    expect(response.headers["cache-control"]).toBe("no-store");
  });
});
