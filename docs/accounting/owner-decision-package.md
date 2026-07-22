# AQUAVO Owner Decision Package (Decisions A–L)

**For:** The AQUAVO owner (non-accountant). **Purpose:** one plain-language page per accounting policy decision so you can approve, defer, or send to an accountant with full knowledge of the money impact.

**Sources:** `docs/accounting/canonical-model.md` §6 (decisions A–L) and `docs/accounting/owner-decisions.md` (the 3-group classification + the NULL-not-zero hard rule).

> **Read this first — two ground rules that apply to every decision below.**
>
> 1. **Group-3 (tax) items are tax-PREPARATION assumptions, not final tax liability.** Where a decision is marked Group 3, the system stores our best-supported answer (with its source and date) as an *unapproved candidate*. It is used to organize the books and estimate a tax base — it is **never** a statement of what AQUAVO legally owes. Only an Iraqi محاسب قانوني (certified accountant) can convert it from "assumption" to "confirmed." Until then, every tax number is clearly labelled provisional.
> 2. **Missing money evidence is never silently `0`.** When a real cost is unknown (e.g. an old order with no recorded supplier cost, or an import not yet landed-costed), the system stores it as `NULL` / `estimated` / `incomplete` **with a confidence flag** — never as `0`. A stored `0` means "we verified this really is zero." This keeps profit honest: an unknown cost never masquerades as pure profit. This is Decision **J** and it is mandatory, not optional.

---

## Decision A — Inventory valuation method

- **Exact decision:** When the same product was bought at different prices over time, which cost do we assign to a unit when it sells?
- **Recommended option:** Weighted-average cost (blend all purchase lots into one running average per product).
- **Alternative option(s):** FIFO (first-in-first-out — oldest cost sells first). LIFO is prohibited under IAS 2 and not available.
- **Concrete AQUAVO example:** You import a canister filter twice: 50 units landed at 24,000 IQD each, then 50 more at 28,000 IQD each. A customer buys one for 45,000 IQD. Weighted-average books COGS at 26,000 IQD (the blended cost). FIFO would book 24,000 IQD (oldest lot) until the first 50 are gone, then jump to 28,000 IQD.
- **Effect on per-order profit:** Changes the COGS on each order and therefore its gross profit. In the example, weighted-average gross profit = 45,000 − 5,000 shipping − 26,000 = 14,000 IQD; FIFO early units = 16,000 IQD.
- **Effect on monthly profit:** Small and smoothing under weighted-average (no lumpy swings as lots turn over); FIFO produces sharper month-to-month movement when supplier prices or the USD rate jump.
- **Effect on tax preparation:** Sets the COGS figure that feeds the taxable-profit base. A consistent method is expected by any accountant; switching methods mid-year is a red flag.
- **Affects HISTORICAL results?** Yes — the method is applied when a period's COGS is computed, so choosing it changes how already-recorded orders are valued until they are locked.
- **Reversibility:** Hard-after-close. Once any period is closed on a basis, changing the method distorts comparability. Cheap to set now (37 orders), expensive later.
- **When it becomes necessary:** The moment the landed-cost / purchases module (§4.3) starts producing real per-lot costs and we run the first month-end close.
- **Group:** 2 (owner confirmation) — with accountant awareness, since the valuation formula ultimately needs sign-off.

---

## Decision B — Packaging / inserts / box classification

