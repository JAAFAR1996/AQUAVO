# AQUAVO Accounting System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full company accountant panel for AQUAVO — P&L reports with per-order/per-product profit breakdown (including COGS, packaging, coupon, loyalty, shipping costs) + Apify competitor price monitoring.

**Architecture:** Three cost fields added to products schema (costPrice, packagingCost, insertCost). A new backend route `accounting.ts` queries orders and products to compute real profit. Two new admin tabs: `accounting-panel.tsx` (P&L dashboard) and `competitor-monitor-panel.tsx` (Apify scraper).

**Tech Stack:** Drizzle ORM + Neon PostgreSQL, Express, React + TanStack Query, shadcn/ui, apify-client npm package.

---

## Files

| Action | Path |
|--------|------|
| Modify | `shared/schema.ts` — add costPrice, packagingCost, insertCost to products |
| Create | `server/routes/accounting.ts` — P&L endpoints + Apify competitor check |
| Modify | `server/routes.ts` — register accounting router |
| Create | `client/src/components/admin/accounting-panel.tsx` — P&L dashboard |
| Create | `client/src/components/admin/competitor-monitor-panel.tsx` — competitor prices |
| Modify | `client/src/pages/admin-dashboard.tsx` — add 2 new tabs |

---

## Task 1: Add APIFY_TOKEN to .env

**Files:**
- Modify: `.env` (local) and `.env.example`

- [ ] **Step 1: Add env var**

Open `.env` and add:
```
APIFY_TOKEN=apify_api_1S7zx9wy7EXHTQDbE8iXTLODYZx42a35C7wn
```

- [ ] **Step 2: Add placeholder to .env.example (if it exists)**

```
APIFY_TOKEN=apify_api_xxxx
```

- [ ] **Step 3: Install apify-client**

```bash
npm install apify-client
```

Expected output: `added 1 package`

- [ ] **Step 4: Commit**

```bash
git add .env.example package.json package-lock.json
git commit -m "chore: add apify-client + APIFY_TOKEN env var"
```

---

## Task 2: Add Cost Fields to Products Schema

**Files:**
- Modify: `shared/schema.ts` lines 64–114

- [ ] **Step 1: Add 3 fields to products table**

In `shared/schema.ts`, inside the `products` pgTable definition, after `hasVariants` (line ~88) and before `createdAt`, add:

```typescript
  // Accounting: cost fields (set by admin manually)
  costPrice: numeric("cost_price").default("0"),
  packagingCost: numeric("packaging_cost").default("0"),
  insertCost: numeric("insert_cost").default("0"),
```

Full context — the products table after your change should have this block:
```typescript
  hasVariants: boolean("has_variants").notNull().default(false),
  // Accounting: cost fields (set by admin manually)
  costPrice: numeric("cost_price").default("0"),
  packagingCost: numeric("packaging_cost").default("0"),
  insertCost: numeric("insert_cost").default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
```

- [ ] **Step 2: Push migration to Neon**

```bash
npx drizzle-kit push
```

Expected: `[✓] Changes applied` — 3 new columns added to products table.

If `drizzle-kit push` is not configured, run this SQL directly on Neon:
```sql
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS cost_price NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS packaging_cost NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS insert_cost NUMERIC DEFAULT 0;
```

- [ ] **Step 3: Commit**

```bash
git add shared/schema.ts
git commit -m "feat: add costPrice, packagingCost, insertCost to products schema"
```

---

## Task 3: Create Backend Accounting Route

**Files:**
- Create: `server/routes/accounting.ts`

- [ ] **Step 1: Create the file**

