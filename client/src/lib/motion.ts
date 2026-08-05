// Shared motion tokens (2026) — "Snappy Modern" personality.
//
// One vocabulary for every animation in the app so the whole site feels like a
// single, deliberate product (agency-grade). Import these instead of hand-rolling
// spring/easing values per component.
//
// Usage with framer-motion:
//   <motion.div variants={fadeUp} initial="hidden" animate="show" />
//   <motion.div variants={staggerContainer} initial="hidden" whileInView="show" />
//   <motion.button whileTap={tap.scale} transition={springSnappy} />

import type { Transition, Variants } from "framer-motion";

// --- Transitions -----------------------------------------------------------
//
// IDENTITY CONSTRAINT (06_Visual_DNA §17): the only approved motion device is
// the icon's infinity loop drawing itself, 600–800ms ease-in-out, for
// loading/intro states. "No bounce, no spring physics, no particle effects —
// those read as playful-consumer-app, which conflicts with the 'precise' DNA
// trait."
//
// `springSnappy` and `springSoft` were literal spring physics (stiffness 500 /
// 320). They are kept as EXPORTED NAMES so existing imports keep compiling, but
// are now compliant duration+easing tweens. Their names are retained rather than
// deleted deliberately: renaming them would break call sites in the same commit
// that changes their behaviour, making a regression harder to attribute.
// Prefer `tweenQuick` / `tweenSettle` in new code.

/** Quick interaction feedback (buttons, toggles). Ease-out, no overshoot. */
export const tweenQuick: Transition = {
  type: "tween",
  duration: 0.18,
  ease: [0.2, 0.8, 0.2, 1],
};

/** Entrance for larger elements (sheets, cards). Ease-out, no overshoot. */
export const tweenSettle: Transition = {
  type: "tween",
  duration: 0.32,
  ease: [0.2, 0.8, 0.2, 1],
};

/** @deprecated Spring physics is prohibited. Alias of `tweenQuick`. */
export const springSnappy: Transition = tweenQuick;

/** @deprecated Spring physics is prohibited. Alias of `tweenSettle`. */
export const springSoft: Transition = tweenSettle;

// --- Easings (for CSS / tween) --------------------------------------------

/** Ease-out — fast start, gentle settle. No control point above 1 (no overshoot). */
export const easeSnappy = [0.2, 0.8, 0.2, 1] as const;

/** Standard duration for reveal-style tweens. */
export const revealDuration = 0.42;

// --- Reusable variants -----------------------------------------------------

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: revealDuration, ease: easeSnappy },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: revealDuration, ease: easeSnappy } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  show: { opacity: 1, scale: 1, transition: tweenSettle },
};

/** Parent that staggers its children's reveal — the agency "choreography" trick. */
export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06, delayChildren: 0.02 },
  },
};

/** Child to use inside a `staggerContainer`. */
export const staggerItem: Variants = fadeUp;

// --- Interaction presets ---------------------------------------------------

export const tap = {
  /** Press-down feedback for buttons / tappable cards. */
  scale: { scale: 0.97 },
  /** Stronger press for primary CTAs. */
  scaleStrong: { scale: 0.94 },
};

export const hover = {
  lift: { y: -4, transition: tweenQuick },
};
