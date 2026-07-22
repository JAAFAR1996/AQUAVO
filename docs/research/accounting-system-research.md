# Modern Ecommerce Accounting System — Sourced Research for AQUAVO

**Author:** Agent 2 (Accounting & Tax Research)
**Access / research date:** 2026-07-21
**Status:** Supersedes and extends `docs/research/accounting-bestpractice.md`. Where that file's claims are unchanged they are carried forward and re-cited; new material (returns/refunds accounting, commission recognition, period close, audit trail, retention, expanded chart of accounts) is added below.

> **AQUAVO context (constant throughout):** Iraqi ecommerce selling aquarium **equipment only** (filters, heaters, food, decor, tanks, lighting, water treatment — **no live animals, no plants**). **Cash-on-Delivery only** (no payment gateway). Sale currency **IQD**; **5,000 IQD flat outbound shipping**; suppliers frequently invoiced in **USD**; goods are **imported**. AQUAVO is a **private SME trading company**.

**Authority levels:**
- **A — Authoritative standard/regulator** (IASB/IFRS Foundation standard text; Big-4 technical guidance interpreting a standard)
- **B — Reputable practitioner/industry guidance** (accounting firms, established finance publications)
- **C — Community/blog** (corroborating only, not primary)

**Classification tags:** `[STANDARD]` accounting standard · `[RECO]` recommendation for AQUAVO · `[SEC]` control/security · `[LEGAL]` legal requirement (see tax file).

---

## 1. Inventory valuation & COGS (IAS 2)

| # | Conclusion | Source | Publisher | URL | Date pub / accessed | Authority | Implication for AQUAVO | Class |
|---|---|---|---|---|---|---|---|---|
| A1 | Inventory cost = **all costs of purchase + conversion + other costs to bring inventory to present location/condition**. Purchase cost = invoice price **+ freight, import duties, other directly attributable acquisition costs − trade discounts/rebates**. | IAS 2 Inventories | IFRS Foundation (IASB) | https://www.ifrs.org/issued-standards/list-of-standards/ias-2-inventories/ | In force 2026 / accessed 2026-07-21 | A | Cost snapshot must be **landed cost**, not just the supplier invoice: add inbound freight, customs duty, and directly-attributable inbound cost; subtract supplier discounts. This is the number feeding COGS. | STANDARD |
| A2 | Permitted cost formulas for interchangeable items: **FIFO or weighted-average**. **LIFO is prohibited under IFRS.** Same formula applied consistently. | IAS 2 cost formulas | CPDbox (interpreting IAS 2) | https://www.cpdbox.com/ias-2-fifo-weighted-average/ | In force / accessed 2026-07-21 | A | Use **weighted-average** (simplest for a restocking trader with varying USD prices) applied consistently. Never LIFO. | STANDARD |
| A3 | **Selling costs, storage beyond that needed to reach present condition, and admin overhead are excluded from inventory cost** (IAS 2.16). | Cost of Inventories (IAS 2) | IFRS Community | https://ifrscommunity.com/knowledge-base/cost-of-inventories/ | In force / accessed 2026-07-21 | A | Outbound 5,000 IQD shipping, courier/COD fees, ad spend are **not** COGS — they are selling costs deducted below gross margin. | STANDARD |
| A4 | Subsequent measurement: **lower of cost and net realisable value (NRV)**. | IAS 2 Measurement & Cost Formulas Guide | LearnSignal | https://www.learnsignal.com/blog/ias-2-inventories-measurement-cost-formulas-guide/ | 2024 / accessed 2026-07-21 | B | Damaged/discontinued/below-cost aquarium stock is written down to NRV. | STANDARD |
| A5 | **Landed/freight allocation:** spread inbound freight + duty across SKUs by **value ratio** (line value ÷ shipment value) or weight ratio. | Allocating Landed and Freight Costs | Sage 100 Help | https://help-sage100.na.sage.com/2018/Subsystems/PO/POConcept/Allocating_Landed_and_Freight_Costs.htm | 2018 / accessed 2026-07-21 | B | On each USD import, allocate freight+duty across SKUs (by value = easiest to automate); store the resulting **landed unit cost** as the immutable snapshot at receipt. | RECO |

**Design rule:** at goods receipt, compute per-SKU landed unit cost in IQD and store it as an immutable snapshot. At order creation, **freeze** that unit cost onto the order line so later restocks never retro-change historical margins (B2 below).

---

## 2. Multi-currency USD→IQD (IAS 21)

