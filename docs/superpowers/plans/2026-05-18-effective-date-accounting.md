# Effective-Date Accounting — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure that every future cost/price change is recorded with an effective date and audit trail, so historical profit calculations for past orders are never silently rewritten.

**Architecture:** Additive only — existing schema unchanged, new columns added to `productCostHistory`, existing JSONB sale-price snapshots preserved, and the cost-entry UI upgraded to always create a history record.

**Tech Stack:** Drizzle ORM + Neon PostgreSQL, Express router (`server/routes/accounting.ts`), React + React Query v5, shared Zod schemas (`shared/accounting.ts`), Vercel startup migration in `api/index.ts`

---

## A) Current Historical Accounting Audit

### Revenue (sale price)
| Field | Location | At-order-time snapshot? |
|-------|----------|------------------------|
| Sale price per item | `orders.items[].priceAtPurchase` (JSONB) | ✅ YES — frozen at checkout |
| Collected amount | `orders.roundedTotal` / `orders.total` | ✅ YES — written by order creation |
| Shipping fee | `orders.shippingCost` | ✅ YES |
| Coupon discount | `orders.discountTotal` | ✅ YES |
| Points discount | `orders.pointsDiscount` | ✅ YES |
| Box/packaging cost | `orders.boxCost` | ✅ YES (editable by admin after delivery) |

Revenue numbers are **fully safe**. `orderCollectedAmount()` reads only stored order fields.

### Cost (COGS)
| Field | How it is resolved | Safe? |
|-------|-------------------|-------|
| `costPrice`, `packagingCost`, `insertCost` | `getEffective(productId, orderCreatedAt)` in `buildCostResolver()` | ⚠️ CONDITIONAL |

`getEffective()` logic:
1. Fetches all `productCostHistory` rows for each productId, sorted by `effectiveFrom DESC`
2. Finds first row where `effectiveFrom <= orderCreatedAt`
3. **Falls back to `products.costPrice`** if no history row qualifies

**The gap:** `POST /api/accounting/costs/:productId` (the current "edit cost" endpoint) updates `products.costPrice/packagingCost/insertCost` directly WITHOUT writing a `productCostHistory` record. Therefore:
- Products whose costs were set via this endpoint have **zero history records**
- If those costs are changed again, old orders will silently use the new cost
- Any product with `productCostHistory` is protected; any without is not

---

## B) Are Old Orders Safe from Future Price/Cost Changes?

| Scenario | Safe? | Reason |
|----------|-------|--------|
| Change `products.price` (current retail price) | ✅ YES | Revenue uses `orders.items[].priceAtPurchase` — never re-reads `products.price` |
| Change `products.costPrice` when a `productCostHistory` row already exists for that product before the order | ✅ YES | `getEffective()` finds the history row first |
| Change `products.costPrice` when NO `productCostHistory` row exists | ❌ NO | Falls back to live `products.costPrice` — historical profit silently changes |
| Change `products.costPrice` when `productCostHistory` rows exist but oldest is after the order date | ❌ NO | No qualifying history row → falls back to live value |

**Verdict:** Old orders are only safe for products that had at least one `productCostHistory` entry created BEFORE the order date. Most products have none yet.

---

## C) Missing Snapshot Fields

1. **`productCostHistory` missing `note TEXT`** — no reason for the change is recorded
2. **`productCostHistory` missing `changedBy TEXT`** — no admin audit trail
3. **`POST /costs/:productId` does not write to `productCostHistory`** — this is the critical gap; closing it prospectively fixes all future orders
4. **`orders.items` JSONB has no cost snapshots** — `costPrice`, `packagingCost`, `insertCost` are not stored per-order-line; this is acceptable because `productCostHistory` provides the lookup, but see section I for what not to build

---

## D) Proposed Schema Changes

### 1. Add `note` and `changedBy` to `productCostHistory`

Pure startup migration (idempotent `ALTER TABLE IF NOT EXISTS`). No Drizzle schema file change required because Drizzle will pick up the columns when the schema file is updated.

**`shared/schema.ts`** — add two columns to `productCostHistory`:
```ts
note: text("note"),
changedBy: text("changed_by"),
```

**`api/index.ts`** — add startup migration:
```ts
db.execute(sql`
  ALTER TABLE product_cost_history
    ADD COLUMN IF NOT EXISTS note        TEXT,
    ADD COLUMN IF NOT EXISTS changed_by  TEXT
`).then(() => console.log("[Migration] product_cost_history: note+changed_by added"))
  .catch(err => console.warn("[Migration] product_cost_history columns:", err.message));
```

