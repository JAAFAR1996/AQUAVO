# Orders, Invoices, Returns & Advanced Accounting — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add delete for orders/invoices, two return statuses with stock logic, COD cash tracking, coupon analysis, and time-aware cost price history to the AQUAVO admin panel.

**Architecture:** Schema changes run via manual SQL on Neon Console (TCP connection blocked locally). Backend routes extend existing `admin.ts`, `admin-invoices.ts`, and `accounting.ts`. Frontend extends existing admin components without creating new pages.

**Tech Stack:** Express + TypeScript + Drizzle ORM + Neon PostgreSQL + React + TanStack Query + shadcn/ui. ESM project — all imports use `.js` extension. CSRF: `addCsrfHeader()` on all mutating fetches.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `shared/schema.ts` | Modify | Add `codReceived` to orders; define `shippingSettlements` + `productCostHistory` tables |
| `migrations/run-new-tables.sql` | Create | Manual SQL for Neon Console |
| `server/storage/order-storage.ts` | Modify | Add `deleteOrder()` method |
| `server/storage/invoice-storage.ts` | Modify | Add `deleteById()` method |
| `server/routes/admin.ts` | Modify | Add `DELETE /orders/:id`; extend `PUT /orders/:id` for `rejected_returned` stock restoration |
| `server/routes/admin-invoices.ts` | Modify | Add `DELETE /:id` endpoint |
| `server/routes/accounting.ts` | Modify | Add COD endpoints, cost history endpoints, coupon analysis; update `calcOrderProfit()` to be time-aware |
| `client/src/components/admin/orders-management.tsx` | Modify | Delete button + AlertDialog; new return statuses in Select |
| `client/src/components/admin/invoices-list.tsx` | Modify | Delete button + AlertDialog |
| `client/src/components/admin/accounting-panel.tsx` | Modify | COD section + cost history UI + coupon tab |

---

## Task 1: DB Schema + Manual SQL

**Files:**
- Modify: `shared/schema.ts`
- Create: `migrations/run-new-tables.sql`

- [ ] **Step 1: Add `codReceived` field to the orders table in schema.ts**

Open `shared/schema.ts`. After the `carrier` field (line ~150), add:

```typescript
  codReceived: boolean("cod_received").default(false),
```

So the orders table block ends like:
```typescript
  carrier: text("carrier"),
  codReceived: boolean("cod_received").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
```

- [ ] **Step 2: Add `shippingSettlements` table to schema.ts**

After the `orders` table definition (before `reviews`), add:

```typescript
export const shippingSettlements = pgTable("shipping_settlements", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  carrier: text("carrier").notNull(),
  amount: numeric("amount").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

- [ ] **Step 3: Add `productCostHistory` table to schema.ts**

After `shippingSettlements`, add:

```typescript
export const productCostHistory = pgTable("product_cost_history", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: text("product_id").references(() => products.id).notNull(),
  costPrice: numeric("cost_price").notNull().default("0"),
  packagingCost: numeric("packaging_cost").notNull().default("0"),
  insertCost: numeric("insert_cost").notNull().default("0"),
  effectiveFrom: timestamp("effective_from").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  productIdIdx: index("pch_product_id_idx").on(table.productId),
  effectiveFromIdx: index("pch_effective_from_idx").on(table.effectiveFrom),
}));
```

- [ ] **Step 4: Create `migrations/run-new-tables.sql`**

```sql
-- Run in Neon Console: https://console.neon.tech → project → SQL Editor

-- 1. Add codReceived to orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS cod_received BOOLEAN DEFAULT FALSE;

