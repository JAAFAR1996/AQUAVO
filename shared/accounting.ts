import { z } from "zod";

export const accountingPeriodSchema = z.enum(["day", "week", "month", "year", "custom"]);
export type AccountingPeriod = z.infer<typeof accountingPeriodSchema>;

export const accountingCostInputSchema = z.object({
  costPrice: z.coerce.number().min(0),
  packagingCost: z.coerce.number().min(0),
  insertCost: z.coerce.number().min(0),
});

// Used by POST /costs/:productId — effectiveFrom and note are optional, default to today / null
export const accountingCostUpdateSchema = accountingCostInputSchema.extend({
  effectiveFrom: z.string().min(1).optional(),
  note: z.string().max(200).trim().optional(),
});

export const accountingCostHistoryInputSchema = accountingCostInputSchema.extend({
  effectiveFrom: z.string().min(1),
  note: z.string().max(200).trim().optional(),
});

export const accountingSettlementInputSchema = z.object({
  carrier: z.string().trim().min(1),
  amount: z.coerce.number().positive(),
  notes: z.string().trim().optional(),
  orderIds: z.array(z.string().min(1)).optional(),
});

export const accountingCompletenessSchema = z.object({
  costsComplete: z.boolean(),
  missingCostLines: z.number(),
  missingProductLines: z.number(),
});

export const accountingSummarySchema = accountingCompletenessSchema.extend({
  period: z.string(),
  totalOrders: z.number(),
  deliveredCount: z.number(),
  cancelledCount: z.number(),
  rejectedCount: z.number(),
  inProgressCount: z.number(),
  rtoRate: z.number(),
  aov: z.number(),
  totalRevenue: z.number(),
  totalCogs: z.number(),
  totalPackaging: z.number(),
  totalCoupons: z.number(),
  totalLoyalty: z.number(),
  totalCosts: z.number(),
  netProfit: z.number(),
  margin: z.number(),
});

export const accountingProductProfitSchema = accountingCompletenessSchema.extend({
  productId: z.string(),
  name: z.string(),
  unitsSold: z.number(),
  revenue: z.number(),
  cogs: z.number(),
  packaging: z.number(),
  netProfit: z.number(),
  margin: z.number(),
  costPrice: z.number(),
  packagingCost: z.number(),
  insertCost: z.number(),
});

// Extended schema used by the product profitability tab — includes all products,
// not just those with sales in the period.
export const accountingProductProfitFullSchema = accountingProductProfitSchema.extend({
  slug: z.string(),
  category: z.string(),
  salePrice: z.number(),
  stock: z.number(),
  grossProfit: z.number(),
  grossMargin: z.number(),
  inventoryValueAtCost: z.number(),
  potentialRevenueFromStock: z.number(),
  potentialGrossProfitFromStock: z.number(),
  comingSoon: z.boolean(),
  recommendationLabel: z.string(),
});

export const accountingProductProfitFullResponseSchema = z.array(accountingProductProfitFullSchema);
export type AccountingProductProfitFull = z.infer<typeof accountingProductProfitFullSchema>;

export const accountingOrderItemSchema = z.object({
  productId: z.string(),
  name: z.string(),
  qty: z.number(),
  priceAtPurchase: z.number(),
});

export const accountingOrderProfitSchema = accountingCompletenessSchema.extend({
  orderId: z.string(),
  orderNumber: z.string().nullable(),
  customerName: z.string().nullable(),
  customerPhone: z.string().nullable(),
  status: z.string(),
  createdAt: z.string(),
  revenue: z.number(),
  cogs: z.number(),
  packaging: z.number(),
  couponDiscount: z.number(),
  loyaltyDiscount: z.number(),
  shipping: z.number(),
  boxCost: z.number(),
  netProfit: z.number(),
  margin: z.number(),
  items: z.array(accountingOrderItemSchema),
});

export const accountingShippingSettlementSchema = z.object({
  id: z.string(),
  carrier: z.string(),
  amount: z.coerce.number(),
  notes: z.string().nullable(),
  createdAt: z.string(),
});

export const accountingCodSummarySchema = z.object({
  totalCod: z.number(),
  totalDelivered: z.number(),
  totalInTransit: z.number(),
  totalReceived: z.number(),
  totalPending: z.number(),
  settlements: z.array(accountingShippingSettlementSchema),
});

export const accountingCostHistoryEntrySchema = z.object({
  id: z.string(),
  productId: z.string(),
  costPrice: z.coerce.number(),
  packagingCost: z.coerce.number(),
  insertCost: z.coerce.number(),
  effectiveFrom: z.string(),
  note: z.string().nullable(),
  changedBy: z.string().nullable(),
  createdAt: z.string(),
});

export const accountingCouponUsageSchema = z.object({
  couponCode: z.string(),
  usageCount: z.number(),
  totalDiscount: z.number(),
  avgDiscount: z.number(),
});

export const accountingProductsResponseSchema = z.array(accountingProductProfitSchema);
export const accountingOrdersResponseSchema = z.array(accountingOrderProfitSchema);
export const accountingCostHistoryResponseSchema = z.array(accountingCostHistoryEntrySchema);
export const accountingCouponsResponseSchema = z.array(accountingCouponUsageSchema);