```typescript
import { Router, type Request, type Response, type NextFunction } from "express";
import { requireAdmin } from "../middleware/auth.js";
import { getDb } from "../db.js";
import { orders, products } from "../../shared/schema.js";
import { and, gte, lte, isNull, inArray, eq } from "drizzle-orm";
import { ApifyClient } from "apify-client";

const router = Router();
router.use(requireAdmin);

// ─── helpers ────────────────────────────────────────────────────────────────

function periodRange(period: string, from?: string, to?: string): { start: Date; end: Date } {
  const now = new Date();
  if (period === "custom" && from && to) {
    return { start: new Date(from), end: new Date(to) };
  }
  if (period === "day") {
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const end   = new Date(now); end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  if (period === "year") {
    return {
      start: new Date(now.getFullYear(), 0, 1),
      end:   new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
    };
  }
  // default: month
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end:   new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
  };
}

interface CostMap {
  [productId: string]: {
    costPrice: number;
    packagingCost: number;
    insertCost: number;
    name: string;
    price: number;
  };
}

interface OrderProfit {
  orderId: string;
  orderNumber: string | null;
  customerName: string | null;
  createdAt: Date;
  revenue: number;
  cogs: number;
  packaging: number;
  couponDiscount: number;
  loyaltyDiscount: number;
  shipping: number;
  netProfit: number;
  margin: number;
}

interface ProductProfit {
  productId: string;
  name: string;
  unitsSold: number;
  revenue: number;
  cogs: number;
  packaging: number;
  netProfit: number;
  margin: number;
}

function calcOrderProfit(order: any, costMap: CostMap): OrderProfit {
  const items: Array<{ productId: string; quantity: number; priceAtPurchase: number }> =
    Array.isArray(order.items) ? order.items : [];

  const orderTotal = Number(order.total) || 0;
  let revenue = 0;
  let cogs = 0;
  let packaging = 0;

  for (const item of items) {
    const qty = item.quantity || 1;
    const price = Number(item.priceAtPurchase) || 0;
    revenue += price * qty;

    const c = costMap[item.productId];
    if (c) {
      cogs += c.costPrice * qty;
      packaging += (c.packagingCost + c.insertCost) * qty;
    }
  }

  const couponDiscount   = Number(order.discountTotal)   || 0;
  const loyaltyDiscount  = Number(order.pointsDiscount)  || 0;
  const shipping         = Number(order.shippingCost)    || 0;

  const netProfit = revenue - cogs - packaging - couponDiscount - loyaltyDiscount - shipping;
  const margin    = revenue > 0 ? Math.round((netProfit / revenue) * 100) : 0;

  return {
    orderId:        order.id,
    orderNumber:    order.orderNumber ?? null,
    customerName:   order.customerName ?? null,
    createdAt:      order.createdAt,
    revenue,
    cogs,
    packaging,
    couponDiscount,
    loyaltyDiscount,
    shipping,
    netProfit,
    margin,
  };
}

// ─── GET /api/admin/accounting/summary ──────────────────────────────────────

router.get("/summary", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getDb();
    const { period = "month", from, to } = req.query as Record<string, string>;
    const { start, end } = periodRange(period, from, to);

    const allOrders = await db
      .select()
      .from(orders)
      .where(and(gte(orders.createdAt, start), lte(orders.createdAt, end)));

    // collect all product IDs
    const productIds = new Set<string>();
    for (const o of allOrders) {
      const items = Array.isArray(o.items) ? o.items : [];
      for (const item of items as any[]) {
        if (item.productId) productIds.add(item.productId);
      }
    }

    const costMap: CostMap = {};
    if (productIds.size > 0) {
      const prods = await db
        .select()
        .from(products)
        .where(and(inArray(products.id, [...productIds]), isNull(products.deletedAt)));
      for (const p of prods) {
        costMap[p.id] = {
          costPrice:     Number(p.costPrice)     || 0,
          packagingCost: Number(p.packagingCost) || 0,
          insertCost:    Number(p.insertCost)    || 0,
          name:          p.name,
          price:         Number(p.price)         || 0,
        };
      }
    }

    let totalRevenue = 0, totalCogs = 0, totalPackaging = 0;
    let totalCoupons = 0, totalLoyalty = 0, totalShipping = 0;
    let totalOrders = 0;

    for (const o of allOrders) {
      const p = calcOrderProfit(o, costMap);
      totalRevenue   += p.revenue;
      totalCogs      += p.cogs;
      totalPackaging += p.packaging;
      totalCoupons   += p.couponDiscount;
      totalLoyalty   += p.loyaltyDiscount;
      totalShipping  += p.shipping;
      totalOrders++;
    }

    const totalCosts  = totalCogs + totalPackaging + totalCoupons + totalLoyalty + totalShipping;
    const netProfit   = totalRevenue - totalCosts;
    const margin      = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

    res.json({
      success: true,
      data: {
        period,
        totalOrders,
        totalRevenue,
        totalCogs,
        totalPackaging,
        totalCoupons,
        totalLoyalty,
        totalShipping,
        totalCosts,
        netProfit,
        margin,
      },
    });
  } catch (err) { next(err); }
});

// ─── GET /api/admin/accounting/products ─────────────────────────────────────

router.get("/products", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getDb();
    const { period = "month", from, to } = req.query as Record<string, string>;
    const { start, end } = periodRange(period, from, to);

    const allOrders = await db
      .select()
      .from(orders)
      .where(and(gte(orders.createdAt, start), lte(orders.createdAt, end)));

    const productIds = new Set<string>();
    for (const o of allOrders) {
      const items = Array.isArray(o.items) ? o.items : [];
      for (const item of items as any[]) {
        if (item.productId) productIds.add(item.productId);
      }
    }

    const costMap: CostMap = {};
    let allProducts: any[] = [];
    if (productIds.size > 0) {
      allProducts = await db
        .select()
        .from(products)
        .where(and(inArray(products.id, [...productIds]), isNull(products.deletedAt)));
      for (const p of allProducts) {
        costMap[p.id] = {
          costPrice:     Number(p.costPrice)     || 0,
          packagingCost: Number(p.packagingCost) || 0,
          insertCost:    Number(p.insertCost)    || 0,
          name:          p.name,
          price:         Number(p.price)         || 0,
        };
      }
    }

    const profitMap: Record<string, ProductProfit> = {};

    for (const o of allOrders) {
      const items = Array.isArray(o.items) ? o.items : [];
      const orderTotal = Number(o.total) || 1;
      const proportionalDeductions =
        (Number(o.discountTotal) || 0) +
        (Number(o.pointsDiscount) || 0) +
        (Number(o.shippingCost) || 0);

      for (const item of items as any[]) {
        const pid = item.productId;
        const qty = item.quantity || 1;
        const price = Number(item.priceAtPurchase) || 0;
        const c = costMap[pid];
        if (!c) continue;

        const lineRevenue = price * qty;
        const lineCogs    = c.costPrice * qty;
        const linePack    = (c.packagingCost + c.insertCost) * qty;
        const lineDeduct  = lineRevenue > 0 ? proportionalDeductions * (lineRevenue / orderTotal) : 0;
        const lineProfit  = lineRevenue - lineCogs - linePack - lineDeduct;

        if (!profitMap[pid]) {
          profitMap[pid] = { productId: pid, name: c.name, unitsSold: 0, revenue: 0, cogs: 0, packaging: 0, netProfit: 0, margin: 0 };
        }
        profitMap[pid].unitsSold  += qty;
        profitMap[pid].revenue    += lineRevenue;
        profitMap[pid].cogs       += lineCogs;
        profitMap[pid].packaging  += linePack;
        profitMap[pid].netProfit  += lineProfit;
      }
    }

    // recalculate margins
    const result = Object.values(profitMap).map(p => ({
      ...p,
      margin: p.revenue > 0 ? Math.round((p.netProfit / p.revenue) * 100) : 0,
    })).sort((a, b) => b.netProfit - a.netProfit);

    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// ─── GET /api/admin/accounting/orders ───────────────────────────────────────

router.get("/orders", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getDb();
    const { period = "month", from, to } = req.query as Record<string, string>;
    const { start, end } = periodRange(period, from, to);

    const allOrders = await db
      .select()
      .from(orders)
      .where(and(gte(orders.createdAt, start), lte(orders.createdAt, end)));

    const productIds = new Set<string>();
    for (const o of allOrders) {
      const items = Array.isArray(o.items) ? o.items : [];
      for (const item of items as any[]) {
        if (item.productId) productIds.add(item.productId);
      }
    }

    const costMap: CostMap = {};
    if (productIds.size > 0) {
      const prods = await db
        .select()
        .from(products)
        .where(and(inArray(products.id, [...productIds]), isNull(products.deletedAt)));
      for (const p of prods) {
        costMap[p.id] = {
          costPrice: Number(p.costPrice) || 0,
          packagingCost: Number(p.packagingCost) || 0,
          insertCost: Number(p.insertCost) || 0,
          name: p.name,
          price: Number(p.price) || 0,
        };
      }
    }

    const result = allOrders.map(o => calcOrderProfit(o, costMap));
    result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// ─── POST /api/admin/accounting/costs/:productId ─────────────────────────────

router.post("/costs/:productId", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getDb();
    const { productId } = req.params as { productId: string };
    const { costPrice, packagingCost, insertCost } = req.body as {
      costPrice: number;
      packagingCost: number;
      insertCost: number;
    };

    if (costPrice === undefined || packagingCost === undefined || insertCost === undefined) {
      res.status(400).json({ success: false, message: "costPrice, packagingCost, insertCost مطلوبة" });
      return;
    }

    const [updated] = await db
      .update(products)
      .set({
        costPrice:     String(Number(costPrice)     || 0),
        packagingCost: String(Number(packagingCost) || 0),
        insertCost:    String(Number(insertCost)    || 0),
        updatedAt:     new Date(),
      })
      .where(eq(products.id, productId))
      .returning();

    if (!updated) {
      res.status(404).json({ success: false, message: "المنتج غير موجود" });
      return;
    }

    res.json({ success: true, data: { costPrice, packagingCost, insertCost } });
  } catch (err) { next(err); }
});

// ─── POST /api/admin/accounting/competitor-check ─────────────────────────────

router.post("/competitor-check", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { productName, brand } = req.body as { productName: string; brand: string };

    if (!productName) {
      res.status(400).json({ success: false, message: "productName مطلوب" });
      return;
    }

    const token = process.env.APIFY_TOKEN;
    if (!token) {
      res.status(500).json({ success: false, message: "APIFY_TOKEN غير مضبوط في .env" });
      return;
    }

    const client = new ApifyClient({ token });
    const query = `${productName} ${brand ?? ""}`.trim();

    const run = await client.actor("apify/google-shopping-scraper").call({
      queries: query,
      countryCode: "IQ",
      maxItems: 8,
      languageCode: "ar",
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems({ limit: 8 });

    const results = (items as any[]).map((item: any) => ({
      store:    item.seller   ?? item.merchantName ?? "غير معروف",
      price:    Number(item.price?.value ?? item.price ?? 0),
      currency: item.price?.currency ?? "IQD",
      url:      item.url      ?? item.productUrl ?? "#",
      title:    item.title    ?? item.name ?? productName,
    })).filter(r => r.price > 0);

    res.json({ success: true, data: results });
  } catch (err) { next(err); }
});

export function createAccountingRouter() { return router; }
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors related to accounting.ts

- [ ] **Step 3: Commit**

```bash
git add server/routes/accounting.ts
git commit -m "feat: accounting backend — P&L summary, products, orders, cost update, Apify competitor check"
```

---

## Task 4: Register Accounting Route in routes.ts

**Files:**
- Modify: `server/routes.ts`

- [ ] **Step 1: Add import**

After line 38 (`import { createInvoiceRouter }...`), add:

```typescript
import { createAccountingRouter } from "./routes/accounting.js";
```

- [ ] **Step 2: Register route**

After line `app.use("/api/admin/invoices", createAdminInvoicesRouter());` (search for `admin/invoices`), add:

```typescript
  app.use("/api/admin/accounting", createAccountingRouter());