| # | Conclusion | Source | Publisher | URL | Date | Authority | Implication | Class |
|---|---|---|---|---|---|---|---|---|
| A6 | **Foreign-currency transactions recorded at the spot rate on the transaction date.** Monetary items retranslated at closing rate; **FX differences go to P&L**. | Effects of Changes in FX Rates (IAS 21) | IFRS Community | https://ifrscommunity.com/knowledge-base/ias-21-effects-of-changes-in-foreign-exchange-rates/ | In force / accessed 2026-07-21 | A | Convert each USD purchase to IQD at the **rate on purchase/receipt date**; store that IQD landed cost as the frozen snapshot. If the USD payable is later settled at a different rate, book the **FX gain/loss to P&L** — do **not** retro-edit inventory cost. | STANDARD |

**Practical:** keep a `purchase_fx_rate DECIMAL` and `fx_rate_date` on every USD purchase so the conversion is auditable and reproducible. USD supplier payables outstanding at period close are retranslated at the closing rate (unrealised FX gain/loss).

---

## 3. Money representation

| # | Conclusion | Source | Publisher | URL | Date | Authority | Implication | Class |
|---|---|---|---|---|---|---|---|---|
| A7 | **Store money as integers in the smallest currency unit**, not floats — binary floats can't represent decimal cents exactly and errors accumulate. Format to major units only at the UI/API edge. | Floats Don't Work For Storing Cents | Modern Treasury | https://www.moderntreasury.com/journal/floats-dont-work-for-storing-cents | 2023 / accessed 2026-07-21 | B | Never store prices/costs as JS `number` floats. **IQD caveat:** the fils (minor unit) is obsolete; IQD is transacted in **whole dinars** → store IQD as **integer dinars**; store USD as **integer cents**. Every amount carries a `currency` field. | RECO |
| A8 | For sub-unit precision (FX rates, ratios), use **fixed-point DECIMAL(p,s)**, never binary float. | Storing currency values: data types & best practices | cardinalby (dev blog) | https://cardinalby.github.io/blog/post/best-practices/storing-currency-values-data-types/ | 2023 / accessed 2026-07-21 | C | Store the USD→IQD rate as DECIMAL (≥6 dp) alongside the integer IQD result. | RECO |

---

## 4. Order profitability — contribution margin, not gross margin

| # | Conclusion | Source | Publisher | URL | Date | Authority | Implication | Class |
|---|---|---|---|---|---|---|---|---|
| B1 | **Contribution margin** is the true per-order figure: `(Revenue − COGS − fulfillment − shipping − COD/processing fees − discounts − expected refunds) ÷ Revenue`. Gross margin overstates DTC profit by ~30–50% because it ignores variable selling costs. | Contribution Margin Formula for Ecommerce | StoreHero | https://storehero.ai/contribution-margin-formula/ | 2024 / accessed 2026-07-21 | B | Per-order profit must deduct: frozen landed COGS + real outbound shipping (or the 5,000 IQD charged/actual) + COD/courier collection fee + coupon/discount + **expected COD-refusal/return loss**. Report **contribution margin per order**, not price − cost. | RECO |
| B2 | **COGS should use an immutable cost snapshot captured at sale**, so later restocks don't retroactively change historical margins. | Inventory costs include (GAAP vs IFRS) | Cleverence | https://www.cleverence.com/articles/for-business/inventory-costs-include-8372/ | 2024 / accessed 2026-07-21 | B | Freeze landed unit cost onto each order line (project memory: order lines live in `orders.items` JSONB → the frozen cost belongs there). | RECO |

---

## 5. COD reconciliation & courier settlement

| # | Conclusion | Source | Publisher | URL | Date | Authority | Implication | Class |
|---|---|---|---|---|---|---|---|---|
| B3 | **COD = cash in transit / a receivable from the courier** until remitted. Best practice: one **receivable control account per courier**; reconcile weekly against courier settlement; net the agreed courier fee; flag shortages/undelivered. | Benefits of COD Reconciliation | eShipz | https://www.eshipz.com/blog/cod-reconciliation-ecommerce/ | 2023 / accessed 2026-07-21 | B | Model COD explicitly. On delivery, cash is **owed by the courier**, not yet in AQUAVO's bank. Track states: dispatched → delivered/collected → remitted → reconciled; plus **returned/refused** (no cash, restock). | RECO |
| B4 | COD reconciliation matches courier-collected cash to actual order values to prevent revenue leakage and missing settlements. | Benefits of COD Reconciliation in Delivery Management | Shipox | https://shipox.com/blog/the-benefits-of-cod-reconciliation-in-delivery-management/ | 2023 / accessed 2026-07-21 | B | Build a reconciliation view: expected COD (Σ delivered orders) vs courier-reported collected vs actually deposited. Persist the **delta** as a first-class figure so shortages are visible, not silently absorbed. | RECO |

