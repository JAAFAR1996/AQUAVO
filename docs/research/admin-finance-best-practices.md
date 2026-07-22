# Admin Finance UX & Security — Sourced Research for AQUAVO

**Author:** Agent 2 (Accounting & Tax Research)
**Access / research date:** 2026-07-21
**Scope:** Admin accounting UX (KPI cards, drill-down, completeness), financial-admin security (OWASP ASVS controls, NIST 800-63B auth), role-based access, export controls, audit-event immutability.

> **AQUAVO context:** the admin finance panel exposes revenue, COGS, margins, COD reconciliation, courier settlements — sensitive financial data for a single trading company. Treat it as a **financial application** (ASVS Level 2 minimum).

**Authority levels:** **A** authoritative standard/regulator (OWASP, NIST) · **B** reputable practitioner · **C** community/blog.

---

## 1. Admin accounting UX — KPI design

| # | Conclusion | Source | Publisher | URL | Date | Auth | Implication for AQUAVO | Class |
|---|---|---|---|---|---|---|---|---|
| K1 | Put the **5–8 metrics that matter above the fold** (net income, cash flow, revenue); reduce complexity with clear hierarchy and trend visibility. | Designing & presenting effective financial reporting dashboards | Cube Software | https://www.cubesoftware.com/blog/financial-reporting-dashboards | 2024 / accessed 2026-07-21 | B | AQUAVO finance home shows ~6 headline KPIs: revenue, COGS, contribution margin, cash collected (COD reconciled), COD outstanding, orders. No clutter. | RECO |
| K2 | **Every number must be auditable — wire drill-down from every headline KPI to the underlying transactions.** A KPI a stakeholder can't trace loses trust. | Finance Dashboard Design Best Practices | f9finance | https://www.f9finance.com/dashboard-design-best-practices/ | 2024 / accessed 2026-07-21 | B | Each KPI card links to the orders/journal rows that compose it (e.g. "Contribution margin" → per-order breakdown). No black-box totals. | RECO |
| K3 | **Drill-down + date-range + dimension filters** turn a static report into a decision tool (break a revenue number down by product/period). | Dashboard Design Best Practices | Boundev | https://www.boundev.ai/blog/dashboard-design-best-practices-guide | 2024 / accessed 2026-07-21 | B | Every KPI states its **definition, date range, and completeness** (e.g. "excludes unreconciled COD", "3 orders pending cost snapshot"), and supports date-range + category drill-down. | RECO |

**KPI card requirements for AQUAVO (each card must show):** (1) the metric's **definition/formula**; (2) the **date range** it covers; (3) a **completeness flag** (are all orders costed/reconciled, or are some excluded/estimated?); (4) a **drill-down** to the transactions beneath it.

---

## 2. Financial-admin security — OWASP ASVS

| # | Conclusion | Source | Publisher | URL | Date | Auth | Implication | Class |
|---|---|---|---|---|---|---|---|---|
| S1 | **Level 2 is recommended for apps handling sensitive data or transactions** (Level 3 for the most critical). | OWASP ASVS project | OWASP Foundation | https://owasp.org/www-project-application-security-verification-standard/ | ASVS current / accessed 2026-07-21 | A | Target **ASVS Level 2** for AQUAVO's finance/admin surface. | SEC |
| S2 | **Access control must be enforced server-side**, and **access-control failures logged**. | ASVS V4 (Access Control / Logging) | OWASP | https://github.com/OWASP/ASVS/blob/master/4.0/en/0x15-V7-Error-Logging.md | ASVS 4.0 / accessed 2026-07-21 | A | Never trust the client for finance authorization — enforce admin role on the server for every finance endpoint (matches project pattern `requireAdmin`). Log every denied finance access. | SEC |
| S3 | **Log security-relevant events** (successful/failed auth, access-control failures, input-validation failures) with enough detail to reconstruct a timeline. | OWASP Logging Cheat Sheet | OWASP | https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html | current / accessed 2026-07-21 | A | Finance admin actions (view exports, edits, reconciliations) emit audit events with actor, action, timestamp, target. | SEC |
| S4 | **Do NOT log payment data, credentials, session tokens, or PII**; store session tokens only hashed/irreversible. | OWASP Logging Cheat Sheet | OWASP | (as S3) | current | A | Audit log records *that* an admin viewed/exported financials, never card/credential/PII payloads. (AQUAVO is COD, so limited card data, but customer PII in orders still must not leak into logs.) | SEC |