### 2. No other schema changes

- `orders.items` JSONB must NOT be changed — would require modifying checkout (forbidden)
- No new tables needed

---

## E) Proposed Calculation Logic Changes

No changes to `calcOrderProfit()`, `buildCostResolver()`, or `getEffective()`. The logic is correct.

The only behavioral change: when admin sets costs for a product, the system MUST ALSO write a `productCostHistory` record at the same time. After this change:
- All future cost updates create a history entry
- `getEffective()` will find the history entry and use it
- The fallback to `products.costPrice` only applies to products whose costs were set before this fix — and only for orders placed before the first history entry

**Calculation formula (unchanged):**
```
netProfit = revenue - cogs - packaging
revenue   = orderCollectedAmount(order) - shippingCost
cogs      = Σ (effectiveCost.costPrice × qty)        [uses getEffective(productId, orderDate)]
packaging = Σ ((effectiveCost.packagingCost + effectiveCost.insertCost) × qty) + boxCost
```

---

## F) Effective-Date UI Plan

### Current flow (broken)
Admin clicks "تعديل الكلفة" → form with `costPrice/packagingCost/insertCost` → `POST /costs/:productId` → updates `products` table only → no history written

### New flow
Admin clicks "سجّل تغيير كلفة" → form with:
- `costPrice` (required, ≥ 0)
- `packagingCost` (required, ≥ 0)
- `insertCost` (required, ≥ 0)
- `effectiveFrom` (date picker, default = today, must be ≤ today, no future dates)
- `note` (optional text, max 200 chars)

On save:
1. `POST /api/accounting/cost-history/:productId` → inserts `productCostHistory` row (already exists, extend with `note` + `changedBy`)
2. `POST /api/accounting/costs/:productId` → updates `products.costPrice/packagingCost/insertCost` to keep current value in sync

### Cost history timeline (per product)
- Read: `GET /api/accounting/cost-history/:productId` (already exists, extend serializer with `note` + `changedBy`)
- Display: chronological list showing when and why costs changed
- No edit/delete on history rows (immutable audit log)

### Where this lives
- "ربحية المنتجات" tab → product row → expand → "كلف المنتج" section → cost history timeline + "سجّل تغيير" button
- The existing inline edit on `finance-overview.tsx` cost cards should also route through the new form

---

## G) Scenario Simulator Safety Rules

The existing scenario simulator (if built) MUST:
- Operate entirely in-memory / React state — zero DB writes
- Label every output clearly: `تحذير: هذه محاكاة افتراضية — ليست أرقاماً حقيقية`
- Never render an "Apply" button, "حفظ", or "تطبيق" of any kind
- Accept hypothetical inputs (new cost, new price, new shipping rate) through uncontrolled form inputs — never write them to DB
- Be in a separate React component, never share mutation hooks with the accounting tab

If someone adds an "Apply" button later, it must require a separate "تغيير الكلفة الفعلي" flow (the new form above) — never a direct simulator-to-DB write.

---

## H) First Safe Implementation Task

**Task 1: Add `note` and `changedBy` to `productCostHistory` + wire cost-update to always create a history entry**

This is the highest-impact, zero-risk first task:
- Schema change is purely additive (new nullable columns)
- History record creation on cost update is purely additive (new insert alongside existing update)
- Closes the main historical safety gap for all future orders
- No change to calculation logic
- No change to checkout or order creation
- No UI change required in Task 1 (backend only)

See Task 1 below.

---

## I) What NOT to Build Yet

| Thing | Why not |
|-------|---------|
| Add cost snapshots to `orders.items` JSONB | Requires touching order creation — forbidden |
| Retroactively recalculate profit on old orders | Destructive — violates "do not update old order rows" |
| Invent missing cost values for products with no history | Forbidden — "missing cost = غير مكتمل" |
| "Apply" button on scenario simulator | Forbidden — simulator is simulation-only |
| Sale price history table | Unnecessary — `priceAtPurchase` already frozen in JSONB |
| `effectiveFrom` in the future (scheduled changes) | Out of scope — would require a new pricing engine |
| Back-fill cost history for old orders | Admin can optionally back-fill via the new form (effectiveFrom in the past) — but never auto-fill |
| Customer-facing exposure of any cost data | Forbidden |

---

## File Structure

