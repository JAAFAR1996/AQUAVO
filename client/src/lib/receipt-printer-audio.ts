/**
 * Short, locally synthesized thermal receipt-printer sound. No third-party
 * audio files, network calls, tracking or dependencies.
 *
 * The sound can only be started from a user action (browser autoplay policy).
 * Motor bursts use the exact same timing as the paper-feed keyframes.
 */
export const PRINTER_FEED_DURATION = 2.6;

export const PRINTER_FEED_TIMES = [
  0, 0.075, 0.105, 0.18, 0.21, 0.285, 0.315,
  0.39, 0.42, 0.495, 0.525, 0.6, 0.63, 0.705,
  0.735, 0.81, 0.84, 0.915, 0.945, 1,
];

const FEED_BURSTS = Array.from({ length: PRINTER_FEED_TIMES.length / 2 }, (_, i) => ({
  from: PRINTER_FEED_DURATION * PRINTER_FEED_TIMES[i * 2],
  to: PRINTER_FEED_DURATION * PRINTER_FEED_TIMES[i * 2 + 1],
}));

/** Returns a cleanup function or null when Web Audio is unavailable. */
export function playReceiptPrinterSound(delaySeconds = 0.65): (() => void) | null {
  if (typeof window === "undefined" || typeof window.AudioContext !== "function") return null;

  let context: AudioContext | null = null;
  try {
    context = new window.AudioContext();
    const rate = context.sampleRate;
    const length = Math.ceil(rate * (PRINTER_FEED_DURATION + 0.16));
    const buffer = context.createBuffer(1, length, rate);
    const data = buffer.getChannelData(0);
    let seed = 786451;
    let lowNoise = 0;

    // Low stepper motor + close paper friction + very short roller clicks.
    // Deterministic so replays sound consistent rather than randomly harsh.
    for (let i = 0; i < length; i++) {
      const time = i / rate;
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const noise = (seed / 4294967295) * 2 - 1;
      lowNoise += 0.055 * (noise - lowNoise);

      let feed = 0;
      let rollerClick = 0;
      for (const burst of FEED_BURSTS) {
        if (time >= burst.from && time < burst.to) {
          feed = Math.max(0, Math.min(1, (time - burst.from) / 0.006, (burst.to - time) / 0.012));
        }
        const atStop = time - burst.to;
        if (atStop >= 0 && atStop < 0.018) {
          rollerClick += Math.exp(-atStop * 260) * Math.sin(atStop * Math.PI * 2 * 350);
        }
      }

      const motor = Math.sin(Math.PI * 2 * 142 * time) * 0.22
        + Math.sin(Math.PI * 2 * 284 * time) * 0.075;
      const paper = (noise - lowNoise) * 0.27 + lowNoise * 0.17;
      // A short, dull end-of-feed mechanism sound, not a loud cash-register bell.
      const finish = time - PRINTER_FEED_DURATION;
      const cutter = finish >= 0 && finish < 0.07
        ? Math.exp(-finish * 75) * (
          0.38 * Math.sin(Math.PI * 2 * 220 * finish) + 0.2 * noise
        ) : 0;
      data[i] = Math.max(-0.9, Math.min(0.9,
        feed * (motor + paper) + 0.12 * rollerClick + cutter
      ));
    }

    const source = context.createBufferSource();
    source.buffer = buffer;
    const volume = context.createGain();
    volume.gain.value = 0.28; // Restrained level in the order-confirmation page.
    source.connect(volume);
    volume.connect(context.destination);

    let stopped = false;
    const audioContext = context;
    const stop = () => {
      if (stopped) return;
      stopped = true;
      try { source.stop(); } catch { /* may not have started yet */ }
      void audioContext.close().catch(() => {});
    };

    source.onended = stop;
    // Called during the click handler so Chrome/iOS can unlock Web Audio.
    void audioContext.resume().catch(stop);
    source.start(audioContext.currentTime + Math.max(0, delaySeconds));
    return stop;
  } catch {
    if (context) void context.close().catch(() => {});
    return null;
  }
}
