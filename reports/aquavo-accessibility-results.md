# AQUAVO Accessibility Results

Date: 2026-07-12

## Scope actually tested

- Chromium at 390×844 with reduced motion.
- Routes: `/`, `/faq`, `/shipping`, `/return-policy`, `/privacy-policy`, `/terms`, `/verify-certificate/yee`.
- Axe-core 4.12.1 rules tagged WCAG 2 A, AA and WCAG 2.1 AA, injected from the pinned jsDelivr package after the local package install timed out.
- Manual evidence already completed for mobile menu, checkout validation, certificate open/zoom/reset/Escape/close/back and reduced-motion behavior.

## Results

- Every route above rendered exactly one visible H1.
- No horizontal overflow at 390×844.
- No repeatable serious or critical axe violation after page settlement. An initial pass briefly reported one contrast node on three routes; an isolated repeat of the contrast rule produced zero nodes, so it is recorded as transient/inconclusive rather than silently treated as a defect.
- New motion computes to `animation-name: none` under reduced-motion emulation while all information remains visible.
- The certificate evidence control has a high-contrast focus-visible treatment and keyboard viewer controls.

## Limitations

- Automated axe testing cannot prove full WCAG conformance and does not cover every interaction state.
- Long-tail educational, account and admin routes remain for the full Phase 12 sweep.
- Screen-reader testing with physical assistive technology was not performed.

Status: core customer journey passes the executed automated checks; full-site accessibility sign-off remains pending Phase 12.