- **Exact decision:** Do per-unit packaging, inserts, and the shipping box count as part of product cost (COGS) or as fulfillment cost (below gross profit)?
- **Recommended option:** Fulfillment cost — keep COGS as pure landed product cost.
- **Alternative option(s):** Fold packaging/inserts/box into COGS (what the current engine does today).
- **Concrete AQUAVO example:** A heater costs 18,000 IQD landed, ships in a 700 IQD box with a 300 IQD care-card insert, sells for 30,000 IQD. Recommended: gross profit = 25,000 (net revenue) − 18,000 = 7,000 IQD, then fulfillment subtracts 1,000 → contribution 6,000 IQD. Alternative: COGS = 19,000, gross profit = 6,000 IQD straight away.
- **Effect on per-order profit:** Moves 1,000 IQD between the "gross" line and the "contribution" line. **Final net profit is identical either way.**
- **Effect on monthly profit:** No change to the bottom line; only the gross-margin vs contribution-margin split shifts.
- **Effect on tax preparation:** Neutral on the taxable base — the same total cost is deducted, just labelled in a different bucket.
- **Affects HISTORICAL results?** No net effect. It re-labels existing costs; both figures are exposed side by side so no number is lost.
- **Reversibility:** Easy — the engine stores `landedCogs`, `packaging`, `inserts`, `boxCost` separately and can present either view with a flag.
- **When it becomes necessary:** When you first want gross margin to mean "IAS 2 product margin" on a report — cosmetic until then.
- **Group:** 1 (safe default) — stored separately now, policy-neutral.

---

## Decision C — Landed-cost allocation basis

- **Exact decision:** When one import shipment carries freight and customs duty for many products, how do we spread those shared costs across the SKUs?
- **Recommended option:** Value ratio — allocate by each line's share of the shipment's value.
- **Alternative option(s):** Weight ratio (by kilograms) or quantity ratio (by unit count).
- **Concrete AQUAVO example:** A USD shipment carries 200 USD freight + 100 USD duty (300 USD to spread). It holds 1,000,000 IQD of filters and 500,000 IQD of tanks (1,500,000 total). By value ratio the filters absorb two-thirds (200 USD) and the tanks one-third (100 USD). A heavy glass tank would absorb far more under weight ratio — but AQUAVO does not capture per-item weights, so value ratio is the only basis we can automate today.
- **Effect on per-order profit:** Sets how much freight+duty lands in each product's unit cost, nudging that product's gross profit up or down.
- **Effect on monthly profit:** Total allocated cost is unchanged; only the split between product lines moves, so category-level margins shift while the month total holds.
- **Effect on tax preparation:** Neutral in total (same duty+freight deducted); affects per-product profitability reporting only.
- **Affects HISTORICAL results?** No for already-frozen orders — landed cost is frozen at goods receipt and never retro-changed. Affects only shipments costed after the basis is chosen.
- **Reversibility:** Easy per purchase until that purchase's orders close; then frozen.
- **When it becomes necessary:** The first time we landed-cost a real multi-SKU import in the purchases module.
- **Group:** 2 for the *method* (owner confirmation); the *infrastructure* to store allocations is Group 1 and built now.

---

## Decision D — Delivery-revenue treatment

- **Exact decision:** Is the 5,000 IQD delivery fee shown as income (with the courier cost as a separate expense), or netted quietly against the courier cost?
- **Recommended option:** Shipping income — book the 5,000 IQD as a revenue line and the actual courier cost as an outbound-shipping expense.
- **Alternative option(s):** Pass-through — treat delivery as a cost offset and never show it as revenue.
- **Concrete AQUAVO example:** Customer pays 45,000 IQD for a filter + 5,000 IQD delivery = 50,000 collected. Courier actually costs you 4,000 IQD. Recommended: 5,000 shipping income and 4,000 shipping expense (net +1,000 visible). Pass-through: nothing in revenue, just a −4,000 offset — the 1,000 IQD you actually made on delivery becomes invisible.
- **Effect on per-order profit:** Net effect is the same small delivery margin (+1,000 IQD here); only whether it is visible changes. Note: canonical net revenue **excludes** shipping either way, so core product profit is unaffected.
- **Effect on monthly profit:** Identical bottom line; the gross-revenue and total-expense figures are larger under the income view (better transparency, useful if you ever compare against a courier contract).
- **Effect on tax preparation:** Neutral on net; the income presentation gives a cleaner audit trail of delivery economics.
- **Affects HISTORICAL results?** No net change — presentation only.
- **Reversibility:** Easy — it is a display/account-mapping choice.
- **When it becomes necessary:** When you start recording actual courier costs separately from the 5,000 IQD charged (courier-settlement module).
- **Group:** 2 (owner confirmation before activation).

---

## Decision E — Affiliate / influencer commission timing

