# AQUAVO Smart Finance Center — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dedicated `/admin/finance` page housing revenue KPIs, expenses tracking, inventory value, monthly trend reports, smart product recommendations, and low-margin/low-stock warnings — all admin-only, no invented numbers.

**Architecture:** New Wouter route `/admin/finance` wraps a 5-tab panel (Overview, Expenses, Reports, Products, Recommendations). Backend adds 3 new endpoints to the existing `accounting.ts` router plus a standalone `expenses.ts` router. One new `expenses` DB table is added via Drizzle schema extension. Existing `accounting-panel.tsx` is NOT deleted — the "💰 المحاسب" admin-dashboard tab becomes a link to the new page for a smooth migration.

**Tech Stack:** Express + Drizzle ORM + NEON PostgreSQL, React + React Query + Wouter, Zod, TypeScript strict, shared schema at `shared/schema.ts`, shared types at `shared/accounting.ts`

---

## CODEBASE AUDIT RESULTS

### A) Financial data that already exists

| Data | Location | Notes |
|------|----------|-------|
| Gross revenue | `accounting.ts /summary` | delivered orders only, uses `roundedTotal - shippingCost` |
| COGS | `accounting.ts /products` | requires `products.costPrice > 0` |
| Gross profit & margin | `accounting.ts /summary` | correct math |
| Per-product profit | `accounting.ts /products` | sorted by netProfit desc |
| Per-order profit | `accounting.ts /orders` | includes box cost |
| AOV, RTO rate | `accounting.ts /summary` | |
| COD pending balance | `accounting.ts /cod-summary` | all-time, not period-filtered |
| Shipping settlements | `shippingSettlements` table | carrier + amount + date |
| Product cost history | `productCostHistory` table | time-based cost lookup |
| Coupon discount impact | `accounting.ts /coupons` | per coupon |
| Carrier per order | `orders.carrier` | text field |
| Box cost per order | `orders.boxCost` | numeric |
| Stock level | `products.stock` | integer |
| Low-stock threshold | `products.lowStockThreshold` | integer, default 10 |
| Coming Soon marker | `products.price <= 0` | by convention |

### B) What is missing

1. **`expenses` table** — no operational expenses (rent, salary, marketing, utilities)
2. **Net profit after expenses** — blocked by #1; must show "ناقص" until expenses added
3. **Inventory value endpoint** — `stock × costPrice` and `stock × price` not exposed
4. **Monthly trend aggregation** — data exists, no GROUP BY month endpoint
5. **Smart recommendations** — no "promote this" or "low-margin alert" backend
6. **Export (CSV)** — no download functionality
7. **Coming Soon exclusion in recommendations** — `price <= 0` not explicitly filtered
8. **Dedicated `/admin/finance` page** — accounting is currently a tab in admin-dashboard

### C) Schema additions needed

**Only one new table:** `expenses` (see Task 1)

No other schema changes. All other new features derive from existing data.

### D) New files to create

**Backend:**
- `server/routes/expenses.ts` — CRUD for expenses table
- 3 new endpoint functions in `server/routes/accounting.ts`:
  - `GET /api/admin/accounting/inventory` — inventory value
  - `GET /api/admin/accounting/trends?groupBy=month&period=year` — time series
  - `GET /api/admin/accounting/recommendations` — smart insights

**Shared:**
- Additions to `shared/schema.ts` — `expenses` table
- Additions to `shared/accounting.ts` — expense schemas + new response types

**Frontend:**
- `client/src/pages/admin/finance.tsx` — new page (registered in App.tsx)
- `client/src/components/admin/finance-overview.tsx` — KPI + COD + inventory section
- `client/src/components/admin/finance-expenses.tsx` — expense CRUD panel
- `client/src/components/admin/finance-reports.tsx` — monthly trends + CSV export
- `client/src/components/admin/finance-products.tsx` — product profitability + cost editing (extracted from accounting-panel, enhanced)
- `client/src/components/admin/finance-recommendations.tsx` — smart alerts + promote list

**Modified files:**
- `server/routes.ts` — register expenses router
- `server/routes/accounting.ts` — add inventory, trends, recommendations endpoints
- `client/src/App.tsx` — add `/admin/finance` Route
- `shared/accounting.ts` — add new Zod schemas
- `shared/schema.ts` — add `expenses` table definition

### E) Safe calculations now (no schema change)

- Gross revenue (delivered orders) ✅
- COGS, gross profit, gross margin ✅ (when costPrice set)
- AOV, RTO rate ✅
- COD pending ✅
- Inventory at cost: `SUM(stock × costPrice)` where `costPrice > 0 AND deletedAt IS NULL` ✅
- Inventory at retail: `SUM(stock × price)` where `price > 0 AND deletedAt IS NULL` ✅
- Products without costs: count where `costPrice = 0` ✅
- Low-stock products: `stock > 0 AND stock <= lowStockThreshold` ✅
- Coming Soon exclusion: `price <= 0` ✅
- Monthly trend: GROUP BY month on `orders.createdAt` ✅

### F) Calculations requiring new data

- Net profit after expenses → needs `expenses` table (Task 2)
- Marketing ROI → needs `category = 'marketing'` in expenses

### G) Risks

1. **`orders.items` is JSONB not relational** — deleted products may appear as productId-only strings. Always handle gracefully: show productId if name lookup fails.
2. **BigInt/Decimal from Neon** — always pass results through `toNumber()` before `res.json()`. Pattern already in `accounting.ts`.
3. **Missing costs → partial profit** — must render orange warning banner when `costsComplete = false`. Never show incomplete profits as complete.
4. **Coming Soon exclusion** — `price <= 0` must exclude from ALL recommendation logic (promote list, slow-movers, top-margin). Flag them separately.
5. **Empty expenses state** — if no expenses exist, net profit section must say "أضف مصاريف أولاً" — not show 0 or null as a real value.
6. **Admin-only** — all new endpoints must use `requireAdmin` middleware. No customer-facing exposure. Double-check on every route file.
7. **Large product catalog query** — inventory value aggregates all products; use a single `SELECT SUM()` query, not per-row map.

---

## IMPLEMENTATION PHASES

---

### Phase 1 — Expenses Schema + API (new table, CRUD)

**Files:**
- Modify: `shared/schema.ts`
- Create: `shared/accounting.ts` (additions)
- Create: `server/routes/expenses.ts`
- Modify: `server/routes.ts`

---

#### Task 1: Add `expenses` table to schema

**Files:**
- Modify: `shared/schema.ts` (after the `productCostHistory` block, ~line 180)

- [ ] **Step 1: Write the schema addition**

Open `shared/schema.ts`. After the `productCostHistory` table definition (around line 180), add:

```typescript
export const expenses = pgTable("expenses", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  category: text("category").notNull(),
  // valid categories: rent, salary, marketing, shipping_cost, utilities, other
  amount: numeric("amount").notNull(),
  description: text("description"),
  expenseDate: timestamp("expense_date").notNull(),
  isRecurring: boolean("is_recurring").notNull().default(false),
  recurringPeriod: text("recurring_period"),
  // valid periods: monthly, weekly, yearly — only meaningful when isRecurring = true
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  categoryIdx: index("expenses_category_idx").on(table.category),
  expenseDateIdx: index("expenses_expense_date_idx").on(table.expenseDate),
}));

export const insertExpenseSchema = createInsertSchema(expenses);
```

- [ ] **Step 2: Run Drizzle push to apply schema to Neon**

```bash
npx drizzle-kit push
```

Expected: "Changes applied" or "0 changes" if table already exists. If errors about column types appear, check that `numeric` and `timestamp` match Neon column types.

- [ ] **Step 3: Verify table in DB**

```bash
npx drizzle-kit studio
```

Open the studio URL, confirm `expenses` table appears with columns: id, category, amount, description, expense_date, is_recurring, recurring_period, created_at, updated_at.

- [ ] **Step 4: Commit**

```bash
git add shared/schema.ts
git commit -m "feat(finance): add expenses table schema"
```

---

#### Task 2: Add expense Zod schemas to shared/accounting.ts

**Files:**
- Modify: `shared/accounting.ts` (append to end of file)

- [ ] **Step 1: Write the schemas**

Append to the bottom of `shared/accounting.ts`:

```typescript
export const EXPENSE_CATEGORIES = [
  "rent",
  "salary",
  "marketing",
  "shipping_cost",
  "utilities",
  "other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  rent: "إيجار",
  salary: "رواتب",
  marketing: "تسويق",
  shipping_cost: "تكلفة توصيل",
  utilities: "فواتير خدمات",
  other: "أخرى",
};

export const expenseInputSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES),
  amount: z.coerce.number().positive(),
  description: z.string().trim().optional(),
  expenseDate: z.string().min(1), // ISO date string, e.g. "2026-05-17"
  isRecurring: z.boolean().default(false),
  recurringPeriod: z.enum(["monthly", "weekly", "yearly"]).optional(),
});

export const expenseResponseSchema = z.object({
  id: z.string(),
  category: z.enum(EXPENSE_CATEGORIES),
  amount: z.number(),
  description: z.string().nullable(),
  expenseDate: z.string(),
  isRecurring: z.boolean(),
  recurringPeriod: z.string().nullable(),
  createdAt: z.string(),
});

export const expensesListResponseSchema = z.array(expenseResponseSchema);

export const expenseSummarySchema = z.object({
  totalExpenses: z.number(),
  byCategory: z.array(z.object({
    category: z.enum(EXPENSE_CATEGORIES),
    total: z.number(),
  })),
  expensesComplete: z.boolean(), // false if no expenses exist at all
});

export type ExpenseInput = z.infer<typeof expenseInputSchema>;
export type ExpenseResponse = z.infer<typeof expenseResponseSchema>;
export type ExpenseSummary = z.infer<typeof expenseSummarySchema>;
```

- [ ] **Step 2: Verify TypeScript compiles with no errors**

```bash
npx tsc --noEmit
```

Expected: no errors. If `z.enum(EXPENSE_CATEGORIES)` fails, check that `EXPENSE_CATEGORIES` is typed as `const`.

- [ ] **Step 3: Commit**

```bash
git add shared/accounting.ts
git commit -m "feat(finance): add expense Zod schemas to shared/accounting"
```

---

#### Task 3: Create expenses API router

**Files:**
- Create: `server/routes/expenses.ts`

- [ ] **Step 1: Write the router**