```

- [ ] **Step 3: Find existing admin/invoices line to place after**

Search for `createAdminInvoicesRouter` in `server/routes.ts`. Place the accounting line directly after it.

- [ ] **Step 4: Commit**

```bash
git add server/routes.ts
git commit -m "feat: register /api/admin/accounting route"
```

---

## Task 5: Create AccountingPanel Frontend Component

**Files:**
- Create: `client/src/components/admin/accounting-panel.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { addCsrfHeader } from "@/lib/csrf";
import {
  TrendingUp, TrendingDown, DollarSign, BarChart3, Package, Pencil,
} from "lucide-react";

type Period = "day" | "month" | "year";

interface Summary {
  period: string;
  totalOrders: number;
  totalRevenue: number;
  totalCogs: number;
  totalPackaging: number;
  totalCoupons: number;
  totalLoyalty: number;
  totalShipping: number;
  totalCosts: number;
  netProfit: number;
  margin: number;
}

interface ProductProfit {
  productId: string;
  name: string;
  unitsSold: number;
  revenue: number;
  cogs: number;
  packaging: number;
  netProfit: number;
  margin: number;
}

interface OrderProfit {
  orderId: string;
  orderNumber: string | null;
  customerName: string | null;
  createdAt: string;
  revenue: number;
  cogs: number;
  packaging: number;
  couponDiscount: number;
  loyaltyDiscount: number;
  shipping: number;
  netProfit: number;
  margin: number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("ar-IQ", { maximumFractionDigits: 0 }).format(n) + " د.ع";

const PERIODS: { value: Period; label: string }[] = [
  { value: "day",   label: "اليوم" },
  { value: "month", label: "هذا الشهر" },
  { value: "year",  label: "هذه السنة" },
];

export default function AccountingPanel() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [period, setPeriod] = useState<Period>("month");
  const [view, setView] = useState<"products" | "orders">("products");
  const [editProduct, setEditProduct] = useState<ProductProfit | null>(null);
  const [costs, setCosts] = useState({ costPrice: 0, packagingCost: 0, insertCost: 0 });