**Files to modify:**
- `shared/schema.ts:169-180` — add `note`, `changedBy` to `productCostHistory`
- `shared/accounting.ts` — extend `accountingCostHistoryInputSchema` with optional `note` and `changedBy`
- `server/routes/accounting.ts:644-677` — `POST /costs/:productId` must also write to `productCostHistory`
- `server/routes/accounting.ts:756-784` — `POST /cost-history/:productId` must accept `note` and `changedBy`, pass to insert
- `server/routes/accounting.ts:353-363` — `serializeCostHistory` must include `note` and `changedBy`
- `api/index.ts` — add `ALTER TABLE` startup migration for the two new columns

**Files to create:**
- None for Tasks 1-2

---

## Task 1: Schema + backend — add `note`/`changedBy` to cost history, wire dual-write on cost update

**Files:**
- Modify: `shared/schema.ts:169-180` (productCostHistory table definition)
- Modify: `shared/accounting.ts` (Zod schema extension)
- Modify: `server/routes/accounting.ts` (3 locations)
- Modify: `api/index.ts` (startup migration)

- [ ] **Step 1: Update `productCostHistory` table definition in `shared/schema.ts`**

Replace the current table body (lines 169-180):
```ts
export const productCostHistory = pgTable("product_cost_history", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: text("product_id").references(() => products.id).notNull(),
  costPrice: numeric("cost_price").notNull().default("0"),
  packagingCost: numeric("packaging_cost").notNull().default("0"),
  insertCost: numeric("insert_cost").notNull().default("0"),
  effectiveFrom: timestamp("effective_from").notNull(),
  note: text("note"),
  changedBy: text("changed_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  productIdIdx: index("pch_product_id_idx").on(table.productId),
  effectiveFromIdx: index("pch_effective_from_idx").on(table.effectiveFrom),
}));
```

- [ ] **Step 2: Extend `accountingCostHistoryInputSchema` in `shared/accounting.ts`**

Find the schema (it will look something like):
```ts
export const accountingCostHistoryInputSchema = z.object({
  costPrice: z.coerce.number().min(0),
  packagingCost: z.coerce.number().min(0),
  insertCost: z.coerce.number().min(0),
  effectiveFrom: z.string().min(1),
});
```

Replace with:
```ts
export const accountingCostHistoryInputSchema = z.object({
  costPrice: z.coerce.number().min(0),
  packagingCost: z.coerce.number().min(0),
  insertCost: z.coerce.number().min(0),
  effectiveFrom: z.string().min(1),
  note: z.string().max(200).optional(),
  changedBy: z.string().optional(),
});
```

- [ ] **Step 3: Update `serializeCostHistory` in `server/routes/accounting.ts`**

Replace (around line 353):
```ts
function serializeCostHistory(history: CostHistoryRow) {
  return {
    id: history.id,
    productId: history.productId,
    costPrice: toNumber(history.costPrice),
    packagingCost: toNumber(history.packagingCost),
    insertCost: toNumber(history.insertCost),
    effectiveFrom: toDate(history.effectiveFrom).toISOString(),
    createdAt: toDate(history.createdAt).toISOString(),
    note: history.note ?? null,
    changedBy: history.changedBy ?? null,
  };
}
```

- [ ] **Step 4: Update `POST /cost-history/:productId` to insert `note` and `changedBy`**

In `server/routes/accounting.ts` around line 756, replace the insert values:
```ts
const { costPrice, packagingCost, insertCost, effectiveFrom, note, changedBy } = parsed.data;
const [entry] = await db
  .insert(productCostHistory)
  .values({
    productId,
    costPrice: String(costPrice),
    packagingCost: String(packagingCost),
    insertCost: String(insertCost),
    effectiveFrom: new Date(effectiveFrom),
    note: note ?? null,
    changedBy: changedBy ?? null,
  })
  .returning();
```

- [ ] **Step 5: Update `POST /costs/:productId` to also write a `productCostHistory` entry**

Replace the handler around line 644 with dual-write:
```ts
router.post("/costs/:productId", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getAccountingDb(res);
    if (!db) return;

    const { productId } = req.params as { productId: string };
    const parsed = accountingCostInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: "بيانات الكلفة غير صالحة", errors: parsed.error.flatten() });
      return;
    }

    const { costPrice, packagingCost, insertCost } = parsed.data;

    const [updated] = await db
      .update(products)
      .set({
        costPrice: String(costPrice),
        packagingCost: String(packagingCost),
        insertCost: String(insertCost),
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId))
      .returning();

    if (!updated) {
      res.status(404).json({ success: false, message: "المنتج غير موجود" });
      return;
    }

    // Write history entry so future getEffective() calls have a safe reference point
    await db.insert(productCostHistory).values({
      productId,
      costPrice: String(costPrice),
      packagingCost: String(packagingCost),
      insertCost: String(insertCost),
      effectiveFrom: new Date(),
      note: null,
      changedBy: null,
    });

    res.json({ success: true, data: { costPrice, packagingCost, insertCost } });
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 6: Add startup migration to `api/index.ts`**

After the existing expenses migration block, add:
```ts
db.execute(sql`
  ALTER TABLE product_cost_history
    ADD COLUMN IF NOT EXISTS note        TEXT,
    ADD COLUMN IF NOT EXISTS changed_by  TEXT
`).then(() => console.log("[Migration] product_cost_history: note+changed_by ready"))
  .catch(err => console.warn("[Migration] product_cost_history columns:", err.message));
