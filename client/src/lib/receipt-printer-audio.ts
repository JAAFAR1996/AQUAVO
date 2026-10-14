/**
 * AQUAVO thermal receipt-printer audio.
 *
 * The sound is made from real CC0 field recordings, not synthesized oscillators:
 * - thepodcastdoctor, "Receipt Printer 01", Freesound 476011 (pharmacy receipt printer)
 * - twisterad3, "Thermal Receipt Print & Cut", Freesound 413838 (Star Micronics)
 *
 * Mixed to match AQUAVO's 2.6-second paper-feed animation, with the cutter
 * near the end. Stored on AQUAVO Cloudinary (39 KB MP3, CORS enabled).
 * See docs/receipt-printer-audio-sources.md for complete provenance.
 */
export const PRINTER_FEED_DURATION = 2.6;

export const PRINTER_FEED_TIMES = [
  0, 0.075, 0.105, 0.18, 0.21, 0.285, 0.315,
  0.39, 0.42, 0.495, 0.525, 0.6, 0.63, 0.705,
  0.735, 0.81, 0.84, 0.915, 0.945, 1,
];

export const REAL_RECEIPT_PRINTER_AUDIO_URL =
  "https://res.cloudinary.com/dyczh8ogv/video/upload/v1791985756/aquavo/ui/receipt-printer/real-thermal-receipt-print-cut-cc0-v1.mp3";

type LegacyAudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

let sharedContext: AudioContext | null = null;
let decodedRecording: AudioBuffer | null = null;
let loadingRecording: Promise<AudioBuffer> | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Constructor = window.AudioContext ?? (window as LegacyAudioWindow).webkitAudioContext;
  if (!Constructor) return null;
  try {
    if (!sharedContext || sharedContext.state === "closed") {
      sharedContext = new Constructor();
    }
    return sharedContext;
  } catch {
    return null;
  }
}

function loadRecording(context: AudioContext): Promise<AudioBuffer> {
  if (decodedRecording) return Promise.resolve(decodedRecording);
  if (!loadingRecording) {
    loadingRecording = fetch(REAL_RECEIPT_PRINTER_AUDIO_URL, { cache: "force-cache" })
      .then(response => {
        if (!response.ok) throw new Error("Receipt printer recording unavailable");
        return response.arrayBuffer();
      })
      .then(bytes => context.decodeAudioData(bytes))
      .then(audio => {
        // Keep only the small decoded recording for the current page session.
        decodedRecording = audio;
        return audio;
      })
      .catch(error => {
        // Retry on next replay if the connection was temporarily unavailable.
        loadingRecording = null;
        throw error;
      });
  }
  return loadingRecording;
}

/**
 * Called synchronously on checkout confirmation click to unlock Web Audio and
 * begin prefetching the recording. NEVER delays/submits/changes checkout data.
 */
export function primeReceiptPrinterAudio(): void {
  const context = getContext();
  if (!context) return;
  void context.resume().catch(() => {});
  void loadRecording(context).catch(() => {});
}

/** Stop/close audio and clear the cache for isolated tests or page disposal. */
export function releaseReceiptPrinterAudio(): void {
  const context = sharedContext;
  sharedContext = null;
  decodedRecording = null;
  loadingRecording = null;
  if (context && context.state !== "closed") {
    void context.close().catch(() => {});
  }
}

/**
 * Schedule the real printer recording to begin with the paper feed.
 *
 * Returning a cancel function synchronously makes component cleanup reliable
 * even if the audio is still downloading. Chrome/Safari autoplay restrictions
 * still apply if the user opens an order URL without a prior click.
 */
export function playReceiptPrinterSound(
  delaySeconds = 0.65,
  onUnavailable?: () => void,
): (() => void) | null {
  const context = getContext();
  if (!context) {
    onUnavailable?.();
    return null;
  }

  const delay = Math.min(2, Math.max(0, delaySeconds));
  const targetMs = performance.now() + delay * 1000;
  let stopped = false;
  let source: AudioBufferSourceNode | null = null;
  let notified = false;

  const fail = () => {
    if (stopped || notified) return;
    notified = true;
    onUnavailable?.();
  };

  // A context unlocked by the checkout click resolves immediately. If a user
  // landed directly on the order URL, the browser may reject/suspend autoplay.
  const resume = context.state === "running"
    ? Promise.resolve()
    : Promise.race([
        context.resume(),
        new Promise<void>((_, reject) => {
          window.setTimeout(() => reject(new Error("Audio autoplay blocked")), 2000);
        }),
      ]);

  void Promise.all([resume, loadRecording(context)])
    .then(([, recording]) => {
      if (stopped || context.state !== "running") {
        if (!stopped) fail();
        return;
      }

      // If network decoding takes time, seek into the recording instead of
      // playing a delayed sound after the receipt has finished animating.
      const elapsed = (performance.now() - targetMs) / 1000;
      if (elapsed >= recording.duration) return;

      const node = context.createBufferSource();
      node.buffer = recording;
      const volume = context.createGain();
      volume.gain.value = 0.64;
      node.connect(volume);
      volume.connect(context.destination);
      node.onended = () => {
        node.disconnect();
        volume.disconnect();
      };
      source = node;

      const startAfter = Math.max(0, -elapsed);
      const startOffset = Math.max(0, elapsed);
      node.start(context.currentTime + startAfter, startOffset);
    })
    .catch(fail);

  return () => {
    stopped = true;
    if (source) {
      try { source.stop(); } catch { /* already ended */ }
    }
  };
}
