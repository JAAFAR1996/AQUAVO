import { describe, expect, it, vi, afterEach } from "vitest";
import { PRINTER_FEED_DURATION, PRINTER_FEED_TIMES, playReceiptPrinterSound, primeReceiptPrinterAudio, releaseReceiptPrinterAudio } from "../receipt-printer-audio";

afterEach(() => {
  releaseReceiptPrinterAudio();
  vi.unstubAllGlobals();
});

describe("thermal receipt printer audio", () => {
  it("uses paired motor bursts matching the 2.6-second receipt animation", () => {
    expect(PRINTER_FEED_DURATION).toBe(2.6);
    expect(PRINTER_FEED_TIMES).toHaveLength(20);
    expect(PRINTER_FEED_TIMES[0]).toBe(0);
    expect(PRINTER_FEED_TIMES[19]).toBe(1);
    expect(PRINTER_FEED_TIMES.every((time, i) =>
      i === 0 || time >= PRINTER_FEED_TIMES[i - 1],
    )).toBe(true);
  });

  it("reports unavailable audio and does not falsely enable it", () => {
    vi.stubGlobal("AudioContext", undefined);
    vi.stubGlobal("webkitAudioContext", undefined);
    const unavailable = vi.fn();
    expect(playReceiptPrinterSound(0.65, unavailable)).toBeNull();
    expect(unavailable).toHaveBeenCalledOnce();
  });

  it("starts audibly on the click, feeds after 650ms, and cleans up", () => {
    const start = vi.fn();
    const stop = vi.fn();
    const close = vi.fn(async () => undefined);
    const resume = vi.fn(async () => undefined);
    let samples = new Float32Array();
    const source = {
      buffer: null as AudioBuffer | null,
      connect: vi.fn(), start, stop, onended: null as (() => void) | null,
    };
    const gain = { gain: { value: 1 }, connect: vi.fn() };
    class MockAudioContext {
      sampleRate = 8000;
      currentTime = 4;
      destination = {};
      createBuffer(_channels: number, frames: number) {
        samples = new Float32Array(frames);
        return { getChannelData: () => samples } as unknown as AudioBuffer;
      }
      createBufferSource() { return source; }
      createGain() { return gain; }
      resume() { return resume(); }
      close() { return close(); }
    }
    vi.stubGlobal("AudioContext", MockAudioContext);

    const cleanup = playReceiptPrinterSound(0.65);
    expect(cleanup).toBeTypeOf("function");
    expect(start).toHaveBeenCalledWith(4);
    expect(resume).toHaveBeenCalledOnce();
    expect(source.buffer).not.toBeNull();
    expect(gain.gain.value).toBeGreaterThanOrEqual(0.5);
    expect(samples.length).toBeGreaterThan(8000 * 3);
    // Clicking plays a distinct mechanism tick right away.
    expect(samples.slice(0, 600).some(v => Math.abs(v) > 0.01)).toBe(true);
    // Rollers remain silent during processing, then audibly feed the sheet.
    expect(samples.slice(900, 3500).every(v => Math.abs(v) < 0.0001)).toBe(true);
    expect(samples.slice(5600, 12000).some(v => Math.abs(v) > 0.08)).toBe(true);
    cleanup?.();
    expect(stop).toHaveBeenCalledOnce();
    expect(close).not.toHaveBeenCalled(); // stays unlocked for future prints
  });


  it("primes silently at checkout and reuses the audio context for automatic printing", () => {
    let created = 0;
    const start = vi.fn();
    const resume = vi.fn(async () => undefined);
    const close = vi.fn(async () => undefined);
    class MockAudioContext {
      sampleRate = 8000;
      currentTime = 3;
      state: AudioContextState = "running";
      destination = {};
      constructor() { created++; }
      createBuffer(_channels: number, frames: number) {
        return { getChannelData: () => new Float32Array(frames) };
      }
      createBufferSource() {
        return { buffer: null, connect: vi.fn(), start, stop: vi.fn(), onended: null };
      }
      createGain() { return { gain: { value: 0 }, connect: vi.fn() }; }
      resume() { return resume(); }
      close() { return close(); }
    }
    vi.stubGlobal("AudioContext", MockAudioContext);
    primeReceiptPrinterAudio();
    expect(created).toBe(1);
    expect(start).not.toHaveBeenCalled(); // confirming a checkout isn't a printer noise
    const stop = playReceiptPrinterSound(0.65);
    expect(created).toBe(1); // not a second, possibly autoplay-blocked context
    expect(start).toHaveBeenCalledWith(3);
    expect(resume).toHaveBeenCalledTimes(2);
    stop?.();
    expect(close).not.toHaveBeenCalled();
  });

  it("supports older Safari's prefixed audio context", () => {
    const start = vi.fn();
    vi.stubGlobal("AudioContext", undefined);
    class PrefixedContext {
      sampleRate = 8000;
      currentTime = 0;
      destination = {};
      createBuffer(_channels: number, frames: number) {
        return { getChannelData: () => new Float32Array(frames) };
      }
      createBufferSource() {
        return { buffer: null, connect: vi.fn(), start, stop: vi.fn(), onended: null };
      }
      createGain() { return { gain: { value: 0 }, connect: vi.fn() }; }
      resume() { return Promise.resolve(); }
      close() { return Promise.resolve(); }
    }
    vi.stubGlobal("webkitAudioContext", class extends PrefixedContext {
      createBufferSource() {
        return { buffer: null, connect: vi.fn(), start, stop: vi.fn(), onended: null };
      }
    });
    expect(playReceiptPrinterSound(0.65)).toBeTypeOf("function");
    expect(start).toHaveBeenCalledOnce();
  });

  it("reports an audio resume policy error without crashing checkout", async () => {
    const error = vi.fn();
    vi.stubGlobal("AudioContext", class {
      sampleRate = 8000;
      currentTime = 0;
      destination = {};
      createBuffer(_channels: number, frames: number) {
        return { getChannelData: () => new Float32Array(frames) };
      }
      createBufferSource() {
        return { buffer: null, connect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null };
      }
      createGain() { return { gain: { value: 0 }, connect: vi.fn() }; }
      resume() { return Promise.reject(new Error("NotAllowedError")); }
      close() { return Promise.resolve(); }
    });
    expect(playReceiptPrinterSound(0.65, error)).toBeTypeOf("function");
    await vi.waitFor(() => expect(error).toHaveBeenCalledOnce());
  });
});