  const { data: summary, isLoading: loadingSum } = useQuery<Summary>({
    queryKey: ["accounting-summary", period],
    queryFn: async () => {
      const r = await fetch(`/api/admin/accounting/summary?period=${period}`, { credentials: "include" });
      const j = await r.json();
      return j.data;
    },
  });

  const { data: productRows = [], isLoading: loadingProds } = useQuery<ProductProfit[]>({
    queryKey: ["accounting-products", period],
    queryFn: async () => {
      const r = await fetch(`/api/admin/accounting/products?period=${period}`, { credentials: "include" });
      const j = await r.json();
      return j.data ?? [];
    },
  });

  const { data: orderRows = [], isLoading: loadingOrders } = useQuery<OrderProfit[]>({
    queryKey: ["accounting-orders", period],
    queryFn: async () => {
      const r = await fetch(`/api/admin/accounting/orders?period=${period}`, { credentials: "include" });
      const j = await r.json();
      return j.data ?? [];
    },
    enabled: view === "orders",
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
      qc.invalidateQueries({ queryKey: ["accounting-products"] });
      qc.invalidateQueries({ queryKey: ["accounting-summary"] });
      setEditProduct(null);
    },
    onError: () => toast({ title: "خطأ في الحفظ", variant: "destructive" }),
  });

  return (
    <div className="space-y-6 p-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">محاسب AQUAVO</h2>
        <div className="flex gap-2">
          {PERIODS.map(p => (
            <Button
              key={p.value}
              size="sm"
              variant={period === p.value ? "default" : "outline"}
              onClick={() => setPeriod(p.value)}
              className={period === p.value ? "bg-[#199bb8]" : "border-[#199bb8]/40 text-[#199bb8]"}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      {loadingSum ? (
        <div className="text-[#199bb8] text-center py-8">جاري التحميل...</div>
      ) : summary ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard
            icon={<DollarSign className="w-5 h-5" />}
            label="إجمالي الإيرادات"
            value={fmt(summary.totalRevenue)}
            color="#22c55e"
          />
          <SummaryCard
            icon={<TrendingDown className="w-5 h-5" />}
            label="إجمالي التكاليف"
            value={fmt(summary.totalCosts)}
            color="#ef4444"
          />
          <SummaryCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="صافي الربح"
            value={fmt(summary.netProfit)}
            color={summary.netProfit >= 0 ? "#199bb8" : "#ef4444"}
          />
          <SummaryCard
            icon={<BarChart3 className="w-5 h-5" />}
            label="هامش الربح"
            value={`${summary.margin}%`}
            color="#ffd700"
          />
        </div>
      ) : null}

      {/* Cost Breakdown */}
      {summary && (
        <Card className="bg-[#0a1628] border-[#199bb8]/20">
          <CardHeader>
            <CardTitle className="text-white text-sm">تفصيل التكاليف</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <CostItem label="تكلفة البضاعة"  value={fmt(summary.totalCogs)} />
              <CostItem label="التغليف والكارت" value={fmt(summary.totalPackaging)} />
              <CostItem label="كوبونات الخصم"   value={fmt(summary.totalCoupons)} />
              <CostItem label="نقاط الولاء"      value={fmt(summary.totalLoyalty)} />
              <CostItem label="تكلفة التوصيل"   value={fmt(summary.totalShipping)} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* View Tabs */}
      <div className="flex gap-2 border-b border-[#199bb8]/20 pb-2">
        <button
          className={`px-4 py-2 text-sm rounded-t ${view === "products" ? "bg-[#199bb8] text-white" : "text-[#199bb8]"}`}
          onClick={() => setView("products")}
        >
          ربحية المنتجات
        </button>
        <button
          className={`px-4 py-2 text-sm rounded-t ${view === "orders" ? "bg-[#199bb8] text-white" : "text-[#199bb8]"}`}
          onClick={() => setView("orders")}
        >
          تفصيل الطلبات
        </button>
      </div>

      {/* Products Table */}
      {view === "products" && (
        <div className="rounded-lg border border-[#199bb8]/20 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#010611] border-[#199bb8]/20">
                <TableHead className="text-[#199bb8]">المنتج</TableHead>
                <TableHead className="text-[#199bb8] text-center">مبيع</TableHead>
                <TableHead className="text-[#199bb8] text-center">إيراد</TableHead>
                <TableHead className="text-[#199bb8] text-center">تكلفة بضاعة</TableHead>
                <TableHead className="text-[#199bb8] text-center">تغليف</TableHead>
                <TableHead className="text-[#199bb8] text-center">صافي ربح</TableHead>
                <TableHead className="text-[#199bb8] text-center">هامش</TableHead>
                <TableHead className="text-[#199bb8] text-center">تكاليف</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingProds ? (
                <TableRow><TableCell colSpan={8} className="text-center text-gray-400">جاري التحميل...</TableCell></TableRow>
              ) : productRows.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-gray-400">لا توجد مبيعات في هذه الفترة</TableCell></TableRow>
              ) : productRows.map(row => (
                <TableRow key={row.productId} className="border-[#199bb8]/10 hover:bg-[#010611]/50">
                  <TableCell className="text-white font-medium max-w-[180px] truncate">{row.name}</TableCell>
                  <TableCell className="text-center text-gray-300">{row.unitsSold}</TableCell>
                  <TableCell className="text-center text-green-400">{fmt(row.revenue)}</TableCell>
                  <TableCell className="text-center text-red-400">{fmt(row.cogs)}</TableCell>
                  <TableCell className="text-center text-orange-400">{fmt(row.packaging)}</TableCell>
                  <TableCell className="text-center font-bold" style={{ color: row.netProfit >= 0 ? "#22c55e" : "#ef4444" }}>
                    {fmt(row.netProfit)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge style={{ background: row.margin >= 20 ? "#22c55e20" : "#ef444420", color: row.margin >= 20 ? "#22c55e" : "#ef4444" }}>
                      {row.margin}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-[#199bb8] hover:text-white"
                      onClick={() => {
                        setEditProduct(row);
                        setCosts({ costPrice: row.cogs / (row.unitsSold || 1), packagingCost: 0, insertCost: 0 });
                      }}
                    >
                      <Pencil className="w-3 h-3 ml-1" /> تعديل
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Orders Table */}
      {view === "orders" && (
        <div className="rounded-lg border border-[#199bb8]/20 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#010611] border-[#199bb8]/20">
                <TableHead className="text-[#199bb8]">رقم الطلب</TableHead>
                <TableHead className="text-[#199bb8]">الزبون</TableHead>
                <TableHead className="text-[#199bb8] text-center">إيراد</TableHead>
                <TableHead className="text-[#199bb8] text-center">تكلفة</TableHead>
                <TableHead className="text-[#199bb8] text-center">كوبون</TableHead>
                <TableHead className="text-[#199bb8] text-center">نقاط</TableHead>
                <TableHead className="text-[#199bb8] text-center">توصيل</TableHead>
                <TableHead className="text-[#199bb8] text-center">صافي الربح</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingOrders ? (
                <TableRow><TableCell colSpan={8} className="text-center text-gray-400">جاري التحميل...</TableCell></TableRow>
              ) : orderRows.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-gray-400">لا توجد طلبات في هذه الفترة</TableCell></TableRow>
              ) : orderRows.map(row => (
                <TableRow key={row.orderId} className="border-[#199bb8]/10 hover:bg-[#010611]/50">
                  <TableCell className="text-[#199bb8] font-mono text-xs">{row.orderNumber ?? row.orderId.slice(0, 8)}</TableCell>
                  <TableCell className="text-gray-300">{row.customerName ?? "—"}</TableCell>
                  <TableCell className="text-center text-green-400">{fmt(row.revenue)}</TableCell>
                  <TableCell className="text-center text-red-400">{fmt(row.cogs + row.packaging)}</TableCell>
                  <TableCell className="text-center text-orange-400">{row.couponDiscount > 0 ? fmt(row.couponDiscount) : "—"}</TableCell>
                  <TableCell className="text-center text-yellow-400">{row.loyaltyDiscount > 0 ? fmt(row.loyaltyDiscount) : "—"}</TableCell>
                  <TableCell className="text-center text-gray-400">{fmt(row.shipping)}</TableCell>
                  <TableCell className="text-center font-bold" style={{ color: row.netProfit >= 0 ? "#22c55e" : "#ef4444" }}>
                    {fmt(row.netProfit)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit Costs Dialog */}
      <Dialog open={!!editProduct} onOpenChange={() => setEditProduct(null)}>
        <DialogContent className="bg-[#0a1628] border-[#199bb8]/30 text-white" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-white">تكاليف: {editProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">سعر الشراء من الشركة (د.ع)</label>
              <Input
                type="number"
                value={costs.costPrice}
                onChange={e => setCosts(c => ({ ...c, costPrice: Number(e.target.value) }))}
                className="bg-[#010611] border-[#199bb8]/40 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">سعر الكارتونة/البوكس (د.ع)</label>
              <Input
                type="number"
                value={costs.packagingCost}
                onChange={e => setCosts(c => ({ ...c, packagingCost: Number(e.target.value) }))}
                className="bg-[#010611] border-[#199bb8]/40 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">سعر الكارت/المواد الداخلية (د.ع)</label>
              <Input
                type="number"
                value={costs.insertCost}
                onChange={e => setCosts(c => ({ ...c, insertCost: Number(e.target.value) }))}
                className="bg-[#010611] border-[#199bb8]/40 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => saveCosts.mutate()}
              disabled={saveCosts.isPending}
              className="bg-[#199bb8] hover:bg-[#199bb8]/80"
            >
              {saveCosts.isPending ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <Card className="bg-[#0a1628] border-[#199bb8]/20">
      <CardContent className="p-4 flex items-start gap-3">
        <div className="p-2 rounded-lg mt-1" style={{ background: color + "20", color }}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-gray-400">{label}</p>
          <p className="text-lg font-bold mt-0.5" style={{ color }}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function CostItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-gray-400 text-xs">{label}</p>
      <p className="text-red-400 font-medium mt-0.5">{value}</p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/admin/accounting-panel.tsx
git commit -m "feat: AccountingPanel — P&L dashboard with product/order profitability"
```

---

## Task 6: Create CompetitorMonitorPanel Frontend Component

**Files:**
- Create: `client/src/components/admin/competitor-monitor-panel.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { addCsrfHeader } from "@/lib/csrf";
import { ExternalLink, Search, TrendingDown, TrendingUp, Minus } from "lucide-react";

interface SimpleProduct {
  id: string;
  name: string;
  brand: string;
  price: string;
}

interface CompetitorResult {
  store: string;
  price: number;
  currency: string;
  url: string;
  title: string;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("ar-IQ", { maximumFractionDigits: 0 }).format(n) + " د.ع";

export default function CompetitorMonitorPanel() {
  const { toast } = useToast();
  const [results, setResults] = useState<Record<string, CompetitorResult[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const { data: productsData = [] } = useQuery<SimpleProduct[]>({
    queryKey: ["admin-products-simple"],
    queryFn: async () => {
      const r = await fetch("/api/admin/products?limit=200", { credentials: "include" });
      if (!r.ok) return [];
      const j = await r.json();
      const list = Array.isArray(j) ? j : (j.products ?? j.data ?? []);
      return list.map((p: any) => ({
        id:    p.id,
        name:  p.name,
        brand: p.brand,
        price: p.price,
      }));
    },
  });

  const checkCompetitors = async (product: SimpleProduct) => {
    setLoading(l => ({ ...l, [product.id]: true }));
    try {
      const r = await fetch("/api/admin/accounting/competitor-check", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...addCsrfHeader() },
        credentials: "include",
        body: JSON.stringify({ productName: product.name, brand: product.brand }),
      });
      const j = await r.json();
      if (j.success) {
        setResults(prev => ({ ...prev, [product.id]: j.data }));
      } else {
        toast({ title: "خطأ في البحث", description: j.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ في الاتصال", variant: "destructive" });
    } finally {
      setLoading(l => ({ ...l, [product.id]: false }));
    }
  };

  return (
    <div className="space-y-4 p-4" dir="rtl">
      <h2 className="text-2xl font-bold text-white">مراقبة أسعار المنافسين</h2>
      <p className="text-gray-400 text-sm">اضغط "فحص الآن" لأي منتج — Apify يبحث عن نفس المنتج عند المنافسين ويرجع الأسعار والروابط.</p>

      <div className="space-y-4">
        {productsData.map(product => {
          const myPrice = Number(product.price) || 0;
          const compResults = results[product.id] ?? [];
          const isLoading = loading[product.id] ?? false;
          const hasResults = compResults.length > 0;
          const cheapest = hasResults ? Math.min(...compResults.map(r => r.price)) : null;

          return (
            <Card key={product.id} className="bg-[#0a1628] border-[#199bb8]/20">
              <CardContent className="p-4">
                {/* Product Header */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-white font-medium">{product.name}</p>
                    <p className="text-gray-400 text-xs">{product.brand}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-gray-400">سعرك</p>
                      <p className="text-[#199bb8] font-bold">{fmt(myPrice)}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => checkCompetitors(product)}
                      disabled={isLoading}
                      className="bg-[#199bb8] hover:bg-[#199bb8]/80"
                    >
                      {isLoading ? (
                        <span className="animate-pulse">جاري البحث...</span>
                      ) : (
                        <><Search className="w-3 h-3 ml-1" /> فحص الآن</>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Status Badge */}
                {hasResults && cheapest !== null && (
                  <div className="mb-3">
                    {cheapest < myPrice ? (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                        <TrendingDown className="w-3 h-3 ml-1" />
                        منافس يبيع بـ {fmt(cheapest)} — أرخص منك بـ {fmt(myPrice - cheapest)}
                      </Badge>
                    ) : cheapest > myPrice ? (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        <TrendingUp className="w-3 h-3 ml-1" />
                        أنت الأرخص — أرخص من أقرب منافس بـ {fmt(cheapest - myPrice)}
                      </Badge>
                    ) : (
                      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                        <Minus className="w-3 h-3 ml-1" />
                        نفس السعر عند المنافسين
                      </Badge>
                    )}
                  </div>
                )}

                {/* Results Table */}
                {hasResults && (
                  <div className="rounded border border-[#199bb8]/10 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[#010611] text-[#199bb8] text-xs">
                          <th className="p-2 text-right">المتجر</th>
                          <th className="p-2 text-center">السعر</th>
                          <th className="p-2 text-center">الفرق</th>
                          <th className="p-2 text-center">رابط</th>
                        </tr>
                      </thead>
                      <tbody>
                        {compResults.map((r, i) => {
                          const diff = r.price - myPrice;
                          return (
                            <tr key={i} className="border-t border-[#199bb8]/10 hover:bg-[#010611]/40">
                              <td className="p-2 text-gray-300 max-w-[140px] truncate">{r.store}</td>
                              <td className="p-2 text-center text-white font-medium">{fmt(r.price)}</td>
                              <td className="p-2 text-center">
                                <span style={{ color: diff > 0 ? "#22c55e" : diff < 0 ? "#ef4444" : "#94a3b8" }}>
                                  {diff > 0 ? "+" : ""}{fmt(Math.abs(diff))}
                                  {diff > 0 ? " (أنت أرخص)" : diff < 0 ? " (هو أرخص)" : ""}
                                </span>
                              </td>
                              <td className="p-2 text-center">
                                <a
                                  href={r.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#199bb8] hover:text-white inline-flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3" /> فتح
                                </a>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {hasResults && compResults.length === 0 && (
                  <p className="text-gray-400 text-sm text-center py-2">ما لقينا منافسين لهذا المنتج</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/admin/competitor-monitor-panel.tsx
git commit -m "feat: CompetitorMonitorPanel — Apify competitor price search with direct links"
```

---

## Task 7: Wire Both Panels into Admin Dashboard

**Files:**
- Modify: `client/src/pages/admin-dashboard.tsx`

- [ ] **Step 1: Add imports**

After the existing imports (around line 57, after `InvoicesList`), add:

```typescript
import AccountingPanel from "@/components/admin/accounting-panel";
import CompetitorMonitorPanel from "@/components/admin/competitor-monitor-panel";
```

- [ ] **Step 2: Add TabsTrigger entries**

In the `<TabsList>` block (around lines 690–704), add these two entries after `"invoices"`:

```tsx
          <TabsTrigger value="accounting">💰 المحاسب</TabsTrigger>
          <TabsTrigger value="competitors">🔍 المنافسون</TabsTrigger>
```

- [ ] **Step 3: Add TabsContent entries**

After the `</TabsContent>` that closes the `"invoices"` tab (around line 710), add:

```tsx
        <TabsContent value="accounting" className="space-y-4">
          <AccountingPanel />
        </TabsContent>

        <TabsContent value="competitors" className="space-y-4">
          <CompetitorMonitorPanel />
        </TabsContent>
```

- [ ] **Step 4: Verify no TypeScript errors**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -20
```

Expected: no new errors.

- [ ] **Step 5: Final commit**

```bash
git add client/src/pages/admin-dashboard.tsx
git commit -m "feat: add المحاسب and مراقبة المنافسين tabs to admin dashboard"
```

---

## Task 8: Verify admin/products endpoint returns cost fields

**Files:**
- Check: `server/routes/admin.ts`

- [ ] **Step 1: Check that GET /api/admin/products returns the new cost fields**

Run the server and hit:
```
GET /api/admin/products?limit=5
```

Verify response includes `costPrice`, `packagingCost`, `insertCost` fields on each product. Since these columns are now in the Drizzle schema, they will be returned automatically by `db.select().from(products)`.

- [ ] **Step 2: Check CompetitorMonitorPanel product fetch**

The competitor panel calls `/api/admin/products?limit=200`. Verify this endpoint exists. Search in `server/routes/admin.ts` for `router.get("/products"`. If it doesn't exist, use `/api/products` instead — update the queryFn in `competitor-monitor-panel.tsx`:

```typescript
// If /api/admin/products doesn't have a limit param, use:
const r = await fetch("/api/products?limit=200", { credentials: "include" });
```

- [ ] **Step 3: Final integration test**

1. Start dev server: `npm run dev`
2. Log in as admin
3. Navigate to admin dashboard → "المحاسب" tab
4. Verify 4 summary cards load
5. Click a product row → "تعديل" → enter costs → save
6. Switch to "مراقبة المنافسون" tab
7. Click "فحص الآن" on any product
8. Verify Apify returns results with prices and links

---

## Self-Review

**Spec coverage:**
- ✅ costPrice / packagingCost / insertCost fields → Task 2
- ✅ P&L summary (revenue, all costs, net profit, margin) → Task 3 `/summary`
- ✅ Per-product profitability → Task 3 `/products`
- ✅ Per-order breakdown (coupon, loyalty, shipping) → Task 3 `/orders`
- ✅ Cost entry UI → Task 5 (Edit dialog)
- ✅ Apify competitor check with direct links → Task 3 + Task 6
- ✅ Two separate admin tabs → Task 7
- ✅ Period filter (day/month/year) → Task 5

**Type consistency:**
- `CostMap`, `OrderProfit`, `ProductProfit` defined in Task 3 and consumed only in Task 3 (backend)
- Frontend interfaces in Task 5 mirror backend response shape exactly
- `createAccountingRouter()` defined in Task 3, imported in Task 4

**No placeholders:** All steps contain actual code.