**COD journal flow (illustrative, weighted-avg, single order):**
1. Dispatch/delivery of a COD order → `Dr COD Receivable (courier X)  /  Cr Sales revenue` (+ `Cr Shipping income` for the 5,000 IQD); and `Dr COGS / Cr Inventory` at frozen landed cost.
2. Courier remits cash net of fee → `Dr Bank`, `Dr Courier fee expense`, `Cr COD Receivable (courier X)`.
3. Refused/returned before payment → reverse the sale, `Dr Inventory / Cr COGS` (restock at the same frozen cost), no cash moves.
4. Reconciliation variance (short-collected/lost) → `Dr COD shortage/loss expense / Cr COD Receivable`.

---

## 6. Returns & refunds accounting (IFRS 15 — right of return)

| # | Conclusion | Source | Publisher | URL | Date | Authority | Implication | Class |
|---|---|---|---|---|---|---|---|---|
| R1 | Under a right of return, **recognise revenue net of expected returns** (variable consideration), and instead of revenue on expected returns recognise a **refund liability**. | Sale with a right of return | BDO | https://www.bdo.co.uk/en-gb/insights/business-edge/business-edge-2017/sale-with-a-right-of-return | 2017 (IFRS 15 in force) / accessed 2026-07-21 | A | If AQUAVO offers returns, revenue should be booked **net of an estimated return rate**; the estimated returnable portion sits in a **refund liability**, not revenue. | STANDARD |
| R2 | Recognise a separate **return asset** (right to recover goods), measured at former inventory carrying amount less recovery/restocking costs and any impairment; **exclude those goods' cost from COGS**. Update refund liability and return asset **each reporting period**. | How to account for sales with a right of return | Data Studios | https://www.datastudios.org/post/how-to-account-for-sales-with-a-right-of-return | 2024 / accessed 2026-07-21 | B | For expected returns, the cost stays as a **return asset** (not COGS); re-estimate the return rate at each close. For AQUAVO's **COD refusals** — where the customer never pays — the cleanest treatment is: sale is never recognised (or fully reversed), goods restocked at frozen cost; a refund liability only arises where cash was actually collected and must be given back. | STANDARD |

**AQUAVO nuance:** COD refusal (parcel rejected on doorstep, no cash) ≠ a post-payment return. Refusal → reverse/never-recognise the sale + restock. Post-delivery return with cash already collected → refund liability until cash returned, plus return asset for the recovered item. Both need explicit order states so profitability and inventory stay correct.

---

## 7. Purchasing, supplier & landed-cost accounting

- Record supplier purchases as **payables** (USD payables held in USD, retranslated at close — §2/A6). Match the supplier invoice, the inbound freight invoice, and the customs/duty document to the **goods receipt** so landed cost is complete before the SKU cost snapshot is frozen (A1/A5).
- **Three-way match** (PO ↔ goods received ↔ supplier invoice) is the standard purchasing control and the basis of a defensible landed cost.
- **Purchase-document retention is also a tax requirement** — Iraq's GCT can disallow undocumented purchases and tax on a deemed basis (see `iraq-tax-readiness.md`, and the 2026 ASYCUDA customs invoice-verification tightening). Keep supplier invoices, import/customs paperwork, and freight invoices with each receipt.

---

## 8. Expense management & commission recognition (matching principle, IFRS 15)

| # | Conclusion | Source | Publisher | URL | Date | Authority | Implication | Class |
|---|---|---|---|---|---|---|---|---|
| E1 | **Matching principle:** expenses recognised in the same period as the revenue they relate to; recorded **when incurred, not when paid**. | Expense recognition principle | AccountingTools | https://www.accountingtools.com/articles/expense-recognition-principle.html | 2024 / accessed 2026-07-21 | B | Ad spend, courier fees, affiliate commissions are accrued to the period the related sale occurs, even if paid later. | STANDARD |
| E2 | **Affiliate/influencer commission** is a cost of obtaining a sale → **accrue when the performance obligation is satisfied** (the influenced sale completes), not when paid. | Commission Expense Recognition (ASC 606 / IFRS 15) | Optymyze | https://optymyze.com/learning/solution-sheets/commission-expense-recognition/ | accessed 2026-07-21 | B | When AQUAVO pays affiliates/influencers per sale, book a **commission-payable accrual** at the sale date; settle against it when paid. For AQUAVO's short COD-cycle sales (no multi-year contracts), commissions are period expenses — no long-term capitalisation needed. | RECO |

---

## 9. Double-entry, chart of accounts, period close, audit trail

