# 3D root cause and verification

## Root cause

The underlying `<model-viewer>` camera controls were functional. The reliability defect came from AQUAVO's six-second `requestAnimationFrame` camera-orbit loop, which repeatedly forced the camera back toward an automated goal while a customer could already begin dragging. That race made early interaction appear ignored. The component also lacked visible reset/zoom alternatives and used continuous pulse/bounce prompts, contrary to Minimal Precision and reduced-motion expectations.

## Fix

- Kept the viewer code-split and absent before explicit activation.
- Kept `camera-controls` and `touch-action="pan-y"`.
- Removed the automatic orbit loop and continuous prompt animation.
- Added keyboard-focusable Reset, Zoom In, and Zoom Out controls.
- Hid the hint on pointer, wheel, or genuine model-viewer user interaction.
- Added truthful Arabic text identifying the 3D object as illustrative; product photos, dimensions, packaging, and written specifications remain authoritative.
- Static product images remain accessible if WebGL or the model fails.

## Automated proof

Command:

`PLAYWRIGHT_BASE_URL=http://127.0.0.1:5000 pnpm exec playwright test e2e/product-3d-interaction.spec.ts --project=chromium --workers=1`

Result: 2/2 passed. The desktop test activates the viewer, waits for the real local GLB to load, performs a real left-button drag, and asserts a camera-theta change greater than 0.2 radians before verifying Reset. The mobile test uses Chrome DevTools Protocol touch events, asserts a camera-theta change greater than 0.2 radians, verifies explicit zoom controls, and proves the page still scrolls outside the viewer.

The same test captures before/after screenshots as Playwright attachments. A visible model by itself is not counted as proof.