-- 2. Create shipping_settlements table
CREATE TABLE IF NOT EXISTS shipping_settlements (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier     TEXT NOT NULL,
  amount      NUMERIC NOT NULL,
  notes       TEXT,
  created_at  TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 3. Create product_cost_history table
CREATE TABLE IF NOT EXISTS product_cost_history (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      TEXT NOT NULL REFERENCES products(id),
  cost_price      NUMERIC NOT NULL DEFAULT 0,
  packaging_cost  NUMERIC NOT NULL DEFAULT 0,
  insert_cost     NUMERIC NOT NULL DEFAULT 0,
  effective_from  TIMESTAMP NOT NULL,
  created_at      TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS pch_product_id_idx ON product_cost_history(product_id);
CREATE INDEX IF NOT EXISTS pch_effective_from_idx ON product_cost_history(effective_from);

-- Verify:
SELECT column_name FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'cod_received';
SELECT table_name FROM information_schema.tables WHERE table_name IN ('shipping_settlements','product_cost_history');
```

- [ ] **Step 5: Run the SQL in Neon Console**

Go to https://console.neon.tech → project → SQL Editor → paste and run `migrations/run-new-tables.sql`. Confirm "Statement executed successfully".

- [ ] **Step 6: Commit**

```
git add shared/schema.ts migrations/run-new-tables.sql
git commit -m "feat: add codReceived, shippingSettlements, productCostHistory schema"
```

---

## Task 2: Storage Methods — deleteOrder + deleteInvoice

**Files:**
- Modify: `server/storage/order-storage.ts`
- Modify: `server/storage/invoice-storage.ts`

- [ ] **Step 1: Add `deleteOrder()` to order-storage.ts**

Open `server/storage/order-storage.ts`. After `updateOrder()` (after line ~54), add:

```typescript
    async deleteOrder(id: string): Promise<boolean> {
        const db = this.ensureDb();
        const result = await db.delete(orders).where(eq(orders.id, id)).returning({ id: orders.id });
        return result.length > 0;
    }
```

Make sure `delete` is imported from drizzle-orm (it should already be, check existing imports — add if missing).

- [ ] **Step 2: Check imports in order-storage.ts**

The file should already import `{ eq, and, gte, lte, sql }` from `"drizzle-orm"`. If `delete` from drizzle is used differently (it's called via `db.delete()`), no extra import is needed — `db.delete` is a method on the drizzle instance.

- [ ] **Step 3: Add `deleteById()` to invoice-storage.ts**

Open `server/storage/invoice-storage.ts`. Find the class/object and add after the existing methods:

```typescript
  async deleteById(id: string): Promise<boolean> {
    const db = getDb();
    if (!db) throw new Error("DB not initialized");
    const result = await db.delete(manualInvoices).where(eq(manualInvoices.id, id)).returning({ id: manualInvoices.id });
    return result.length > 0;
  }
```

Check existing imports in that file — `manualInvoices` table and `eq` must be imported. Add if missing.

- [ ] **Step 4: Commit**

```
git add server/storage/order-storage.ts server/storage/invoice-storage.ts
git commit -m "feat: add deleteOrder and deleteInvoice storage methods"
```

---

## Task 3: Backend — DELETE /orders/:id + rejected_returned stock logic

**Files:**
- Modify: `server/routes/admin.ts`

- [ ] **Step 1: Add DELETE /orders/:id to admin.ts**

Open `server/routes/admin.ts`. After the `router.put("/orders/:id", ...)` block (which ends around line 250+), add:

```typescript
    router.delete("/orders/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params as { id: string };
            const deleted = await storage.deleteOrder(id);
            if (!deleted) {
                res.status(404).json({ success: false, message: "الطلب غير موجود" });
                return;
            }
            await storage.createAuditLog({
                userId: (req as any).session?.userId || "admin",
                action: "delete",
                entityType: "order",
                entityId: id,
                changes: {}
            });
            res.json({ success: true });
        } catch (err) {
            next(err);
        }
    });
```

- [ ] **Step 2: Add `rejected_returned` and `rejected_carrier` stock restoration logic to PUT /orders/:id**

Inside the existing `router.put("/orders/:id", ...)` handler, after the `rejected` status block (currently handles loyalty cancel + IP ban), add a new block:

```typescript
                // 📦 رجوع البضاعة للمخزون عند رفض + إرجاع من العميل
                if (newStatus === "rejected_returned" && oldStatus !== "rejected_returned") {
                    try {
                        const { getDb } = await import("../db.js");
                        const dbConn = getDb();
                        if (dbConn && Array.isArray(order.items)) {
                            for (const item of (order.items as any[])) {
                                if (item.productId && item.quantity) {
                                    await dbConn
                                        .update(products)
                                        .set({ stock: sql`stock + ${item.quantity}` })
                                        .where(eq(products.id, item.productId));
                                }
                            }
                            console.log(`[Admin] 📦 Stock restored for rejected_returned order ${order.id}`);
                        }
                    } catch (stockErr) {
                        console.error("[Admin] Failed to restore stock:", stockErr);
                    }
                    // Also cancel loyalty points
                    try {
                        const { loyaltyStorage } = await import("../storage/loyalty-storage.js");
                        if ((order as any).userId) {
                            await loyaltyStorage.cancelOrderPoints((order as any).userId, order.id);
                        }
                    } catch (loyaltyErr) {
                        console.error("[Admin] Failed to cancel loyalty points:", loyaltyErr);
                    }
                }

                // 🚚 رفض + بقي عند شركة الشحن — بدون تغيير مخزون
                if (newStatus === "rejected_carrier" && oldStatus !== "rejected_carrier") {
                    try {
                        const { loyaltyStorage } = await import("../storage/loyalty-storage.js");
                        if ((order as any).userId) {
                            await loyaltyStorage.cancelOrderPoints((order as any).userId, order.id);
                        }
                    } catch (loyaltyErr) {
                        console.error("[Admin] Failed to cancel loyalty points:", loyaltyErr);
                    }
                }
