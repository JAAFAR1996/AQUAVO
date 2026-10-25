# Product choice follow-up

Goal: surface existing catalogue fit, requirements, contents and measurements before purchase, and make successful cart feedback clearer.

Implemented: explicit allowlisted catalogue fields, selected-option measurement isolation, no inferred tank capacity, selected thumbnails scroll within their own strip, quantity always included in cart success notifications, continue-shopping action in both animated and fallback confirmations, and a synchronous product-page add guard. Arabic, English and Kurdish interface copy is included. Prices, stock, checkout and product records are unchanged.

Evidence: production client/server build and TypeScript check pass; 42 focused tests pass. The existing browser CI scenarios now check selected-option measurements and requirements. Browser CI is pending for this branch.

Image scope: existing product photos are preserved. No new scale or use-case photograph has been created. Missing dimensions or photo provenance must be verified before publishing a new factual product illustration; text measurements explicitly say photos are not to scale.

Status: implementation complete for the UI; private review publication in progress. Next: inspect the review and approve the second production release. Decision owner: founder. Rollback: revert only this follow-up commit, preserving the first release (PR339).