Create `server/routes/expenses.ts` with the following content:

```typescript
import { Router, type Request, type Response, type NextFunction } from "express";
import { requireAdmin } from "../middleware/auth.js";
import { getDb } from "../db.js";
import { expenses } from "../../shared/schema.js";
import { and, gte, lte, eq, desc } from "drizzle-orm";
import {
  expenseInputSchema,
  accountingPeriodSchema,
} from "../../shared/accounting.js";

const router = Router();
router.use(requireAdmin);

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function getExpenseDb(res: Response) {
  const db = getDb();
  if (!db) {
    res.status(503).json({ success: false, message: "قاعدة البيانات غير مهيأة" });
    return null;
  }
  return db;
}

function serializeExpense(e: typeof expenses.$inferSelect) {
  return {
    id: e.id,
    category: e.category,
    amount: toNumber(e.amount),
    description: e.description ?? null,
    expenseDate: e.expenseDate instanceof Date
      ? e.expenseDate.toISOString()
      : String(e.expenseDate),
    isRecurring: e.isRecurring ?? false,
    recurringPeriod: e.recurringPeriod ?? null,
    createdAt: e.createdAt instanceof Date
      ? e.createdAt.toISOString()
      : String(e.createdAt),
  };
}

// GET /api/admin/expenses?period=month&from=&to=
router.get("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getExpenseDb(res);
    if (!db) return;

    const rawPeriod = typeof req.query.period === "string" ? req.query.period : "month";
    const period = accountingPeriodSchema.safeParse(rawPeriod).success
      ? (rawPeriod as "day" | "week" | "month" | "year" | "custom")
      : "month";

    const now = new Date();
    let start: Date;
    let end: Date;

    if (period === "custom") {
      const from = typeof req.query.from === "string" ? req.query.from : "";
      const to = typeof req.query.to === "string" ? req.query.to : "";
      start = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1);
      end = to ? new Date(to) : new Date();
      end.setHours(23, 59, 59, 999);
    } else if (period === "year") {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    } else if (period === "week") {
      const day = now.getDay();
      const diffToSat = (day + 1) % 7;
      start = new Date(now);
      start.setDate(now.getDate() - diffToSat);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (period === "day") {
      start = new Date(now);
      start.setHours(0, 0, 0, 0);
      end = new Date(now);
      end.setHours(23, 59, 59, 999);
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    const list = await db
      .select()
      .from(expenses)
      .where(and(gte(expenses.expenseDate, start), lte(expenses.expenseDate, end)))
      .orderBy(desc(expenses.expenseDate));

    const totalExpenses = list.reduce((s, e) => s + toNumber(e.amount), 0);
    const byCategory: Record<string, number> = {};
    for (const e of list) {
      byCategory[e.category] = (byCategory[e.category] ?? 0) + toNumber(e.amount);
    }

    res.json({
      success: true,
      data: {
        list: list.map(serializeExpense),
        totalExpenses,
        byCategory: Object.entries(byCategory).map(([category, total]) => ({ category, total })),
        expensesComplete: list.length > 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/expenses
router.post("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getExpenseDb(res);
    if (!db) return;

    const parsed = expenseInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: "بيانات المصروف غير صالحة", errors: parsed.error.flatten() });
      return;
    }

    const { category, amount, description, expenseDate, isRecurring, recurringPeriod } = parsed.data;
    const [created] = await db
      .insert(expenses)
      .values({
        category,
        amount: String(amount),
        description: description ?? null,
        expenseDate: new Date(expenseDate),
        isRecurring,
        recurringPeriod: recurringPeriod ?? null,
      })
      .returning();

    res.status(201).json({ success: true, data: serializeExpense(created) });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/expenses/:id
router.patch("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getExpenseDb(res);
    if (!db) return;

    const { id } = req.params as { id: string };
    const parsed = expenseInputSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: "بيانات المصروف غير صالحة", errors: parsed.error.flatten() });
      return;
    }

    const updateData: Partial<typeof expenses.$inferInsert> = {
      updatedAt: new Date(),
    };
    const { category, amount, description, expenseDate, isRecurring, recurringPeriod } = parsed.data;
    if (category !== undefined) updateData.category = category;
    if (amount !== undefined) updateData.amount = String(amount);
    if (description !== undefined) updateData.description = description;
    if (expenseDate !== undefined) updateData.expenseDate = new Date(expenseDate);
    if (isRecurring !== undefined) updateData.isRecurring = isRecurring;
    if (recurringPeriod !== undefined) updateData.recurringPeriod = recurringPeriod;

    const [updated] = await db
      .update(expenses)
      .set(updateData)
      .where(eq(expenses.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ success: false, message: "المصروف غير موجود" });
      return;
    }

    res.json({ success: true, data: serializeExpense(updated) });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/expenses/:id
router.delete("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getExpenseDb(res);
    if (!db) return;

    const { id } = req.params as { id: string };
    const [deleted] = await db.delete(expenses).where(eq(expenses.id, id)).returning({ id: expenses.id });

    if (!deleted) {
      res.status(404).json({ success: false, message: "المصروف غير موجود" });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export function createExpensesRouter() {
  return router;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors. If `expenses.$inferInsert` causes issues, confirm `expenses` is exported from `shared/schema.ts`.

- [ ] **Step 3: Register the router in server/routes.ts**

Open `server/routes.ts`. Add the import after the accounting import line (~line 39):

```typescript
import { createExpensesRouter } from "./routes/expenses.js";
```

Inside `registerRoutes()`, after the accounting router registration, add:

```typescript
app.use("/api/admin/expenses", createExpensesRouter());
```

- [ ] **Step 4: Test the endpoints manually**

Start the dev server and test with curl or browser:

```bash
# Create an expense
curl -X POST http://localhost:5000/api/admin/expenses \
  -H "Content-Type: application/json" \
  -b "connect.sid=<your_admin_session>" \
  -d '{"category":"rent","amount":500000,"description":"إيجار المخزن","expenseDate":"2026-05-01"}'
# Expected: 201 with id, category, amount, expenseDate

# List expenses
curl http://localhost:5000/api/admin/expenses?period=month \
  -b "connect.sid=<your_admin_session>"
# Expected: 200 with list, totalExpenses, byCategory
```

- [ ] **Step 5: Commit**

```bash
git add server/routes/expenses.ts server/routes.ts
git commit -m "feat(finance): add expenses CRUD API"
```

---

### Phase 2 — New Accounting Endpoints (inventory, trends, recommendations)

**Files:**
- Modify: `server/routes/accounting.ts` (append new routes before the export)
- Modify: `shared/accounting.ts` (add new response schemas)

---

#### Task 4: Add inventory value endpoint to accounting.ts

**Files:**
- Modify: `server/routes/accounting.ts`
- Modify: `shared/accounting.ts`

- [ ] **Step 1: Add the schema to shared/accounting.ts**

Append to `shared/accounting.ts`:

```typescript
export const accountingInventorySchema = z.object({
  inventoryValueAtCost: z.number(),
  inventoryValueAtRetail: z.number(),
  totalProducts: z.number(),
  productsWithCost: z.number(),
  productsWithoutCost: z.number(),
  comingSoonProducts: z.number(),
  lowStockProducts: z.number(),
  outOfStockProducts: z.number(),
});

export type AccountingInventory = z.infer<typeof accountingInventorySchema>;
```

- [ ] **Step 2: Add the GET /inventory route to accounting.ts**

In `server/routes/accounting.ts`, add this route before the `export function createAccountingRouter()` line at the bottom:

```typescript
router.get("/inventory", async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getAccountingDb(res);
    if (!db) return;

    const allProducts = await db
      .select({
        id: products.id,
        price: products.price,
        costPrice: products.costPrice,
        stock: products.stock,
        lowStockThreshold: products.lowStockThreshold,
      })
      .from(products)
      .where(eq(products.deletedAt, null as unknown as Date));
    // Note: using sql`deleted_at IS NULL` style with Drizzle requires isNull() helper

    // Active (not soft-deleted) products
    const active = allProducts.filter(p => p.deletedAt === null || p.deletedAt === undefined);

    // Apply the IS NULL workaround for Drizzle — re-query properly:
    // (The above select with eq(null) won't work; use isNull from drizzle-orm)
    // See implementation note below.
    const activeProducts = allProducts; // Replace with isNull query — see note

    let inventoryValueAtCost = 0;
    let inventoryValueAtRetail = 0;
    let productsWithCost = 0;
    let productsWithoutCost = 0;
    let comingSoonProducts = 0;
    let lowStockProducts = 0;
    let outOfStockProducts = 0;

    for (const p of activeProducts) {
      const price = toNumber(p.price);
      const costPrice = toNumber(p.costPrice);
      const stock = Number(p.stock ?? 0);
      const threshold = Number(p.lowStockThreshold ?? 10);

      if (price <= 0) {
        comingSoonProducts++;
        continue; // Coming Soon — exclude from inventory metrics
      }

      if (stock === 0) {
        outOfStockProducts++;
      } else if (stock <= threshold) {
        lowStockProducts++;
      }

      if (costPrice > 0) {
        productsWithCost++;
        inventoryValueAtCost += costPrice * stock;
      } else {
        productsWithoutCost++;
      }

      inventoryValueAtRetail += price * stock;
    }

    res.json({
      success: true,
      data: {
        inventoryValueAtCost,
        inventoryValueAtRetail,
        totalProducts: activeProducts.length,
        productsWithCost,
        productsWithoutCost,
        comingSoonProducts,
        lowStockProducts,
        outOfStockProducts,
      },
    });
  } catch (err) {
    next(err);
  }
});
```

**IMPLEMENTATION NOTE:** The `eq(products.deletedAt, null)` pattern doesn't work in Drizzle. Import `isNull` from `drizzle-orm` and replace the query with:

```typescript
import { and, gte, lte, inArray, eq, desc, isNull } from "drizzle-orm";
// ...
const activeProducts = await db
  .select({
    id: products.id,
    price: products.price,
    costPrice: products.costPrice,
    stock: products.stock,
    lowStockThreshold: products.lowStockThreshold,
  })
  .from(products)
  .where(isNull(products.deletedAt));
```

Update the existing `import { and, gte, lte, inArray, eq, desc } from "drizzle-orm"` at the top to include `isNull`.

- [ ] **Step 3: Test the endpoint**

```bash
curl http://localhost:5000/api/admin/accounting/inventory \
  -b "connect.sid=<admin_session>"