```

Note: `products` and `eq` and `sql` are already imported at top of admin.ts. Confirm the import line includes them — if not, add. Also import `products` from `"../../shared/schema.js"` if not already present.

- [ ] **Step 3: Verify imports at top of admin.ts**

The file currently imports:
```typescript
import { sql } from "drizzle-orm";
```
And uses `storage` from `"../storage/index.js"`. The `products` table is needed for the stock update — add it:

```typescript
import { products } from "../../shared/schema.js";
import { eq } from "drizzle-orm";
```

Check existing imports and add only what's missing.

- [ ] **Step 4: Commit**

```
git add server/routes/admin.ts
git commit -m "feat: DELETE /orders/:id + rejected_returned stock restoration"
```

---

## Task 4: Backend — DELETE /invoices/:id

**Files:**
- Modify: `server/routes/admin-invoices.ts`

- [ ] **Step 1: Add DELETE /:id to admin-invoices.ts**

Open `server/routes/admin-invoices.ts`. After the last route (POST /:id/cancel), add:

```typescript
/** DELETE /api/admin/invoices/:id — حذف نهائي */
router.delete("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const deleted = await invoiceStorage.deleteById(req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, message: "الفاتورة غير موجودة" });
      return;
    }
    res.json({ success: true });
  } catch (err) { next(err); }
});
```

- [ ] **Step 2: Commit**

```
git add server/routes/admin-invoices.ts
git commit -m "feat: DELETE /api/admin/invoices/:id"
```

---

## Task 5: Backend — COD Accounting Endpoints

**Files:**
- Modify: `server/routes/accounting.ts`

- [ ] **Step 1: Add shippingSettlements import to accounting.ts**

At the top of `server/routes/accounting.ts`, update the schema import to include the new tables:

```typescript
import { orders, products, shippingSettlements, productCostHistory } from "../../shared/schema.js";
```

Also add `desc` to drizzle-orm imports:

```typescript
import { and, gte, lte, isNull, inArray, eq, lte as lteOp, desc, lt } from "drizzle-orm";
```

(Use the actual import style already in the file — just add `shippingSettlements`, `productCostHistory`, `desc` to existing imports.)

- [ ] **Step 2: Add GET /api/admin/accounting/cod-summary**

After the existing `/orders` endpoint, add:

```typescript
// ─── GET /api/admin/accounting/cod-summary ──────────────────────────────────

router.get("/cod-summary", async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getDb();

    // Total COD orders (shipped/delivered, not cancelled/rejected)
    const codOrders = await db
      .select()
      .from(orders)
      .where(and(
        inArray(orders.status, ["shipped", "delivered", "rejected_returned", "rejected_carrier"]),
      ));

    const totalCod = codOrders.reduce((sum, o) => sum + (Number(o.roundedTotal ?? o.total) || 0), 0);

    // Already marked as received
    const receivedOrders = codOrders.filter((o: any) => o.codReceived === true);
    const totalReceived = receivedOrders.reduce((sum, o) => sum + (Number(o.roundedTotal ?? o.total) || 0), 0);

    // Pending from carrier
    const totalPending = totalCod - totalReceived;

    // Settlements history
    const settlements = await db
      .select()
      .from(shippingSettlements)
      .orderBy(desc(shippingSettlements.createdAt));

    res.json({
      success: true,
      data: {
        totalCod,
        totalReceived,
        totalPending,
        settlements,
      },
    });
  } catch (err) { next(err); }
});
```

- [ ] **Step 3: Add POST /api/admin/accounting/settlements**

```typescript
// ─── POST /api/admin/accounting/settlements ─────────────────────────────────

router.post("/settlements", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getDb();
    const { carrier, amount, notes, orderIds } = req.body as {
      carrier: string;
      amount: number;
      notes?: string;
      orderIds?: string[];
    };

    if (!carrier || !amount || amount <= 0) {
      res.status(400).json({ success: false, message: "carrier و amount مطلوبان" });
      return;
    }

    // Create settlement record
    const [settlement] = await db
      .insert(shippingSettlements)
      .values({ carrier, amount: String(amount), notes: notes ?? null })
      .returning();

    // Mark the specified orders as cod_received = true
    if (Array.isArray(orderIds) && orderIds.length > 0) {
      await db
        .update(orders)
        .set({ codReceived: true } as any)
        .where(inArray(orders.id, orderIds));
    }

    res.status(201).json({ success: true, data: settlement });
  } catch (err) { next(err); }
});
```

- [ ] **Step 4: Add GET /api/admin/accounting/settlements**

```typescript
// ─── GET /api/admin/accounting/settlements ──────────────────────────────────

