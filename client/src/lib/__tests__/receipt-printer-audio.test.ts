import { describe, expect, it, vi, afterEach } from "vitest";
import { PRINTER_FEED_DURATION, PRINTER_FEED_TIMES, playReceiptPrinterSound } from "../receipt-printer-audio";

afterEach(() => vi.unstubAllGlobals());

describe("thermal receipt printer audio", () => {
  it("uses paired start/end bursts matching the 2.6-second receipt animation", () => {
    expect(PRINTER_FEED_DURATION).toBe(2.6);
    expect(PRINTER_FEED_TIMES).toHaveLength(20);
    expect(PRINTER_FEED_TIMES[0]).toBe(0);
    expect(PRINTER_FEED_TIMES[19]).toBe(1);
    expect(PRINTER_FEED_TIMES.every((time, i) => i === 0 || time >= PRINTER_FEED_TIMES[i - 1])).toBe(true);
  });

  it("fails safely when Web Audio is unavailable", () => {
    vi.stubGlobal("AudioContext", undefined);
    expect(playReceiptPrinterSound()).toBeNull();
  });

  it("starts a restrained audio buffer in sync with the paper and allows cleanup", () => {
    const start = vi.fn();
    const stop = vi.fn();
    const close = vi.fn(async () => undefined);
    const source = { buffer: null as AudioBuffer | null, connect: vi.fn(), start, stop, onended: null as (() => void) | null };
    const gain = { gain: { value: 1 }, connect: vi.fn() };
    class MockAudioContext {
      sampleRate = 8000;
      currentTime = 4;
      destination = {};
      createBuffer(_channels: number, frames: number) {
        const samples = new Float32Array(frames);
        return { getChannelData: () => samples } as unknown as AudioBuffer;
      }
      createBufferSource() { return source; }
      createGain() { return gain; }
      resume() { return Promise.resolve(); }
      close() { return close(); }
    }
    vi.stubGlobal("AudioContext", MockAudioContext);

    const cleanup = playReceiptPrinterSound(0.65);
    expect(cleanup).toBeTypeOf("function");
    expect(start).toHaveBeenCalledWith(4.65);
    expect(gain.gain.value).toBeLessThan(0.4);
    expect(source.buffer).not.toBeNull();
    cleanup?.();
    expect(stop).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
  });
});
