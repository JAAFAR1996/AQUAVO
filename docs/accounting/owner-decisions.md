# Owner-Policy Decisions (A–L)

Source: `docs/accounting/canonical-model.md` (research-backed). I will proceed with the **recommended default** for each (all reversible or net-neutral for existing metrics), marked **`unverified`**, and will NOT activate any policy-dependent result that is hard to reverse or touches production until you confirm. Items marked **[ACCOUNTANT]** must be signed off by an Iraqi محاسب قانوني — take those offline.

| ID | Decision | Recommended default | Impact / reversibility |
|----|----------|--------------------|------------------------|
| A | Inventory valuation method | Weighted-average (IAS 2) | **Hard to reverse after a period close.** [ACCOUNTANT-aware] |
| B | Packaging/inserts/box classification | Fulfillment cost, not COGS | Net profit unchanged; reversible |
| C | Landed-cost allocation basis | Value ratio (by line value) | Reversible before close |
| D | Delivery revenue treatment | Shipping = income + outbound expense (gross) | Changes revenue/expense display, net unchanged; reversible |
| E | Affiliate/influencer commission timing | Accrue at sale (matching) | Reversible |
| F | Advertising spend | Period opex, no per-order attribution | Reversible |
| G | Overhead allocation | None (period opex) | Reversible |
| H | **VAT / sales-tax status** | **NO tax line** (research: none applies) | **Highest impact — pricing depends on it.** [ACCOUNTANT] |
| I | Period-locking policy | Hard lock; corrections via reversing entries | Structural; reversible before adoption |
| J | Historical cost-backfill | NULL/estimated, never fabricate 0 | Safety default; reversible |
| K | Realized timestamp | Add `deliveredAt`, bucket P&L by delivery date | Additive; reversible |
| L | Ledger persistence | Derive on read while period open; persist journal at close | Reversible |

## Accountant-gated subset (blocks ACTIVATION, not the build)
H (VAT/sales-tax), A (valuation), import-duty rate (ASYCUDA/HS-code), deemed-profit ratio, IUAS chart-of-accounts mapping, record-retention years, COD-refusal loss deductibility. Stored in a new `tax_rules` table with source + effective-date + verification-date + approval-status; nothing tax-related is asserted as fact until approved.

## HARD RULE — missing evidence is never 0 (owner-mandated)
Missing or historically unavailable financial evidence MUST be represented as `NULL` / `unknown` / `incomplete` / `estimated` (with explicit source + confidence). A stored `0` is allowed ONLY when zero is a verified real business value. This supersedes the Architect's "default new cost fields to 0" note and is enforced across migrations, schema, engine, and tests. Decision **J** is therefore mandatory, not optional.

## Three-group policy classification (owner-mandated)
- **Group 1 — Safe implementation defaults (build now, mark provisional):** B (packaging/insert/box stored separately), C (landed-cost *infrastructure* without activating a final method), E-infrastructure (commissions stored as separate variable cost), COD-as-receivable before settlement, configurable accounting periods *without locking*, L (derive ledger open). Reversible, policy-neutral.
- **Group 2 — Owner confirmation required before ACTIVATION (build configurable, keep unset):** D (delivery revenue treatment), E-timing (commission recognition timing), F (ad attribution), G (overhead allocation), A (inventory valuation method), C-method (landed-cost allocation method), J-method (historical cost reconstruction — but never fabricate), I (period close & locking), owner-withdrawal treatment.
- **Group 3 — Accountant/legal confirmation required (never encode as confirmed law, never auto-activate):** H (VAT/sales-tax), corporate/income-tax rate applicability, IUAS obligations, customs-duty treatment, tax deductibility, record-retention periods, filing deadlines, legal-entity classification. Stored in new `tax_rules` table with official source + effective date + verification date + applicability + confidence + accountant-approval status. System must state unapproved rules are **tax-preparation assumptions, not final tax liability.**

## Coordinator stance
I build Group-1 infrastructure with provisional config, keep Group-2 policies unset/provisional (infra + tests only), and store Group-3 as unapproved candidate rules. I pause ONLY when a policy must be *activated* for the next implementation step, or before: closing/locking a real period, any production write, deleting production data, or reconstructing history. A full per-decision package (one section each, with AQUAVO example + profit/tax/historical impact + reversibility + when-needed) is in `docs/accounting/owner-decision-package.md`.
