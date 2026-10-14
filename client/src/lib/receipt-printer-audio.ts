/**
 * A short thermal receipt printer sound, rendered locally with Web Audio.
 * No audio downloads, tracking or network dependency.
 *
 * Browser autoplay policies require an actual user click before sound can play.
 * The click makes an audible motor-engagement tick immediately; the rollers then
 * start after the same 650ms delay as the receipt animation.
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

type LegacyAudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

/**
 * Start printer audio synchronously from a click handler. Returns a cleanup
 * function, or null if this browser cannot create Web Audio. onUnavailable is
 * called on startup/resume failure so the UI does not falsely claim sound is on.
 */
export function playReceiptPrinterSound(
  delaySeconds = 0.65,
  onUnavailable?: () => void,
): (() => void) | null {
  if (typeof window === "undefined") {
    onUnavailable?.();
    return null;
  }

  const AudioContextConstructor =
    window.AudioContext ?? (window as LegacyAudioWindow).webkitAudioContext;
  if (!AudioContextConstructor) {
    onUnavailable?.();
    return null;
  }

  let context: AudioContext | null = null;
  try {
    // Create and schedule while the user's click still grants activation.
    context = new AudioContextConstructor();
    const rate = context.sampleRate;
    const delay = Math.min(2, Math.max(0, delaySeconds));
    const length = Math.ceil(rate * (delay + PRINTER_FEED_DURATION + 0.16));
    const buffer = context.createBuffer(1, length, rate);
    const data = buffer.getChannelData(0);
    let seed = 786451;
    let lowNoise = 0;

    for (let i = 0; i < length; i++) {
      const t = i / rate;
      const feedTime = t - delay;
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const noise = (seed / 4294967295) * 2 - 1;
      lowNoise += 0.07 * (noise - lowNoise);

      // The short mechanical latch confirms the switch worked immediately.
      const engage = t < 0.085
        ? Math.exp(-t * 55) * (
          0.52 * Math.sin(Math.PI * 2 * 135 * t) + 0.2 * noise
        )
        : 0;

      let feed = 0;
      let rollerClick = 0;
      if (feedTime >= 0) {
        for (const burst of FEED_BURSTS) {
          if (feedTime >= burst.from && feedTime < burst.to) {
            feed = Math.max(0, Math.min(1,
              (feedTime - burst.from) / 0.006,
              (burst.to - feedTime) / 0.012,
            ));
          }
          const atStop = feedTime - burst.to;
          if (atStop >= 0 && atStop < 0.022) {
            rollerClick += Math.exp(-atStop * 195)
              * (0.62 * Math.sin(atStop * Math.PI * 2 * 380) + 0.16 * noise);
          }
        }
      }

      // Ratcheting stepper motor plus close, scratchy paper friction.
      const motor = Math.sin(Math.PI * 2 * 142 * feedTime) * 0.32
        + Math.sin(Math.PI * 2 * 284 * feedTime) * 0.1
        + Math.sin(Math.PI * 2 * 71 * feedTime) * 0.065;
      const paper = (noise - lowNoise) * 0.37 + lowNoise * 0.23;
      const finish = feedTime - PRINTER_FEED_DURATION;
      const cutter = finish >= 0 && finish < 0.085
        ? Math.exp(-finish * 58) * (
          0.58 * Math.sin(Math.PI * 2 * 210 * finish) + 0.23 * noise
        ) : 0;

      data[i] = Math.max(-0.95, Math.min(0.95,
        engage + feed * (motor + paper) + 0.24 * rollerClick + cutter,
      ));
    }

    const source = context.createBufferSource();
    source.buffer = buffer;
    const volume = context.createGain();
    // Old 0.28 made an already quiet motor almost inaudible on phone speakers.
    volume.gain.value = 0.64;
    source.connect(volume);
    volume.connect(context.destination);

    const audioContext = context;
    let stopped = false;
    const stop = () => {
      if (stopped) return;
      stopped = true;
      try { source.stop(); } catch { /* may have ended already */ }
      void audioContext.close().catch(() => {});
    };

    source.onended = stop;
    // The source starts immediately, not 650ms later. Its PCM itself contains
    // the startup tick, then silence until the paper feed at t=delay.
    source.start(audioContext.currentTime);
    void audioContext.resume().catch(() => {
      stop();
      onUnavailable?.();
    });
    return stop;
  } catch {
    if (context) void context.close().catch(() => {});
    onUnavailable?.();
    return null;
  }
}