router.get("/settlements", async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getDb();
    const list = await db
      .select()
      .from(shippingSettlements)
      .orderBy(desc(shippingSettlements.createdAt));
    res.json({ success: true, data: list });
  } catch (err) { next(err); }
});
```

- [ ] **Step 5: Commit**

```
git add server/routes/accounting.ts
git commit -m "feat: COD summary + settlements endpoints"
```

---

## Task 6: Backend — Cost History + Coupon Analysis Endpoints

**Files:**
- Modify: `server/routes/accounting.ts`

- [ ] **Step 1: Update `calcOrderProfit()` to accept a cost lookup function**

Replace the current `calcOrderProfit` signature:

```typescript
function calcOrderProfit(order: any, costMap: CostMap): OrderProfit {
```

Change `CostMap` to support time-aware cost lookup via a passed-in function. Add a new helper:

```typescript
async function getCostAtTime(
  db: ReturnType<typeof getDb>,
  productId: string,
  orderDate: Date
): Promise<{ costPrice: number; packagingCost: number; insertCost: number } | null> {
  // Find latest cost history entry where effectiveFrom <= orderDate
  const history = await db!
    .select()
    .from(productCostHistory)
    .where(and(
      eq(productCostHistory.productId, productId),
      lte(productCostHistory.effectiveFrom, orderDate),
    ))
    .orderBy(desc(productCostHistory.effectiveFrom))
    .limit(1);

  if (history.length > 0) {
    return {
      costPrice:     Number(history[0].costPrice)     || 0,
      packagingCost: Number(history[0].packagingCost) || 0,
      insertCost:    Number(history[0].insertCost)    || 0,
    };
  }
  return null;
}
```

The existing `calcOrderProfit` stays as-is (uses the costMap fallback). The new endpoints below will layer history on top. No need to change the existing summary/products/orders endpoints — they already work. Cost history is additive.

- [ ] **Step 2: Add GET /api/admin/accounting/cost-history/:productId**

```typescript
// ─── GET /api/admin/accounting/cost-history/:productId ──────────────────────

router.get("/cost-history/:productId", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getDb();
    const { productId } = req.params as { productId: string };
    const history = await db!
      .select()
      .from(productCostHistory)
      .where(eq(productCostHistory.productId, productId))
      .orderBy(desc(productCostHistory.effectiveFrom));
    res.json({ success: true, data: history });
  } catch (err) { next(err); }
});
```

- [ ] **Step 3: Add POST /api/admin/accounting/cost-history/:productId**

```typescript
// ─── POST /api/admin/accounting/cost-history/:productId ─────────────────────

router.post("/cost-history/:productId", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getDb();
    const { productId } = req.params as { productId: string };
    const { costPrice, packagingCost, insertCost, effectiveFrom } = req.body as {
      costPrice: number;
      packagingCost: number;
      insertCost: number;
      effectiveFrom: string;
    };

    if (!effectiveFrom) {
      res.status(400).json({ success: false, message: "effectiveFrom مطلوب" });
      return;
    }

    const [entry] = await db!
      .insert(productCostHistory)
      .values({
        productId,
        costPrice:     String(costPrice     ?? 0),
        packagingCost: String(packagingCost ?? 0),
        insertCost:    String(insertCost    ?? 0),
        effectiveFrom: new Date(effectiveFrom),
      })
      .returning();

    res.status(201).json({ success: true, data: entry });
  } catch (err) { next(err); }
});
```

- [ ] **Step 4: Add GET /api/admin/accounting/coupons**

```typescript
// ─── GET /api/admin/accounting/coupons ──────────────────────────────────────

router.get("/coupons", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getDb();
    const { period = "month", from, to } = req.query as Record<string, string>;
    const { start, end } = periodRange(period, from, to);

    const couponOrders = await db!
      .select()
      .from(orders)
      .where(and(
        gte(orders.createdAt, start),
        lte(orders.createdAt, end),
      ));

    // Group by couponId
    const map: Record<string, { couponCode: string; usageCount: number; totalDiscount: number }> = {};
    for (const o of couponOrders) {
      if (!o.couponId) continue;
      const discount = Number(o.discountTotal) || 0;
      if (!map[o.couponId]) {
        map[o.couponId] = { couponCode: o.couponId, usageCount: 0, totalDiscount: 0 };
      }
      map[o.couponId].usageCount++;
      map[o.couponId].totalDiscount += discount;
    }

    const result = Object.values(map).map((c) => ({
      ...c,
      avgDiscount: c.usageCount > 0 ? Math.round(c.totalDiscount / c.usageCount) : 0,
    })).sort((a, b) => b.totalDiscount - a.totalDiscount);

    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});
```

- [ ] **Step 5: Commit**

```
git add server/routes/accounting.ts
git commit -m "feat: cost history + coupon analysis accounting endpoints"
```

---

## Task 7: Frontend — Delete Buttons (Orders + Invoices)

**Files:**
- Modify: `client/src/components/admin/orders-management.tsx`
- Modify: `client/src/components/admin/invoices-list.tsx`

- [ ] **Step 1: Add delete state + handler to orders-management.tsx**

Open `client/src/components/admin/orders-management.tsx`.

After the existing state declarations (around line 104), add:

```typescript
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);
```

Add the `handleDeleteOrder` function after `handleStatusChange`:

```typescript
  const handleDeleteOrder = async () => {
    if (!deleteOrderId) return;
    try {
      const response = await fetch(`/api/admin/orders/${deleteOrderId}`, {
        method: "DELETE",
        headers: addCsrfHeader({}),
        credentials: "include",
      });
      if (!response.ok) throw new Error("فشل الحذف");
      setOrders((prev) => prev.filter((o) => o.id !== deleteOrderId));
      toast({ title: "تم الحذف", description: "تم حذف الطلب بنجاح" });
    } catch {
      toast({ title: "خطأ", description: "فشل حذف الطلب", variant: "destructive" });
    } finally {
      setDeleteOrderId(null);
    }
  };
