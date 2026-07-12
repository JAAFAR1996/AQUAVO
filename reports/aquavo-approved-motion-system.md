# AQUAVO Approved Motion System

Date: 2026-07-12
Direction: Minimal Precision

## Implemented primitives

| Primitive | Purpose | Motion | Reduced motion |
|---|---|---|---|
| Controlled Waterline | Brand-signature boundary on the homepage hero | 520 ms scale X, 1 px line | Static visible line |
| Proof Window | Direct attention to evidence and real imagery | 360 ms, 6 px vertical settle plus opacity | Immediate final state |
| Trust Seal | Establish the verified service promise block | 260 ms opacity only | Immediate final state |
| Filter Chamber | Group filter and sort controls | Static 2 px FlowLine rail | Same static rail |
| Evidence Anchor | Make proof interaction obvious to keyboard users | Focus outline only | Identical |

All animated content is visible in its final layout before motion. The implementation uses native CSS only and does not add JavaScript observers, layout measurement, GSAP, WebGL, Three.js, autoplay media, parallax or an endless decorative loop.

## Accepted existing interaction patterns

- Valve-Gate Menu uses the existing accessible sheet/drawer direction.
- Product and certificate galleries keep direct controls and contained media.
- Checkout validation and totals update immediately.
- Loading uses dimension-stable skeletons.
- Recovery uses one clear error state and retry action.
- Order success remains gated by a confirmed server response.

## Rejected concepts

- Circulation Loop Cart / flying product: harms transactional clarity and conflicts with the explicit prohibition.
- Filtration Path Diagram: no verified universal process exists for the current mixed catalog.
- Animated Specification Channel: would slow access to decision-critical facts.
- Stability Gauge: would imply measured stability data AQUAVO does not possess.

## Verification evidence

- Motion unit contract: 3/3 tests passed.
- Related homepage/store/certificate tests: 13/13 tests passed across the executed files.
- Chromium at 390×844: one H1 and no horizontal overflow.
- Browser media emulation proved `aquavo-waterline-enter` and `aquavo-proof-window` run with normal preference and compute to `animation-name: none` with reduced motion.
