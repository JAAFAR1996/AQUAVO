# Accounting V2 production rollout — 2026-08-03

- Owner approval: explicit in the AQUAVO accounting implementation session.
- Reviewed merge commit: `524c6423558297d028a8ffe633084a5f4d5eac90`.
- Accounting V2 migrations: `0051` through `0060`.
- Pre-change Neon backup branch: `backup-before-accounting-v2-20260803` (`br-snowy-smoke-a4skswwe`).
- Deployment rule: production build applies the exact migration files and verifies database health before application build/deploy.
- Correct Al-Waseet statement: gross 183,750 IQD; delivery fees 30,000 IQD; other deductions 0; merchant net 153,750 IQD.
- Controlled test requirement: rollback-safe synthetic order; no fake sale may remain in production.
- Open evidence items remain blockers for monthly close: seven physical inventory counts, actual physical cash count, July returned-carton cost, and licensed-accountant tax profile.