| # | Conclusion | Source | Publisher | URL | Date | Authority | Implication | Class |
|---|---|---|---|---|---|---|---|---|
| D1 | Every transaction hits ≥2 accounts (**debits = credits**); the chart of accounts groups Assets, Liabilities, Equity, Revenue, Expenses, with **COGS separated** from operating expenses. | Inventory accounting: IFRS vs US GAAP | KPMG | https://kpmg.com/us/en/articles/2026/inventory-accounting-ifrs-accounting-standards-vs-us-gaap.html | 2026 / accessed 2026-07-21 | A | See minimal COA below. | STANDARD |
| D2 | **Month-end close = collect → verify → adjust → report**: bank reconciliation, AP/AR review, revenue matching, closing entries, **locked periods**, documented approvals and an audit trail for major/non-routine entries. | Month-End Close Process: Checklist & Best Practices | Brex | https://www.brex.com/spend-trends/accounting/month-end-close-process-checklist | 2024 / accessed 2026-07-21 | B | Run a monthly close: reconcile bank + each courier COD control account, re-estimate refund liability/return asset, retranslate USD payables, post closing entries, then **lock the period** so posted history is immutable. | RECO |
| D3 | **Locked periods + documented approvals + logged transaction/adjustment/user activity** create a clean, immutable audit trail and lower restatement/compliance risk. | Month-End Close Checklist | Trullion | https://trullion.com/blog/month-end-close-checklist/ | 2024 / accessed 2026-07-21 | B | Append-only ledger: financial entries are never edited in place — corrections are new reversing entries. Log who/what/when for every posting and adjustment. (Aligns with the live audit-trail work in project memory.) | SEC |
| A8b | **IFRS for SMEs** (Third Edition, Feb 2025) suits private SMEs: IFRS principles, simplified recognition/measurement, drastically fewer disclosures; LIFO prohibited; inventory write-downs may reverse. | IFRS for SMEs Accounting Standard, 3rd Ed. | IFRS Foundation | https://www.ifrs.org/content/dam/ifrs/publications/ifrs-for-smes/english/2025/ifrs-for-smes.pdf | Feb 2025 / accessed 2026-07-21 | A | Use IFRS-for-SMEs as the **conceptual reference** for weighted-avg costing, landed cost, NRV, refund liabilities. **But statutory Iraqi books must map to the Iraqi Unified Accounting System** — see tax file. | STANDARD |

### Minimal chart of accounts for AQUAVO (map to Iraqi Unified Accounting System for statutory filing)

- **Assets:** Cash/Bank · COD Receivable — per courier · Inventory (at landed cost) · Return asset · Prepaid/other
- **Liabilities:** Supplier payables (IQD) · Supplier payables (USD, retranslated) · Refund liability · Commission payable · Tax payable · Accrued expenses
- **Equity:** Owner capital · Retained earnings
- **Revenue:** Product sales · Shipping income (the 5,000 IQD)
- **COGS:** Product landed cost
- **Operating/selling expenses:** Outbound shipping · Courier/COD fees · COD shortage/loss · Marketing/ad spend · Affiliate commissions · FX gain/loss · Bank charges · General & admin

---

## 10. Financial-document retention

- Retain full accounting records — orders, frozen landed-cost snapshots, courier settlements, supplier + freight + customs invoices — for **at least 5 years** (Iraq's tax statute of limitations; GCT can reach further in some cases). See `iraq-tax-readiness.md`. Best practice: **≥5–7 years**, immutable. `[LEGAL]`/`[RECO]`

---

## Highest-impact takeaways (owner/accountant decisions)

1. **Freeze landed cost at sale** (supplier invoice + allocated import freight/duty, converted to IQD at purchase-date FX) onto each order line → historical margins never drift. *(A1, A5, A6, B2)* — **owner decision:** confirm which inbound costs are captured; **accountant:** get the HS-code customs-duty rate.
2. **Weighted-average costing, never LIFO.** *(A2)* — **accountant sign-off** on the chosen formula, applied consistently.
3. **Report contribution margin per order**, deducting outbound shipping + COD/courier fee + discount + expected refusal loss. *(B1, A3)*
4. **Model COD as a per-courier receivable with explicit states + weekly reconciliation delta.** *(B3, B4)* — this is where cash actually leaks.
5. **Returns/refunds:** distinguish COD refusal (reverse sale + restock) from post-payment return (refund liability + return asset); re-estimate at each close. *(R1, R2)*
6. **Accrue commissions/expenses to the sale period** (matching), not when paid. *(E1, E2)*
7. **Monthly close with locked periods + append-only audit trail**; corrections are reversing entries, never edits. *(D2, D3)*
8. **Money = integers + currency tag**; IQD whole dinars, USD cents; FX rate stored as DECIMAL. *(A7, A8)*
9. **Retain records ≥5 years, immutable.** *(§10)*
10. **IFRS-for-SMEs is the conceptual model; statutory books map to the Iraqi Unified Accounting System.** *(A8b + tax file)*

## Open questions for the Iraqi accountant
- Specific import/customs duty rate for AQUAVO's aquarium-equipment HS codes (feeds landed cost; sharpened by 2026 ASYCUDA customs automation).
- Tax deductibility of COD-refusal/return losses and outbound shipping.
- Required IUAS account mapping for the statutory return.
