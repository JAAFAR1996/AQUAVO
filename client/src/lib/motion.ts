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

// --- Springs ---------------------------------------------------------------

/** Crisp, responsive spring for interactions (buttons, toggles, dock). */
export const springSnappy: Transition = {
  type: "spring",
  stiffness: 500,
  damping: 30,
  mass: 0.8,
};

/** Slightly looser spring for larger elements entering (sheets, cards). */
export const springSoft: Transition = {
  type: "spring",
  stiffness: 320,
  damping: 34,
};

// --- Easings (for CSS / tween) --------------------------------------------

/** Snappy ease-out — fast start, gentle settle. Matches the CSS token below. */
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
  show: { opacity: 1, scale: 1, transition: springSnappy },
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
  lift: { y: -4, transition: springSnappy },
};