```

- [ ] **Step 2: Add new return statuses to ORDER_STATUSES in orders-management.tsx**

Find `ORDER_STATUSES` (line ~75) and add two new entries:

```typescript
  rejected_returned: { label: "رجع للبائع 📦", color: "bg-orange-600 hover:bg-orange-700" },
  rejected_carrier:  { label: "بقي بالشركة 🚚", color: "bg-rose-700 hover:bg-rose-800" },
```

- [ ] **Step 3: Add Order interface field for codReceived**

In the `Order` interface (line ~48), add:

```typescript
  codReceived?: boolean;
```

- [ ] **Step 4: Add delete button in the orders table row**

Find where each order row is rendered (the `<TableRow>` that contains the status Select and detail Eye button). Add a delete button next to the Eye button:

```tsx
<Button
  variant="ghost"
  size="sm"
  className="text-red-400 hover:text-red-300 hover:bg-red-900/30"
  onClick={() => setDeleteOrderId(order.id)}
>
  <Trash2 className="h-4 w-4" />
</Button>
```

Import `Trash2` from `"lucide-react"` (add to existing import).

- [ ] **Step 5: Add AlertDialog for delete confirmation in orders-management.tsx**

Before the closing `</>` of the component return, add:

```tsx
<AlertDialog open={!!deleteOrderId} onOpenChange={(open) => !open && setDeleteOrderId(null)}>
  <AlertDialogContent className="bg-[#0d1f3c] border-[#1e3a5f]">
    <AlertDialogHeader>
      <AlertDialogTitle className="text-white">تأكيد حذف الطلب</AlertDialogTitle>
      <AlertDialogDescription className="text-gray-400">
        هل تريد حذف هذا الطلب نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel className="border-[#1e3a5f] text-gray-300">إلغاء</AlertDialogCancel>
      <AlertDialogAction
        className="bg-red-600 hover:bg-red-700 text-white"
        onClick={handleDeleteOrder}
      >
        حذف نهائي
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

- [ ] **Step 6: Delete order FH-260513-0001 via the UI**

Start the dev server (`pnpm dev`) and navigate to the admin orders panel. Find order FH-260513-0001 and click its delete button. Confirm deletion.

Alternatively, call the endpoint directly:
```
curl -X DELETE https://aquavoiq.com/api/admin/orders/<id> -H "Cookie: <session>" -H "X-CSRF-Token: <token>"
```
But using the UI after deploying is simpler and safer.

- [ ] **Step 7: Add delete state + handler to invoices-list.tsx**

Open `client/src/components/admin/invoices-list.tsx`.

After the existing state declarations, add:

```typescript
  const [deleteInvoiceId, setDeleteInvoiceId] = useState<string | null>(null);
```

Add handler function after `fetchAll`:

```typescript
  const handleDeleteInvoice = async () => {
    if (!deleteInvoiceId) return;
    try {
      const response = await fetch(`/api/admin/invoices/${deleteInvoiceId}`, {
        method: "DELETE",
        headers: addCsrfHeader({}),
        credentials: "include",
      });
      if (!response.ok) throw new Error("فشل الحذف");
      setInvoices((prev) => prev.filter((inv) => inv.id !== deleteInvoiceId));
      toast({ title: "تم الحذف", description: "تم حذف الفاتورة" });
    } catch {
      toast({ title: "خطأ", description: "فشل حذف الفاتورة", variant: "destructive" });
    } finally {
      setDeleteInvoiceId(null);
    }
  };
```

- [ ] **Step 8: Add delete button in invoice row**

Find the action buttons in the invoice row (currently Send/Eye/Cancel buttons). Add:

```tsx
<button
  onClick={() => setDeleteInvoiceId(inv.id)}
  title="حذف"
  style={{
    padding: "4px 8px", borderRadius: 6, cursor: "pointer",
    background: "#ef444420", color: "#ef4444", border: "1px solid #ef444440",
    fontSize: 12,
  }}
>
  حذف
</button>
```

Import `useState` if not already (it should be).

- [ ] **Step 9: Add AlertDialog for invoice delete confirmation**

Add at end of InvoicesList return:

```tsx
{deleteInvoiceId && (
  <div style={{
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
  }}>
    <div style={{
      background: "#0d1f3c", border: "1px solid #1e3a5f", borderRadius: 12,
      padding: 24, maxWidth: 400, width: "90%",
    }}>
      <h3 style={{ color: "#fff", margin: "0 0 8px" }}>تأكيد حذف الفاتورة</h3>
      <p style={{ color: "#94a3b8", margin: "0 0 20px", fontSize: 14 }}>
        هل تريد حذف هذه الفاتورة نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.
      </p>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          onClick={() => setDeleteInvoiceId(null)}
          style={{ padding: "8px 16px", borderRadius: 6, background: "#1e3a5f", color: "#94a3b8", border: "none", cursor: "pointer" }}
        >
          إلغاء
        </button>
        <button
          onClick={handleDeleteInvoice}
          style={{ padding: "8px 16px", borderRadius: 6, background: "#ef4444", color: "#fff", border: "none", cursor: "pointer" }}
        >
          حذف نهائي
        </button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 10: Commit**

```
git add client/src/components/admin/orders-management.tsx client/src/components/admin/invoices-list.tsx
git commit -m "feat: delete buttons for orders and invoices + rejected_returned/carrier statuses"
```

---

## Task 8: Frontend — Accounting Panel Updates (COD + Cost History + Coupons)

**Files:**
- Modify: `client/src/components/admin/accounting-panel.tsx`

- [ ] **Step 1: Add COD section state and data fetching**

Open `client/src/components/admin/accounting-panel.tsx`.

Add a new state for COD tab and a fetch for COD summary. After existing `useQuery` calls, add:

```typescript
  const { data: codData } = useQuery({
    queryKey: ["/api/admin/accounting/cod-summary"],
    queryFn: async () => {
      const r = await fetch("/api/admin/accounting/cod-summary", { credentials: "include" });
      if (!r.ok) throw new Error("failed");
      const j = await r.json();
      return j.data as {
        totalCod: number;
        totalReceived: number;
        totalPending: number;
        settlements: Array<{ id: string; carrier: string; amount: string; notes: string | null; createdAt: string }>;
      };
    },
  });
```

- [ ] **Step 2: Add new settlement dialog state**

```typescript
  const [showSettlement, setShowSettlement] = useState(false);
  const [settlementForm, setSettlementForm] = useState({ carrier: "", amount: "", notes: "" });
  const queryClient = useQueryClient();
```

Import `useQueryClient` from `"@tanstack/react-query"` (add to existing import).

- [ ] **Step 3: Add handleCreateSettlement function**

```typescript
  const handleCreateSettlement = async () => {
    if (!settlementForm.carrier || !settlementForm.amount) return;
    try {
      const r = await fetch("/api/admin/accounting/settlements", {
        method: "POST",
        headers: addCsrfHeader({ "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify({
          carrier: settlementForm.carrier,
          amount: Number(settlementForm.amount),
          notes: settlementForm.notes || undefined,
        }),
      });
      if (!r.ok) throw new Error("فشل");
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/accounting/cod-summary"] });
      setShowSettlement(false);
      setSettlementForm({ carrier: "", amount: "", notes: "" });
      toast({ title: "تم تسجيل الدفعة" });
    } catch {
      toast({ title: "خطأ", description: "فشل تسجيل الدفعة", variant: "destructive" });
    }
  };
```

- [ ] **Step 4: Add coupon analysis state**

```typescript
  const { data: couponsData } = useQuery({
    queryKey: ["/api/admin/accounting/coupons", period],
    queryFn: async () => {
      const r = await fetch(`/api/admin/accounting/coupons?period=${period}`, { credentials: "include" });
      if (!r.ok) throw new Error("failed");
      const j = await r.json();
      return j.data as Array<{ couponCode: string; usageCount: number; totalDiscount: number; avgDiscount: number }>;
    },
  });
```

- [ ] **Step 5: Add activeTab state for accounting sub-tabs**

```typescript
  const [accountingTab, setAccountingTab] = useState<"summary" | "products" | "orders" | "cod" | "coupons">("summary");
