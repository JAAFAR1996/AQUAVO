const FALLBACK_CARD_BACKGROUND = "#f5f3f0";

export interface AdaptiveBackgroundResult {
  imageBackground: string;
  seamBackground: string;
  confidence: number;
  mode: "matched" | "guarded" | "fallback";
}

type RGB = { r: number; g: number; b: number };

const backgroundCache = new Map<string, AdaptiveBackgroundResult>();

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function srgbChannelToLinear(channel: number) {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
}

function luminance({ r, g, b }: RGB) {
  return (
    0.2126 * srgbChannelToLinear(r) +
    0.7152 * srgbChannelToLinear(g) +
    0.0722 * srgbChannelToLinear(b)
  );
}

function colorDistance(a: RGB, b: RGB) {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[middle - 1] + sorted[middle]) / 2)
    : sorted[middle];
}

function rgbToHex({ r, g, b }: RGB) {
  const toHex = (value: number) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function mix(a: RGB, b: RGB, ratio: number): RGB {
  const t = clamp(ratio, 0, 1);
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

function hexToRgb(hex: string): RGB {
  const normalized = hex.replace("#", "");
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function isBorderPixel(x: number, y: number, size: number, ring: number) {
  return x < ring || y < ring || x >= size - ring || y >= size - ring;
}

function fallbackResult(): AdaptiveBackgroundResult {
  return {
    imageBackground: FALLBACK_CARD_BACKGROUND,
    seamBackground: FALLBACK_CARD_BACKGROUND,
    confidence: 0,
    mode: "fallback",
  };
}

export function getCachedAdaptiveBackground(key: string) {
  return backgroundCache.get(key);
}

export function clearAdaptiveBackgroundCache() {
  backgroundCache.clear();
}

export function analyzeImageBackground(
  image: HTMLImageElement,
  cacheKey: string,
): AdaptiveBackgroundResult {
  const cached = backgroundCache.get(cacheKey);
  if (cached) return cached;

  try {
    if (!image.naturalWidth || !image.naturalHeight) return fallbackResult();

    const size = 32;
    const ring = 5;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return fallbackResult();

    context.drawImage(image, 0, 0, size, size);
    const { data } = context.getImageData(0, 0, size, size);

    const samples: RGB[] = [];
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        if (!isBorderPixel(x, y, size, ring)) continue;
        const index = (y * size + x) * 4;
        const alpha = data[index + 3];
        if (alpha < 220) continue;
        samples.push({ r: data[index], g: data[index + 1], b: data[index + 2] });
      }
    }

    if (samples.length < 80) return fallbackResult();

    const candidate: RGB = {
      r: median(samples.map((sample) => sample.r)),
      g: median(samples.map((sample) => sample.g)),
      b: median(samples.map((sample) => sample.b)),
    };

    const closeSamples = samples.filter((sample) => colorDistance(sample, candidate) <= 34);
    const uniformity = closeSamples.length / samples.length;

    const cornerSize = 5;
    const cornerMeans: RGB[] = [];
    const cornerOrigins = [
      [0, 0],
      [size - cornerSize, 0],
      [0, size - cornerSize],
      [size - cornerSize, size - cornerSize],
    ] as const;

    for (const [startX, startY] of cornerOrigins) {
      const cornerSamples: RGB[] = [];
      for (let y = startY; y < startY + cornerSize; y += 1) {
        for (let x = startX; x < startX + cornerSize; x += 1) {
          const index = (y * size + x) * 4;
          if (data[index + 3] < 220) continue;
          cornerSamples.push({ r: data[index], g: data[index + 1], b: data[index + 2] });
        }
      }
      if (cornerSamples.length === 0) continue;
      cornerMeans.push({
        r: median(cornerSamples.map((sample) => sample.r)),
        g: median(cornerSamples.map((sample) => sample.g)),
        b: median(cornerSamples.map((sample) => sample.b)),
      });
    }

    const maxCornerDistance = cornerMeans.reduce((maxDistance, corner) => {
      return Math.max(maxDistance, colorDistance(corner, candidate));
    }, 0);
    const cornerAgreement = 1 - clamp(maxCornerDistance / 100, 0, 1);
    const confidence = clamp(uniformity * 0.75 + cornerAgreement * 0.25, 0, 1);

    if (confidence < 0.56) {
      const result = fallbackResult();
      backgroundCache.set(cacheKey, result);
      return result;
    }

    const base = hexToRgb(FALLBACK_CARD_BACKGROUND);
    const candidateLuminance = luminance(candidate);
    const chroma = Math.max(candidate.r, candidate.g, candidate.b) - Math.min(candidate.r, candidate.g, candidate.b);

    // Very dark or strongly colored photographic backgrounds should not tint the
    // entire information area. Match the image frame exactly, then fade quickly
    // toward the neutral AQUAVO card surface.
    const guarded = candidateLuminance < 0.56 || chroma > 72;
    const seam = guarded ? mix(candidate, base, 0.72) : candidate;

    const result: AdaptiveBackgroundResult = {
      imageBackground: rgbToHex(candidate),
      seamBackground: rgbToHex(seam),
      confidence,
      mode: guarded ? "guarded" : "matched",
    };

    backgroundCache.set(cacheKey, result);
    return result;
  } catch {
    // Cross-origin images without canvas permission simply keep the neutral
    // fallback. Product rendering must never fail because color sampling failed.
    const result = fallbackResult();
    backgroundCache.set(cacheKey, result);
    return result;
  }
}

export { FALLBACK_CARD_BACKGROUND };