---

## 3. Authentication — NIST SP 800-63B

| # | Conclusion | Source | Publisher | URL | Date | Auth | Implication | Class |
|---|---|---|---|---|---|---|---|---|
| A2f | **AAL2 requires multi-factor authentication** — proof of possession/control of two different factors via a secure protocol. | NIST SP 800-63B, Digital Identity Guidelines | NIST | https://pages.nist.gov/800-63-3/sp800-63b.html | current / accessed 2026-07-21 | A | Admin/finance login should require **MFA (AAL2)** — password + a second factor (TOTP or passkey), not password alone. | SEC |
| A2g | **Correctly configured syncable passkeys can meet AAL2** (2024 supplement), with local cryptographic operation. | Incorporating Syncable Authenticators into SP 800-63B (2024 supplement) | NIST | https://csrc.nist.gov/pubs/sp/800/63/b/upd2/final | 2024 / accessed 2026-07-21 | A | Passkeys are an acceptable modern second factor for AQUAVO admins. | SEC |

---

## 4. Role-based access, export controls, audit immutability

| # | Conclusion | Source | Publisher | URL | Date | Auth | Implication | Class |
|---|---|---|---|---|---|---|---|---|
| RB1 | Server-side, role-based access control with least privilege (ASVS V4). | ASVS V4 | OWASP | https://owasp.org/www-project-application-security-verification-standard/ | current | A | Separate **admin** from **finance-admin** roles if staff grow; least-privilege on finance endpoints. | SEC |
| EX1 | Financial data **exports are security-relevant events** to be logged (who exported what, when) — derived from S3 logging + K2 auditability. | OWASP Logging Cheat Sheet | OWASP | https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html | current | A | Log every CSV/PDF financial export with actor + scope + timestamp; consider rate-limiting bulk exports. | SEC |
| IM1 | **Locked periods + logged transaction/adjustment/user activity = immutable audit trail**; corrections are reversing entries, never in-place edits. | Month-End Close Checklist | Trullion | https://trullion.com/blog/month-end-close-checklist/ | 2024 / accessed 2026-07-21 | B | Financial audit events are **append-only**; no admin (including super-admin) can silently edit posted history — only append reversing/correcting entries. Ties to the live audit-trail work in project memory and the 5-year retention requirement (tax file). | SEC + RECO |

---

## Highest-impact takeaways (owner/accountant/engineering decisions)

1. **Every finance KPI carries definition + date range + completeness flag + drill-down** to source transactions — no untraceable totals. *(K1–K3)* — **engineering** decision.
2. **Treat the finance admin as an ASVS Level 2 app**: server-side role enforcement on every finance endpoint, and log all access-control failures. *(S1, S2)* — **engineering/security**.
3. **Require MFA (AAL2) for admin/finance login** — password alone is insufficient for financial data; passkeys/TOTP acceptable. *(A2f, A2g)* — **owner** decision to enable.
4. **Never log credentials/tokens/PII/payment data**; audit logs record actions, not payloads. *(S4)* — **engineering/security**.
5. **Log financial exports** (actor, scope, time); consider rate-limiting bulk export. *(EX1)*
6. **Append-only audit trail with locked periods** — posted financial history is immutable; corrections are reversing entries only; retain ≥5 years. *(IM1 + tax file)* — **accountant + engineering**.

## Cross-references
- Contribution-margin / COD / period-close definitions feeding these KPIs → `docs/research/accounting-system-research.md`.
- 5-year retention, 15% CIT, no-VAT, IUAS mapping → `docs/research/iraq-tax-readiness.md`.
