import { z } from "zod";

export const accountingPeriodSchema = z.enum(["day", "week", "month", "year", "custom"]);
export type AccountingPeriod = z.infer<typeof accountingPeriodSchema>;

export const accountingCostInputSchema = z.object({
  costPrice: z.coerce.number().min(0),
  packagingCost: z.coerce.number().min(0),
  insertCost: z.coerce.number().min(0),
});

export const accountingCostHistoryInputSchema = accountingCostInputSchema.extend({
  effectiveFrom: z.string().min(1),
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