- **Exact decision:** When do we record an influencer's commission — at the moment the influenced order is delivered, or later when we actually pay the influencer?
- **Recommended option:** Accrue at sale (record the commission in the same period the order is delivered).
- **Alternative option(s):** Cash basis — record it only when paid out.
- **Concrete AQUAVO example:** An influencer drives a 120,000 IQD tank sale in June at 10% commission (12,000 IQD), but you settle influencers at the end of July. Accrual: the 12,000 IQD reduces June's profit (the month that earned the sale). Cash basis: it hits July, making June look better than it was and punishing July.
- **Effect on per-order profit:** Adds the commission as a contribution-level cost on that specific order (tank order contribution drops by 12,000 IQD).
- **Effect on monthly profit:** Matches the cost to the revenue that caused it — June carries its own commissions instead of leaking into July.
- **Effect on tax preparation:** Accrual gives a truer period profit, which is the correct base for tax; cash basis can misstate which fiscal period bore the cost.
- **Affects HISTORICAL results?** Yes if applied to past influenced orders — it re-dates commissions into the delivery month.
- **Reversibility:** Easy — a reclass between accrued and paid; the infrastructure stores commissions as a separate variable cost regardless.
- **When it becomes necessary:** The first time you run an influencer/affiliate deal that pays per-sale.
- **Group:** Infrastructure (store commission as a separate cost) is Group 1 now; the *timing* choice is Group 2 before activation.

---

## Decision F — Advertising-spend attribution

- **Exact decision:** Is ad spend (Meta/TikTok) a general monthly expense, or split and charged onto individual orders/products?
- **Recommended option:** Period operating expense — one lump below the contribution line, not attributed per order.
- **Alternative option(s):** Allocate ad spend per order or per product.
- **Concrete AQUAVO example:** You spend 900,000 IQD on ads in a month that produced 300 orders. Recommended: the 900,000 sits as one operating expense; each order's contribution margin stays clean. Alternative: you would smear ~3,000 IQD onto every order — but a customer who bought unprompted gets wrongly charged for ads, and the per-order number becomes fiction.
- **Effect on per-order profit:** None under the recommendation (per-order contribution unaffected). Allocation would artificially lower every order's profit.
- **Effect on monthly profit:** Same monthly total either way; the recommendation keeps it honest and avoids fake precision.
- **Effect on tax preparation:** Ad spend is deducted in full as an operating expense regardless; the recommendation matches how it will be filed.
- **Affects HISTORICAL results?** No — it is where the number sits on the report, not whether it counts.
- **Reversibility:** Easy.
- **When it becomes necessary:** When ad spend is first entered into the expenses module (it already supports an `ad_spend` category).
- **Group:** 2 (owner confirmation), though the recommended default is the low-risk one.

---

## Decision G — Overhead allocation

- **Exact decision:** Do fixed overheads (rent, salaries, utilities, software) get spread onto product costs, or stay as a monthly lump?
- **Recommended option:** None — keep overhead as a period operating expense.
- **Alternative option(s):** Allocate overhead into product/inventory cost.
- **Concrete AQUAVO example:** Monthly overhead is 1,200,000 IQD. Recommended: it hits the operating line once, so a filter's margin still reads as a clean product margin. Allocation would bury a slice of rent inside every filter's cost, making product profitability murky and (per IAS 2.16) is not appropriate for admin overhead.
- **Effect on per-order profit:** None under the recommendation; product margins stay clean.
- **Effect on monthly profit:** Same total; the recommendation keeps overhead visible as one controllable line.
- **Effect on tax preparation:** Overhead is deducted as operating expense either way; the recommendation is the standard SME treatment.
- **Affects HISTORICAL results?** No.
- **Reversibility:** Easy.
- **When it becomes necessary:** When recurring overhead rows are entered in the expenses module.
- **Group:** 2 (owner confirmation); recommended default is low-risk.

---

## Decision H — VAT / sales-tax status