```

- [ ] **Step 7: Build check**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 8: Commit**

```bash
git add shared/schema.ts shared/accounting.ts server/routes/accounting.ts api/index.ts
git commit -m "feat(accounting): add note/changedBy to cost history, dual-write on cost update

Closes the main historical safety gap: every cost update now creates a
productCostHistory entry, so getEffective() will always find a qualifying
row for future orders. New columns are nullable and additive."
```

---

## Task 2: UI — "سجّل تغيير كلفة" form with effectiveFrom and note

**Files:**
- Create: `client/src/components/admin/cost-history-form.tsx`
- Modify: wherever the current cost edit button lives (finance-overview or product-profitability tab)

- [ ] **Step 1: Create `cost-history-form.tsx`**

```tsx
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addCsrfHeader } from "@/lib/csrf";
import { useToast } from "@/hooks/use-toast";

interface CostHistoryFormProps {
  productId: string;
  productName: string;
  currentCostPrice: number;
  currentPackagingCost: number;
  currentInsertCost: number;
  onClose: () => void;
}

interface FormState {
  costPrice: string;
  packagingCost: string;
  insertCost: string;
  effectiveFrom: string;
  note: string;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function CostHistoryForm({
  productId,
  productName,
  currentCostPrice,
  currentPackagingCost,
  currentInsertCost,
  onClose,
}: CostHistoryFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>({
    costPrice: String(currentCostPrice),
    packagingCost: String(currentPackagingCost),
    insertCost: String(currentInsertCost),
    effectiveFrom: todayStr(),
    note: "",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const body = {
        costPrice: Number(form.costPrice),
        packagingCost: Number(form.packagingCost),
        insertCost: Number(form.insertCost),
        effectiveFrom: form.effectiveFrom,
        note: form.note.trim() || undefined,
      };
      const res = await fetch(`/api/accounting/cost-history/${productId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...addCsrfHeader() },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("فشل الحفظ");
      // Also sync the product's current cost fields
      await fetch(`/api/accounting/costs/${productId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...addCsrfHeader() },
        credentials: "include",
        body: JSON.stringify({
          costPrice: body.costPrice,
          packagingCost: body.packagingCost,
          insertCost: body.insertCost,
        }),
      });
    },
    onSuccess: () => {
      toast({ description: "تم حفظ تغيير الكلفة" });
      queryClient.invalidateQueries({ queryKey: ["accounting-summary"] });
      queryClient.invalidateQueries({ queryKey: ["cost-history", productId] });
      onClose();
    },
    onError: () => {
      toast({ description: "فشل الحفظ — حاول مجدداً", variant: "destructive" });
    },
  });

  const field = (key: keyof FormState, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
      style={{ display: "flex", flexDirection: "column", gap: 12, direction: "rtl" }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{productName}</div>

      {(["costPrice", "packagingCost", "insertCost"] as const).map((k) => (
        <label key={k} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 12, color: "#94a3b8" }}>
            {{ costPrice: "سعر الكلفة", packagingCost: "كلفة الكارتونة", insertCost: "كلفة الإدراج" }[k]}
          </span>
          <input
            type="number"
            min={0}
            step="any"
            required
            value={form[k]}
            onChange={(e) => field(k, e.target.value)}
            style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #334155", background: "#0f172a", color: "#f1f5f9" }}
          />
        </label>
      ))}

      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 12, color: "#94a3b8" }}>ساري اعتباراً من</span>
        <input
          type="date"
          required
          max={todayStr()}
          value={form.effectiveFrom}
          onChange={(e) => field("effectiveFrom", e.target.value)}
          style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #334155", background: "#0f172a", color: "#f1f5f9" }}
        />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 12, color: "#94a3b8" }}>سبب التغيير (اختياري)</span>
        <input
          type="text"
          maxLength={200}
          value={form.note}
          onChange={(e) => field("note", e.target.value)}
          placeholder="مثال: زيادة سعر المورّد"
          style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #334155", background: "#0f172a", color: "#f1f5f9" }}
        />
      </label>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
        <button
          type="button"
          onClick={onClose}
          style={{ padding: "6px 16px", borderRadius: 6, border: "1px solid #334155", background: "transparent", color: "#94a3b8", cursor: "pointer" }}
        >
          إلغاء
        </button>
        <button
          type="submit"
          disabled={mutation.isPending}
          style={{ padding: "6px 16px", borderRadius: 6, border: "none", background: "#199bb8", color: "#fff", cursor: "pointer", opacity: mutation.isPending ? 0.6 : 1 }}
        >
          {mutation.isPending ? "جاري الحفظ..." : "حفظ التغيير"}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Build check**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add client/src/components/admin/cost-history-form.tsx
