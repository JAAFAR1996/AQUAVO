# Storefront motion review — 2026-10-25

Goal: add visible, restrained movement to the private product-choice review.
Status: implemented; private preview validation in progress. Owner: Jaafar.

Scoped CSS opt-ins preserve the existing global animation backstop. Whole-phrase hero settle preserves connected Arabic; hero image remains immediately visible. Hover lift and image zoom are limited to fine pointers. Touch buttons acknowledge presses. Variant and thumbnail selection use border/background transitions. Confirmed cart toast icon settles once. Existing one-shot section reveal now uses opacity/translation without clipping or blurring text.

All new movement is gated by prefers-reduced-motion. No new runtime dependencies, timers, imagery, data mutations or checkout changes. No claimed conversion or speed improvement.

References inspected: https://www.vengenceui.com/components/flip-text (phrase motion adapted independently, not copied); https://animmasterlib.dev/ (scroll/hover categories); https://skiper-ui.com/components (index returned client loading state; no claim of exhaustive review). No paid component code used.

Validation: TypeScript, production build and focused home/product/gallery/variant tests. Browser and hosting outcomes recorded in handoff. Rollback: revert this motion commit; preserve prior product-choice work. Production release requires owner's specific approval.
