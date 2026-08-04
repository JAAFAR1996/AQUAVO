# AQUAVO COD Refusal & Exchange Accounting Policy

**Approved by owner:** 2026-08-04  
**Accounting cutover:** 2026-08-01, Asia/Baghdad  
**Scope:** AQUAVO / محل المنبع COD orders

## 1. Full refusal before acceptance

A full refusal happens before the customer accepts the parcel. It is not a sale
and it is not a post-delivery refund.

Required treatment:

- realised revenue: **0**
- cash collected: **0**
- refund: **0**
- carrier charge to AQUAVO: **0**
- return-shipping charge to AQUAVO: **0**
- product write-off: **0**
- COGS loss: **0**
- returned products: **sellable**
- carton: damaged/lost classification only; never a second additive expense

The sellable quantity becomes available when the carrier confirms refusal. The
later admin action "استلمت من الشركة" confirms physical custody only and must
not increase quantity a second time.

For operational control, reports must distinguish:

- sellable quantity owned by AQUAVO
- physical location `MAIN`
- physical location `RETURN_PENDING` while still with the carrier

## 2. Preparation materials

Per order:

- one AQUAVO gift sticker: **50 IQD**
- one thank-you/contact card: **100 IQD**
- carton: actual approved carton cost
- tape, protective bags, bubble wrap, paper/foam filler: recipe-driven by product,
  with actual consumption editable during packing

On a full refusal, the gift sticker and card return with the products. On a
partial refusal, they stay with the customer. In both cases their original
preparation cost remains in the original shipment snapshot and is not deducted
again.

## 3. Partial refusal at the door

Partial refusal is rare but supported as an item-level event. The customer pays:

- the net value of accepted product quantities
- the full customer delivery fee

The order discount is allocated proportionally to all item lines, using a stable
largest-remainder method so every IQD is allocated exactly once. Accepted and
refused quantities must be recorded per line.

The carton is classified damaged only when it stayed with the customer or was
returned damaged. This classification is never a second expense.

## 4. Exchanges

An exchange never rewrites the original order. The original item follows its
return/warranty path, and a new linked replacement order is created.

- more expensive replacement: customer pays the difference
- cheaper replacement: difference becomes customer store credit
- store credit: no expiry, partial use allowed, remaining balance carries forward
- store credit is a liability until used, never revenue when issued
- ledger entries are immutable; corrections use reversing entries

## 5. Inventory costing

AQUAVO does not require serial/batch tracking at its present volume. Inventory
uses weighted-average acquisition cost, while each order line keeps an immutable
sale-time cost snapshot. A refused product returns at the frozen product cost,
not a later catalogue cost, and order-level packaging is never mixed into product
inventory cost.

## 6. Separate warranty path

Post-delivery damage, shortage, non-conformity, repair, replacement and limited
warranty are a separate workflow. They must not use the COD-refusal accounting
rules or the legacy 14-day/change-of-mind AI return assumptions.

## 7. Non-negotiable controls

- no revenue before confirmed customer acceptance
- no carrier expense for COD refusal under the current carrier agreement
- no product loss for a sellable refused item
- no duplicate carton deduction
- no negative customer credit
- no mutation or deletion of credit ledger entries
- no Production migration without a cloned-branch test and explicit owner approval