```

Find the existing `view` state (if it exists as `"summary" | "products" | "orders"`) and extend it, or add `accountingTab` as a parallel tab selector.

- [ ] **Step 6: Add COD section UI**

In the JSX, add a new section when `accountingTab === "cod"`:

```tsx
{accountingTab === "cod" && (
  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    {/* Cards */}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
      <div style={{ background: "#0d1f3c", border: "1px solid #1e3a5f", borderRadius: 10, padding: 16 }}>
        <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 4 }}>إجمالي COD المسلّم</div>
        <div style={{ color: "#fff", fontSize: 20, fontWeight: 700 }}>
          {(codData?.totalCod ?? 0).toLocaleString()} د.ع
        </div>
      </div>
      <div style={{ background: "#0d1f3c", border: "1px solid #22c55e40", borderRadius: 10, padding: 16 }}>
        <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 4 }}>مستلم من الشركة</div>
        <div style={{ color: "#22c55e", fontSize: 20, fontWeight: 700 }}>
          {(codData?.totalReceived ?? 0).toLocaleString()} د.ع
        </div>
      </div>
      <div style={{ background: "#0d1f3c", border: "1px solid #ef444440", borderRadius: 10, padding: 16 }}>
        <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 4 }}>باقي عند الشركة</div>
        <div style={{ color: "#ef4444", fontSize: 20, fontWeight: 700 }}>
          {(codData?.totalPending ?? 0).toLocaleString()} د.ع
        </div>
      </div>
    </div>

    {/* Register settlement button */}
    <button
      onClick={() => setShowSettlement(true)}
      style={{
        alignSelf: "flex-start", padding: "8px 16px", borderRadius: 8,
        background: "#199bb8", color: "#fff", border: "none", cursor: "pointer", fontWeight: 600,
      }}
    >
      تسجيل دفعة جديدة
    </button>

    {/* Settlements table */}
    <div style={{ background: "#0d1f3c", border: "1px solid #1e3a5f", borderRadius: 10, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #1e3a5f" }}>
            {["شركة الشحن", "المبلغ", "ملاحظات", "التاريخ"].map((h) => (
              <th key={h} style={{ padding: "10px 14px", textAlign: "right", color: "#94a3b8", fontSize: 12 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(codData?.settlements ?? []).map((s) => (
            <tr key={s.id} style={{ borderBottom: "1px solid #1e3a5f20" }}>
              <td style={{ padding: "10px 14px", color: "#fff" }}>{s.carrier}</td>
              <td style={{ padding: "10px 14px", color: "#22c55e" }}>{Number(s.amount).toLocaleString()} د.ع</td>
              <td style={{ padding: "10px 14px", color: "#94a3b8" }}>{s.notes ?? "—"}</td>
              <td style={{ padding: "10px 14px", color: "#94a3b8" }}>{new Date(s.createdAt).toLocaleDateString("ar-IQ")}</td>
            </tr>
          ))}
          {(codData?.settlements ?? []).length === 0 && (
            <tr><td colSpan={4} style={{ padding: 20, textAlign: "center", color: "#94a3b8" }}>لا توجد دفعات مسجلة</td></tr>
          )}
        </tbody>
      </table>
    </div>

    {/* Settlement dialog */}
    {showSettlement && (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
        <div style={{ background: "#0d1f3c", border: "1px solid #1e3a5f", borderRadius: 12, padding: 24, maxWidth: 400, width: "90%" }}>
          <h3 style={{ color: "#fff", margin: "0 0 16px" }}>تسجيل دفعة من شركة الشحن</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              placeholder="اسم شركة الشحن"
              value={settlementForm.carrier}
              onChange={(e) => setSettlementForm((p) => ({ ...p, carrier: e.target.value }))}
              style={{ padding: "8px 12px", borderRadius: 6, background: "#0a1628", border: "1px solid #1e3a5f", color: "#fff" }}
            />
            <input
              type="number"
              placeholder="المبلغ (د.ع)"
              value={settlementForm.amount}
              onChange={(e) => setSettlementForm((p) => ({ ...p, amount: e.target.value }))}
              style={{ padding: "8px 12px", borderRadius: 6, background: "#0a1628", border: "1px solid #1e3a5f", color: "#fff" }}
            />
            <input
              placeholder="ملاحظات (اختياري)"
              value={settlementForm.notes}
              onChange={(e) => setSettlementForm((p) => ({ ...p, notes: e.target.value }))}
              style={{ padding: "8px 12px", borderRadius: 6, background: "#0a1628", border: "1px solid #1e3a5f", color: "#fff" }}
            />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
            <button onClick={() => setShowSettlement(false)} style={{ padding: "8px 16px", borderRadius: 6, background: "#1e3a5f", color: "#94a3b8", border: "none", cursor: "pointer" }}>إلغاء</button>
            <button onClick={handleCreateSettlement} style={{ padding: "8px 16px", borderRadius: 6, background: "#199bb8", color: "#fff", border: "none", cursor: "pointer" }}>حفظ</button>
          </div>
        </div>
      </div>
    )}
  </div>
)}
```

- [ ] **Step 7: Add Coupons tab UI**

Add when `accountingTab === "coupons"`:

```tsx
{accountingTab === "coupons" && (
  <div style={{ background: "#0d1f3c", border: "1px solid #1e3a5f", borderRadius: 10, overflow: "hidden" }}>
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ borderBottom: "1px solid #1e3a5f" }}>
          {["رمز الكوبون", "عدد الاستخدامات", "إجمالي الخصم", "متوسط الخصم"].map((h) => (
            <th key={h} style={{ padding: "10px 14px", textAlign: "right", color: "#94a3b8", fontSize: 12 }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {(couponsData ?? []).map((c) => (
          <tr key={c.couponCode} style={{ borderBottom: "1px solid #1e3a5f20" }}>
            <td style={{ padding: "10px 14px", color: "#fff", fontFamily: "monospace" }}>{c.couponCode}</td>
            <td style={{ padding: "10px 14px", color: "#199bb8" }}>{c.usageCount}</td>
            <td style={{ padding: "10px 14px", color: "#ef4444" }}>{c.totalDiscount.toLocaleString()} د.ع</td>
            <td style={{ padding: "10px 14px", color: "#94a3b8" }}>{c.avgDiscount.toLocaleString()} د.ع</td>
          </tr>
        ))}
        {(couponsData ?? []).length === 0 && (
          <tr><td colSpan={4} style={{ padding: 20, textAlign: "center", color: "#94a3b8" }}>لا توجد كوبونات في هذه الفترة</td></tr>
        )}
      </tbody>
    </table>
  </div>
)}
```

- [ ] **Step 8: Add cost history change UI to the edit costs dialog**

In the existing edit costs dialog (where admin enters costPrice/packagingCost/insertCost), add:

1. A state to hold cost history for the selected product:
```typescript
  const [costHistory, setCostHistory] = useState<Array<{ effectiveFrom: string; costPrice: string; packagingCost: string; insertCost: string }>>([]);
  const [newCostDate, setNewCostDate] = useState("");
```

2. When dialog opens (in `handleOpenEditCosts` or equivalent), fetch history:
```typescript
  const fetchCostHistory = async (productId: string) => {
    try {
      const r = await fetch(`/api/admin/accounting/cost-history/${productId}`, { credentials: "include" });
      if (r.ok) {
        const j = await r.json();
        setCostHistory(j.data);
      }
    } catch { /* ignore */ }
  };
```

3. In the edit dialog JSX, below existing cost inputs, add a "تطبيق من تاريخ محدد" section:
```tsx
<div style={{ borderTop: "1px solid #1e3a5f", marginTop: 16, paddingTop: 16 }}>
  <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 8 }}>تغيير السعر من تاريخ محدد:</div>
  <input
    type="date"
    value={newCostDate}
    onChange={(e) => setNewCostDate(e.target.value)}
    style={{ padding: "6px 10px", borderRadius: 6, background: "#0a1628", border: "1px solid #1e3a5f", color: "#fff", width: "100%", marginBottom: 8 }}
  />
  <button
    disabled={!newCostDate}
    onClick={async () => {
      if (!editingProductId || !newCostDate) return;
      await fetch(`/api/admin/accounting/cost-history/${editingProductId}`, {
        method: "POST",
        headers: addCsrfHeader({ "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify({
          costPrice: Number(editForm.costPrice),
          packagingCost: Number(editForm.packagingCost),
          insertCost: Number(editForm.insertCost),
          effectiveFrom: newCostDate,
        }),
      });
      await fetchCostHistory(editingProductId);
      setNewCostDate("");
      toast({ title: "تم حفظ السعر الجديد من التاريخ المحدد" });
    }}
    style={{ padding: "6px 12px", borderRadius: 6, background: "#199bb8", color: "#fff", border: "none", cursor: "pointer", opacity: newCostDate ? 1 : 0.5 }}
  >
    حفظ بتاريخ محدد
  </button>

  {/* History list */}
  {costHistory.length > 0 && (
    <div style={{ marginTop: 12 }}>
      <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 6 }}>التاريخ السابق:</div>
      {costHistory.slice(0, 5).map((h, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#94a3b8", padding: "4px 0", borderBottom: "1px solid #1e3a5f20" }}>
          <span>{new Date(h.effectiveFrom).toLocaleDateString("ar-IQ")}</span>
          <span>تكلفة: {h.costPrice} | تغليف: {h.packagingCost} | كارت: {h.insertCost}</span>
        </div>
      ))}
    </div>
  )}
</div>
```

- [ ] **Step 9: Update the tab bar in accounting-panel.tsx**

Find the existing tab bar buttons (day/month/year or summary/products/orders). Add the new sub-tabs:

```tsx
{(["summary", "products", "orders", "cod", "coupons"] as const).map((t) => (
  <button
    key={t}
    onClick={() => setAccountingTab(t)}
    style={{
      padding: "6px 14px", borderRadius: 6, fontSize: 13, cursor: "pointer", border: "none",
      background: accountingTab === t ? "#199bb8" : "#1e3a5f",
      color: accountingTab === t ? "#fff" : "#94a3b8",
    }}
  >
    {{ summary: "الملخص", products: "المنتجات", orders: "الطلبات", cod: "شركة الشحن", coupons: "الكوبونات" }[t]}
  </button>
))}
```

Note: The existing tab logic may use a different state variable name — adapt this to match. The key is adding `cod` and `coupons` tabs.

- [ ] **Step 10: Commit**

```
git add client/src/components/admin/accounting-panel.tsx
git commit -m "feat: COD tracking + coupon analysis + cost history UI in accounting panel"
```

---

## Task 9: Final Integration Check

- [ ] **Step 1: Verify TypeScript compiles without errors**

```
pnpm tsc --noEmit
```

Expected: 0 errors. Fix any type errors found.

- [ ] **Step 2: Run the dev server and test all features**

```
pnpm dev
```

Test checklist:
1. Admin orders panel: delete button appears, confirmation dialog shows, order is removed after confirming
2. Order status Select includes `rejected_returned` and `rejected_carrier` options
3. Admin invoices panel: delete button appears, confirmation dialog shows, invoice is removed after confirming
4. Accounting panel: "شركة الشحن" tab shows COD cards + settlements table + "تسجيل دفعة" dialog works
5. Accounting panel: "الكوبونات" tab shows coupon usage table
6. Edit costs dialog: "تغيير السعر من تاريخ محدد" section appears + saves history entry
7. Cost history list shows in edit dialog after saving

- [ ] **Step 3: Push to GitHub**

```
git push origin main
```

---

## Neon SQL Quick Reference

If the migration SQL hasn't been run yet, run `migrations/run-new-tables.sql` in Neon Console before deploying.

To verify tables exist:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('shipping_settlements', 'product_cost_history');

SELECT column_name FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'cod_received';
```