export type AccountingSummary = z.infer<typeof accountingSummarySchema>;
export type AccountingProductProfit = z.infer<typeof accountingProductProfitSchema>;
export type AccountingOrderProfit = z.infer<typeof accountingOrderProfitSchema>;
export type AccountingCodSummary = z.infer<typeof accountingCodSummarySchema>;
export type AccountingCostHistoryEntry = z.infer<typeof accountingCostHistoryEntrySchema>;
export type AccountingCouponUsage = z.infer<typeof accountingCouponUsageSchema>;
export type AccountingCostUpdate = z.infer<typeof accountingCostUpdateSchema>;

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
  expenseDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "تاريخ غير صالح — استخدم صيغة YYYY-MM-DD")
    .refine(v => !isNaN(new Date(v).getTime()), "تاريخ غير صالح"),
  isRecurring: z.boolean().default(false),
  recurringPeriod: z.enum(["monthly", "weekly", "yearly"]).optional(),
});

export const expenseResponseSchema = z.object({
  id: z.string(),
  category: z.enum(EXPENSE_CATEGORIES),
  amount: z.coerce.number(),
  description: z.string().nullable(),
  expenseDate: z.string(),
  isRecurring: z.boolean(),
  recurringPeriod: z.enum(["monthly", "weekly", "yearly"]).nullable(),
  createdAt: z.string(),
});

export const expensesListResponseSchema = z.array(expenseResponseSchema);

export type ExpenseInput = z.infer<typeof expenseInputSchema>;
export type ExpenseResponse = z.infer<typeof expenseResponseSchema>;

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

export const COST_AUDIT_RISK_STATUSES = ["OK", "Needs baseline", "Missing cost", "No sales yet"] as const;
export type CostAuditRiskStatus = (typeof COST_AUDIT_RISK_STATUSES)[number];

export const accountingCostAuditEntrySchema = z.object({
  productId: z.string(),
  slug: z.string(),
  name: z.string(),
  category: z.string(),
  costPrice: z.number(),
  packagingCost: z.number(),
  insertCost: z.number(),
  firstDeliveredOrderDate: z.string().nullable(),
  deliveredOrderCount: z.number(),
  hasCostHistory: z.boolean(),
  earliestEffectiveFrom: z.string().nullable(),
  riskStatus: z.enum(COST_AUDIT_RISK_STATUSES),
});

export const accountingCostAuditResponseSchema = z.array(accountingCostAuditEntrySchema);
export type AccountingCostAuditEntry = z.infer<typeof accountingCostAuditEntrySchema>;

// ── Return Events ──────────────────────────────────────────────────────────

export const ORDER_RETURN_EVENT_TYPES = [
  "rejected_delivery",
  "failed_delivery",
  "customer_return",
  "cancelled_before_shipping",
  "cancelled_after_shipping",
  "damaged_return",
  "partial_return",
  "lost_package",
] as const;
export type OrderReturnEventType = (typeof ORDER_RETURN_EVENT_TYPES)[number];

export const ORDER_RETURN_EVENT_STATUSES = ["recorded", "verified", "disputed"] as const;
export type OrderReturnEventStatus = (typeof ORDER_RETURN_EVENT_STATUSES)[number];

export const orderReturnEventStatusSchema = z.enum(ORDER_RETURN_EVENT_STATUSES);

export const orderReturnEventStatusUpdateSchema = z.object({
  status: orderReturnEventStatusSchema,
  note: z.string().trim().max(500).optional(),
});
export type OrderReturnEventStatusUpdate = z.infer<typeof orderReturnEventStatusUpdateSchema>;

const affectedItemSchema = z.object({
  productId: z.string().min(1),
  qty: z.number().int().positive(),
  priceAtPurchase: z.number().min(0),
  cogsAtTime: z.number().min(0),
});

export const orderReturnEventInputSchema = z.object({
  orderId: z.string().min(1),
  type: z.enum(ORDER_RETURN_EVENT_TYPES),
  reason: z.string().trim().max(500).optional(),
  refundAmount: z.coerce.number().min(0).default(0),
  deliveryCostLoss: z.coerce.number().min(0).default(0),
  returnShippingCost: z.coerce.number().min(0).default(0),
  packagingLoss: z.coerce.number().min(0).default(0),
  productWriteOffAmount: z.coerce.number().min(0).default(0),
  cogsLoss: z.coerce.number().min(0).default(0),
  restocked: z.boolean().default(false),
  affectedItems: z.array(affectedItemSchema).optional(),
  note: z.string().trim().max(500).optional(),
});

export const orderReturnEventResponseSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  type: z.enum(ORDER_RETURN_EVENT_TYPES),
  reason: z.string().nullable(),
  refundAmount: z.coerce.number(),
  deliveryCostLoss: z.coerce.number(),
  returnShippingCost: z.coerce.number(),
  packagingLoss: z.coerce.number(),
  productWriteOffAmount: z.coerce.number(),
  cogsLoss: z.coerce.number(),
  restocked: z.boolean(),
  restockedAt: z.string().nullable(),
  affectedItems: z.array(affectedItemSchema).nullable(),
  status: z.enum(ORDER_RETURN_EVENT_STATUSES),
  note: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const orderReturnEventsListSchema = z.array(orderReturnEventResponseSchema);

export type OrderReturnEventInput = z.infer<typeof orderReturnEventInputSchema>;
export type OrderReturnEventResponse = z.infer<typeof orderReturnEventResponseSchema>;