- **Exact decision:** Do we add a VAT or sales-tax line to aquarium-equipment prices and invoices, or not?
- **Recommended option:** No tax line — research indicates no VAT/sales tax applies to this equipment in Iraq.
- **Alternative option(s):** Add a tax line at a confirmed rate.
- **Concrete AQUAVO example:** A tank listed at 120,000 IQD stays 120,000 IQD to the customer with no added tax. If a tax later proved to apply, the same tank might need a tax component inside or on top of that price — directly changing what customers pay and what you remit.
- **Effect on per-order profit:** Under "no tax line," none. Adding a tax that you must remit would carve a slice out of every order's collected amount.
- **Effect on monthly profit:** None today; adding tax later would reduce net collected revenue by the remitted portion.
- **Effect on tax preparation:** This is the **highest-impact tax assumption.** It is stored as an *unapproved* candidate rule (source + date) and treated as a preparation assumption, not settled law.
- **Affects HISTORICAL results?** Potentially yes and customer-facing — if a tax were found to have applied, past pricing/invoices could be implicated, which is why it needs professional sign-off before any change.
- **Reversibility:** Reversible in code, but mispricing is customer-facing and cannot be un-charged — treat as high-stakes.
- **When it becomes necessary:** Before launch pricing is finalized and before any invoice claims a tax position — i.e. now, as an assumption; and formally before an accountant signs the books.
- **Group:** 3 (accountant / legal) — needs an Iraqi محاسب قانوني. Never encoded as confirmed law.

---

## Decision I — Period-locking policy

- **Exact decision:** After a month is closed, are its books frozen (corrections only via new reversing entries), or still editable?
- **Recommended option:** Hard lock on close — closed months are immutable; fixes come as new dated correction entries; reopening requires a logged reason.
- **Alternative option(s):** Soft close — allow direct edits to a closed month.
- **Concrete AQUAVO example:** June closes showing 4,500,000 IQD profit. In July you discover a 30,000 IQD supplier cost you forgot. Hard lock: you post a 30,000 IQD correcting entry dated July (audit trail intact). Soft close: someone edits June directly — and now June's "final" number silently changed after the fact.
- **Effect on per-order profit:** None directly; it governs whether finalized figures can move under you.
- **Effect on monthly profit:** Protects the integrity of each month's reported profit; corrections are transparent and traceable.
- **Effect on tax preparation:** Essential for the 5-year retention/audit requirement — locked, immutable books are what a tax authority expects.
- **Affects HISTORICAL results?** No — it protects history rather than changing it.
- **Reversibility:** Structural. The lock/reopen mechanism itself is reversible before adoption, but once you rely on locked books the discipline should not be loosened.
- **When it becomes necessary:** At the first real month-end close.
- **Group:** 2 (owner confirmation) — a structural workflow choice you should consciously adopt.

---

## Decision J — Historical cost-backfill method

- **Exact decision:** For old orders that have no recorded supplier cost, how do we fill the gap?
- **Recommended option:** Leave as `NULL` → `estimated`; backfill only from dated `product_cost_history` where a real historical cost exists; **never fabricate `0`.**
- **Alternative option(s):** Backfill from today's current cost, or default missing costs to `0` (both rejected).
- **Concrete AQUAVO example:** A March order sold a filter but no landed cost was captured. If the cost-history shows the filter cost 24,000 IQD in March, we use that and flag the order `estimated`. If nothing exists, the order stays `incomplete` — we do **not** stamp cost `0` (which would falsely show 45,000 − 5,000 = 40,000 IQD as pure gross profit) and we do **not** borrow today's 28,000 IQD cost as if it were March's.
- **Effect on per-order profit:** Determines whether an old order shows an honest `estimated` margin or a fake `exact` one. Prevents phantom profit from a fabricated zero cost.
- **Effect on monthly profit:** Keeps historical months truthful — flagged as estimated/incomplete rather than inflated.
- **Effect on tax preparation:** A base built on real-or-estimated (never fabricated) costs is defensible; a base padded with fake-zero costs is not.
- **Affects HISTORICAL results?** Yes by design — it is specifically about how past orders are valued, but only using genuine dated evidence.
- **Reversibility:** Easy — the backfill can be re-run; risk is low (37 orders, ~99% cost-complete).
- **When it becomes necessary:** Before the first historical close or any report that claims per-order COGS on pre-snapshot orders.
- **Group:** 2 for the *method*, but the **NULL-not-zero rule is a mandatory hard rule** across the whole system, not optional.