# Expected: 200 with inventoryValueAtCost, inventoryValueAtRetail, counts
```

- [ ] **Step 4: Commit**

```bash
git add server/routes/accounting.ts shared/accounting.ts
git commit -m "feat(finance): add inventory value endpoint"
```

---

#### Task 5: Add monthly trends endpoint to accounting.ts

**Files:**
- Modify: `server/routes/accounting.ts`
- Modify: `shared/accounting.ts`

- [ ] **Step 1: Add trend schema to shared/accounting.ts**

Append to `shared/accounting.ts`:

```typescript
export const accountingTrendPointSchema = z.object({
  month: z.string(), // "2026-05"
  label: z.string(), // "مايو 2026"
  revenue: z.number(),
  cogs: z.number(),
  netProfit: z.number(),
  margin: z.number(),
  orderCount: z.number(),
  deliveredCount: z.number(),
});

export const accountingTrendsResponseSchema = z.array(accountingTrendPointSchema);
export type AccountingTrendPoint = z.infer<typeof accountingTrendPointSchema>;
```

- [ ] **Step 2: Add GET /trends route to accounting.ts**

Add before the export line in `server/routes/accounting.ts`:

```typescript
const ARABIC_MONTHS = [
  "يناير","فبراير","مارس","أبريل","مايو","يونيو",
  "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر",
];

