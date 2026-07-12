# Test report

## Green gates

- `pnpm exec tsc -p tsconfig.json --noEmit --incremental false` — passed.
- `pnpm exec vitest run` — passed, exit 0 (complete Vitest collection).
- `pnpm run build` — passed; 4,006 modules transformed; server bundle generated.
- `pnpm run test:performance-budget` — passed all five budgets.
- Focused commerce/SEO/analytics run — 65/65 passed.
- Focused 3D + v2 Chromium run — 10/10 passed on the final local production build.
- Earlier 3D-only run — 2/2 passed with real mouse and CDP touch input.

## Browser evidence

The release-specific suite covers desktop/tablet/mobile foundation, footer entity facts, products recovery, YEE keyboard behavior, checkout validation without submission, deferred 3D, real mouse rotation, real touch rotation, reset, zoom controls, and page scroll outside the viewer.

The older broad Chromium selection completed 98 tests: 84 passed and 14 failed because its selectors and expected payment/navigation UI describe retired flows. It includes expectations for payment options that AQUAVO must not enable. These tests were not rewritten to make false business behavior pass. They remain recorded as legacy test debt.

Warnings retained honestly: some React tests emit existing `act(...)` warnings; one invoice dialog test emits an existing missing-description warning; image migration deliberately logs its mocked Cloudinary failure path; optional AI-key warnings occur because no keys are supplied to tests.