---

## Decision K — Realized-period timestamp

- **Exact decision:** Do we bucket an order's revenue by its creation date (today's behaviour) or by its actual delivery date?
- **Recommended option:** Add a `deliveredAt` timestamp and bucket realized revenue by delivery date.
- **Alternative option(s):** Keep using `createdAt` as the proxy (known-imperfect).
- **Concrete AQUAVO example:** A 120,000 IQD tank is ordered June 29 but delivered July 2. Since revenue is recognized only at delivery, it belongs to July. Using `createdAt` wrongly counts it in June; `deliveredAt` places it correctly in July.
- **Effect on per-order profit:** None to the amount — only which month the order's profit lands in.
- **Effect on monthly profit:** Corrects cross-month leakage; each month reflects what was actually delivered in it.
- **Effect on tax preparation:** Aligns revenue recognition with delivery (the correct event), giving accurate fiscal-period totals.
- **Affects HISTORICAL results?** Yes — re-buckets past orders whose delivery month differed from their creation month.
- **Reversibility:** Reversible, but requires the new `deliveredAt` column to be populated.
- **When it becomes necessary:** Before monthly P&L is trusted for close, and before the `deliveredAt` migration ships.
- **Group:** 2 (owner confirmation); additive and low-risk.

---

## Decision L — Ledger persistence

- **Exact decision:** Do we compute the double-entry ledger fresh on every read, or store permanent journal rows — and if so, when?
- **Recommended option:** Derive-on-read while a period is open; persist an immutable journal only at period close.
- **Alternative option(s):** Persist live journal rows continuously, or never persist at all.
- **Concrete AQUAVO example:** While June is open, the trial balance is recomputed from orders/expenses/returns each time you open the finance screen (always in sync, self-proving). When June closes, the system freezes June's journal into permanent append-only records so the locked month has immutable double-entry books for audit.
- **Effect on per-order profit:** None — this is purely how the ledger is stored, not how profit is calculated.
- **Effect on monthly profit:** None.
- **Effect on tax preparation:** Persisting at close gives the immutable, retained journal a tax audit expects, without the drift risk of keeping two live sources of truth.
- **Affects HISTORICAL results?** No — numbers are unchanged; only their storage/immutability changes.
- **Reversibility:** Easy before the close-persistence step ships.
- **When it becomes necessary:** At the first real period close (the freeze step).
- **Group:** 1 (safe default) — derive-on-read for open periods is built now; persistence rides along with the close workflow.

---

## What I need from you, and when

**Needed soonest (they gate the first real month-end close and the landed-cost / purchases work):**
- **A — Inventory valuation** (weighted-average recommended). Hard to reverse after a close; lock it in before the first close.
- **J — NULL-not-zero backfill.** The hard rule is already mandatory; I only need you to confirm we backfill from dated history and never fabricate zero.
- **K — `deliveredAt` bucketing.** Needed before you trust any monthly P&L.
- **I — Period locking.** Needed the moment you want a month to be "final."
- **H — VAT / sales-tax status (Group 3).** Highest impact and customer-facing. Please engage an Iraqi محاسب قانوني; until then it stays a labelled assumption. Take this offline soonest because it touches pricing.

**Can wait (build proceeds on the recommended default; confirm before activation):**
- **C — Landed-cost allocation basis** — only bites when we costs a real multi-SKU import.
- **D — Delivery-revenue treatment** — only when actual courier costs are tracked separately.
- **E — Commission timing** — only when you run a per-sale influencer deal.
- **F — Ad-spend attribution** and **G — Overhead allocation** — recommended defaults are low-risk; confirm at leisure.

**Already safe / no action unless you object:**
- **B — Packaging/box classification** (stored separately, net-neutral).
- **L — Ledger persistence** (derive open, persist at close).

**Reminder:** Every Group-3 item (led by H) is a **tax-preparation assumption, not final tax liability**, and every unknown cost is carried as **NULL/estimated, never 0**, until real evidence or an accountant confirms it.