router.get("/trends", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getAccountingDb(res);
    if (!db) return;

    // Default: last 12 months
    const monthsBack = typeof req.query.months === "string" ? Math.min(24, parseInt(req.query.months) || 12) : 12;
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setMonth(start.getMonth() - monthsBack + 1);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const allOrders = await getOrdersForPeriod(db, start, end);
    const productIds = collectProductIds(allOrders.filter(o => REALIZED_STATUSES.includes(o.status as (typeof REALIZED_STATUSES)[number])));
    const costs = await buildCostResolver(db, productIds);

    // Group by YYYY-MM
    const monthMap = new Map<string, {
      revenue: number; cogs: number; netProfit: number;
      orderCount: number; deliveredCount: number;
    }>();

    for (const order of allOrders) {
      const d = toDate(order.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!monthMap.has(key)) {
        monthMap.set(key, { revenue: 0, cogs: 0, netProfit: 0, orderCount: 0, deliveredCount: 0 });
      }
      const bucket = monthMap.get(key)!;
      bucket.orderCount++;

      if (REALIZED_STATUSES.includes(order.status as (typeof REALIZED_STATUSES)[number])) {
        const profit = calcOrderProfit(order, costs);
        bucket.revenue += profit.revenue;
        bucket.cogs += profit.cogs;
        bucket.netProfit += profit.netProfit;
        bucket.deliveredCount++;
      }
    }

    // Sort by month key ascending
    const sorted = [...monthMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    const result = sorted.map(([key, bucket]) => {
      const [year, month] = key.split("-").map(Number);
      const label = `${ARABIC_MONTHS[(month ?? 1) - 1]} ${year}`;
      const margin = bucket.revenue > 0 ? Math.round((bucket.netProfit / bucket.revenue) * 100) : 0;
      return {
        month: key,
        label,
        revenue: Math.round(bucket.revenue),
        cogs: Math.round(bucket.cogs),
        netProfit: Math.round(bucket.netProfit),
        margin,
        orderCount: bucket.orderCount,
        deliveredCount: bucket.deliveredCount,
      };
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors. If `REALIZED_STATUSES` is not in scope, move it or re-reference `["delivered"]`.

- [ ] **Step 4: Test**

```bash
curl "http://localhost:5000/api/admin/accounting/trends?months=6" \
  -b "connect.sid=<admin_session>"
# Expected: array of 6 month objects with revenue, cogs, netProfit, margin
```

- [ ] **Step 5: Commit**

```bash
git add server/routes/accounting.ts shared/accounting.ts
git commit -m "feat(finance): add monthly trends endpoint"
```

---

#### Task 6: Add recommendations endpoint to accounting.ts

**Files:**
- Modify: `server/routes/accounting.ts`
- Modify: `shared/accounting.ts`

- [ ] **Step 1: Add recommendation schemas to shared/accounting.ts**

Append to `shared/accounting.ts`:

```typescript
export const financeRecommendationSchema = z.object({
  type: z.enum([
    "promote",       // high margin, decent stock, worth advertising
    "low_margin",    // margin below 15%, costs set
    "low_stock",     // stock <= threshold, actively selling
    "no_cost",       // costPrice not set, can't calculate profit
    "dead_stock",    // stock > 0 but zero sales in period
    "coming_soon",   // price <= 0, excluded from revenue logic
  ]),
  productId: z.string(),
  name: z.string(),
  margin: z.number().nullable(),
  stock: z.number(),
  unitsSold: z.number(),
  message: z.string(), // Arabic explanation
  priority: z.enum(["high", "medium", "low"]),
});

export const financeRecommendationsResponseSchema = z.object({
  promote: z.array(financeRecommendationSchema),
  warnings: z.array(financeRecommendationSchema),
  comingSoon: z.array(financeRecommendationSchema),
});

export type FinanceRecommendation = z.infer<typeof financeRecommendationSchema>;
export type FinanceRecommendationsResponse = z.infer<typeof financeRecommendationsResponseSchema>;
```

- [ ] **Step 2: Add GET /recommendations route to accounting.ts**

Add before the export line in `server/routes/accounting.ts`:

```typescript
router.get("/recommendations", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getAccountingDb(res);
    if (!db) return;

    const { period, from, to } = getPeriodQuery(req);
    const { start, end } = periodRange(period, from, to);

    // Get realized orders for the period (profit data)
    const periodOrders = await getRealizedOrdersForPeriod(db, start, end);
    const costs = await buildCostResolver(db, collectProductIds(periodOrders));

    // Build sales map for this period
    const salesMap = new Map<string, number>(); // productId → unitsSold
    for (const order of periodOrders) {
      for (const item of getOrderItems(order)) {
        if (!item.productId) continue;
        salesMap.set(item.productId, (salesMap.get(item.productId) ?? 0) + lineQuantity(item));
      }
    }

    // Get product profitability for the period (already sorted by netProfit)
    const profitMap: Record<string, ProductProfit> = {};
    const subtotalMap = new Map<string, number>();
    for (const order of periodOrders) {
      const items = getOrderItems(order);
      const subtotal = orderSubtotal(items);
      const orderRevenue = orderCollectedAmount(order) - toNumber(order.shippingCost);
      const revenueRatio = subtotal > 0 ? orderRevenue / subtotal : 1;
      const boxCost = toNumber(order.boxCost);
      const createdAt = toDate(order.createdAt);

      for (const item of items) {
        const productId = item.productId;
        const qty = lineQuantity(item);
        const price = toNumber(item.priceAtPurchase);
        const lineGross = price * qty;
        const lineRevenue = lineGross * revenueRatio;
        const lineDeduct = subtotal > 0 ? boxCost * (lineGross / subtotal) : 0;
        if (!productId) continue;

        const currentCost = costs.getCurrent(productId);
        const effectiveCost = costs.getEffective(productId, createdAt);
        if (!currentCost || !effectiveCost) continue;

        const lineCogs = effectiveCost.costPrice * qty;
        const linePack = (effectiveCost.packagingCost + effectiveCost.insertCost) * qty;
        const lineProfit = lineRevenue - lineCogs - linePack - lineDeduct;

        if (!profitMap[productId]) {
          profitMap[productId] = {
            productId,
            name: currentCost.name,
            unitsSold: 0,
            revenue: 0,
            cogs: 0,
            packaging: 0,
            netProfit: 0,
            margin: 0,
            costPrice: currentCost.costPrice,
            packagingCost: currentCost.packagingCost,
            insertCost: currentCost.insertCost,
            costsComplete: true,
            missingCostLines: 0,
            missingProductLines: 0,
          };
        }
        profitMap[productId].unitsSold += qty;
        profitMap[productId].revenue += lineRevenue;
        profitMap[productId].cogs += lineCogs;
        profitMap[productId].packaging += linePack;
        profitMap[productId].netProfit += lineProfit;
      }
    }

    // Get all active products (for inventory-level warnings + coming soon)
    const allActiveProducts = await db
      .select({
        id: products.id,
        name: products.name,
        price: products.price,
        costPrice: products.costPrice,
        stock: products.stock,
        lowStockThreshold: products.lowStockThreshold,
      })
      .from(products)
      .where(isNull(products.deletedAt));

    const promote: FinanceRecommendation[] = [];
    const warnings: FinanceRecommendation[] = [];
    const comingSoon: FinanceRecommendation[] = [];

    for (const p of allActiveProducts) {
      const price = toNumber(p.price);
      const costPrice = toNumber(p.costPrice);
      const stock = Number(p.stock ?? 0);
      const threshold = Number(p.lowStockThreshold ?? 10);
      const unitsSold = salesMap.get(p.id) ?? 0;
      const profitData = profitMap[p.id];
      const margin = profitData && profitData.revenue > 0
        ? Math.round((profitData.netProfit / profitData.revenue) * 100)
        : null;

      // Coming Soon — price <= 0
      if (price <= 0) {
        comingSoon.push({
          type: "coming_soon",
          productId: p.id,
          name: p.name,
          margin: null,
          stock,
          unitsSold,
          message: "منتج Coming Soon — مستبعد من حسابات الإيراد والتوصيات",
          priority: "low",
        });
        continue;
      }

      // No cost set
      if (costPrice === 0) {
        warnings.push({
          type: "no_cost",
          productId: p.id,
          name: p.name,
          margin: null,
          stock,
          unitsSold,
          message: "سعر الشراء غير مدخل — لا يمكن حساب الربح",
          priority: "high",
        });
        continue;
      }

      // Low stock + selling
      if (stock > 0 && stock <= threshold && unitsSold > 0) {
        warnings.push({
          type: "low_stock",
          productId: p.id,
          name: p.name,
          margin: margin ?? null,
          stock,
          unitsSold,
          message: `مخزون منخفض (${stock} قطعة) مع ${unitsSold} مبيع — أعد الطلبية`,
          priority: "high",
        });
      }

      // Low margin (< 15%) — costsComplete
      if (margin !== null && margin < 15 && unitsSold > 0) {
        warnings.push({
          type: "low_margin",
          productId: p.id,
          name: p.name,
          margin,
          stock,
          unitsSold,
          message: `هامش ${margin}% — أقل من 15%، راجع سعر الشراء أو رفع السعر`,
          priority: margin < 5 ? "high" : "medium",
        });
        continue;
      }

      // Dead stock — in inventory but zero sales in period
      if (stock > 0 && unitsSold === 0 && costPrice > 0) {
        warnings.push({
          type: "dead_stock",
          productId: p.id,
          name: p.name,
          margin: null,
          stock,
          unitsSold,
          message: `${stock} قطعة في المخزن بدون أي مبيع في هذه الفترة`,
          priority: "medium",
        });
        continue;
      }

      // Promote — high margin (>= 30%) + decent stock + has sales
      if (margin !== null && margin >= 30 && stock > threshold && unitsSold > 0) {
        promote.push({
          type: "promote",
          productId: p.id,
          name: p.name,
          margin,
          stock,
          unitsSold,
          message: `هامش ${margin}% — ربح عالي ومخزون كافي، يستحق الترويج`,
          priority: margin >= 50 ? "high" : "medium",
        });
      }
    }

    // Sort promotes by margin desc, warnings by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    promote.sort((a, b) => (b.margin ?? 0) - (a.margin ?? 0));
    warnings.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    res.json({ success: true, data: { promote, warnings, comingSoon } });
  } catch (err) {
    next(err);
  }
});
```

Note: `FinanceRecommendation` type needs to be imported at the top of `accounting.ts`:

```typescript
import type { FinanceRecommendation } from "../../shared/accounting.js";
```

And `isNull` needs to be added to the drizzle-orm import line.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Test**

```bash
curl "http://localhost:5000/api/admin/accounting/recommendations?period=month" \
  -b "connect.sid=<admin_session>"
# Expected: { promote: [...], warnings: [...], comingSoon: [...] }
```

- [ ] **Step 5: Commit**

```bash
git add server/routes/accounting.ts shared/accounting.ts
git commit -m "feat(finance): add smart recommendations endpoint"
```

---

### Phase 3 — Finance Page + Components (Frontend)

**Files:**
- Create: `client/src/pages/admin/finance.tsx`
- Create: `client/src/components/admin/finance-overview.tsx`
- Create: `client/src/components/admin/finance-expenses.tsx`
- Create: `client/src/components/admin/finance-reports.tsx`
- Create: `client/src/components/admin/finance-products.tsx`
- Create: `client/src/components/admin/finance-recommendations.tsx`
- Modify: `client/src/App.tsx`

---

#### Task 7: Create finance page shell + register route

**Files:**
- Create: `client/src/pages/admin/finance.tsx`
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Write the finance page shell**

Create `client/src/pages/admin/finance.tsx`:

```tsx
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/auth-context";
import { Redirect } from "wouter";
import FinanceOverview from "@/components/admin/finance-overview";
import FinanceExpenses from "@/components/admin/finance-expenses";
import FinanceReports from "@/components/admin/finance-reports";
import FinanceProducts from "@/components/admin/finance-products";
import FinanceRecommendations from "@/components/admin/finance-recommendations";

type FinancePeriod = "day" | "week" | "month" | "year";

export default function FinancePage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<FinancePeriod>("month");

  if (!user || user.role !== "admin") return <Redirect to="/admin/login" />;

  const PERIODS: { value: FinancePeriod; label: string }[] = [
    { value: "day", label: "اليوم" },
    { value: "week", label: "الأسبوع" },
    { value: "month", label: "الشهر" },
    { value: "year", label: "السنة" },
  ];

  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: "#010611", padding: "20px 16px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: 0 }}>مركز المالية — AQUAVO</h1>
          <p style={{ color: "#64748b", fontSize: 12, margin: "4px 0 0" }}>لوحة تحكم مالية داخلية — للإدارة فقط</p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              style={{
                padding: "5px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                background: period === p.value ? "#199bb8" : "#0d1f3c",
                border: period === p.value ? "1.5px solid #199bb8" : "1.5px solid #1e3a5f",
                color: period === p.value ? "#fff" : "#94a3b8",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-tabs */}
      <Tabs defaultValue="overview" dir="rtl">
        <TabsList style={{ background: "#0d1f3c", borderBottom: "1px solid #1e3a5f", padding: "4px 8px", borderRadius: 10, marginBottom: 20 }}>
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="expenses">المصاريف</TabsTrigger>
          <TabsTrigger value="reports">تقارير شهرية</TabsTrigger>
          <TabsTrigger value="products">ربحية المنتجات</TabsTrigger>
          <TabsTrigger value="recommendations">توصيات ذكية</TabsTrigger>
        </TabsList>

        <TabsContent value="overview"><FinanceOverview period={period} /></TabsContent>
        <TabsContent value="expenses"><FinanceExpenses period={period} /></TabsContent>
        <TabsContent value="reports"><FinanceReports /></TabsContent>
        <TabsContent value="products"><FinanceProducts period={period} /></TabsContent>
        <TabsContent value="recommendations"><FinanceRecommendations period={period} /></TabsContent>
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 2: Register the route in App.tsx**

Open `client/src/App.tsx`. Add the lazy import after the existing admin page imports (~line 57):

```typescript
const FinancePage = lazy(() => import("@/pages/admin/finance"));
```

Inside the `Router` function's `<Switch>`, after the `/admin/social-analytics` route, add:

```tsx
<Route path="/admin/finance">
  {() => (
    <RequireAdmin>
      <Suspense fallback={<div>...</div>}>
        <FinancePage />
      </Suspense>
    </RequireAdmin>
  )}
</Route>
```

- [ ] **Step 3: Verify the route loads in browser**

Start dev server and navigate to `/admin/finance`. Expected: the page shell renders with 5 tabs, no JS errors in console.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/admin/finance.tsx client/src/App.tsx
git commit -m "feat(finance): add /admin/finance page shell and route"
```

---

#### Task 8: Build FinanceOverview component

**Files:**
- Create: `client/src/components/admin/finance-overview.tsx`

- [ ] **Step 1: Write the component**

Create `client/src/components/admin/finance-overview.tsx`:

```tsx
import { useQuery } from "@tanstack/react-query";
import type { ZodType } from "zod";
import {
  accountingSummarySchema,
  accountingCodSummarySchema,
  accountingInventorySchema,
  expenseSummarySchema,
  EXPENSE_CATEGORY_LABELS,
  type AccountingSummary,
  type AccountingCodSummary,
  type AccountingInventory,
  type ExpenseSummary,
} from "@shared/accounting";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n) + " د.ع";

async function apiFetch<T>(url: string, schema: ZodType<T>): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) throw new Error(json?.message ?? `خطأ ${res.status}`);
  return schema.parse(json.data);
}

function KpiCard({ label, value, sub, color = "#199bb8", big = false }: {
  label: string; value: string; sub?: string; color?: string; big?: boolean;
}) {
  return (
    <div style={{
      background: "#0d1f3c", border: `1px solid ${color}30`,
      borderRadius: 12, padding: "14px 18px",
    }}>
      <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 4 }}>{label}</div>
      <div style={{ color, fontSize: big ? 22 : 17, fontWeight: 700 }}>{value}</div>
      {sub && <div style={{ color: "#64748b", fontSize: 11, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

export default function FinanceOverview({ period }: { period: string }) {
  const { data: summary, isLoading: loadingSum } = useQuery<AccountingSummary>({
    queryKey: ["fin-summary", period],
    queryFn: () => apiFetch(`/api/admin/accounting/summary?period=${period}`, accountingSummarySchema),
  });

  const { data: inventory, isLoading: loadingInv } = useQuery<AccountingInventory>({
    queryKey: ["fin-inventory"],
    queryFn: () => apiFetch("/api/admin/accounting/inventory", accountingInventorySchema),
  });

  const { data: codData } = useQuery<AccountingCodSummary>({
    queryKey: ["fin-cod"],
    queryFn: () => apiFetch("/api/admin/accounting/cod-summary", accountingCodSummarySchema),
  });

  const { data: expenseData } = useQuery({
    queryKey: ["fin-expenses", period],
    queryFn: async () => {
      const res = await fetch(`/api/admin/expenses?period=${period}`, { credentials: "include" });
      const json = await res.json();
      return json?.data ?? null;
    },
  });

  const totalExpenses = expenseData?.totalExpenses ?? null;
  const netAfterExpenses = summary && totalExpenses !== null
    ? summary.netProfit - totalExpenses
    : null;

  const marginColor = (m: number) => m >= 30 ? "#22c55e" : m >= 15 ? "#f59e0b" : "#ef4444";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Revenue block */}
      <section>
        <div style={{ color: "#199bb8", fontSize: 13, fontWeight: 700, borderBottom: "1px solid #199bb820", paddingBottom: 8, marginBottom: 12 }}>
          الإيرادات والأرباح — {period === "month" ? "هذا الشهر" : period === "year" ? "هذه السنة" : period === "week" ? "هذا الأسبوع" : "اليوم"}
        </div>
        {loadingSum ? (
          <div style={{ color: "#199bb8", textAlign: "center", padding: 24 }}>جاري التحميل...</div>
        ) : summary ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 10 }}>
              <KpiCard label="إيراد موصّل" value={fmt(summary.totalRevenue)} color="#22c55e" big />
              <KpiCard
                label="ربح إجمالي (بعد البضاعة)"
                value={fmt(summary.netProfit)}
                color={summary.netProfit >= 0 ? "#199bb8" : "#ef4444"}
                big
              />
              <KpiCard
                label="هامش الربح الإجمالي"
                value={`${summary.margin}%`}
                sub={summary.margin >= 30 ? "ممتاز" : summary.margin >= 15 ? "مقبول" : "منخفض"}
                color={marginColor(summary.margin)}
                big
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              <KpiCard label="تكلفة البضاعة (COGS)" value={fmt(summary.totalCogs)} color="#ef4444" />
              <KpiCard label="تكاليف التغليف" value={fmt(summary.totalPackaging)} color="#f97316" />
              <KpiCard label="خصومات كوبونات" value={fmt(summary.totalCoupons)} color="#f59e0b" />
              <KpiCard label="متوسط قيمة الطلب" value={fmt(summary.aov)} color="#ffd700" />
            </div>
            {!summary.costsComplete && (
              <div style={{ marginTop: 10, background: "#f59e0b15", border: "1px solid #f59e0b40", borderRadius: 8, padding: "8px 14px", color: "#fcd34d", fontSize: 12 }}>
                تحذير: {summary.missingCostLines} منتج بدون سعر شراء — أرباح غير مكتملة
              </div>
            )}
          </>
        ) : null}
      </section>

      {/* Net profit after expenses */}
      <section>
        <div style={{ color: "#199bb8", fontSize: 13, fontWeight: 700, borderBottom: "1px solid #199bb820", paddingBottom: 8, marginBottom: 12 }}>
          صافي الربح بعد المصاريف التشغيلية
        </div>
        {netAfterExpenses !== null ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            <KpiCard label="ربح إجمالي" value={fmt(summary?.netProfit ?? 0)} color="#199bb8" big />
            <KpiCard label="مجموع المصاريف" value={fmt(totalExpenses ?? 0)} color="#ef4444" big />
            <KpiCard
              label="صافي الربح الفعلي"
              value={fmt(netAfterExpenses)}
              sub={netAfterExpenses >= 0 ? "في المنطقة الآمنة" : "خسارة — راجع المصاريف"}
              color={netAfterExpenses >= 0 ? "#22c55e" : "#ef4444"}
              big
            />
          </div>
        ) : (
          <div style={{ background: "#0d1f3c", border: "1px solid #1e3a5f", borderRadius: 10, padding: "18px 24px", color: "#64748b", fontSize: 13 }}>
            لم يتم إدخال أي مصاريف تشغيلية — اذهب لتبويب "المصاريف" وأضف الإيجار والرواتب وغيرها لحساب الربح الصافي الفعلي
          </div>
        )}
      </section>

      {/* Order stats */}
      <section>
        <div style={{ color: "#199bb8", fontSize: 13, fontWeight: 700, borderBottom: "1px solid #199bb820", paddingBottom: 8, marginBottom: 12 }}>
          إحصاءات الطلبات
        </div>
        {summary && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            <KpiCard label="طلبات موصّلة" value={String(summary.deliveredCount)} color="#22c55e" />
            <KpiCard label="طلبات قيد التنفيذ" value={String(summary.inProgressCount)} color="#f59e0b" />
            <KpiCard label="طلبات ملغاة / مرفوضة" value={String(summary.cancelledCount)} color="#ef4444" />
            <KpiCard label="نسبة RTO (إرجاع)" value={`${summary.rtoRate}%`} color={summary.rtoRate > 20 ? "#ef4444" : "#f59e0b"} />
          </div>
        )}
      </section>

      {/* COD */}
      <section>
        <div style={{ color: "#199bb8", fontSize: 13, fontWeight: 700, borderBottom: "1px solid #199bb820", paddingBottom: 8, marginBottom: 12 }}>
          تتبع الكاش — شركة الشحن
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          <KpiCard label="باقي عند الشركة" value={fmt(codData?.totalPending ?? 0)} color="#ef4444" big />
          <KpiCard label="استلمت من الشركة" value={fmt(codData?.totalReceived ?? 0)} color="#22c55e" big />
          <KpiCard label="في الطريق" value={fmt(codData?.totalInTransit ?? 0)} color="#f97316" big />
        </div>
      </section>

      {/* Inventory */}
      <section>
        <div style={{ color: "#199bb8", fontSize: 13, fontWeight: 700, borderBottom: "1px solid #199bb820", paddingBottom: 8, marginBottom: 12 }}>
          قيمة المخزون
        </div>
        {loadingInv ? (
          <div style={{ color: "#199bb8", textAlign: "center", padding: 16 }}>جاري التحميل...</div>
        ) : inventory ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 10 }}>
              <KpiCard
                label="قيمة المخزون بسعر الشراء"
                value={inventory.productsWithCost > 0 ? fmt(inventory.inventoryValueAtCost) : "ناقص — أدخل أسعار الشراء"}
                sub={inventory.productsWithoutCost > 0 ? `${inventory.productsWithoutCost} منتج بدون سعر شراء` : undefined}
                color={inventory.productsWithoutCost > 0 ? "#f59e0b" : "#199bb8"}
                big
              />
              <KpiCard
                label="قيمة المخزون بسعر البيع"
                value={fmt(inventory.inventoryValueAtRetail)}
                big
                color="#22c55e"
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              <KpiCard label="إجمالي المنتجات" value={String(inventory.totalProducts)} color="#199bb8" />
              <KpiCard label="مخزون منخفض" value={String(inventory.lowStockProducts)} color="#f59e0b" />
              <KpiCard label="نفد من المخزون" value={String(inventory.outOfStockProducts)} color="#ef4444" />
              <KpiCard label="Coming Soon" value={String(inventory.comingSoonProducts)} color="#64748b" />
            </div>
          </>
        ) : null}
      </section>

    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no type errors. If `accountingInventorySchema` is missing, confirm Task 4 added it to `shared/accounting.ts`.

- [ ] **Step 3: Navigate to /admin/finance and check "نظرة عامة" tab**

Start dev server. Expected: KPI cards render with real data, COD block shows, inventory shows. "صافي الربح بعد المصاريف" section shows the "add expenses first" message.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/admin/finance-overview.tsx
git commit -m "feat(finance): build FinanceOverview component"
```

---

#### Task 9: Build FinanceExpenses component

**Files:**
- Create: `client/src/components/admin/finance-expenses.tsx`

- [ ] **Step 1: Write the component**

Create `client/src/components/admin/finance-expenses.tsx`:

```tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { addCsrfHeader } from "@/lib/csrf";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Pencil, Plus } from "lucide-react";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  type ExpenseResponse,
  type ExpenseCategory,
} from "@shared/accounting";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n) + " د.ع";

interface ExpenseListData {
  list: ExpenseResponse[];
  totalExpenses: number;
  byCategory: { category: string; total: number }[];
  expensesComplete: boolean;
}

function emptyForm() {
  return {
    category: "rent" as ExpenseCategory,
    amount: "",
    description: "",
    expenseDate: new Date().toISOString().slice(0, 10),
    isRecurring: false,
    recurringPeriod: "" as "" | "monthly" | "weekly" | "yearly",
  };
}

export default function FinanceExpenses({ period }: { period: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());

  const { data, isLoading } = useQuery<ExpenseListData>({
    queryKey: ["fin-expenses-full", period],
    queryFn: async () => {
      const res = await fetch(`/api/admin/expenses?period=${period}`, { credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.message ?? "خطأ");
      return json.data as ExpenseListData;
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["fin-expenses"] });
    qc.invalidateQueries({ queryKey: ["fin-expenses-full"] });
  };

  const saveExpense = useMutation({
    mutationFn: async () => {
      const url = editingId ? `/api/admin/expenses/${editingId}` : "/api/admin/expenses";
      const method = editingId ? "PATCH" : "POST";
      const body = {
        category: form.category,
        amount: Number(form.amount),
        description: form.description || undefined,
        expenseDate: form.expenseDate,
        isRecurring: form.isRecurring,
        recurringPeriod: form.isRecurring && form.recurringPeriod ? form.recurringPeriod : undefined,
      };
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...addCsrfHeader() },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const json = await r.json().catch(() => null);
      if (!r.ok || !json?.success) throw new Error(json?.message ?? "فشل الحفظ");
    },
    onSuccess: () => {
      toast({ title: editingId ? "تم تعديل المصروف" : "تم إضافة المصروف" });
      invalidate();
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm());
    },
    onError: (e) => toast({ title: "خطأ", description: e instanceof Error ? e.message : "فشل الحفظ", variant: "destructive" }),
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/admin/expenses/${id}`, {
        method: "DELETE",
        headers: addCsrfHeader(),
        credentials: "include",
      });
      if (!r.ok) throw new Error("فشل الحذف");
    },
    onSuccess: () => {
      toast({ title: "تم حذف المصروف" });
      invalidate();
    },
    onError: () => toast({ title: "خطأ في الحذف", variant: "destructive" }),
  });

  function openEdit(e: ExpenseResponse) {
    setEditingId(e.id);
    setForm({
      category: e.category,
      amount: String(e.amount),
      description: e.description ?? "",
      expenseDate: e.expenseDate.slice(0, 10),
      isRecurring: e.isRecurring,
      recurringPeriod: (e.recurringPeriod as "" | "monthly" | "weekly" | "yearly") ?? "",
    });
    setShowForm(true);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Category summary */}
      {data && data.byCategory.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {data.byCategory.map(c => (
            <div key={c.category} style={{ background: "#0d1f3c", border: "1px solid #ef444430", borderRadius: 10, padding: "12px 16px" }}>
              <div style={{ color: "#94a3b8", fontSize: 11 }}>
                {EXPENSE_CATEGORY_LABELS[c.category as ExpenseCategory] ?? c.category}
              </div>
              <div style={{ color: "#ef4444", fontSize: 16, fontWeight: 700 }}>{fmt(c.total)}</div>
            </div>
          ))}
          <div style={{ background: "#0d1f3c", border: "1px solid #ef444460", borderRadius: 10, padding: "12px 16px" }}>
            <div style={{ color: "#94a3b8", fontSize: 11 }}>إجمالي المصاريف</div>
            <div style={{ color: "#ef4444", fontSize: 20, fontWeight: 700 }}>{fmt(data.totalExpenses)}</div>
          </div>
        </div>
      )}

      {/* Add button */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm()); }}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 8, background: "#199bb8", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
        >
          <Plus style={{ width: 15, height: 15 }} />
          إضافة مصروف
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ background: "#0d1f3c", border: "1px solid #199bb830", borderRadius: 12, padding: 20 }}>
          <div style={{ color: "#fff", fontSize: 14, fontWeight: 700, marginBottom: 16 }}>
            {editingId ? "تعديل مصروف" : "إضافة مصروف جديد"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ color: "#94a3b8", fontSize: 11, display: "block", marginBottom: 4 }}>الفئة</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value as ExpenseCategory }))}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 7, background: "#010611", border: "1px solid #1e3a5f", color: "#fff", fontSize: 13 }}
              >
                {EXPENSE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{EXPENSE_CATEGORY_LABELS[cat]}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ color: "#94a3b8", fontSize: 11, display: "block", marginBottom: 4 }}>المبلغ (د.ع)</label>
              <input
                type="number"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 7, background: "#010611", border: "1px solid #1e3a5f", color: "#fff", fontSize: 13 }}
                placeholder="500000"
              />
            </div>
            <div>
              <label style={{ color: "#94a3b8", fontSize: 11, display: "block", marginBottom: 4 }}>التاريخ</label>
              <input
                type="date"
                value={form.expenseDate}
                onChange={e => setForm(f => ({ ...f, expenseDate: e.target.value }))}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 7, background: "#010611", border: "1px solid #1e3a5f", color: "#fff", fontSize: 13 }}
              />
            </div>
            <div>
              <label style={{ color: "#94a3b8", fontSize: 11, display: "block", marginBottom: 4 }}>الوصف (اختياري)</label>
              <input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 7, background: "#010611", border: "1px solid #1e3a5f", color: "#fff", fontSize: 13 }}
                placeholder="تفاصيل المصروف"
              />
            </div>
          </div>
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              id="isRecurring"
              checked={form.isRecurring}
              onChange={e => setForm(f => ({ ...f, isRecurring: e.target.checked }))}
            />
            <label htmlFor="isRecurring" style={{ color: "#94a3b8", fontSize: 12, cursor: "pointer" }}>مصروف متكرر</label>
            {form.isRecurring && (
              <select
                value={form.recurringPeriod}
                onChange={e => setForm(f => ({ ...f, recurringPeriod: e.target.value as "monthly" | "weekly" | "yearly" }))}
                style={{ padding: "4px 8px", borderRadius: 6, background: "#010611", border: "1px solid #1e3a5f", color: "#fff", fontSize: 12 }}
              >
                <option value="monthly">شهري</option>
                <option value="weekly">أسبوعي</option>
                <option value="yearly">سنوي</option>
              </select>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
            <button onClick={() => { setShowForm(false); setEditingId(null); }} style={{ padding: "7px 16px", borderRadius: 7, background: "#1e3a5f", color: "#94a3b8", border: "none", cursor: "pointer" }}>إلغاء</button>
            <button
              onClick={() => saveExpense.mutate()}
              disabled={saveExpense.isPending || !form.amount || !form.expenseDate}
              style={{ padding: "7px 18px", borderRadius: 7, background: "#199bb8", color: "#fff", border: "none", cursor: "pointer", fontWeight: 600, opacity: saveExpense.isPending ? 0.7 : 1 }}
            >
              {saveExpense.isPending ? "جاري الحفظ..." : "حفظ"}
            </button>
          </div>
        </div>
      )}

      {/* Expenses list */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: 24, color: "#199bb8" }}>جاري التحميل...</div>
      ) : !data || data.list.length === 0 ? (
        <div style={{ background: "#0d1f3c", border: "1px solid #1e3a5f", borderRadius: 10, padding: "32px 24px", textAlign: "center", color: "#64748b", fontSize: 13 }}>
          لا توجد مصاريف في هذه الفترة — اضغط "إضافة مصروف" لتسجيل أول مصروف
        </div>
      ) : (
        <div style={{ background: "#0d1f3c", border: "1px solid #1e3a5f", borderRadius: 10, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#010611" }}>
                {["الفئة", "المبلغ", "التاريخ", "الوصف", "متكرر", ""].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: h === "" ? "center" : "right", color: "#94a3b8", fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.list.map(e => (
                <tr key={e.id} style={{ borderTop: "1px solid #1e3a5f20" }}>
                  <td style={{ padding: "10px 14px", color: "#fff", fontSize: 13 }}>
                    {EXPENSE_CATEGORY_LABELS[e.category] ?? e.category}
                  </td>
                  <td style={{ padding: "10px 14px", color: "#ef4444", fontSize: 13, fontWeight: 600 }}>{fmt(e.amount)}</td>
                  <td style={{ padding: "10px 14px", color: "#94a3b8", fontSize: 12 }}>
                    {new Date(e.expenseDate).toLocaleDateString("ar-IQ")}
                  </td>
                  <td style={{ padding: "10px 14px", color: "#64748b", fontSize: 12 }}>{e.description ?? "—"}</td>
                  <td style={{ padding: "10px 14px", textAlign: "center" }}>
                    {e.isRecurring ? (
                      <span style={{ background: "#199bb820", color: "#199bb8", padding: "2px 8px", borderRadius: 99, fontSize: 10 }}>
                        {e.recurringPeriod === "monthly" ? "شهري" : e.recurringPeriod === "weekly" ? "أسبوعي" : "سنوي"}
                      </span>
                    ) : "—"}
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "center" }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                      <button onClick={() => openEdit(e)} style={{ background: "none", border: "1px solid #1e3a5f", borderRadius: 6, color: "#199bb8", cursor: "pointer", padding: "3px 8px" }}>
                        <Pencil style={{ width: 11, height: 11 }} />
                      </button>
                      <button onClick={() => deleteExpense.mutate(e.id)} style={{ background: "none", border: "1px solid #ef444430", borderRadius: 6, color: "#ef4444", cursor: "pointer", padding: "3px 8px" }}>
                        <Trash2 style={{ width: 11, height: 11 }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Test the expenses tab**

Navigate to `/admin/finance`, click "المصاريف". Add a test expense. Verify it appears in list. Edit it. Delete it.

- [ ] **Step 3: Verify FinanceOverview net profit updates after adding expenses**

After adding an expense, switch to "نظرة عامة". The "صافي الربح بعد المصاريف" section should show real numbers (not the "add expenses first" message).

- [ ] **Step 4: Commit**

```bash
git add client/src/components/admin/finance-expenses.tsx
git commit -m "feat(finance): build FinanceExpenses CRUD component"
```

---

#### Task 10: Build FinanceReports component (trends + CSV export)

**Files:**
- Create: `client/src/components/admin/finance-reports.tsx`

- [ ] **Step 1: Write the component**

Create `client/src/components/admin/finance-reports.tsx`:

```tsx
import { useQuery } from "@tanstack/react-query";
import {
  accountingTrendsResponseSchema,
  type AccountingTrendPoint,
} from "@shared/accounting";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n) + " د.ع";

function marginColor(m: number) {
  return m >= 30 ? "#22c55e" : m >= 15 ? "#f59e0b" : "#ef4444";
}

function exportCSV(rows: AccountingTrendPoint[]) {
  const headers = ["الشهر", "الإيراد", "تكلفة البضاعة", "صافي الربح", "هامش%", "طلبات", "موصّل"];
  const lines = rows.map(r => [
    r.label,
    r.revenue,
    r.cogs,
    r.netProfit,
    r.margin,
    r.orderCount,
    r.deliveredCount,
  ].join(","));
  const csv = [headers.join(","), ...lines].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `aquavo-finance-${new Date().toISOString().slice(0, 7)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function FinanceReports() {
  const { data: trends = [], isLoading } = useQuery<AccountingTrendPoint[]>({
    queryKey: ["fin-trends"],
    queryFn: async () => {
      const res = await fetch("/api/admin/accounting/trends?months=12", { credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.message ?? "خطأ");
      return accountingTrendsResponseSchema.parse(json.data);
    },
  });

  const maxRevenue = Math.max(...trends.map(t => t.revenue), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ color: "#199bb8", fontSize: 13, fontWeight: 700 }}>
          التقرير الشهري — آخر 12 شهر
        </div>
        {trends.length > 0 && (
          <button
            onClick={() => exportCSV(trends)}
            style={{ padding: "6px 14px", borderRadius: 7, background: "#0d1f3c", border: "1px solid #1e3a5f", color: "#199bb8", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
          >
            تصدير CSV
          </button>
        )}
      </div>

      {/* Revenue bar chart (CSS bars — no chart library needed) */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: 24, color: "#199bb8" }}>جاري التحميل...</div>
      ) : trends.length === 0 ? (
        <div style={{ background: "#0d1f3c", border: "1px solid #1e3a5f", borderRadius: 10, padding: "32px 24px", textAlign: "center", color: "#64748b", fontSize: 13 }}>
          لا توجد بيانات بعد
        </div>
      ) : (
        <>
          {/* Visual bars */}
          <div style={{ background: "#0d1f3c", border: "1px solid #1e3a5f", borderRadius: 10, padding: "16px 20px" }}>
            <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 12 }}>الإيراد الشهري (موصّل فقط)</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120 }}>
              {trends.map(t => {
                const h = Math.max(4, (t.revenue / maxRevenue) * 110);
                return (
                  <div key={t.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{ fontSize: 9, color: "#64748b", textAlign: "center" }}>
                      {t.revenue > 0 ? (t.revenue / 1000).toFixed(0) + "K" : ""}
                    </div>
                    <div style={{ width: "100%", height: h, background: t.revenue > 0 ? "#199bb8" : "#1e3a5f", borderRadius: "3px 3px 0 0", transition: "height 0.3s" }} />
                    <div style={{ fontSize: 9, color: "#64748b", textAlign: "center", writingMode: "vertical-rl", transform: "rotate(180deg)", height: 40 }}>
                      {t.label.split(" ")[0]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Data table */}
          <div style={{ background: "#0d1f3c", border: "1px solid #1e3a5f", borderRadius: 10, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#010611" }}>
                  {["الشهر", "إيراد موصّل", "تكلفة بضاعة", "صافي ربح", "هامش", "طلبات", "موصّل"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: h === "الشهر" ? "right" : "center", color: "#94a3b8", fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...trends].reverse().map(t => (
                  <tr key={t.month} style={{ borderTop: "1px solid #1e3a5f20" }}>
                    <td style={{ padding: "10px 14px", color: "#fff", fontSize: 13 }}>{t.label}</td>
                    <td style={{ padding: "10px 14px", textAlign: "center", color: "#22c55e", fontSize: 12 }}>{fmt(t.revenue)}</td>
                    <td style={{ padding: "10px 14px", textAlign: "center", color: "#ef4444", fontSize: 12 }}>{fmt(t.cogs)}</td>
                    <td style={{ padding: "10px 14px", textAlign: "center", fontWeight: 700, fontSize: 12, color: t.netProfit >= 0 ? "#199bb8" : "#ef4444" }}>{fmt(t.netProfit)}</td>
                    <td style={{ padding: "10px 14px", textAlign: "center" }}>
                      <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: marginColor(t.margin) + "20", color: marginColor(t.margin) }}>
                        {t.margin}%
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", textAlign: "center", color: "#94a3b8", fontSize: 12 }}>{t.orderCount}</td>
                    <td style={{ padding: "10px 14px", textAlign: "center", color: "#22c55e", fontSize: 12 }}>{t.deliveredCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify CSV export**

Navigate to "تقارير شهرية". Click "تصدير CSV". Verify a `.csv` file downloads and opens correctly in Excel/Sheets. Check that Arabic column headers render correctly (UTF-8 BOM is included).

- [ ] **Step 3: Commit**

```bash
git add client/src/components/admin/finance-reports.tsx
git commit -m "feat(finance): build FinanceReports with monthly trends and CSV export"
```

---

#### Task 11: Build FinanceProducts component

**Files:**
- Create: `client/src/components/admin/finance-products.tsx`

This component is a cleaned-up extraction from `accounting-panel.tsx`'s product section, enhanced with a cost-editing dialog and cost-completeness indicator.

- [ ] **Step 1: Write the component**

Create `client/src/components/admin/finance-products.tsx`:

```tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { addCsrfHeader } from "@/lib/csrf";
import { Pencil } from "lucide-react";
import {
  accountingProductsResponseSchema,
  accountingCostHistoryResponseSchema,
  type AccountingProductProfit,
  type AccountingCostHistoryEntry,
} from "@shared/accounting";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n) + " د.ع";

function marginColor(m: number) {
  return m >= 30 ? "#22c55e" : m >= 15 ? "#f59e0b" : "#ef4444";
}

export default function FinanceProducts({ period }: { period: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editProduct, setEditProduct] = useState<AccountingProductProfit | null>(null);
  const [costs, setCosts] = useState({ costPrice: 0, packagingCost: 0, insertCost: 0 });
  const [newCostDate, setNewCostDate] = useState("");
  const [costHistory, setCostHistory] = useState<AccountingCostHistoryEntry[]>([]);

  const { data: products = [], isLoading } = useQuery<AccountingProductProfit[]>({
    queryKey: ["fin-products", period],
    queryFn: async () => {
      const res = await fetch(`/api/admin/accounting/products?period=${period}`, { credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.message ?? "خطأ");
      return accountingProductsResponseSchema.parse(json.data);
    },
  });

  const saveCosts = useMutation({
    mutationFn: async () => {
      if (!editProduct) return;
      const r = await fetch(`/api/admin/accounting/costs/${editProduct.productId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...addCsrfHeader() },
        credentials: "include",
        body: JSON.stringify(costs),
      });
      if (!r.ok) throw new Error("فشل الحفظ");
    },
    onSuccess: () => {
      toast({ title: "تم حفظ التكاليف" });
      qc.invalidateQueries({ queryKey: ["fin-products"] });
      qc.invalidateQueries({ queryKey: ["fin-summary"] });
      setEditProduct(null);
    },
    onError: () => toast({ title: "خطأ في الحفظ", variant: "destructive" }),
  });

  const fetchCostHistory = async (productId: string) => {
    try {
      const r = await fetch(`/api/admin/accounting/cost-history/${productId}`, { credentials: "include" });
      const j = await r.json();
      if (!r.ok || !j?.success) throw new Error(j?.message ?? "فشل");
      setCostHistory(accountingCostHistoryResponseSchema.parse(j.data));
    } catch {
      setCostHistory([]);
    }
  };

  const missingCostCount = products.filter(p => !p.costsComplete).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Warning banner */}
      {missingCostCount > 0 && (
        <div style={{ background: "#f59e0b15", border: "1px solid #f59e0b40", borderRadius: 8, padding: "10px 16px", color: "#fcd34d", fontSize: 12 }}>
          {missingCostCount} منتج بدون سعر شراء — اضغط زر التعديل وأدخل التكاليف لحساب الربح الصحيح
        </div>
      )}

      {/* Products table */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: 24, color: "#199bb8" }}>جاري التحميل...</div>
      ) : products.length === 0 ? (
        <div style={{ background: "#0d1f3c", border: "1px solid #1e3a5f", borderRadius: 10, padding: "32px 24px", textAlign: "center", color: "#64748b", fontSize: 13 }}>
          لا توجد مبيعات في هذه الفترة
        </div>
      ) : (
        <div style={{ background: "#0d1f3c", border: "1px solid #1e3a5f", borderRadius: 10, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#010611" }}>
                {["المنتج", "مبيع", "إيراد", "تكلفة بضاعة", "صافي ربح", "هامش", ""].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: h === "المنتج" ? "right" : "center", color: "#94a3b8", fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map(row => (
                <tr key={row.productId} style={{ borderTop: "1px solid #1e3a5f20" }}>
                  <td style={{ padding: "10px 14px", color: "#fff", fontSize: 13, maxWidth: 220 }}>
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.name}</div>
                    {!row.costsComplete && (
                      <div style={{ fontSize: 10, color: "#f59e0b", marginTop: 2 }}>سعر الشراء غير مدخل</div>
                    )}
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>{row.unitsSold}</td>
                  <td style={{ padding: "10px 14px", textAlign: "center", color: "#22c55e", fontSize: 13 }}>{fmt(row.revenue)}</td>
                  <td style={{ padding: "10px 14px", textAlign: "center", color: "#ef4444", fontSize: 13 }}>{row.costsComplete ? fmt(row.cogs) : "—"}</td>
                  <td style={{ padding: "10px 14px", textAlign: "center", fontSize: 13, fontWeight: 700, color: row.costsComplete ? (row.netProfit >= 0 ? "#199bb8" : "#ef4444") : "#64748b" }}>
                    {row.costsComplete ? fmt(row.netProfit) : "ناقص"}
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "center" }}>
                    {row.costsComplete ? (
                      <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: marginColor(row.margin) + "20", color: marginColor(row.margin) }}>
                        {row.margin}%
                      </span>
                    ) : (
                      <span style={{ color: "#64748b", fontSize: 11 }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "center" }}>
                    <button
                      onClick={() => {
                        setEditProduct(row);
                        setCosts({ costPrice: row.costPrice, packagingCost: row.packagingCost, insertCost: row.insertCost });
                        fetchCostHistory(row.productId);
                      }}
                      style={{ background: "none", border: "1px solid #1e3a5f", borderRadius: 6, color: "#199bb8", cursor: "pointer", padding: "3px 10px", fontSize: 11 }}
                    >
                      <Pencil style={{ width: 11, height: 11, display: "inline", marginLeft: 3 }} />
                      تكاليف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Cost edit dialog */}
      <Dialog open={!!editProduct} onOpenChange={() => setEditProduct(null)}>
        <DialogContent className="bg-[#0a1628] border-[#199bb8]/30 text-white" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-white text-sm">{editProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">سعر الشراء النهائي (د.ع)</label>
              <Input type="number" value={costs.costPrice} onChange={e => setCosts(c => ({ ...c, costPrice: Number(e.target.value) }))} className="bg-[#010611] border-[#199bb8]/40 text-white" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">تكلفة تغليف لكل قطعة (د.ع)</label>
              <Input type="number" value={costs.packagingCost} onChange={e => setCosts(c => ({ ...c, packagingCost: Number(e.target.value) }))} className="bg-[#010611] border-[#199bb8]/40 text-white" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">كارت / مواد داخلية (د.ع)</label>
              <Input type="number" value={costs.insertCost} onChange={e => setCosts(c => ({ ...c, insertCost: Number(e.target.value) }))} className="bg-[#010611] border-[#199bb8]/40 text-white" />
            </div>
            {/* Historical cost entry */}
            <div style={{ borderTop: "1px solid #1e3a5f", paddingTop: 12 }}>
              <div style={{ color: "#64748b", fontSize: 11, marginBottom: 6 }}>سعر بتاريخ محدد (اختياري):</div>
              <input type="date" value={newCostDate} onChange={e => setNewCostDate(e.target.value)}
                style={{ padding: "6px 10px", borderRadius: 6, background: "#010611", border: "1px solid #1e3a5f", color: "#fff", width: "100%", fontSize: 12 }} />
              <button
                disabled={!newCostDate}
                onClick={async () => {
                  if (!editProduct || !newCostDate) return;
                  const r = await fetch(`/api/admin/accounting/cost-history/${editProduct.productId}`, {
                    method: "POST", headers: addCsrfHeader({ "Content-Type": "application/json" }),
                    credentials: "include", body: JSON.stringify({ ...costs, effectiveFrom: newCostDate }),
                  });
                  const j = await r.json().catch(() => null);
                  if (r.ok && j?.success) { await fetchCostHistory(editProduct.productId); setNewCostDate(""); toast({ title: "تم" }); }
                }}
                style={{ marginTop: 6, padding: "5px 12px", borderRadius: 6, background: "#199bb8", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, opacity: newCostDate ? 1 : 0.4 }}
              >
                حفظ بتاريخ
              </button>
              {costHistory.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ color: "#64748b", fontSize: 10, marginBottom: 4 }}>التاريخ السابق:</div>
                  {costHistory.slice(0, 4).map((h, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94a3b8", padding: "2px 0", borderBottom: "1px solid #1e3a5f20" }}>
                      <span>{new Date(h.effectiveFrom).toLocaleDateString("ar-IQ")}</span>
                      <span>{h.costPrice} د.ع</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => saveCosts.mutate()} disabled={saveCosts.isPending} className="bg-[#199bb8] hover:bg-[#199bb8]/80">
              {saveCosts.isPending ? "جاري الحفظ..." : "حفظ التكاليف"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/admin/finance-products.tsx
git commit -m "feat(finance): build FinanceProducts component with cost editing"
```

---

#### Task 12: Build FinanceRecommendations component

**Files:**
- Create: `client/src/components/admin/finance-recommendations.tsx`

- [ ] **Step 1: Write the component**

Create `client/src/components/admin/finance-recommendations.tsx`:

```tsx
import { useQuery } from "@tanstack/react-query";
import { financeRecommendationsResponseSchema, type FinanceRecommendation } from "@shared/accounting";

const PRIORITY_COLORS = { high: "#ef4444", medium: "#f59e0b", low: "#64748b" };
const TYPE_ICONS: Record<FinanceRecommendation["type"], string> = {
  promote: "الترويج",
  low_margin: "هامش منخفض",
  low_stock: "مخزون منخفض",
  no_cost: "تكلفة مفقودة",
  dead_stock: "بضاعة راكدة",
  coming_soon: "Coming Soon",
};

function RecommendationRow({ r }: { r: FinanceRecommendation }) {
  const priorityColor = PRIORITY_COLORS[r.priority];
  return (
    <div style={{ background: "#0d1f3c", border: `1px solid ${priorityColor}20`, borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: 14 }}>
      <div style={{ minWidth: 80, textAlign: "center" }}>
        <div style={{ background: priorityColor + "20", color: priorityColor, padding: "3px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700 }}>
          {TYPE_ICONS[r.type]}
        </div>
        {r.margin !== null && (
          <div style={{ marginTop: 4, fontSize: 12, fontWeight: 700, color: priorityColor }}>{r.margin}%</div>
        )}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{r.name}</div>
        <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 3 }}>{r.message}</div>
        <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
          <span style={{ color: "#64748b", fontSize: 11 }}>مخزون: <span style={{ color: "#fff" }}>{r.stock}</span></span>
          <span style={{ color: "#64748b", fontSize: 11 }}>مبيع: <span style={{ color: "#fff" }}>{r.unitsSold}</span></span>
        </div>
      </div>
    </div>
  );
}

export default function FinanceRecommendations({ period }: { period: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["fin-recommendations", period],
    queryFn: async () => {
      const res = await fetch(`/api/admin/accounting/recommendations?period=${period}`, { credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.message ?? "خطأ");
      return financeRecommendationsResponseSchema.parse(json.data);
    },
  });

  if (isLoading) return <div style={{ textAlign: "center", padding: 32, color: "#199bb8" }}>جاري التحليل...</div>;
  if (!data) return null;

  const SectionTitle = ({ children, count, color = "#199bb8" }: { children: React.ReactNode; count: number; color?: string }) => (
    <div style={{ color, fontSize: 13, fontWeight: 700, borderBottom: `1px solid ${color}20`, paddingBottom: 8, marginBottom: 12, display: "flex", justifyContent: "space-between" }}>
      <span>{children}</span>
      <span style={{ background: color + "20", color, padding: "1px 8px", borderRadius: 99, fontSize: 11 }}>{count}</span>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

      {/* Promote */}
      <section>
        <SectionTitle count={data.promote.length} color="#22c55e">
          منتجات تستحق الترويج — هامش عالي + مخزون كافي
        </SectionTitle>
        {data.promote.length === 0 ? (
          <div style={{ color: "#64748b", fontSize: 13, padding: 8 }}>لا توجد منتجات بهامش ≥ 30% مع مبيعات في هذه الفترة</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.promote.map(r => <RecommendationRow key={r.productId} r={r} />)}
          </div>
        )}
      </section>

      {/* Warnings */}
      <section>
        <SectionTitle count={data.warnings.length} color="#f59e0b">
          تحذيرات تحتاج انتباهك
        </SectionTitle>
        {data.warnings.length === 0 ? (
          <div style={{ color: "#64748b", fontSize: 13, padding: 8 }}>لا توجد تحذيرات — وضع ممتاز</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.warnings.map(r => <RecommendationRow key={`${r.productId}-${r.type}`} r={r} />)}
          </div>
        )}
      </section>

      {/* Coming Soon */}
      {data.comingSoon.length > 0 && (
        <section>
          <SectionTitle count={data.comingSoon.length} color="#64748b">
            Coming Soon — مستبعدة من الحسابات
          </SectionTitle>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {data.comingSoon.map(r => (
              <span key={r.productId} style={{ background: "#1e3a5f", color: "#94a3b8", padding: "4px 12px", borderRadius: 99, fontSize: 12 }}>
                {r.name}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Navigate to "توصيات ذكية" tab and verify**

Expected: promote list shows high-margin products, warnings show missing costs + low stock, Coming Soon list shows price=0 products.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/admin/finance-recommendations.tsx
git commit -m "feat(finance): build FinanceRecommendations smart insights component"
```

---

### Phase 4 — Integration + Polish

#### Task 13: Link accounting tab to finance page

**Files:**
- Modify: `client/src/pages/admin-dashboard.tsx`

- [ ] **Step 1: Replace accounting tab content with link to new page**

Open `client/src/pages/admin-dashboard.tsx`. Find the accounting TabsContent (around line 716). Replace the `<AccountingPanel />` with a redirect button:

```tsx
<TabsContent value="accounting" className="space-y-4">
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 24px", gap: 16 }}>
    <div style={{ color: "#fff", fontSize: 16, fontWeight: 700 }}>مركز المالية انتقل لصفحة مخصصة</div>
    <div style={{ color: "#64748b", fontSize: 13, textAlign: "center", maxWidth: 400 }}>
      تم ترقية لوحة المحاسبة إلى مركز مالي متكامل مع تقارير، مصاريف، وتوصيات ذكية
    </div>
    <a
      href="/admin/finance"
      style={{ padding: "10px 24px", borderRadius: 8, background: "#199bb8", color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 600 }}
    >
      فتح مركز المالية
    </a>
  </div>
</TabsContent>
```

- [ ] **Step 2: Verify navigation works**

Click "💰 المحاسب" tab → click "فتح مركز المالية" → lands on `/admin/finance`. Browser back button returns to admin dashboard.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/admin-dashboard.tsx
git commit -m "feat(finance): link admin dashboard accounting tab to new finance page"
```

---

#### Task 14: Final TypeScript check + smoke test

- [ ] **Step 1: Full TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors. Fix any type errors before continuing.

- [ ] **Step 2: Navigate through all 5 tabs on /admin/finance**

- "نظرة عامة": KPI cards show real numbers. COD block shows. Inventory block shows. Net profit shows either data or "add expenses first" message.
- "المصاريف": Empty state message shown. Add one expense. Verify it appears. Edit it. Delete it.
- "تقارير شهرية": Monthly table renders with data or empty state. CSV button appears and downloads a file.
- "ربحية المنتجات": Product table renders. Missing cost warning shows if applicable. Edit a product cost.
- "توصيات ذكية": Promote section and warnings section render. Coming Soon list shows.

- [ ] **Step 3: Verify no customer-facing exposure**

```bash
# Unauthenticated request should be blocked
curl http://localhost:5000/api/admin/expenses
# Expected: 401 or 403
curl http://localhost:5000/api/admin/accounting/recommendations
# Expected: 401 or 403
curl http://localhost:5000/api/admin/accounting/inventory
# Expected: 401 or 403
```

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat(finance): complete AQUAVO Smart Finance Center v1"
```

---

## SELF-REVIEW

### Spec Coverage Check

| Requirement | Covered by |
|-------------|-----------|
| Track real revenue, gross profit, net profit estimate | Task 8 (FinanceOverview), existing `/summary` endpoint |
| Calculate product-level profitability | Task 11 (FinanceProducts), existing `/products` endpoint |
| Track inventory value | Task 4 (`/inventory` endpoint) + Task 8 |
| Track expenses | Tasks 1-3 (`expenses` table + CRUD API) + Task 9 |
| Generate monthly finance reports | Task 5 (`/trends` endpoint) + Task 10 |
| Recommend products worth promoting | Task 6 (`/recommendations`) + Task 12 |
| Warn about low-margin/low-stock | Task 6 + Task 12 |
| Exclude Coming Soon (price ≤ 0) | Task 6 (explicit filter in recommendation logic) |
| No invented numbers | All endpoints only compute from real DB data; missing cost = "ناقص" |
| `/admin/finance` dashboard | Task 7 |
| `/admin/finance/expenses` sub-section | Task 9 |
| `/admin/finance/reports` sub-section | Task 10 |
| `/admin/finance/products` sub-section | Task 11 |
| Smart recommendations section | Task 12 |
| Gross revenue, COGS, gross profit, gross margin | Task 8 (FinanceOverview via existing API) |
| Inventory value | Task 4 + Task 8 |
| Best-margin products | Task 6 (promote list, sorted by margin) |
| Slow-moving stock | Task 6 (dead_stock type) |
| Net profit after expenses | Task 8 (computed: grossProfit − totalExpenses) |
| Delivery fee collected vs cost | Existing COD section (shippingCost on orders) |
| Admin-only | All routes use `requireAdmin`; frontend has `RequireAdmin` wrapper |
| Iraqi dinar formatting | `fmt()` helper in every component |
| Clear Arabic admin labels | All labels in Arabic throughout |
| If cost missing → mark incomplete | "ناقص" label in products table, warning banner |

### Placeholder Scan

No placeholder text ("TBD", "TODO", "fill in later") remains in the plan. All code blocks are complete.

### Type Consistency

- `FinanceRecommendation` type imported from `shared/accounting.ts` in both backend (Task 6) and frontend (Task 12) ✅
- `AccountingInventory` schema defined in Task 4 and used in Task 8 ✅
- `AccountingTrendPoint` schema defined in Task 5 and used in Task 10 ✅
- `ExpenseResponse`, `ExpenseCategory`, `EXPENSE_CATEGORY_LABELS` defined in Task 2 and used in Task 9 ✅
- `financeRecommendationsResponseSchema` defined in Task 6's schema step and used in Task 12 ✅

---

## WHAT NOT TO BUILD YET

The following are deliberately excluded from this plan. They require more data, separate decisions, or carry disproportionate complexity for the MVP:

1. **PDF export** — requires a PDF library (jsPDF, puppeteer) or backend template. Add in v2.
2. **Marketing ROI calculator** — needs ad spend data linked to specific campaigns. Out of scope for v1.
3. **Automated alerts (email/push when margin drops)** — monitoring system belongs in a separate cron-based feature.
4. **Multi-currency support** — AQUAVO is IQD-only. Don't add.
5. **Accountant user role** — a read-only finance role. Admin-only is sufficient for the current team size.
6. **Profit forecasting / projections** — requires historical trend analysis and ML. Out of scope.
7. **Expense attachments (receipt images)** — nice-to-have, requires R2 upload integration. Add in v2.
8. **Recurring expense auto-generation** — `isRecurring` flag is stored, but the cron job to auto-create next month's entry is not built yet. The flag is a hint for manual re-entry for now.

---

## FIRST SAFE MVP SCOPE

If you want to ship the smallest useful increment first:

**MVP = Phase 1 (expenses) + Phase 2 (inventory endpoint only) + Task 7 + Task 8 + Task 9**

This gives you:
- A real `/admin/finance` page
- Real overview KPIs (already working via existing API)  
- Expenses tracking with net-profit-after-expenses calculation
- Inventory value visibility

Then add Phase 2 remainder (trends, recommendations) + Phase 3 as v1.1.
