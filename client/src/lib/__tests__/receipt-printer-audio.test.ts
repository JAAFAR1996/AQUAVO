import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PRINTER_FEED_DURATION,
  PRINTER_FEED_TIMES,
  REAL_RECEIPT_PRINTER_AUDIO_URL,
  playReceiptPrinterSound,
  primeReceiptPrinterAudio,
  releaseReceiptPrinterAudio,
} from "../receipt-printer-audio";

afterEach(() => {
  releaseReceiptPrinterAudio();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function mockRealAudio() {
  const start = vi.fn();
  const stop = vi.fn();
  const close = vi.fn(async () => undefined);
  const resume = vi.fn(async () => undefined);
  const decodeAudioData = vi.fn(async (_data: ArrayBuffer) => ({ duration: 2.67 } as AudioBuffer));
  const source = {
    buffer: null as AudioBuffer | null,
    connect: vi.fn(),
    disconnect: vi.fn(),
    start,
    stop,
    onended: null as (() => void) | null,
  };
  const gain = { gain: { value: 1 }, connect: vi.fn(), disconnect: vi.fn() };
  let contexts = 0;
  class FakeContext {
    state: AudioContextState = "running";
    currentTime = 5;
    destination = {};
    constructor() { contexts++; }
    resume() { return resume(); }
    close() { return close(); }
    decodeAudioData(b: ArrayBuffer) { return decodeAudioData(b); }
    createBufferSource() { return source; }
    createGain() { return gain; }
  }
  vi.stubGlobal("AudioContext", FakeContext);
  vi.stubGlobal("fetch", vi.fn(async () => ({
    ok: true,
    arrayBuffer: async () => new ArrayBuffer(256),
  })));
  return { start, stop, resume, close, source, gain, decodeAudioData, getContexts: () => contexts };
}

describe("genuine thermal receipt printer audio", () => {
  it("matches 2.6-second feed keyframes and uses the actual licensed recording", () => {
    expect(PRINTER_FEED_DURATION).toBe(2.6);
    expect(PRINTER_FEED_TIMES).toHaveLength(20);
    expect(PRINTER_FEED_TIMES[0]).toBe(0);
    expect(PRINTER_FEED_TIMES.at(-1)).toBe(1);
    expect(PRINTER_FEED_TIMES.every((time, i) => i === 0 || time >= PRINTER_FEED_TIMES[i - 1])).toBe(true);
    expect(REAL_RECEIPT_PRINTER_AUDIO_URL).toMatch(/^https:\/\/res\.cloudinary\.com\/dyczh8ogv\/video\/upload\/.+\.mp3$/);
  });

  it("does not interrupt checkout when a browser has no Web Audio", () => {
    vi.stubGlobal("AudioContext", undefined);
    vi.stubGlobal("webkitAudioContext", undefined);
    const unavailable = vi.fn();
    primeReceiptPrinterAudio();
    expect(playReceiptPrinterSound(0.65, unavailable)).toBeNull();
    expect(unavailable).toHaveBeenCalledOnce();
  });

  it("preloads from Cloudinary silently at checkout and reuses a single context", async () => {
    const m = mockRealAudio();
    primeReceiptPrinterAudio();
    await vi.waitFor(() => expect(m.decodeAudioData).toHaveBeenCalledOnce());
    expect(m.start).not.toHaveBeenCalled();
    expect(m.getContexts()).toBe(1);
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(REAL_RECEIPT_PRINTER_AUDIO_URL, { cache: "force-cache" });
    const cancel = playReceiptPrinterSound(0.65);
    await vi.waitFor(() => expect(m.start).toHaveBeenCalledOnce());
    expect(m.getContexts()).toBe(1);
    expect(m.decodeAudioData).toHaveBeenCalledOnce();
    expect(m.gain.gain.value).toBe(0.64);
    expect(m.start.mock.calls[0][0]).toBeGreaterThanOrEqual(5);
    cancel?.();
    expect(m.stop).toHaveBeenCalledOnce();
    expect(m.close).not.toHaveBeenCalled();
  });

  it("reuses the decoded recording on repeat print without a second network request", async () => {
    const m = mockRealAudio();
    primeReceiptPrinterAudio();
    await vi.waitFor(() => expect(m.decodeAudioData).toHaveBeenCalledOnce());
    const a = playReceiptPrinterSound(0.65);
    await vi.waitFor(() => expect(m.start).toHaveBeenCalledOnce());
    a?.();
    const b = playReceiptPrinterSound(0.65);
    await vi.waitFor(() => expect(m.start).toHaveBeenCalledTimes(2));
    b?.();
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it("cancels a waiting recording without starting audio after unmount", async () => {
    const m = mockRealAudio();
    let resolveFetch: ((value: {ok: boolean; arrayBuffer: () => Promise<ArrayBuffer>}) => void) | undefined;
    vi.stubGlobal("fetch", vi.fn(() => new Promise(resolve => { resolveFetch = resolve; })));
    const stop = playReceiptPrinterSound(0.65);
    stop?.();
    resolveFetch?.({ ok: true, arrayBuffer: async () => new ArrayBuffer(256) });
    await vi.waitFor(() => expect(m.decodeAudioData).toHaveBeenCalledOnce());
    await Promise.resolve();
    expect(m.start).not.toHaveBeenCalled();
  });

  it("shows an error when the real audio file is unavailable", async () => {
    mockRealAudio();
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false })));
    const unavailable = vi.fn();
    expect(playReceiptPrinterSound(0.65, unavailable)).toBeTypeOf("function");
    await vi.waitFor(() => expect(unavailable).toHaveBeenCalledOnce());
  });
});