git commit -m "feat(admin): add CostHistoryForm with effectiveFrom and note fields"
```

---

## Task 3: Cost history timeline viewer per product

**Files:**
- Create: `client/src/components/admin/cost-history-timeline.tsx`

- [ ] **Step 1: Create `cost-history-timeline.tsx`**

```tsx
import { useQuery } from "@tanstack/react-query";

interface CostHistoryEntry {
  id: string;
  costPrice: number;
  packagingCost: number;
  insertCost: number;
  effectiveFrom: string;
  createdAt: string;
  note: string | null;
  changedBy: string | null;
}

interface CostHistoryTimelineProps {
  productId: string;
}

function fmt(n: number): string {
  return n.toLocaleString("ar-IQ") + " د.ع";
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ar-IQ", { year: "numeric", month: "short", day: "numeric" });
}

export function CostHistoryTimeline({ productId }: CostHistoryTimelineProps) {
  const { data, isLoading, isError } = useQuery<{ success: boolean; data: CostHistoryEntry[] }>({
    queryKey: ["cost-history", productId],
    queryFn: async () => {
      const res = await fetch(`/api/accounting/cost-history/${productId}`, { credentials: "include" });
      if (!res.ok) throw new Error("فشل التحميل");
      return res.json() as Promise<{ success: boolean; data: CostHistoryEntry[] }>;
    },
  });

  if (isLoading) return <div style={{ color: "#94a3b8", fontSize: 12 }}>جاري التحميل...</div>;
  if (isError) return <div style={{ color: "#ef4444", fontSize: 12 }}>فشل تحميل السجل</div>;

  const entries = data?.data ?? [];
  if (entries.length === 0) {
    return <div style={{ color: "#94a3b8", fontSize: 12 }}>لا يوجد سجل تغييرات بعد</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, direction: "rtl" }}>
      {entries.map((entry, i) => (
        <div
          key={entry.id}
          style={{
            borderRight: `2px solid ${i === 0 ? "#199bb8" : "#334155"}`,
            paddingRight: 12,
            paddingBottom: 8,
          }}
        >
          <div style={{ fontSize: 11, color: "#94a3b8" }}>{fmtDate(entry.effectiveFrom)}</div>
          <div style={{ display: "flex", gap: 12, marginTop: 2, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12 }}>كلفة: <strong>{fmt(entry.costPrice)}</strong></span>
            <span style={{ fontSize: 12 }}>كارتونة: <strong>{fmt(entry.packagingCost)}</strong></span>
            <span style={{ fontSize: 12 }}>إدراج: <strong>{fmt(entry.insertCost)}</strong></span>
          </div>
          {entry.note && (
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{entry.note}</div>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Build check**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add client/src/components/admin/cost-history-timeline.tsx
git commit -m "feat(admin): add CostHistoryTimeline component for per-product cost audit log"
```

---

## Task 4: Deploy to production

- [ ] **Step 1: Final build check**

Run: `npx tsc --noEmit && pnpm run build`
Expected: no errors, build succeeds

- [ ] **Step 2: Deploy**

```bash
git push origin main
```

Vercel will auto-deploy. On first cold start, `api/index.ts` will run the `ALTER TABLE` migration adding `note` and `changed_by` columns to `product_cost_history`.

- [ ] **Step 3: Smoke test**

```bash
curl -sL https://aquavoiq.com/api/admin/accounting/cost-history/<any-product-id> \
  -H "Cookie: sid=<admin-session>" | jq '.data[0] | keys'
```
Expected: `["changedBy", "costPrice", "createdAt", "effectiveFrom", "id", "insertCost", "note", "packagingCost", "productId"]`

If the response shows `note` and `changedBy` keys (even as `null`) — migration succeeded.

---
