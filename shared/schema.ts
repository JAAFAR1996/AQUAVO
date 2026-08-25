import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, numeric, index, uniqueIndex, check, serial } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Product variant type for size/power options within a single product
export interface ProductVariant {
  id: string;                         // Unique variant ID (e.g., "S", "M", "L", "18W")
  label: string;                      // Display label (e.g., "30×100 سم", "18 واط")
  price: number;                      // Price for this variant
  originalPrice?: number;             // Original price for discounts
  stock: number;                      // Stock for this variant
  sku?: string;                       // Optional SKU code
  isDefault?: boolean;                // Is this the default/popular variant
  specifications?: Record<string, any>; // Variant-specific specs (tank size, etc.)
}

export interface OrderLineItem {
  productId: string;
  productName?: string;
  quantity: number;
  variantId?: string;
  variantLabel?: string;
  priceAtPurchase: number;
  lineTotal?: number;
  // Immutable cost snapshot captured at sale time (per unit). When present, the
  // accounting engine uses these directly instead of re-deriving cost from the
  // mutable product record — so editing a product's cost later cannot change a
  // completed order's profit. Absent on orders created before this was added.
  // NULL cost = UNKNOWN at sale (never treat as 0); costStatus records this.
  costPrice?: number | null;
  packagingCost?: number | null;
  insertCost?: number | null;
  // `verified_zero` = a human-confirmed cost of exactly 0. Distinct from a 0
  // that is merely the `DEFAULT '0'` an untouched product is born with — that
  // one is snapshotted as `unknown` with NULL costs (F-10).
  costStatus?: "exact" | "verified_zero" | "estimated" | "incomplete" | "unknown";
  costSource?: "product_current" | "cost_history" | "manual" | "none";
}


export const users = pgTable("users", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name"),
  phone: text("phone"),
  birthDate: timestamp("birth_date"),
  role: text("role").notNull().default("user"),
  emailVerified: boolean("email_verified").default(false),
  verificationToken: text("verification_token"),
  verificationTokenExpiresAt: timestamp("verification_token_expires_at"),
  loyaltyPoints: integer("loyalty_points").default(0),
  pendingLoyaltyPoints: integer("pending_loyalty_points").default(0),
  loyaltyTier: text("loyalty_tier").default("bronze"),
  cashbackBalance: integer("cashback_balance").default(0),
  pendingCashbackBalance: integer("pending_cashback_balance").default(0),
  totalSpent: integer("total_spent").default(0), // إجمالي المشتريات التراكمي بالدينار - لحساب مستوى العضوية
  welcomeBonusClaimed: boolean("welcome_bonus_claimed").default(false),
  aquariumProfile: jsonb("aquarium_profile").$type<{
    tankSize?: string;
    fishType?: string;
    mainProblem?: string;
    tankAge?: string;
  }>(),
  preferences: jsonb("preferences").$type<{
    tourSeen?: Record<string, boolean>; // e.g. { "/": true, "/products": true }
    theme?: "light" | "dark" | "system";
    notifications?: boolean;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
}, (table) => ({
  emailIdx: index("users_email_idx").on(table.email),
}));

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").references(() => users.id).notNull(),
  token: text("token").notNull().unique(), // Hashed token
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  brand: text("brand").notNull(),
  category: text("category").notNull(), // Temporary: kept for migration
  categoryId: text("category_id").references(() => categories.id), // New Relation
  subcategory: text("subcategory").notNull(),
  description: text("description").notNull(),
  price: numeric("price").notNull(),
  originalPrice: numeric("original_price"),
  currency: text("currency").notNull().default("IQD"),
  images: jsonb("images").notNull().$type<string[]>(),
  thumbnail: text("thumbnail").notNull(),
  rating: numeric("rating").notNull().default("0"),
  reviewCount: integer("review_count").notNull().default(0),
  stock: integer("stock").notNull().default(0),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(10),
  isNew: boolean("is_new").notNull().default(false),
  isBestSeller: boolean("is_best_seller").notNull().default(false),
  isProductOfWeek: boolean("is_product_of_week").notNull().default(false),
  specifications: jsonb("specifications").notNull().$type<Record<string, any>>(),
  // Product variants (for products with multiple sizes/options like HYGGER)
  variants: jsonb("variants").$type<ProductVariant[] | null>(),
  hasVariants: boolean("has_variants").notNull().default(false),
  // Accounting: cost fields (set by admin manually).
  // F-10: NO column default. A `DEFAULT '0'` made an untouched product born
  // holding a zero that is indistinguishable from a deliberate one, which is
  // exactly the ambiguity the *_resolution columns below exist to remove.
  // Omitting a cost must yield NULL (= UNKNOWN), never 0.
  // Requires migrations/drop_product_cost_zero_defaults.sql.
  costPrice: numeric("cost_price"),
  packagingCost: numeric("packaging_cost"),
  insertCost: numeric("insert_cost"),
  // F-5: what each cost number MEANS. 'known' (>0, real evidence) |
  // 'verified_zero' (=0, human-confirmed, requires costResolutionNote) |
  // 'unresolved' (UNKNOWN — accounting treats the value as NULL, never as 0).
  // NULL is read as 'unresolved'. Requires migrations/add_product_cost_resolution.sql
  // to be applied BEFORE this code is deployed.
  costPriceResolution: text("cost_price_resolution"),
  packagingCostResolution: text("packaging_cost_resolution"),
  insertCostResolution: text("insert_cost_resolution"),
  costResolutionNote: text("cost_resolution_note"),
  costResolutionBy: text("cost_resolution_by"),
  costResolutionAt: timestamp("cost_resolution_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
}, (table) => ({
  priceCheck: check("price_check", sql`${table.price} >= 0`),
  stockCheck: check("stock_check", sql`${table.stock} >= 0`),
  // Optimized Indexing
  slugIdx: index("products_slug_idx").on(table.slug),
  categoryIdx: index("products_category_idx").on(table.category), // Keeping legacy for now

  // New optimizations
  categoryIdIdx: index("products_category_id_idx").on(table.categoryId),
  isNewIdx: index("products_is_new_idx").on(table.isNew),
  isBestSellerIdx: index("products_is_best_seller_idx").on(table.isBestSeller),

  createdAtIdx: index("products_created_at_idx").on(table.createdAt),
  ratingIdx: index("products_rating_idx").on(table.rating),
  deletedAtIdx: index("products_deleted_at_idx").on(table.deletedAt),
  brandIdx: index("products_brand_idx").on(table.brand),
  priceIdx: index("products_price_idx").on(table.price),
  // Composite indexes for the most common filter patterns (deletedAt IS NULL + filter column)
  categoryDeletedIdx: index("products_category_deleted_idx").on(table.category, table.deletedAt),
  brandDeletedIdx: index("products_brand_deleted_idx").on(table.brand, table.deletedAt),
  createdAtDeletedIdx: index("products_created_at_deleted_idx").on(table.createdAt, table.deletedAt),
  bestSellerDeletedIdx: index("products_best_seller_deleted_idx").on(table.isBestSeller, table.deletedAt),
}));

export const orders = pgTable("orders", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  orderNumber: text("order_number").unique(),
  userId: text("user_id").references(() => users.id),
  status: text("status").notNull().default("pending"),
  paymentStatus: text("payment_status").notNull().default("pending"), // pending, paid, failed, refunded
  total: numeric("total").notNull(),
  roundedTotal: numeric("rounded_total"), // المبلغ بعد التقريب لأقرب 250 دينار
  shippingCost: numeric("shipping_cost").notNull().default("0"),
  couponId: text("coupon_id"),
  discountTotal: numeric("discount_total").default("0"),
  pointsUsed: integer("points_used").default(0), // نقاط الولاء المستخدمة
  cashbackUsed: integer("cashback_used").default(0), // نقاط الباقي المستخدمة
  pointsDiscount: numeric("points_discount").default("0"), // قيمة الخصم من النقاط بالدينار
  pointsEarned: integer("points_earned").default(0), // نقاط الولاء المكتسبة من هذا الطلب
  roundingCashback: integer("rounding_cashback").default(0), // نقاط الباقي من التقريب
  // Stronger Typing for JSONB
  items: jsonb("items").notNull().$type<OrderLineItem[]>(),
  shippingAddress: jsonb("shipping_address").$type<{ addressLine1: string; city: string; country: string; }>(),
  // Customer info (for guest orders or quick access)
  customerName: text("customer_name"),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone"),
  bonusPrize: jsonb("bonus_prize").$type<{
    type: string;
    value: number;
    label: string;
    couponId?: string;
  }>(),
  bonusClaimedAt: timestamp("bonus_claimed_at"),
  carrier: text("carrier"),
  codReceived: boolean("cod_received").default(false),
  boxCost: numeric("box_cost").default("0"),
  // Order origin: 'website' (default) | 'whatsapp' (created from a manual WhatsApp invoice)
  source: text("source").default("website"),
  // Manual financial inclusion override: null=auto (use status), true=force include, false=force exclude
  financiallyCounted: boolean("financially_counted"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("orders_user_id_idx").on(table.userId),
  createdAtIdx: index("orders_created_at_idx").on(table.createdAt),
  statusIdx: index("orders_status_idx").on(table.status),
  sourceIdx: index("orders_source_idx").on(table.source),
}));

/**
 * @deprecated LEGACY — ARCHIVED 2026-07-28.
 *
 * Operational carrier-payment log that under-records real cash. It is NOT a
 * financial source of truth and has NO runtime reader left: the accountant path
 * and the AI finance auditor both read `cashSettlements` (status='reconciled').
 *
 * The table is moved to `archive.shipping_settlements` by
 * migrations/isolate_legacy_shipping_settlements.sql and is excluded from
 * `drizzle.config.ts` tablesFilter so `db:push` cannot recreate it in `public`.
 * The definition is kept only so the archived rows remain typed for audit.
 * DO NOT query it from application code.
 */
export const shippingSettlements = pgTable("shipping_settlements", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  carrier: text("carrier").notNull(),
  amount: numeric("amount").notNull(),
  notes: text("notes"),
  // Which specific orders this settlement covers — enables COD reconciliation.
  coveredOrderIds: jsonb("covered_order_ids"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * CANONICAL completed carrier cash settlement.
 *
 * This — not `shipping_settlements` — is the source of truth for money actually
 * settled with a carrier. `shipping_settlements` is a legacy operational log and
 * under-records; reading it produced a phantom outstanding balance.
 *
 * The invariant every reconciled row satisfies:
 *     gross_amount = fees_amount + net_amount
 * so the carrier's fee is money it KEEPS, never money it still holds for us.
 */
/**
 * CANONICAL carrier cash. The integrity constraints below are NOT aspirational:
 * they are transcribed verbatim from the live production database via
 * `pg_get_constraintdef`, read-only, on 2026-07-28.
 *
 * SCHEMA DRIFT, corrected here. This file previously declared none of them,
 * which made the table look unprotected. An adversarial review read this file,
 * concluded that duplicate settlements and broken gross/fees/net arithmetic
 * were both possible, and a migration was written to "add" protection that had
 * existed in production all along — and in a WEAKER form (unique scoped to
 * carrier instead of global; the arithmetic check NOT VALID instead of
 * validated). That migration was withdrawn. The lesson is recorded because the
 * failure mode was not the missing constraint, it was trusting this file as a
 * description of the database.
 *
 * Keep these declarations byte-faithful to production. `schema-contract.test.ts`
 * fails if any of them is removed or weakened.
 */
export const cashSettlements = pgTable("cash_settlements", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  /**
   * UNIQUE GLOBALLY — not per carrier. Production constraint
   * `cash_settlements_settlement_number_key`: UNIQUE (settlement_number).
   * Prevents a re-entered carrier statement from inflating recorded collections.
   */
  settlementNumber: text("settlement_number").notNull().unique(),
  carrier: text("carrier").notNull(),
  /** Only `reconciled` rows count as completed cash. */
  status: text("status").notNull().default("draft"),
  /** Total collected from customers, before the carrier's fee. */
  grossAmount: numeric("gross_amount").notNull().default("0"),
  /** The carrier's own fee — deducted, never a receivable. */
  feesAmount: numeric("fees_amount").notNull().default("0"),
  /** Cash actually received by AQUAVO. */
  netAmount: numeric("net_amount").notNull().default("0"),
  currency: text("currency").notNull().default("IQD"),
  receivedAt: timestamp("received_at", { withTimezone: true }),
  bankReference: text("bank_reference"),
  evidence: jsonb("evidence").notNull().default(sql`'{}'::jsonb`),
  notes: text("notes"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  /**
   * `cash_settlements_net_formula_check` — VALIDATED, applies to EVERY row
   * regardless of status. Algebraically identical to gross = fees + net.
   * A row breaking it cannot exist, so a "carrier receivable" derived from
   * gross - fees - net can never be an artefact of a corrupt document.
   */
  netFormula: check("cash_settlements_net_formula_check",
    sql`${table.netAmount} = ${table.grossAmount} - ${table.feesAmount}`),
  /** `cash_settlements_amount_check` — no negative money. VALIDATED. */
  amountsNonNegative: check("cash_settlements_amount_check",
    sql`${table.grossAmount} >= 0 AND ${table.feesAmount} >= 0 AND ${table.netAmount} >= 0`),
  /**
   * `cash_settlements_status_check` — VALIDATED. Note the vocabulary is wider
   * than the two states the accounting engine cares about: only `reconciled`
   * is counted as completed cash.
   */
  statusVocabulary: check("cash_settlements_status_check",
    sql`${table.status} IN ('draft', 'received', 'reconciled', 'closed', 'rejected')`),
}));

/**
 * Effective-dated cost versions. Append-only: a cost change writes a NEW row,
 * it never edits an old one (mission §11 "قواعد كلفة المنتج").
 *
 * Cost columns are NULLABLE and carry no DEFAULT — see
 * migrations/fix_product_cost_history_nullable.sql. Before that fix they were
 * `NOT NULL DEFAULT '0'`, which made a genuinely-zero historical cost
 * indistinguishable from an unrecorded one (Red Team M-6). NULL means "not
 * recorded"; a stored 0 means zero ONLY when its resolution says verified_zero.
 */
export const productCostHistory = pgTable("product_cost_history", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: text("product_id").references(() => products.id).notNull(),
  costPrice: numeric("cost_price"),
  packagingCost: numeric("packaging_cost"),
  insertCost: numeric("insert_cost"),
  costPriceResolution: text("cost_price_resolution"),        // known|verified_zero|unresolved
  packagingCostResolution: text("packaging_cost_resolution"),
  insertCostResolution: text("insert_cost_resolution"),
  costResolutionNote: text("cost_resolution_note"),
  effectiveFrom: timestamp("effective_from").notNull(),
  // Evidence chain — a cost version with no evidence can never support an
  // `exact` snapshot on a sale line.
  purchaseLotId: text("purchase_lot_id"),
  evidenceIds: jsonb("evidence_ids"),
  approvedBy: text("approved_by"),
  approvedAt: timestamp("approved_at"),
  reason: text("reason"),
  note: text("note"),
  changedBy: text("changed_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  productIdIdx: index("pch_product_id_idx").on(table.productId),
  effectiveFromIdx: index("pch_effective_from_idx").on(table.effectiveFrom),
}));

/**
 * DEPLOYMENT-COMPATIBLE PROJECTION for `product_cost_history`.
 *
 * Same reasoning as `orderItemsPreMigrationColumns`: the resolution/evidence
 * columns are declared above, but fix_product_cost_history_nullable.sql has not
 * been applied to production. Any read path that must work on both schema
 * versions selects through this projection.
 */
export const productCostHistoryPreMigrationColumns = {
  id: productCostHistory.id,
  productId: productCostHistory.productId,
  costPrice: productCostHistory.costPrice,
  packagingCost: productCostHistory.packagingCost,
  insertCost: productCostHistory.insertCost,
  effectiveFrom: productCostHistory.effectiveFrom,
  note: productCostHistory.note,
  changedBy: productCostHistory.changedBy,
  createdAt: productCostHistory.createdAt,
} as const;

export const expenses = pgTable("expenses", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  category: text("category").notNull(),
  // valid: rent, salary, marketing, shipping_cost, utilities, other
  amount: numeric("amount").notNull(),
  description: text("description"),
  expenseDate: timestamp("expense_date").notNull(),
  isRecurring: boolean("is_recurring").notNull().default(false),
  recurringPeriod: text("recurring_period"),
  // valid: monthly, weekly, yearly — only when isRecurring = true
  // Soft-delete: expenses are never hard-deleted (preserves period integrity).
  deletedAt: timestamp("deleted_at"),
  deletedBy: text("deleted_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  categoryIdx: index("expenses_category_idx").on(table.category),
  expenseDateIdx: index("expenses_expense_date_idx").on(table.expenseDate),
}));

export const insertExpenseSchema = createInsertSchema(expenses);

export const reviews = pgTable("reviews", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: text("product_id").references(() => products.id).notNull(),
  userId: text("user_id").references(() => users.id),
  rating: integer("rating").notNull(),
  title: text("title"),
  comment: text("comment"),
  images: jsonb("images").$type<string[]>(),
  videoUrl: text("video_url"),
  status: text("status").notNull().default("approved"),
  ipAddress: text("ip_address"),
  helpfulCount: integer("helpful_count").default(0),
  verifiedPurchase: boolean("verified_purchase").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  productIdx: index("reviews_product_id_idx").on(table.productId),
  userIdIdx: index("reviews_user_id_idx").on(table.userId),
  statusIdx: index("reviews_status_idx").on(table.status),
  createdAtIndex: index("reviews_created_at_idx").on(table.createdAt),
}));

// Review ratings for tracking helpful votes
export const reviewRatings = pgTable("review_ratings", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  reviewId: text("review_id").references(() => reviews.id).notNull(),
  userId: text("user_id").references(() => users.id),
  ipAddress: text("ip_address"),
  isHelpful: boolean("is_helpful").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Sessions table for persistent session storage
export const sessions = pgTable("sessions", {
  sid: text("sid").primaryKey(),
  sess: jsonb("sess").notNull().$type<any>(),
  expire: timestamp("expire").notNull(),
}, (table) => ({
  expireIdx: index("sessions_expire_idx").on(table.expire),
}));

// Discounts table for product discounts
export const discounts = pgTable("discounts", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: text("product_id").references(() => products.id).notNull(),
  type: text("type").notNull(), // percentage, fixed
  value: numeric("value").notNull(),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Audit logs for tracking admin actions
export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").references(() => users.id).notNull(),
  action: text("action").notNull(), // create, update, delete
  entityType: text("entity_type").notNull(), // product, order, user
  entityId: text("entity_id").notNull(),
  changes: jsonb("changes").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const coupons = pgTable("coupons", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").unique().notNull(),
  type: text("discount_type").notNull(), // percentage, fixed, free_shipping
  value: numeric("discount_value").notNull(),
  minOrderAmount: numeric("min_order_amount"),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").default(0),
  maxUsesPerUser: integer("max_uses_per_user").default(1),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").default(true),
  description: text("description"),
  userId: text("user_id").references(() => users.id), // For user-specific coupons
  createdAt: timestamp("created_at").defaultNow(),
});

export const cartItems = pgTable("cart_items", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").references(() => users.id).notNull(),
  productId: text("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull().default(1),
  // Variant info — stored to preserve correct price per size/option
  variantPrice: numeric("variant_price"),   // سعر الخيار المحدد (مثل: 48,400 لحجم 35×35)
  variantLabel: text("variant_label"),       // اسم الخيار (مثل: "40×23×25 سم")
  variantId: text("variant_id"),             // معرّف الخيار (مثل: "small")
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userProductIdx: index("cart_items_user_product_idx").on(table.userId, table.productId),
}));

export const favorites = pgTable("favorites", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").references(() => users.id).notNull(),
  productId: text("product_id").references(() => products.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // Ensure user can't favorite the same product twice
  userProductIdx: index("favorites_user_product_idx").on(table.userId, table.productId),
}));

export const fishSpecies = pgTable("fish_species", {
  id: text("id").primaryKey(),
  commonName: text("common_name").notNull(),
  arabicName: text("arabic_name").notNull(),
  scientificName: text("scientific_name").notNull(),
  family: text("family"),
  origin: text("origin"),
  minSize: numeric("min_size"),
  maxSize: numeric("max_size"),
  lifespan: integer("lifespan"),
  temperament: text("temperament"), // peaceful, semi-aggressive, aggressive
  careLevel: text("care_level"), // beginner, intermediate, advanced
  minTankSize: integer("min_tank_size"),
  waterParameters: jsonb("water_parameters").notNull().$type<{
    tempMin: number;
    tempMax: number;
    phMin: number;
    phMax: number;
    hardness: string;
  }>(),
  diet: jsonb("diet").$type<string[]>(),
  breeding: jsonb("breeding").$type<any>(), // Can be string or BreedingInfo object
  schooling: boolean("schooling").default(false),
  minimumGroup: integer("minimum_group").default(1),
  compatibility: jsonb("compatibility").$type<{
    goodWith: string[];
    avoidWith: string[];
  }>(),
  description: text("description").notNull(),
  careTips: jsonb("care_tips").$type<string[]>(),
  image: text("image"),
  category: text("category").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Gallery Submissions for Community Creations
export const gallerySubmissions = pgTable("gallery_submissions", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").references(() => users.id), // Optional: allow guest submissions too?
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone"),
  imageUrl: text("image_url").notNull(),
  tankSize: text("tank_size"),
  description: text("description"),
  likes: integer("likes").default(0),
  isWinner: boolean("is_winner").default(false),
  winnerMonth: text("winner_month"),
  prize: text("prize"),
  couponCode: text("coupon_code"), // The generated coupon code for the winner
  hasSeenCelebration: boolean("has_seen_celebration").default(false), // To trigger the animation once
  isApproved: boolean("is_approved").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  isApprovedIdx: index("gallery_submissions_is_approved_idx").on(table.isApproved),
}));

// Gallery votes (to prevent multiple votes from same IP/User)
export const galleryVotes = pgTable("gallery_votes", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  galleryId: text("gallery_id").references(() => gallerySubmissions.id).notNull(),
  userId: text("user_id"), // Optional
  ipAddress: text("ip_address").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  voteIdx: index("gallery_votes_idx").on(table.galleryId, table.ipAddress),
}));

// --- Normalized Tables (Refactor) ---

export const categories = pgTable("categories", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(), // The English key/slug
  displayName: text("display_name").notNull(), // Arabic or default display name
  description: text("description"),
  slug: text("slug").unique(),
  imageUrl: text("image_url"),
  parentId: text("parent_id"), // Self-reference will be added in relations
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const orderItems = pgTable("order_items_relational", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: text("order_id").references(() => orders.id).notNull(),
  productId: text("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull(),
  priceAtPurchase: numeric("price_at_purchase").notNull(), // Snapshot of price
  totalPrice: numeric("total_price").notNull(),
  // Immutable per-unit cost snapshot captured at sale time (mirrors the JSONB
  // orders.items snapshot). NULLABLE — NULL means cost was UNKNOWN at sale, never 0.
  unitCostPrice: numeric("unit_cost_price"),
  unitPackagingCost: numeric("unit_packaging_cost"),
  unitInsertCost: numeric("unit_insert_cost"),
  costSnapshotStatus: text("cost_snapshot_status"),       // exact|estimated|incomplete|unknown
  costSnapshotSource: text("cost_snapshot_source"),       // product_current|cost_history|manual|none
  costSnapshotConfidence: text("cost_snapshot_confidence"),// high|medium|low (NULL when unknown)
  costSnapshotVersion: integer("cost_snapshot_version"),
  costSnapshotAt: timestamp("cost_snapshot_at"),
  // Immutable per-unit SALE PRICE snapshot — mission §11. `priceAtPurchase`
  // above records WHAT was charged; these record where that figure came from
  // and when it was frozen, so a historical order can be proven not to have
  // been recomputed from today's catalogue.
  // NULLABLE — NULL means "never snapshotted" (the 182 historical lines).
  // Never backfilled from products.price.
  unitSalePriceSnapshot: numeric("unit_sale_price_snapshot"),
  discountSnapshot: numeric("discount_snapshot"),
  finalUnitSalePriceSnapshot: numeric("final_unit_sale_price_snapshot"),
  salePriceSnapshotAt: timestamp("sale_price_snapshot_at"),
  salePriceSource: text("sale_price_source"),             // product_current|price_history|manual|none
  metadata: jsonb("metadata"), // For variants like size, color
}, (table) => ({
  productIdIdx: index("order_items_product_id_idx").on(table.productId),
  orderIdIdx: index("order_items_order_id_idx").on(table.orderId),
}));

/**
 * DEPLOYMENT-COMPATIBLE PROJECTION for `order_items_relational`.
 *
 * Drizzle's bare `db.select().from(orderItems)` emits every column named in the
 * schema above. The sale-price snapshot columns are declared here but the
 * migration that creates them (add_order_item_sale_price_snapshot.sql) has NOT
 * been applied to production. A bare select would therefore compile a query
 * against columns the live database does not have, and fail on deploy — before
 * the migration ever runs.
 *
 * Use this projection in any read path that must work on BOTH schema versions.
 * Once the migration is applied and verified in production, callers can be
 * widened deliberately, one at a time.
 */
export const orderItemsPreMigrationColumns = {
  id: orderItems.id,
  orderId: orderItems.orderId,
  productId: orderItems.productId,
  quantity: orderItems.quantity,
  priceAtPurchase: orderItems.priceAtPurchase,
  totalPrice: orderItems.totalPrice,
  unitCostPrice: orderItems.unitCostPrice,
  unitPackagingCost: orderItems.unitPackagingCost,
  unitInsertCost: orderItems.unitInsertCost,
  costSnapshotStatus: orderItems.costSnapshotStatus,
  costSnapshotSource: orderItems.costSnapshotSource,
  costSnapshotConfidence: orderItems.costSnapshotConfidence,
  costSnapshotVersion: orderItems.costSnapshotVersion,
  costSnapshotAt: orderItems.costSnapshotAt,
  metadata: orderItems.metadata,
} as const;

export const payments = pgTable("payments", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: text("order_id").references(() => orders.id).unique().notNull(), // One-to-One
  amount: numeric("amount").notNull(),
  currency: text("currency").default("IQD"),
  method: text("method").notNull(), // cod/cash_on_delivery (legacy) or alqaseh (online hosted checkout)
  status: text("status").notNull().default("pending"), // pending, completed, failed, refunded
  transactionId: text("transaction_id"),
  providerResponse: jsonb("provider_response"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const translations = pgTable("translations", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: text("entity_type").notNull(), // product, category, etc.
  entityId: text("entity_id").notNull(),
  field: text("field").notNull(), // name, description
  language: text("language").notNull(), // en, ar, ku
  value: text("value").notNull(),
});

export const userAddresses = pgTable("user_addresses", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").references(() => users.id).notNull(),
  label: text("label"),
  addressLine1: text("address_line1").notNull(),
  city: text("city").notNull(),
  country: text("country").default("Iraq"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCategorySchema = createInsertSchema(categories);
export const insertOrderItemSchema = createInsertSchema(orderItems);
export const insertPaymentSchema = createInsertSchema(payments);
export const insertTranslationSchema = createInsertSchema(translations);

// --- Relations Definitions ---

export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
  reviews: many(reviews),
  cartItems: many(cartItems),
  favorites: many(favorites),
  auditLogs: many(auditLogs),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  // We will map category string to category table later if needed, 
  // currently product.category is just a string column.
  // Future: categoryRef: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  reviews: many(reviews),
  orderItems: many(orderItems),
  cartItems: many(cartItems),
  favorites: many(favorites),
  discounts: many(discounts),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "parent_child",
  }),
  children: many(categories, { relationName: "parent_child" }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  items: many(orderItems),
  payment: one(payments, {
    fields: [orders.id],
    references: [payments.orderId],
  }),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  product: one(products, {
    fields: [reviews.productId],
    references: [products.id],
  }),
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id],
  }),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  product: one(products, {
    fields: [cartItems.productId],
    references: [products.id],
  }),
  user: one(users, {
    fields: [cartItems.userId],
    references: [users.id],
  }),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  product: one(products, {
    fields: [favorites.productId],
    references: [products.id],
  }),
  user: one(users, {
    fields: [favorites.userId],
    references: [users.id],
  }),
}));

// Explicit Zod schema to avoid drizzle-zod type inference issues
export const insertUserSchema = z.object({
  email: z.string().email("Valid email is required"),
  passwordHash: z.string().min(1, "Password is required"),
  fullName: z.string().optional(),
  phone: z.string().optional(),
  role: z.enum(["user", "admin"]).optional(),
});

export const insertUserAddressSchema = createInsertSchema(userAddresses);

// Explicit Zod schema to avoid drizzle-zod type inference issues with boolean columns
export const insertProductSchema = z.object({
  id: z.string().min(1, "Product ID is required"),
  slug: z.string().min(1),
  name: z.string().min(1),
  brand: z.string().min(1),
  category: z.string().min(1),
  categoryId: z.string().optional(),
  subcategory: z.string().min(1),
  description: z.string().min(1),
  price: z.string(),
  originalPrice: z.string().optional(),
  currency: z.string().optional(),
  images: z.array(z.string()),
  thumbnail: z.string(),
  rating: z.string().optional(),
  reviewCount: z.number().optional(),
  stock: z.number().optional(),
  lowStockThreshold: z.number().optional(),
  isNew: z.boolean().optional(),
  isBestSeller: z.boolean().optional(),
  isProductOfWeek: z.boolean().optional(),
  costPrice: z.string().optional(),
  packagingCost: z.string().optional(),
  insertCost: z.string().optional(),
  variants: z.array(z.any()).nullable().optional(),
  hasVariants: z.boolean().optional(),
  specifications: z.record(z.string(), z.any()),
});
export const insertOrderSchema = createInsertSchema(orders);
// Explicit Zod schema to avoid drizzle-zod type inference issues
export const insertReviewSchema = z.object({
  productId: z.string().min(1),
  userId: z.string().optional(),
  rating: z.number().min(1).max(5),
  title: z.string().max(100).optional(),
  comment: z.string().max(2000).optional(),
  images: z.array(z.string()).max(5).optional(),
  status: z.string().optional(),
  ipAddress: z.string().optional(),
  helpfulCount: z.number().optional(),
  verifiedPurchase: z.boolean().optional(),
});
export const insertReviewRatingSchema = createInsertSchema(reviewRatings);
export const insertDiscountSchema = createInsertSchema(discounts);
export const insertAuditLogSchema = createInsertSchema(auditLogs);
export const insertCouponSchema = createInsertSchema(coupons);
export const insertCartItemSchema = createInsertSchema(cartItems);
export const insertFavoriteSchema = createInsertSchema(favorites);
export const insertFishSpeciesSchema = createInsertSchema(fishSpecies);
// Explicit Zod schema to avoid drizzle-zod type inference issues with boolean columns
export const insertGallerySubmissionSchema = z.object({
  userId: z.string().optional(),
  customerName: z.string().min(1),
  customerPhone: z.string().optional(),
  imageUrl: z.string().min(1),
  tankSize: z.string().optional(),
  description: z.string().optional(),
  couponCode: z.string().optional(),
  hasSeenCelebration: z.boolean().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type ReviewRating = typeof reviewRatings.$inferSelect;
export type Discount = typeof discounts.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type Coupon = typeof coupons.$inferSelect;
export type CartItem = typeof cartItems.$inferSelect;
export type Favorite = typeof favorites.$inferSelect;
export type FishSpecies = typeof fishSpecies.$inferSelect;
export type GallerySubmission = typeof gallerySubmissions.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Translation = typeof translations.$inferSelect;
export type UserAddress = typeof userAddresses.$inferSelect;
export type InsertUserAddress = z.infer<typeof insertUserAddressSchema>;

// Gallery Prizes table for monthly prizes
export const galleryPrizes = pgTable("gallery_prizes", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  month: text("month").notNull().unique(), // Format: "2025-01" or "كانون الثاني 2025"
  prize: text("prize").notNull(),
  discountCode: text("discount_code"),
  discountPercentage: integer("discount_percentage"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertGalleryPrizeSchema = createInsertSchema(galleryPrizes);
export type GalleryPrize = typeof galleryPrizes.$inferSelect;

// Newsletter Subscriptions
export const newsletterSubscriptions = pgTable("newsletter_subscriptions", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Explicit Zod schema to avoid drizzle-zod type inference issues
export const insertNewsletterSubscriptionSchema = z.object({
  email: z.string().email("Valid email is required"),
});

export type NewsletterSubscription = typeof newsletterSubscriptions.$inferSelect;
export type InsertNewsletterSubscription = z.infer<typeof insertNewsletterSubscriptionSchema>;

// Email Logs - Track all sent emails
export const emailLogs = pgTable("email_logs", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  emailType: text("email_type").notNull(), // 'welcome', 'discount', 'password_reset'
  recipientEmail: text("recipient_email").notNull(),
  productId: text("product_id").references(() => products.id), // For discount emails
  productName: text("product_name"),
  discountPercentage: integer("discount_percentage"),
  status: text("status").notNull().default("sent"), // 'sent', 'failed'
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  emailTypeIdx: index("email_logs_email_type_idx").on(table.emailType),
  recipientIdx: index("email_logs_recipient_idx").on(table.recipientEmail),
  createdAtIdx: index("email_logs_created_at_idx").on(table.createdAt),
}));

export const insertEmailLogSchema = z.object({
  emailType: z.enum(["welcome", "discount", "password_reset"]),
  recipientEmail: z.string().email(),
  productId: z.string().optional(),
  productName: z.string().optional(),
  discountPercentage: z.number().optional(),
  status: z.enum(["sent", "failed"]).optional(),
  errorMessage: z.string().optional(),
});

export type EmailLog = typeof emailLogs.$inferSelect;
export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;

// Journey Plans - for aquarium setup wizard persistence
export const journeyPlans = pgTable("journey_plans", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),

  // User reference (optional for guests)
  userId: text("user_id").references(() => users.id),
  sessionId: text("session_id"), // For guest users

  // Plan data
  tankSize: text("tank_size"),
  tankType: text("tank_type"),
  location: jsonb("location").$type<string[]>(),
  filterType: text("filter_type"),
  heaterWattage: integer("heater_wattage"),
  lightingType: text("lighting_type"),
  substrateType: text("substrate_type"),
  decorations: jsonb("decorations").$type<string[]>(),
  waterSource: text("water_source"),
  cyclingMethod: text("cycling_method"),
  fishTypes: jsonb("fish_types").$type<string[]>(),
  stockingLevel: text("stocking_level"),
  maintenancePreference: text("maintenance_preference"),

  // Progress tracking
  currentStep: integer("current_step").default(0),
  isCompleted: boolean("is_completed").default(false),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("journey_plans_user_id_idx").on(table.userId),
  sessionIdIdx: index("journey_plans_session_id_idx").on(table.sessionId),
}));

export const insertJourneyPlanSchema = createInsertSchema(journeyPlans);
export type JourneyPlan = typeof journeyPlans.$inferSelect;
export type InsertJourneyPlan = z.infer<typeof insertJourneyPlanSchema>;

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens);
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;

// Store Settings
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Setting = typeof settings.$inferSelect;
export const insertSettingSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});
export type InsertSetting = z.infer<typeof insertSettingSchema>;

// ========================================
// Referral System (نظام دعوة الأصدقاء)
// ========================================

// Referral Codes - أكواد الدعوة الفريدة لكل مستخدم
export const referralCodes = pgTable("referral_codes", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(), // كود فريد مثل "AHMED123"
  userId: text("user_id").references(() => users.id).notNull(),
  isActive: boolean("is_active").default(true),
  totalReferrals: integer("total_referrals").default(0), // عدد الإحالات الناجحة
  totalPointsEarned: integer("total_points_earned").default(0), // إجمالي النقاط المكتسبة
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  codeIdx: index("referral_codes_code_idx").on(table.code),
  userIdIdx: index("referral_codes_user_id_idx").on(table.userId),
}));

// Referrals - تتبع الإحالات
export const referrals = pgTable("referrals", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerUserId: text("referrer_user_id").references(() => users.id).notNull(), // المُحيل
  referredUserId: text("referred_user_id").references(() => users.id).notNull(), // الصديق المُحال
  referralCodeId: text("referral_code_id").references(() => referralCodes.id).notNull(),
  status: text("status").notNull().default("pending"), // pending, registered, first_purchase, rewarded
  referralDate: timestamp("referral_date").defaultNow().notNull(), // تاريخ استخدام كود الإحالة
  signupDate: timestamp("signup_date"), // تاريخ تسجيل الصديق
  firstOrderId: text("first_order_id").references(() => orders.id), // أول طلب للصديق
  firstOrderDate: timestamp("first_order_date"), // تاريخ أول شراء
  referrerPointsAwarded: integer("referrer_points_awarded").default(0), // نقاط المُحيل (50)
  referredDiscountAwarded: boolean("referred_discount_awarded").default(false), // هل حصل الصديق على خصم 5%
  referredCouponCode: text("referred_coupon_code"), // كود الكوبون المخصص للصديق
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  referrerIdx: index("referrals_referrer_idx").on(table.referrerUserId),
  referredIdx: index("referrals_referred_idx").on(table.referredUserId),
  statusIdx: index("referrals_status_idx").on(table.status),
}));

// Relations for Referral System
export const referralCodesRelations = relations(referralCodes, ({ one, many }) => ({
  user: one(users, {
    fields: [referralCodes.userId],
    references: [users.id],
  }),
  referrals: many(referrals),
}));

export const referralsRelations = relations(referrals, ({ one }) => ({
  referrer: one(users, {
    fields: [referrals.referrerUserId],
    references: [users.id],
    relationName: "referrer",
  }),
  referred: one(users, {
    fields: [referrals.referredUserId],
    references: [users.id],
    relationName: "referred",
  }),
  referralCode: one(referralCodes, {
    fields: [referrals.referralCodeId],
    references: [referralCodes.id],
  }),
  firstOrder: one(orders, {
    fields: [referrals.firstOrderId],
    references: [orders.id],
  }),
}));

// Zod Schemas
export const insertReferralCodeSchema = z.object({
  code: z.string().min(4).max(20),
  userId: z.string().min(1),
});

export const insertReferralSchema = z.object({
  referrerUserId: z.string().min(1),
  referredUserId: z.string().min(1),
  referralCodeId: z.string().min(1),
});

// Types
export type ReferralCode = typeof referralCodes.$inferSelect;
export type InsertReferralCode = z.infer<typeof insertReferralCodeSchema>;
export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = z.infer<typeof insertReferralSchema>;

// ========================================
// Security System (نظام الأمان)
// ========================================

// Login Attempts - تسجيل محاولات الدخول
export const loginAttempts = pgTable("login_attempts", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").references(() => users.id), // null إذا كان المستخدم غير موجود
  email: text("email").notNull(), // البريد المستخدم في المحاولة
  success: boolean("success").notNull(), // هل نجحت المحاولة؟
  ipAddress: text("ip_address"), // عنوان IP
  userAgent: text("user_agent"), // معلومات المتصفح
  failureReason: text("failure_reason"), // سبب الفشل (كلمة مرور خاطئة، حساب غير موجود...)
  // F-8: timestamptz (not naked `timestamp`) — this column feeds the block
  // decision (failed-attempts-in-last-hour). A tz-less column round-trips a JS
  // Date through the driver with a local-offset skew; timestamptz stores an
  // absolute instant so the "last hour" window is correct in any server tz.
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  emailIdx: index("login_attempts_email_idx").on(table.email),
  ipIdx: index("login_attempts_ip_idx").on(table.ipAddress),
  createdAtIdx: index("login_attempts_created_at_idx").on(table.createdAt),
  successIdx: index("login_attempts_success_idx").on(table.success),
}));

// Blocked IPs - العناوين المحظورة
export const blockedIPs = pgTable("blocked_ips", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  ipAddress: text("ip_address").notNull().unique(),
  reason: text("reason").notNull(), // سبب الحظر
  failedAttempts: integer("failed_attempts").default(0), // عدد المحاولات الفاشلة
  // F-8: ALL three timestamps are timestamptz. `expires_at` is the load-bearing
  // one — a naked `timestamp` column stored the JS Date's UTC wall-clock but was
  // read back interpreted as Asia/Baghdad local (+03:00), so a row expiring
  // 09:54Z was served as 12:54Z and the block never lifted. timestamptz carries
  // an absolute instant, so writes and reads agree regardless of session tz.
  // NOTE: expiry is ALWAYS compared in-DB against now() (see security-storage),
  // never against a JS clock — server clock skew must not extend a block.
  blockedAt: timestamp("blocked_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }), // null = حظر دائم (permanent)
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  ipIdx: index("blocked_ips_ip_idx").on(table.ipAddress),
  isActiveIdx: index("blocked_ips_is_active_idx").on(table.isActive),
}));

// Zod Schemas
export const insertLoginAttemptSchema = z.object({
  userId: z.string().optional(),
  email: z.string().email(),
  success: z.boolean(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  failureReason: z.string().optional(),
});

export const insertBlockedIPSchema = z.object({
  ipAddress: z.string().min(1),
  reason: z.string().min(1),
  failedAttempts: z.number().optional(),
  expiresAt: z.date().optional(),
});

// Types
export type LoginAttempt = typeof loginAttempts.$inferSelect;
export type InsertLoginAttempt = z.infer<typeof insertLoginAttemptSchema>;
export type BlockedIP = typeof blockedIPs.$inferSelect;
export type InsertBlockedIP = z.infer<typeof insertBlockedIPSchema>;

// ==================== Analytics Tables ====================

export const pageViews = pgTable("page_views", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").references(() => users.id),
  sessionId: text("session_id"),
  pagePath: text("page_path").notNull(),
  pageTitle: text("page_title"),
  referrer: text("referrer"),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  country: text("country"),
  city: text("city"),
  deviceType: text("device_type"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  detectedSource: text("detected_source"), // 'facebook'|'instagram'|'tiktok'|'google'|'bing'|'youtube'|'twitter'|'snapchat'|'direct'|'other'
  duration: integer("duration"), // Time spent on page in seconds (updated on exit)
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("page_views_user_idx").on(table.userId),
  pathIdx: index("page_views_path_idx").on(table.pagePath),
  createdAtIdx: index("page_views_created_at_idx").on(table.createdAt),
  detectedSourceIdx: index("page_views_source_idx").on(table.detectedSource),
  sessionIdx: index("page_views_session_idx").on(table.sessionId),
}));

export const salesStats = pgTable("sales_stats", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  date: timestamp("date").notNull(),
  totalOrders: integer("total_orders").default(0),
  totalRevenue: integer("total_revenue").default(0),
  averageOrderValue: integer("average_order_value").default(0),
  newCustomers: integer("new_customers").default(0),
  returningCustomers: integer("returning_customers").default(0),
  conversionRate: numeric("conversion_rate", { precision: 5, scale: 2 }),
  topProducts: jsonb("top_products").$type<{ productId: string; sales: number }[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  dateIdx: index("sales_stats_date_idx").on(table.date),
}));

// ==================== Email Campaigns ====================

export const emailCampaigns = pgTable("email_campaigns", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  subject: text("subject").notNull(),
  content: text("content"),
  status: text("status").notNull().default("pending"),
  sentAt: timestamp("sent_at"),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("email_campaigns_user_idx").on(table.userId),
  typeIdx: index("email_campaigns_type_idx").on(table.type),
  statusIdx: index("email_campaigns_status_idx").on(table.status),
}));

// ==================== Push Notifications ====================

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").references(() => users.id),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: text("user_agent"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("push_subscriptions_user_idx").on(table.userId),
  endpointIdx: index("push_subscriptions_endpoint_idx").on(table.endpoint),
}));

// Types for new tables
export type PageView = typeof pageViews.$inferSelect;
export type SalesStats = typeof salesStats.$inferSelect;
export type EmailCampaign = typeof emailCampaigns.$inferSelect;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;

// ==================== AI & ML Enhancement Tables ====================

// Chat Messages - سجل المحادثات للذكاء الاصطناعي
export const chatMessages = pgTable("chat_messages", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: text("conversation_id").notNull(), // Group messages by conversation
  userId: text("user_id").references(() => users.id),
  sessionId: text("session_id"), // For anonymous users
  role: text("role").notNull(), // "user" | "assistant" | "admin" | "system"
  content: text("content").notNull(),
  metadata: jsonb("metadata").$type<{
    confidence?: number;
    escalationScore?: number;
    productsMentioned?: string[];
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  conversationIdx: index("chat_messages_conversation_idx").on(table.conversationId),
  userIdIdx: index("chat_messages_user_id_idx").on(table.userId),
  createdAtIdx: index("chat_messages_created_at_idx").on(table.createdAt),
}));

// Support Tickets - تذاكر الدعم البشري
export const supportTickets = pgTable("support_tickets", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: text("conversation_id").notNull(),
  userId: text("user_id").references(() => users.id),
  customerName: text("customer_name"),
  customerEmail: text("customer_email"),
  status: text("status").notNull().default("open"), // open, assigned, in_progress, resolved, closed
  priority: text("priority").default("medium"), // low, medium, high, urgent
  assignedToUserId: text("assigned_to_user_id").references(() => users.id),
  category: text("category"), // product_question, complaint, technical, other
  escalationReason: text("escalation_reason"), // frustrated, requested_human, low_confidence, complex_query
  aiConfidence: numeric("ai_confidence"), // AI's confidence before escalation
  sentiment: text("sentiment"), // positive, neutral, negative, very_negative
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  statusIdx: index("support_tickets_status_idx").on(table.status),
  assignedToIdx: index("support_tickets_assigned_to_idx").on(table.assignedToUserId),
  createdAtIdx: index("support_tickets_created_at_idx").on(table.createdAt),
}));

// Product Interactions - تتبع تفاعلات المستخدم للتعلم الآلي
export const productInteractions = pgTable("product_interactions", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").references(() => users.id),
  sessionId: text("session_id"), // For anonymous users
  productId: text("product_id").references(() => products.id).notNull(),
  interactionType: text("interaction_type").notNull(), // view, cart_add, cart_remove, favorite, purchase, review
  duration: integer("duration"), // Time spent viewing (seconds)
  scrollDepth: integer("scroll_depth"), // Percentage scrolled
  metadata: jsonb("metadata").$type<{ from?: string; searchQuery?: string }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userProductIdx: index("product_interactions_user_product_idx").on(table.userId, table.productId),
  productIdx: index("product_interactions_product_idx").on(table.productId),
  typeIdx: index("product_interactions_type_idx").on(table.interactionType),
  createdAtIdx: index("product_interactions_created_at_idx").on(table.createdAt),
}));

// Product Embeddings - للبحث الدلالي بالذكاء الاصطناعي
export const productEmbeddings = pgTable("product_embeddings", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: text("product_id").references(() => products.id).unique().notNull(),
  embedding: jsonb("embedding").notNull().$type<number[]>(), // Vector embedding from Gemini
  model: text("model").notNull().default("gemini-1.5-flash"), // Track model version
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  productIdIdx: index("product_embeddings_product_id_idx").on(table.productId),
}));

// Price History - تاريخ الأسعار للتحليل الزمني
export const priceHistory = pgTable("price_history", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: text("product_id").references(() => products.id).notNull(),
  price: numeric("price").notNull(),
  stock: integer("stock"),
  salesVelocity: numeric("sales_velocity"), // Units sold per day
  demandScore: numeric("demand_score"), // Calculated demand metric
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  productCreatedIdx: index("price_history_product_created_idx").on(table.productId, table.createdAt),
}));

// Search Queries - ذكاء البحث وتتبع الاستعلامات
export const searchQueries = pgTable("search_queries", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").references(() => users.id),
  sessionId: text("session_id"),
  query: text("query").notNull(),
  resultsCount: integer("results_count"),
  clickedProductId: text("clicked_product_id").references(() => products.id),
  clickPosition: integer("click_position"), // Which result was clicked (1-based)
  noResultsFound: boolean("no_results_found").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  queryIdx: index("search_queries_query_idx").on(table.query),
  createdAtIdx: index("search_queries_created_at_idx").on(table.createdAt),
}));

// ==================== Customer Profiles - ملفات العملاء للذكاء الاصطناعي ====================

export const customerProfiles = pgTable("customer_profiles", {
  userId: text("user_id").primaryKey().references(() => users.id),
  preferredCategories: jsonb("preferred_categories").$type<string[]>(),
  preferredBrands: jsonb("preferred_brands").$type<string[]>(),
  priceRange: jsonb("price_range").$type<{ min: number, max: number }>(),
  interests: jsonb("interests").$type<string[]>(),
  averageOrderValue: numeric("average_order_value"),
  purchaseFrequency: text("purchase_frequency"),
  totalPurchases: integer("total_purchases").default(0),
  aiSummary: text("ai_summary"),
  aiNotes: text("ai_notes"),
  sentimentScore: numeric("sentiment_score"),
  engagementLevel: text("engagement_level"),
  lastViewedProducts: jsonb("last_viewed_products").$type<string[]>(),
  lastSearchQueries: jsonb("last_search_queries").$type<string[]>(),
  lastInteractionAt: timestamp("last_interaction_at"),
  lastAnalyzedAt: timestamp("last_analyzed_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  engagementIdx: index("customer_profiles_engagement_idx").on(table.engagementLevel),
  expiresAtIdx: index("customer_profiles_expires_at_idx").on(table.expiresAt),
}));

// ==================== Advanced AI Features Tables ====================

// 1. Image Analyses - تحليل الصور بالذكاء الاصطناعي
export const imageAnalyses = pgTable("image_analyses", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").references(() => users.id),
  sessionId: text("session_id"), // For anonymous users
  imageUrl: text("image_url").notNull(),
  analysisType: text("analysis_type").notNull(), // fish, tank, problem, health
  aiAnalysis: jsonb("ai_analysis").$type<{
    detected: string[];
    confidence: number;
    suggestions: string[];
    details?: Record<string, any>;
  }>(),
  recommendedProducts: jsonb("recommended_products").$type<string[]>(),
  processingTimeMs: integer("processing_time_ms"), // Track AI performance
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("image_analyses_user_idx").on(table.userId),
  typeIdx: index("image_analyses_type_idx").on(table.analysisType),
  createdAtIdx: index("image_analyses_created_at_idx").on(table.createdAt),
}));

// 2. Sentiment History - تاريخ تحليل المشاعر
export const sentimentHistory = pgTable("sentiment_history", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").references(() => users.id),
  conversationId: text("conversation_id"),
  sessionId: text("session_id"),
  sentiment: text("sentiment").notNull(), // very_positive, positive, neutral, negative, very_negative
  score: numeric("score").notNull(), // -2 to +2
  confidence: numeric("confidence"), // 0 to 1
  message: text("message"),
  aiResponse: text("ai_response"),
  indicators: jsonb("indicators").$type<string[]>(), // What triggered the sentiment
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("sentiment_history_user_idx").on(table.userId),
  conversationIdx: index("sentiment_history_conversation_idx").on(table.conversationId),
  sentimentIdx: index("sentiment_history_sentiment_idx").on(table.sentiment),
  createdAtIdx: index("sentiment_history_created_at_idx").on(table.createdAt),
}));

// 3. Predicted Needs - احتياجات العملاء المتوقعة
export const predictedNeeds = pgTable("predicted_needs", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").references(() => users.id).notNull(),
  productId: text("product_id").references(() => products.id).notNull(),
  probability: numeric("probability").notNull(), // 0-100
  predictedDate: timestamp("predicted_date").notNull(),
  reason: text("reason"), // AI explanation
  category: text("category"), // replenishment, upgrade, seasonal, complementary
  basedOn: jsonb("based_on").$type<{
    lastPurchaseDate?: string;
    consumptionRate?: number;
    similarUsersPattern?: boolean;
  }>(),
  notified: boolean("notified").default(false),
  notifiedAt: timestamp("notified_at"),
  converted: boolean("converted").default(false), // Did user actually buy?
  convertedAt: timestamp("converted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userProductIdx: index("predicted_needs_user_product_idx").on(table.userId, table.productId),
  dateIdx: index("predicted_needs_date_idx").on(table.predictedDate),
  notifiedIdx: index("predicted_needs_notified_idx").on(table.notified),
  probabilityIdx: index("predicted_needs_probability_idx").on(table.probability),
}));

// 4. Churn Predictions - توقع فقدان العملاء
export const churnPredictions = pgTable("churn_predictions", {
  userId: text("user_id").primaryKey().references(() => users.id),
  churnScore: numeric("churn_score").notNull(), // 0-100
  riskLevel: text("risk_level").notNull(), // low, medium, high, critical
  indicators: jsonb("indicators").$type<{
    daysSinceLastPurchase: number;
    engagementDrop: number;
    negativeSentiment: boolean;
    unsubscribed: boolean;
    cartAbandonments: number;
  }>(),
  contributingFactors: jsonb("contributing_factors").$type<Array<{
    factor: string;
    weight: number;
    description: string;
  }>>(),
  actionPlan: text("action_plan"), // email_campaign, special_offer, personal_call
  actionTaken: boolean("action_taken").default(false),
  actionDate: timestamp("action_date"),
  actionResult: text("action_result"), // engaged, converted, still_churned
  lastAnalyzedAt: timestamp("last_analyzed_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  riskIdx: index("churn_predictions_risk_idx").on(table.riskLevel),
  scoreIdx: index("churn_predictions_score_idx").on(table.churnScore),
  actionTakenIdx: index("churn_predictions_action_taken_idx").on(table.actionTaken),
}));

// 5. AI Email Metrics - مقاييس البريد الإلكتروني الذكي
export const aiEmailMetrics = pgTable("ai_email_metrics", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").references(() => users.id).notNull(),
  emailType: text("email_type").notNull(), // welcome, reengagement, prediction, churn_prevention, promotional
  subject: text("subject").notNull(),
  personalizedContent: boolean("personalized_content").default(true),
  aiGenerated: boolean("ai_generated").default(false), // Was content AI-generated?
  opened: boolean("opened").default(false),
  clicked: boolean("clicked").default(false),
  converted: boolean("converted").default(false), // Resulted in purchase
  revenue: numeric("revenue").default("0"),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
  convertedAt: timestamp("converted_at"),
  campaignId: text("campaign_id"),  // Links to campaign group
  status: text("status").default("scheduled"), // scheduled, sent, failed
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userTypeIdx: index("ai_email_metrics_user_type_idx").on(table.userId, table.emailType),
  openedIdx: index("ai_email_metrics_opened_idx").on(table.opened),
  convertedIdx: index("ai_email_metrics_converted_idx").on(table.converted),
  sentAtIdx: index("ai_email_metrics_sent_at_idx").on(table.sentAt),
  campaignIdx: index("ai_email_metrics_campaign_idx").on(table.campaignId),
}));

// 6. Inventory Recommendations - توصيات المخزون الذكية
export const inventoryRecommendations = pgTable("inventory_recommendations", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: text("product_id").references(() => products.id).notNull(),
  currentStock: integer("current_stock").notNull(),
  suggestedOrderQuantity: integer("suggested_order_quantity").notNull(),
  urgency: text("urgency").notNull(), // low, medium, high, critical
  estimatedRunoutDate: timestamp("estimated_runout_date"),
  expectedDemand: jsonb("expected_demand").$type<{
    next7Days: number;
    next30Days: number;
    seasonal: boolean;
    trend: string; // increasing, stable, decreasing
  }>(),
  aiReason: text("ai_reason"),
  estimatedCost: numeric("estimated_cost"),
  potentialRevenueLoss: numeric("potential_revenue_loss"), // If we run out
  status: text("status").default("pending"), // pending, ordered, dismissed, completed
  orderedQuantity: integer("ordered_quantity"),
  orderedAt: timestamp("ordered_at"),
  dismissedReason: text("dismissed_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  productIdx: index("inventory_recommendations_product_idx").on(table.productId),
  urgencyIdx: index("inventory_recommendations_urgency_idx").on(table.urgency),
  statusIdx: index("inventory_recommendations_status_idx").on(table.status),
  runoutDateIdx: index("inventory_recommendations_runout_date_idx").on(table.estimatedRunoutDate),
}));

// 7. Auto Orders - الطلبات التلقائية (Subscriptions)
export const autoOrders = pgTable("auto_orders", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").references(() => users.id).notNull(),
  productId: text("product_id").references(() => products.id).notNull(),
  frequency: text("frequency").notNull(), // weekly, biweekly, monthly, custom_30, custom_60
  quantity: integer("quantity").notNull(),
  nextScheduledDate: timestamp("next_scheduled_date").notNull(),
  lastOrderDate: timestamp("last_order_date"),
  lastOrderId: text("last_order_id").references(() => orders.id),
  status: text("status").default("active"), // active, paused, cancelled
  aiSuggestedQuantity: integer("ai_suggested_quantity"), // AI may suggest adjustments
  aiReason: text("ai_reason"), // Why AI suggests change
  pausedUntil: timestamp("paused_until"),
  pauseReason: text("pause_reason"),
  cancelledAt: timestamp("cancelled_at"),
  cancelReason: text("cancel_reason"),
  totalOrdersPlaced: integer("total_orders_placed").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("auto_orders_user_idx").on(table.userId),
  productIdx: index("auto_orders_product_idx").on(table.productId),
  scheduledIdx: index("auto_orders_scheduled_idx").on(table.nextScheduledDate),
  statusIdx: index("auto_orders_status_idx").on(table.status),
}));

// 8. Return Requests - طلبات الإرجاع والاسترجاع
export const returnRequests = pgTable("return_requests", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: text("order_id").references(() => orders.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  productId: text("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").default(1),
  reason: text("reason").notNull(),
  reasonCategory: text("reason_category"), // damaged, wrong_item, not_satisfied, changed_mind, defective, size_issue
  detailedDescription: text("detailed_description"),
  status: text("status").default("pending"), // pending, approved, rejected, processing, completed, cancelled
  aiDecision: text("ai_decision"), // auto_approved, auto_rejected, needs_review, escalated
  aiConfidence: numeric("ai_confidence"), // 0-1
  aiReasoning: text("ai_reasoning"),
  refundAmount: numeric("refund_amount"),
  refundMethod: text("refund_method"), // original_payment, store_credit, exchange
  restockingFee: numeric("restocking_fee").default("0"),
  images: jsonb("images").$type<string[]>(), // Customer uploaded images
  adminNotes: text("admin_notes"),
  processedBy: text("processed_by").references(() => users.id),
  fraudScore: numeric("fraud_score"), // 0-100, AI fraud detection
  createdAt: timestamp("created_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
  completedAt: timestamp("completed_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  orderIdx: index("return_requests_order_idx").on(table.orderId),
  userIdx: index("return_requests_user_idx").on(table.userId),
  statusIdx: index("return_requests_status_idx").on(table.status),
  aiDecisionIdx: index("return_requests_ai_decision_idx").on(table.aiDecision),
  createdAtIdx: index("return_requests_created_at_idx").on(table.createdAt),
}));

// 9. Competitor Prices - أسعار المنافسين
export const competitorPrices = pgTable("competitor_prices", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: text("product_id").references(() => products.id).notNull(),
  competitorName: text("competitor_name").notNull(),
  competitorPrice: numeric("competitor_price").notNull(),
  competitorUrl: text("competitor_url"),
  ourPrice: numeric("our_price").notNull(),
  priceDifference: numeric("price_difference").notNull(), // absolute
  priceDifferencePercent: numeric("price_difference_percent"), // percentage
  competitive: boolean("competitive"), // Are we cheaper?
  aiSuggestedPrice: numeric("ai_suggested_price"),
  aiReason: text("ai_reason"),
  lastCheckedAt: timestamp("last_checked_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  productIdx: index("competitor_prices_product_idx").on(table.productId),
  competitorIdx: index("competitor_prices_competitor_idx").on(table.competitorName),
  lastCheckedIdx: index("competitor_prices_last_checked_idx").on(table.lastCheckedAt),
  competitiveIdx: index("competitor_prices_competitive_idx").on(table.competitive),
}));

// 10. Pricing Rules - قواعد التسعير التلقائي
export const pricingRules = pgTable("pricing_rules", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: text("product_id").references(() => products.id),
  categoryId: text("category_id").references(() => categories.id),
  strategy: text("strategy").notNull(), // match_lowest, undercut_by_5%, premium_10%, dynamic, cost_plus
  parameters: jsonb("parameters").$type<{
    percentage?: number;
    fixedAmount?: number;
    minMargin?: number;
    maxDiscount?: number;
  }>(),
  minPrice: numeric("min_price"), // Never go below this
  maxPrice: numeric("max_price"), // Never go above this
  targetMargin: numeric("target_margin"), // Desired profit margin %
  isActive: boolean("is_active").default(true),
  priority: integer("priority").default(1), // Higher = more important
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  productIdx: index("pricing_rules_product_idx").on(table.productId),
  categoryIdx: index("pricing_rules_category_idx").on(table.categoryId),
  activeIdx: index("pricing_rules_active_idx").on(table.isActive),
}));

// 11. Generated Content - المحتوى المولد بالذكاء الاصطناعي
export const generatedContent = pgTable("generated_content", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: text("product_id").references(() => products.id),
  contentType: text("content_type").notNull(), // description, seo_meta, email, social_post, blog, ad_copy
  generatedText: text("generated_text").notNull(),
  prompt: text("prompt"), // The prompt used to generate
  metadata: jsonb("metadata").$type<{
    keywords?: string[];
    tone?: string;
    length?: number;
    language?: string;
    targetAudience?: string;
  }>(),
  status: text("status").default("draft"), // draft, approved, published, archived
  qualityScore: numeric("quality_score"), // 0-100 (AI self-assessment)
  humanReviewed: boolean("human_reviewed").default(false),
  feedback: text("feedback"), // Admin feedback
  publishedAt: timestamp("published_at"),
  generatedBy: text("generated_by").default("gemini-2.5-flash"), // Track model
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  productIdx: index("generated_content_product_idx").on(table.productId),
  typeIdx: index("generated_content_type_idx").on(table.contentType),
  statusIdx: index("generated_content_status_idx").on(table.status),
  publishedAtIdx: index("generated_content_published_at_idx").on(table.publishedAt),
}));

// 12. Aquarium Designs - تصاميم الأحواض (Virtual Advisor)
export const aquariumDesigns = pgTable("aquarium_designs", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").references(() => users.id),
  sessionId: text("session_id"), // For anonymous users
  name: text("name").notNull(),
  tankSize: text("tank_size").notNull(), // "50L", "100L", "200L+", etc
  tankType: text("tank_type"), // freshwater, marine, planted, brackish
  budget: numeric("budget"),
  selectedFish: jsonb("selected_fish").$type<Array<{
    fishId: string;
    quantity: number;
    reason?: string;
  }>>(),
  selectedEquipment: jsonb("selected_equipment").$type<Array<{
    productId: string;
    quantity: number;
    category: string;
  }>>(),
  selectedDecor: jsonb("selected_decor").$type<Array<{
    productId: string;
    quantity: number;
  }>>(),
  compatibilityScore: numeric("compatibility_score"), // 0-100 (fish compatibility)
  aiNotes: text("ai_notes"), // AI advice for this design
  aiWarnings: jsonb("ai_warnings").$type<string[]>(), // Potential issues
  shoppingList: jsonb("shopping_list").$type<Array<{
    productId: string;
    quantity: number;
    reason: string;
    priority: string; // essential, recommended, optional
  }>>(),
  estimatedCost: numeric("estimated_cost"),
  status: text("status").default("draft"), // draft, finalized, ordered, completed
  imageUrl: text("image_url"), // Screenshot or render of the design
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("aquarium_designs_user_idx").on(table.userId),
  statusIdx: index("aquarium_designs_status_idx").on(table.status),
  createdAtIdx: index("aquarium_designs_created_at_idx").on(table.createdAt),
}));

// Zod Schemas for new tables

export const insertChatMessageSchema = z.object({
  conversationId: z.string().min(1),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  role: z.enum(["user", "assistant", "admin", "system"]),
  content: z.string().min(1),
  metadata: z.object({
    confidence: z.number().optional(),
    escalationScore: z.number().optional(),
    productsMentioned: z.array(z.string()).optional(),
  }).optional(),
});

export const insertSupportTicketSchema = z.object({
  conversationId: z.string().min(1),
  userId: z.string().optional(),
  customerName: z.string().optional(),
  customerEmail: z.string().email().optional(),
  status: z.enum(["open", "assigned", "in_progress", "resolved", "closed"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  assignedToUserId: z.string().optional(),
  category: z.string().optional(),
  escalationReason: z.enum(["frustrated", "requested_human", "low_confidence", "complex_query"]).optional(),
  sentiment: z.enum(["positive", "neutral", "negative", "very_negative"]).optional(),
});

export const insertProductInteractionSchema = z.object({
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  productId: z.string().min(1),
  interactionType: z.enum(["view", "cart_add", "cart_remove", "favorite", "purchase", "review"]),
  duration: z.number().optional(),
  scrollDepth: z.number().optional(),
  metadata: z.object({
    from: z.string().optional(),
    searchQuery: z.string().optional(),
  }).optional(),
});

export const insertProductEmbeddingSchema = z.object({
  productId: z.string().min(1),
  embedding: z.array(z.number()),
  model: z.string().optional(),
});

export const insertPriceHistorySchema = z.object({
  productId: z.string().min(1),
  price: z.string(),
  stock: z.number().optional(),
  salesVelocity: z.string().optional(),
  demandScore: z.string().optional(),
});

export const insertSearchQuerySchema = z.object({
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  query: z.string().min(1),
  resultsCount: z.number().optional(),
  clickedProductId: z.string().optional(),
  clickPosition: z.number().optional(),
  noResultsFound: z.boolean().optional(),
});

// Types for AI/ML enhancement tables
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type ProductInteraction = typeof productInteractions.$inferSelect;
export type InsertProductInteraction = z.infer<typeof insertProductInteractionSchema>;
export type ProductEmbedding = typeof productEmbeddings.$inferSelect;
export type InsertProductEmbedding = z.infer<typeof insertProductEmbeddingSchema>;
export type PriceHistory = typeof priceHistory.$inferSelect;
export type InsertPriceHistory = z.infer<typeof insertPriceHistorySchema>;
export type SearchQuery = typeof searchQueries.$inferSelect;
export type InsertSearchQuery = z.infer<typeof insertSearchQuerySchema>;

// Customer Profile schema and types
export const insertCustomerProfileSchema = z.object({
  userId: z.string().min(1),
  preferredCategories: z.array(z.string()).optional(),
  preferredBrands: z.array(z.string()).optional(),
  priceRange: z.object({ min: z.number(), max: z.number() }).optional(),
  interests: z.array(z.string()).optional(),
  averageOrderValue: z.string().optional(),
  purchaseFrequency: z.enum(["weekly", "monthly", "occasional"]).optional(),
  totalPurchases: z.number().optional(),
  aiSummary: z.string().optional(),
  aiNotes: z.string().optional(),
  sentimentScore: z.string().optional(),
  engagementLevel: z.enum(["low", "medium", "high"]).optional(),
  lastViewedProducts: z.array(z.string()).optional(),
  lastSearchQueries: z.array(z.string()).optional(),
});

export type CustomerProfile = typeof customerProfiles.$inferSelect;
export type InsertCustomerProfile = z.infer<typeof insertCustomerProfileSchema>;

// Advanced AI Features Schemas and Types

export const insertImageAnalysisSchema = z.object({
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  imageUrl: z.string().url(),
  analysisType: z.enum(["fish", "tank", "problem", "health"]),
  aiAnalysis: z.object({
    detected: z.array(z.string()),
    confidence: z.number().min(0).max(1),
    suggestions: z.array(z.string()),
    details: z.record(z.any()).optional(),
  }).optional(),
  recommendedProducts: z.array(z.string()).optional(),
  processingTimeMs: z.number().optional(),
});

export type ImageAnalysis = typeof imageAnalyses.$inferSelect;
export type InsertImageAnalysis = z.infer<typeof insertImageAnalysisSchema>;

export const insertSentimentHistorySchema = z.object({
  userId: z.string().optional(),
  conversationId: z.string().optional(),
  sessionId: z.string().optional(),
  sentiment: z.enum(["very_positive", "positive", "neutral", "negative", "very_negative"]),
  score: z.string(), // numeric as string
  confidence: z.string().optional(),
  message: z.string().optional(),
  aiResponse: z.string().optional(),
  indicators: z.array(z.string()).optional(),
});

export type SentimentHistory = typeof sentimentHistory.$inferSelect;
export type InsertSentimentHistory = z.infer<typeof insertSentimentHistorySchema>;

export const insertPredictedNeedSchema = z.object({
  userId: z.string().min(1),
  productId: z.string().min(1),
  probability: z.string(), // numeric as string
  predictedDate: z.string().or(z.date()),
  reason: z.string().optional(),
  category: z.enum(["replenishment", "upgrade", "seasonal", "complementary"]).optional(),
  basedOn: z.object({
    lastPurchaseDate: z.string().optional(),
    consumptionRate: z.number().optional(),
    similarUsersPattern: z.boolean().optional(),
  }).optional(),
});

export type PredictedNeed = typeof predictedNeeds.$inferSelect;
export type InsertPredictedNeed = z.infer<typeof insertPredictedNeedSchema>;

export const insertChurnPredictionSchema = z.object({
  userId: z.string().min(1),
  churnScore: z.string(), // numeric
  riskLevel: z.enum(["low", "medium", "high", "critical"]),
  indicators: z.object({
    daysSinceLastPurchase: z.number(),
    engagementDrop: z.number(),
    negativeSentiment: z.boolean(),
    unsubscribed: z.boolean(),
    cartAbandonments: z.number(),
  }).optional(),
  actionPlan: z.string().optional(),
  lastAnalyzedAt: z.string().or(z.date()),
});

export type ChurnPrediction = typeof churnPredictions.$inferSelect;
export type InsertChurnPrediction = z.infer<typeof insertChurnPredictionSchema>;

export const insertAIEmailMetricSchema = z.object({
  userId: z.string().min(1),
  emailType: z.enum(["welcome", "reengagement", "prediction", "churn_prevention", "promotional"]),
  subject: z.string().min(1),
  personalizedContent: z.boolean().optional(),
  aiGenerated: z.boolean().optional(),
  campaignId: z.string().optional(),
  status: z.enum(["scheduled", "sent", "failed"]).optional(),
});

export type AIEmailMetric = typeof aiEmailMetrics.$inferSelect;
export type InsertAIEmailMetric = z.infer<typeof insertAIEmailMetricSchema>;

export const insertInventoryRecommendationSchema = z.object({
  productId: z.string().min(1),
  currentStock: z.number(),
  suggestedOrderQuantity: z.number(),
  urgency: z.enum(["low", "medium", "high", "critical"]),
  estimatedRunoutDate: z.string().or(z.date()).optional(),
  aiReason: z.string().optional(),
});

export type InventoryRecommendation = typeof inventoryRecommendations.$inferSelect;
export type InsertInventoryRecommendation = z.infer<typeof insertInventoryRecommendationSchema>;

export const insertAutoOrderSchema = z.object({
  userId: z.string().min(1),
  productId: z.string().min(1),
  frequency: z.enum(["weekly", "biweekly", "monthly", "custom_30", "custom_60"]),
  quantity: z.number().min(1),
  nextScheduledDate: z.string().or(z.date()),
});

export type AutoOrder = typeof autoOrders.$inferSelect;
export type InsertAutoOrder = z.infer<typeof insertAutoOrderSchema>;

export const insertReturnRequestSchema = z.object({
  orderId: z.string().min(1),
  userId: z.string().min(1),
  productId: z.string().min(1),
  quantity: z.number().min(1).optional(),
  reason: z.string().min(1),
  reasonCategory: z.enum(["damaged", "wrong_item", "not_satisfied", "changed_mind", "defective", "size_issue"]).optional(),
  detailedDescription: z.string().optional(),
  images: z.array(z.string()).optional(),
});

export type ReturnRequest = typeof returnRequests.$inferSelect;
export type InsertReturnRequest = z.infer<typeof insertReturnRequestSchema>;

export const insertCompetitorPriceSchema = z.object({
  productId: z.string().min(1),
  competitorName: z.string().min(1),
  competitorPrice: z.string(), // numeric
  competitorUrl: z.string().url().optional(),
  ourPrice: z.string(), // numeric
  priceDifference: z.string(), // numeric
  lastCheckedAt: z.string().or(z.date()),
});

export type CompetitorPrice = typeof competitorPrices.$inferSelect;
export type InsertCompetitorPrice = z.infer<typeof insertCompetitorPriceSchema>;

export const insertPricingRuleSchema = z.object({
  productId: z.string().optional(),
  categoryId: z.string().optional(),
  strategy: z.enum(["match_lowest", "undercut_by_5%", "premium_10%", "dynamic", "cost_plus"]),
  parameters: z.object({
    percentage: z.number().optional(),
    fixedAmount: z.number().optional(),
    minMargin: z.number().optional(),
    maxDiscount: z.number().optional(),
  }).optional(),
  minPrice: z.string().optional(), // numeric
  maxPrice: z.string().optional(), // numeric
  targetMargin: z.string().optional(), // numeric
  isActive: z.boolean().optional(),
  priority: z.number().optional(),
});

export type PricingRule = typeof pricingRules.$inferSelect;
export type InsertPricingRule = z.infer<typeof insertPricingRuleSchema>;

export const insertGeneratedContentSchema = z.object({
  productId: z.string().optional(),
  contentType: z.enum(["description", "seo_meta", "email", "social_post", "blog", "ad_copy"]),
  generatedText: z.string().min(1),
  prompt: z.string().optional(),
  metadata: z.object({
    keywords: z.array(z.string()).optional(),
    tone: z.string().optional(),
    length: z.number().optional(),
    language: z.string().optional(),
    targetAudience: z.string().optional(),
  }).optional(),
  status: z.enum(["draft", "approved", "published", "archived"]).optional(),
  qualityScore: z.string().optional(), // numeric
  feedback: z.string().optional(),
});

export type GeneratedContent = typeof generatedContent.$inferSelect;
export type InsertGeneratedContent = z.infer<typeof insertGeneratedContentSchema>;

export const insertAquariumDesignSchema = z.object({
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  name: z.string().min(1),
  tankSize: z.string().min(1),
  tankType: z.enum(["freshwater", "marine", "planted", "brackish"]).optional(),
  budget: z.string().optional(), // numeric
  selectedFish: z.array(z.object({
    fishId: z.string(),
    quantity: z.number(),
    reason: z.string().optional(),
  })).optional(),
  selectedEquipment: z.array(z.object({
    productId: z.string(),
    quantity: z.number(),
    category: z.string(),
  })).optional(),
  selectedDecor: z.array(z.object({
    productId: z.string(),
    quantity: z.number(),
  })).optional(),
  status: z.enum(["draft", "finalized", "ordered", "completed"]).optional(),
});

export type AquariumDesign = typeof aquariumDesigns.$inferSelect;
export type InsertAquariumDesign = z.infer<typeof insertAquariumDesignSchema>;

// ============================================================
// AUTO-BLOG FEATURE TABLES
// ============================================================

// Product Views - Track which products users are viewing
export const productViews = pgTable("product_views", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: text("product_id").references(() => products.id),
  userId: text("user_id").references(() => users.id),
  sessionId: text("session_id"),
  referrer: text("referrer"), // e.g. "search_google", "social_facebook", "direct"
  viewedAt: timestamp("viewed_at").defaultNow().notNull(),
  viewDuration: integer("view_duration"), // seconds
  source: text("source"), // homepage, search, category, direct
}, (table) => ({
  productIdIdx: index("product_views_product_id_idx").on(table.productId),
  userIdIdx: index("product_views_user_id_idx").on(table.userId),
  viewedAtIdx: index("product_views_viewed_at_idx").on(table.viewedAt),
}));

export const insertProductViewSchema = createInsertSchema(productViews);
export type ProductView = typeof productViews.$inferSelect;
export type InsertProductView = typeof productViews.$inferInsert;

export const cartSessions = pgTable("cart_sessions", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").references(() => users.id),
  sessionId: text("session_id").notNull().unique(), // Unique per active browser session
  status: text("status").notNull().default("active"), // 'active', 'abandoned', 'converted'
  totalValue: integer("total_value").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCartSessionSchema = createInsertSchema(cartSessions);
export type CartSession = typeof cartSessions.$inferSelect;
export type InsertCartSession = typeof cartSessions.$inferInsert;

export const blogCategories = pgTable("blog_categories", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  iconName: text("icon_name"), // for optional UI styling
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBlogCategorySchema = createInsertSchema(blogCategories);
export type BlogCategory = typeof blogCategories.$inferSelect;
export type InsertBlogCategory = typeof blogCategories.$inferInsert;

// Blog Posts - Store auto-generated and manual blog posts
export const blogPosts = pgTable("blog_posts", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  excerpt: text("excerpt").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(),
  readTime: text("read_time"),
  author: text("author").default("شريمب 🦐"),
  imageUrl: text("image_url"),
  iconName: text("icon_name").default("Fish"),
  isPublished: boolean("is_published").default(false),
  isFeatured: boolean("is_featured").default(false),
  isAutoGenerated: boolean("is_auto_generated").default(false),
  viewCount: integer("view_count").default(0),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  slugIdx: index("blog_posts_slug_idx").on(table.slug),
  categoryIdx: index("blog_posts_category_idx").on(table.category),
  publishedAtIdx: index("blog_posts_published_at_idx").on(table.publishedAt),
  isPublishedIdx: index("blog_posts_is_published_idx").on(table.isPublished),
}));

export const insertBlogPostSchema = createInsertSchema(blogPosts);
export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = typeof blogPosts.$inferInsert;

// ========================================
// Early Access Leads (قائمة الحجز المبكر)
// ========================================
export const earlyAccessLeads = pgTable("early_access_leads", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  phone: varchar("phone", { length: 20 }).notNull().unique(), // رقم الواتساب matching DB VARCHAR(20)
  name: varchar("name", { length: 255 }), // Matching DB VARCHAR(255)
  source: varchar("source", { length: 50 }).default("landing_page"),
  status: text("status").default("pending"), // pending, contacted, converted
  notes: text("notes"), // ملاحظات للأدمن
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  contactedAt: timestamp("contacted_at"),
  convertedAt: timestamp("converted_at"),
}, (table) => ({
  phoneIdx: index("early_access_leads_phone_idx").on(table.phone),
  statusIdx: index("early_access_leads_status_idx").on(table.status),
  createdAtIdx: index("early_access_leads_created_at_idx").on(table.createdAt),
}));

export const insertEarlyAccessLeadSchema = z.object({
  phone: z.string().min(10, "رقم الهاتف مطلوب").max(20),
  name: z.string().optional(),
  source: z.string().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

export type EarlyAccessLead = typeof earlyAccessLeads.$inferSelect;
export type InsertEarlyAccessLead = z.infer<typeof insertEarlyAccessLeadSchema>;

// ========================================
// Partner Applications (برنامج شركاء المبيعات الميدانيين)
// ========================================
export const partnerApplications = pgTable("partner_applications", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  // Basic info
  fullName: varchar("full_name", { length: 255 }).notNull(),
  age: integer("age"),
  gender: varchar("gender", { length: 16 }), // male | female
  governorate: varchar("governorate", { length: 64 }),
  area: varchar("area", { length: 128 }),
  phone: varchar("phone", { length: 20 }).notNull(),
  whatsapp: varchar("whatsapp", { length: 20 }),
  socialLink: text("social_link"),
  // Field readiness
  fieldReady: varchar("field_ready", { length: 16 }), // yes | no
  weeklyHours: varchar("weekly_hours", { length: 64 }),
  transport: varchar("transport", { length: 64 }),
  weeklyVisits: varchar("weekly_visits", { length: 64 }),
  firstWeekPlaces: text("first_week_places"),
  // Experience
  salesExperience: varchar("sales_experience", { length: 16 }), // yes | no
  relationshipsDetails: text("relationships_details"),
  aquariumKnowledge: text("aquarium_knowledge"),
  // All remaining structured + free-text answers
  answers: jsonb("answers").$type<Record<string, unknown>>().default({}),
  // Auto-evaluation (suggestion only — final decision is admin's)
  systemScore: integer("system_score").default(0),
  suggestedStatus: varchar("suggested_status", { length: 24 }).default("medium"), // accepted | medium | rejected
  redFlags: jsonb("red_flags").$type<string[]>().default([]),
  // Admin workflow
  finalStatus: varchar("final_status", { length: 24 }).default("new"), // new | accepted | rejected | reviewing | contacted | trial_started
  adminNotes: text("admin_notes"),
  reviewedAt: timestamp("reviewed_at"),
  contactedAt: timestamp("contacted_at"),
}, (table) => ({
  phoneIdx: index("partner_applications_phone_idx").on(table.phone),
  statusIdx: index("partner_applications_final_status_idx").on(table.finalStatus),
  createdAtIdx: index("partner_applications_created_at_idx").on(table.createdAt),
}));

export type PartnerApplication = typeof partnerApplications.$inferSelect;

// Server-side validation for the public submission
export const partnerApplicationStatuses = [
  "new", "accepted", "rejected", "reviewing", "contacted", "trial_started",
] as const;
export type PartnerFinalStatus = (typeof partnerApplicationStatuses)[number];

// ============================================================
// AI AGENT SETTINGS - إعدادات وكلاء الذكاء الاصطناعي
// ============================================================

export const aiAgentSettings = pgTable("ai_agent_settings", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  agentName: text("agent_name").notNull().unique(), // sales, inventory, pricing, marketing, sentiment, visual
  displayName: text("display_name").notNull(), // اسم العرض بالعربي
  description: text("description"), // وصف الوكيل
  isEnabled: boolean("is_enabled").default(true),
  autoRun: boolean("auto_run").default(false), // تشغيل تلقائي
  runFrequency: text("run_frequency").default("manual"), // manual, hourly, daily, weekly
  config: jsonb("config").$type<{
    maxActionsPerDay?: number;
    priority?: number;
    fallbackMessage?: string;
    customSettings?: Record<string, any>;
  }>(),
  lastRunAt: timestamp("last_run_at"),
  lastRunStatus: text("last_run_status"), // success, failed, partial
  actionsToday: integer("actions_today").default(0),
  totalActions: integer("total_actions").default(0),
  updatedBy: text("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  agentNameIdx: index("ai_agent_settings_agent_name_idx").on(table.agentName),
  isEnabledIdx: index("ai_agent_settings_is_enabled_idx").on(table.isEnabled),
}));

export const insertAIAgentSettingSchema = z.object({
  agentName: z.enum(["sales", "inventory", "pricing", "marketing", "sentiment", "visual", "content", "aquarium"]),
  displayName: z.string().min(1),
  description: z.string().optional(),
  isEnabled: z.boolean().optional(),
  autoRun: z.boolean().optional(),
  runFrequency: z.enum(["manual", "hourly", "daily", "weekly"]).optional(),
  config: z.object({
    maxActionsPerDay: z.number().optional(),
    priority: z.number().optional(),
    fallbackMessage: z.string().optional(),
    customSettings: z.record(z.any()).optional(),
  }).optional(),
});

export const updateAIAgentSettingSchema = z.object({
  isEnabled: z.boolean().optional(),
  autoRun: z.boolean().optional(),
  runFrequency: z.enum(["manual", "hourly", "daily", "weekly"]).optional(),
  config: z.object({
    maxActionsPerDay: z.number().optional(),
    priority: z.number().optional(),
    fallbackMessage: z.string().optional(),
    customSettings: z.record(z.any()).optional(),
  }).optional(),
});

export type AIAgentSetting = typeof aiAgentSettings.$inferSelect;
export type InsertAIAgentSetting = z.infer<typeof insertAIAgentSettingSchema>;
export type UpdateAIAgentSetting = z.infer<typeof updateAIAgentSettingSchema>;

// ============================================================
// SOCIAL MEDIA CONNECTIONS - ربط حسابات السوشيال ميديا
// ============================================================

export const socialConnections = pgTable("social_connections", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").references(() => users.id).notNull(),
  platform: text("platform").notNull(), // 'facebook' | 'instagram' | 'tiktok'
  accessToken: text("access_token").notNull(), // encrypted
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at"),
  pageId: text("page_id"), // For Facebook/Instagram business pages
  accountId: text("account_id"), // Platform-specific account ID
  accountName: text("account_name"),
  accountUsername: text("account_username"),
  profileImageUrl: text("profile_image_url"),
  permissions: jsonb("permissions").$type<string[]>(), // Granted permissions
  isActive: boolean("is_active").default(true),
  lastSyncAt: timestamp("last_sync_at"),
  syncStatus: text("sync_status").default("pending"), // pending, syncing, success, failed
  syncError: text("sync_error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("social_connections_user_id_idx").on(table.userId),
  platformIdx: index("social_connections_platform_idx").on(table.platform),
  isActiveIdx: index("social_connections_is_active_idx").on(table.isActive),
}));

// Analytics Cache - تخزين مؤقت للبيانات (تجنب Rate Limits)
export const socialAnalyticsCache = pgTable("social_analytics_cache", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  connectionId: text("connection_id").references(() => socialConnections.id).notNull(),
  dataType: text("data_type").notNull(), // 'insights' | 'posts' | 'demographics' | 'best_content'
  data: jsonb("data").notNull(),
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(), // Cache expiration
}, (table) => ({
  connectionIdx: index("social_analytics_cache_connection_idx").on(table.connectionId),
  dataTypeIdx: index("social_analytics_cache_data_type_idx").on(table.dataType),
  expiresIdx: index("social_analytics_cache_expires_idx").on(table.expiresAt),
}));

// Relations
export const socialConnectionsRelations = relations(socialConnections, ({ one, many }) => ({
  user: one(users, {
    fields: [socialConnections.userId],
    references: [users.id],
  }),
  cache: many(socialAnalyticsCache),
}));

export const socialAnalyticsCacheRelations = relations(socialAnalyticsCache, ({ one }) => ({
  connection: one(socialConnections, {
    fields: [socialAnalyticsCache.connectionId],
    references: [socialConnections.id],
  }),
}));

// Zod Schemas
export const insertSocialConnectionSchema = z.object({
  userId: z.string().min(1),
  platform: z.enum(["facebook", "instagram", "tiktok"]),
  accessToken: z.string().min(1),
  refreshToken: z.string().optional(),
  tokenExpiresAt: z.date().optional(),
  pageId: z.string().optional(),
  accountId: z.string().optional(),
  accountName: z.string().optional(),
  accountUsername: z.string().optional(),
  profileImageUrl: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

export const insertSocialAnalyticsCacheSchema = z.object({
  connectionId: z.string().min(1),
  dataType: z.enum(["insights", "posts", "demographics", "best_content"]),
  data: z.any(),
  periodStart: z.date().optional(),
  periodEnd: z.date().optional(),
  expiresAt: z.date(),
});

// Types
export type SocialConnection = typeof socialConnections.$inferSelect;
export type InsertSocialConnection = z.infer<typeof insertSocialConnectionSchema>;
export type SocialAnalyticsCache = typeof socialAnalyticsCache.$inferSelect;
export type InsertSocialAnalyticsCache = z.infer<typeof insertSocialAnalyticsCacheSchema>;

// ============================================================
// AI MONITORING LOGS — تسجيل كل عمليات الذكاء الاصطناعي
// ============================================================
export const aiMonitoringLogs = pgTable("ai_monitoring_logs", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  event: text("event").notNull(),         // 'chat', 'tool_call', 'error', 'timeout', 'fallback', 'key_rotated', 'search', 'sentiment', 'embedding'
  level: text("level").notNull().default("info"), // 'info' | 'warning' | 'error' | 'critical'
  model: text("model"),                   // 'compound-beta' | 'llama-3.3-70b-versatile' | etc
  userId: text("user_id"),
  sessionId: text("session_id"),
  responseTimeMs: integer("response_time_ms"),
  success: boolean("success").notNull().default(true),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  tokenCount: integer("token_count"),
  toolsUsed: jsonb("tools_used").$type<string[]>(),
  productsFound: integer("products_found"),
  fallbackUsed: boolean("fallback_used").default(false),
  webSearchUsed: boolean("web_search_used").default(false),
  messageLength: integer("message_length"),
  details: jsonb("details").$type<Record<string, any>>(),
}, (table) => ({
  timestampIdx: index("ai_monitor_timestamp_idx").on(table.timestamp),
  levelIdx: index("ai_monitor_level_idx").on(table.level),
  eventIdx: index("ai_monitor_event_idx").on(table.event),
  userIdx: index("ai_monitor_user_idx").on(table.userId),
}));

export type AiMonitoringLog = typeof aiMonitoringLogs.$inferSelect;

// ========================================
// AI Self-Learning System (نظام التعلم الذاتي)
// ========================================

export const aiLearnings = pgTable("ai_learnings", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  type: text("type").notNull(), // 'negative_feedback' | 'self_correction' | 'pattern_learned'
  userMessage: text("user_message").notNull(),
  aiResponse: text("ai_response").notNull(),
  correctedBehavior: text("corrected_behavior"), // What the AI learned
  rule: text("rule"), // The rule extracted, injected into future prompts
  severity: text("severity").default("medium"), // 'low' | 'medium' | 'high'
  applied: boolean("applied").default(false), // Whether this learning is active in prompt
  appliedAt: timestamp("applied_at"),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
}, (table) => ({
  typeIdx: index("ai_learnings_type_idx").on(table.type),
  appliedIdx: index("ai_learnings_applied_idx").on(table.applied),
  createdAtIdx: index("ai_learnings_created_at_idx").on(table.createdAt),
}));

export type AiLearning = typeof aiLearnings.$inferSelect;

// ==================== AI Notification Log ====================

export const notificationLog = pgTable("notification_log", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(), // 'replenishment' | 'churn_prevention' | 'welcome' | 'cart_abandonment' | 'new_product' | 'seasonal_tip'
  channel: text("channel").notNull(), // 'push' | 'email'
  title: text("title").notNull(),
  body: text("body").notNull(),
  url: text("url"),
  metadata: jsonb("metadata").$type<{
    productId?: string;
    churnScore?: number;
    probability?: number;
    aiGenerated?: boolean;
    variant?: string;
  }>(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  deliveredAt: timestamp("delivered_at"),
  readAt: timestamp("read_at"),
  clickedAt: timestamp("clicked_at"),
  failedAt: timestamp("failed_at"),
  failReason: text("fail_reason"),
}, (table) => ({
  userIdx: index("notification_log_user_idx").on(table.userId),
  typeIdx: index("notification_log_type_idx").on(table.type),
  sentAtIdx: index("notification_log_sent_at_idx").on(table.sentAt),
  userSentIdx: index("notification_log_user_sent_idx").on(table.userId, table.sentAt),
}));

export type NotificationLog = typeof notificationLog.$inferSelect;
export type InsertNotificationLog = typeof notificationLog.$inferInsert;

// ==================== Diagnosis Intelligence System ====================

// Diagnosis Feedback — ملاحظات المستخدم على التشخيص
export const diagnosisFeedback = pgTable("diagnosis_feedback", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  analysisId: text("analysis_id").references(() => imageAnalyses.id).notNull(),
  userId: text("user_id").references(() => users.id),
  isCorrect: boolean("is_correct").notNull(), // هل التشخيص صحيح؟
  correctDisease: text("correct_disease"), // المرض الصحيح إذا كان التشخيص خاطئ
  notes: text("notes"), // ملاحظات إضافية
  treatmentWorked: boolean("treatment_worked"), // هل العلاج نجح؟
  rating: integer("rating"), // تقييم 1-5
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  analysisIdx: index("diagnosis_feedback_analysis_idx").on(table.analysisId),
  userIdx: index("diagnosis_feedback_user_idx").on(table.userId),
  correctIdx: index("diagnosis_feedback_correct_idx").on(table.isCorrect),
}));

// Diagnosis Cases — قاعدة الحالات المشخصة (يتعلم منها AI)
export const diagnosisCases = pgTable("diagnosis_cases", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  analysisId: text("analysis_id").references(() => imageAnalyses.id),
  disease: text("disease").notNull(), // اسم المرض الإنجليزي
  arabicName: text("arabic_name"), // الاسم العربي
  category: text("category"), // parasitic, bacterial, fungal, viral, environmental, nutritional, physical, healthy
  symptoms: jsonb("symptoms").$type<string[]>(), // الأعراض المكتشفة
  confidence: numeric("confidence"), // نسبة الثقة
  treatment: jsonb("treatment").$type<string[]>(), // العلاج المستخدم
  outcome: text("outcome"), // recovered, partially_recovered, died, unknown
  verified: boolean("verified").default(false), // هل تم التحقق من التشخيص (عبر feedback)
  speciesName: text("species_name"), // نوع السمكة
  imageUrl: text("image_url"), // رابط الصورة
  userId: text("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  diseaseIdx: index("diagnosis_cases_disease_idx").on(table.disease),
  categoryIdx: index("diagnosis_cases_category_idx").on(table.category),
  verifiedIdx: index("diagnosis_cases_verified_idx").on(table.verified),
  createdAtIdx: index("diagnosis_cases_created_at_idx").on(table.createdAt),
}));

// Zod Schemas
export const insertDiagnosisFeedbackSchema = z.object({
  analysisId: z.string().min(1),
  userId: z.string().optional(),
  isCorrect: z.boolean(),
  correctDisease: z.string().optional(),
  notes: z.string().optional(),
  treatmentWorked: z.boolean().optional(),
  rating: z.number().min(1).max(5).optional(),
});

export const insertDiagnosisCaseSchema = z.object({
  analysisId: z.string().optional(),
  disease: z.string().min(1),
  arabicName: z.string().optional(),
  category: z.string().optional(),
  symptoms: z.array(z.string()).optional(),
  confidence: z.string().optional(),
  treatment: z.array(z.string()).optional(),
  outcome: z.enum(["recovered", "partially_recovered", "died", "unknown"]).optional(),
  verified: z.boolean().optional(),
  speciesName: z.string().optional(),
  imageUrl: z.string().optional(),
  userId: z.string().optional(),
});

// Types
export type DiagnosisFeedback = typeof diagnosisFeedback.$inferSelect;
export type InsertDiagnosisFeedback = z.infer<typeof insertDiagnosisFeedbackSchema>;
export type DiagnosisCase = typeof diagnosisCases.$inferSelect;
export type InsertDiagnosisCase = z.infer<typeof insertDiagnosisCaseSchema>;

// ========================================
// Fish Patient Records (سجلات المرضى)
// ========================================

// Fish Patients — تسجيل أسماك المستخدم
export const fishPatients = pgTable("fish_patients", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(), // اسم السمكة (مثل "نيمو")
  species: text("species"), // نوع السمكة
  scientificName: text("scientific_name"),
  age: text("age"), // عمر تقريبي
  gender: text("gender"), // ذكر/أنثى/غير محدد
  tankSize: text("tank_size"), // حجم الحوض
  waterType: text("water_type"), // عذبة/مالحة
  photoUrl: text("photo_url"), // صورة السمكة (Cloudflare R2)
  notes: text("notes"), // ملاحظات عامة
  isActive: boolean("is_active").default(true), // هل السمكة لا تزال حية
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("fish_patients_user_idx").on(table.userId),
  activeIdx: index("fish_patients_active_idx").on(table.isActive),
}));

// Fish Medical Records — السجل الطبي لكل سمكة
export const fishMedicalRecords = pgTable("fish_medical_records", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  fishPatientId: text("fish_patient_id").references(() => fishPatients.id).notNull(),
  analysisId: text("analysis_id").references(() => imageAnalyses.id),
  diagnosis: text("diagnosis"), // التشخيص
  arabicDiagnosis: text("arabic_diagnosis"),
  confidence: numeric("confidence"),
  category: text("category"), // parasitic, bacterial, etc.
  symptoms: jsonb("symptoms").$type<string[]>(),
  treatment: jsonb("treatment").$type<string[]>(),
  waterParams: jsonb("water_params").$type<{
    temperature?: string;
    ph?: string;
    ammonia?: string;
    nitrite?: string;
    nitrate?: string;
  }>(),
  userNotes: text("user_notes"), // ملاحظات المالك
  outcome: text("outcome"), // recovered, worsened, stable, died
  followUpDate: timestamp("follow_up_date"), // موعد المتابعة
  followUpCompleted: boolean("follow_up_completed").default(false),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  fishIdx: index("fish_medical_records_fish_idx").on(table.fishPatientId),
  analysisIdx: index("fish_medical_records_analysis_idx").on(table.analysisId),
  followUpIdx: index("fish_medical_records_followup_idx").on(table.followUpDate),
  createdAtIdx: index("fish_medical_records_created_at_idx").on(table.createdAt),
}));

// Relations
export const fishPatientsRelations = relations(fishPatients, ({ one, many }) => ({
  user: one(users, {
    fields: [fishPatients.userId],
    references: [users.id],
  }),
  medicalRecords: many(fishMedicalRecords),
}));

export const fishMedicalRecordsRelations = relations(fishMedicalRecords, ({ one }) => ({
  fishPatient: one(fishPatients, {
    fields: [fishMedicalRecords.fishPatientId],
    references: [fishPatients.id],
  }),
  analysis: one(imageAnalyses, {
    fields: [fishMedicalRecords.analysisId],
    references: [imageAnalyses.id],
  }),
}));

// Zod Schemas
export const insertFishPatientSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1),
  species: z.string().optional(),
  scientificName: z.string().optional(),
  age: z.string().optional(),
  gender: z.string().optional(),
  tankSize: z.string().optional(),
  waterType: z.string().optional(),
  photoUrl: z.string().optional(),
  notes: z.string().optional(),
});

export const insertFishMedicalRecordSchema = z.object({
  fishPatientId: z.string().min(1),
  analysisId: z.string().optional(),
  diagnosis: z.string().optional(),
  arabicDiagnosis: z.string().optional(),
  confidence: z.string().optional(),
  category: z.string().optional(),
  symptoms: z.array(z.string()).optional(),
  treatment: z.array(z.string()).optional(),
  waterParams: z.object({
    temperature: z.string().optional(),
    ph: z.string().optional(),
    ammonia: z.string().optional(),
    nitrite: z.string().optional(),
    nitrate: z.string().optional(),
  }).optional(),
  userNotes: z.string().optional(),
  outcome: z.string().optional(),
  followUpDate: z.date().optional(),
  imageUrl: z.string().optional(),
});

// Types
export type FishPatient = typeof fishPatients.$inferSelect;
export type InsertFishPatient = z.infer<typeof insertFishPatientSchema>;
export type FishMedicalRecord = typeof fishMedicalRecords.$inferSelect;
export type InsertFishMedicalRecord = z.infer<typeof insertFishMedicalRecordSchema>;

// ========================================
// Loyalty Transactions (سجل حركات النقاط)
// ========================================

export const loyaltyTransactions = pgTable("loyalty_transactions", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(), // 'purchase_earn', 'referral_earn', 'review_earn', 'rounding_earn', 'redeem', 'tier_bonus', 'expired', 'welcome_bonus', 'quiz_earn', 'bonus_reveal', 'order_cancelled'
  pointsType: text("points_type").notNull().default("loyalty"), // 'loyalty' | 'cashback'
  status: text("status").notNull().default("approved"), // 'pending', 'approved', 'rejected', 'cancelled'
  amount: integer("amount").notNull(), // Positive = earned, Negative = spent
  balanceAfter: integer("balance_after").notNull(), // الرصيد بعد العملية
  orderId: text("order_id").references(() => orders.id), // الطلب المرتبط (إن وجد)
  description: text("description").notNull(), // وصف العملية بالعربي
  metadata: jsonb("metadata").$type<Record<string, any>>(), // بيانات إضافية
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("loyalty_tx_user_id_idx").on(table.userId),
  typeIdx: index("loyalty_tx_type_idx").on(table.type),
  orderIdIdx: index("loyalty_tx_order_id_idx").on(table.orderId),
  createdAtIdx: index("loyalty_tx_created_at_idx").on(table.createdAt),
}));

export const insertLoyaltyTransactionSchema = z.object({
  userId: z.string().min(1),
  type: z.enum(['purchase_earn', 'referral_earn', 'review_earn', 'rounding_earn', 'redeem', 'tier_bonus', 'expired', 'welcome_bonus', 'quiz_earn', 'bonus_reveal', 'order_cancelled', 'badge_earn', 'challenge_complete', 'monthly_completion', 'winback', 'ai_bonus']),
  pointsType: z.enum(['loyalty', 'cashback']).default('loyalty'),
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']).default('approved'),
  amount: z.number().int(),
  balanceAfter: z.number().int(),
  orderId: z.string().optional(),
  description: z.string().min(1),
  metadata: z.record(z.any()).optional(),
});

export type LoyaltyTransaction = typeof loyaltyTransactions.$inferSelect;
export type InsertLoyaltyTransaction = z.infer<typeof insertLoyaltyTransactionSchema>;

// ========================================
// Loyalty Coupons (كوبونات الولاء)
// ========================================

export const loyaltyCoupons = pgTable("loyalty_coupons", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(), // 'discount_pct', 'discount_fixed', 'free_shipping', 'bonus_points'
  value: jsonb("value").notNull().$type<{ amount: number; percent?: number; label: string }>(),
  minOrderAmount: integer("min_order_amount").default(0),
  maxDiscount: integer("max_discount"),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  usedOrderId: text("used_order_id").references(() => orders.id),
  source: text("source"), // 'welcome', 'bonus_reveal', 'milestone', 'winback', 'challenge'
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("loyalty_coupons_user_id_idx").on(table.userId),
  expiresAtIdx: index("loyalty_coupons_expires_at_idx").on(table.expiresAt),
  sourceIdx: index("loyalty_coupons_source_idx").on(table.source),
}));

export const insertLoyaltyCouponSchema = z.object({
  userId: z.string().min(1),
  type: z.enum(['discount_pct', 'discount_fixed', 'free_shipping', 'bonus_points']),
  value: z.object({
    amount: z.number(),
    percent: z.number().optional(),
    label: z.string(),
  }),
  minOrderAmount: z.number().int().optional(),
  maxDiscount: z.number().int().optional(),
  expiresAt: z.date(),
  source: z.string().optional(),
});

export type LoyaltyCoupon = typeof loyaltyCoupons.$inferSelect;
export type InsertLoyaltyCoupon = z.infer<typeof insertLoyaltyCouponSchema>;

// ========================================
// Badges (شارات احترافية)
// ========================================

export const badges = pgTable("badges", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").unique().notNull(),
  title: text("title").notNull(),
  description: text("description"),
  icon: text("icon").notNull(), // Lucide icon name
  pointsReward: integer("points_reward").default(0),
  criteria: jsonb("criteria").notNull().$type<{ type: string; target: number }>(),
  sortOrder: integer("sort_order").default(0),
});

export const userBadges = pgTable("user_badges", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").references(() => users.id).notNull(),
  badgeId: text("badge_id").references(() => badges.id).notNull(),
  earnedAt: timestamp("earned_at").defaultNow().notNull(),
}, (table) => ({
  userBadgeUnique: uniqueIndex("user_badges_unique_idx").on(table.userId, table.badgeId),
  userIdIdx: index("user_badges_user_id_idx").on(table.userId),
}));

export type Badge = typeof badges.$inferSelect;
export type UserBadge = typeof userBadges.$inferSelect;

// ========================================
// Monthly Challenges (تحديات شهرية)
// ========================================

export const challenges = pgTable("challenges", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  month: text("month").notNull(), // '2026-05'
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull(), // 'review', 'referral', 'cross_category'
  target: integer("target").notNull().default(1),
  rewardPoints: integer("reward_points").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  monthTypeUnique: uniqueIndex("challenges_month_type_idx").on(table.month, table.type),
}));

export const userChallenges = pgTable("user_challenges", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").references(() => users.id).notNull(),
  challengeId: text("challenge_id").references(() => challenges.id).notNull(),
  progress: integer("progress").default(0),
  completedAt: timestamp("completed_at"),
  pointsAwarded: boolean("points_awarded").default(false),
}, (table) => ({
  userChallengeUnique: uniqueIndex("user_challenges_unique_idx").on(table.userId, table.challengeId),
  userIdIdx: index("user_challenges_user_id_idx").on(table.userId),
}));

export type Challenge = typeof challenges.$inferSelect;
export type UserChallenge = typeof userChallenges.$inferSelect;

// ============================================================
// MANUAL INVOICES — فواتير واتساب اليدوية
// ============================================================

export interface ManualInvoiceItem {
  productId: string;
  variantId?: string;
  variantLabel?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  imageUrl?: string;
}

export type InvoiceStatus = 'draft' | 'sent' | 'confirmed' | 'rejected' | 'completed' | 'cancelled';

export const manualInvoices = pgTable("manual_invoices", {
  id:         text("id").primaryKey(),
  invoiceNo:  text("invoice_no").unique().notNull(),
  token:      text("token").unique().notNull(),           // رابط العميل الآمن

  // بيانات العميل
  customerName:    text("customer_name").notNull(),
  customerPhone:   text("customer_phone").notNull(),
  customerCity:    text("customer_city"),
  customerAddress: text("customer_address"),
  customerNotes:   text("customer_notes"),

  // المنتجات
  items:    jsonb("items").notNull().$type<ManualInvoiceItem[]>(),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  discount: numeric("discount", { precision: 12, scale: 2 }).notNull().default("0"),
  delivery: numeric("delivery", { precision: 12, scale: 2 }).notNull().default("0"),
  total:    numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),

  // الحالة
  status:    text("status").notNull().default("draft").$type<InvoiceStatus>(),
  createdBy: text("created_by"),
  orderId:   text("order_id"),

  // Manual financial inclusion override: null=auto, true=force include, false=force exclude
  financiallyCounted: boolean("financially_counted"),

  // التوقيتات
  createdAt:   timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  sentAt:      timestamp("sent_at",      { withTimezone: true }),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  rejectedAt:  timestamp("rejected_at",  { withTimezone: true }),
  expiresAt:   timestamp("expires_at",   { withTimezone: true }),
}, (table) => ({
  tokenIdx:     index("manual_invoices_token_idx").on(table.token),
  statusIdx:    index("manual_invoices_status_idx").on(table.status),
  createdByIdx: index("manual_invoices_created_by_idx").on(table.createdBy),
}));

export const insertManualInvoiceSchema = z.object({
  customerName:    z.string().min(1, "اسم العميل مطلوب"),
  customerPhone:   z.string().min(7, "رقم الهاتف غير صحيح"),
  customerCity:    z.string().optional(),
  customerAddress: z.string().optional(),
  customerNotes:   z.string().optional(),
  items: z.array(z.object({
    productId:    z.string().min(1),
    variantId:    z.string().optional(),
    variantLabel: z.string().optional(),
    name:         z.string().min(1),
    quantity:     z.number().int().positive(),
    unitPrice:    z.number().positive(),
    total:        z.number().positive(),
    imageUrl:     z.string().optional(),
  })).min(1, "أضف منتجاً واحداً على الأقل"),
  subtotal: z.number().min(0),
  discount: z.number().min(0).default(0),
  delivery: z.number().min(0).default(0),
  total:    z.number().positive(),
});

export type ManualInvoice = typeof manualInvoices.$inferSelect;
export type InsertManualInvoice = z.infer<typeof insertManualInvoiceSchema>;

// ==================== Finance: Return Events ====================

export const orderReturnEvents = pgTable("order_return_events", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: text("order_id").references(() => orders.id).notNull(),
  type: text("type").notNull(),
  // rejected_delivery | failed_delivery | customer_return
  // cancelled_before_shipping | cancelled_after_shipping
  // damaged_return | partial_return | lost_package
  reason: text("reason"),
  refundAmount: numeric("refund_amount").default("0"),
  deliveryCostLoss: numeric("delivery_cost_loss").default("0"),
  returnShippingCost: numeric("return_shipping_cost").default("0"),
  packagingLoss: numeric("packaging_loss").default("0"),
  // Added by migration 0046 and live in Production, but never modelled here —
  // so every select() dropped it and the additive/reclassification distinction
  // was invisible to the accounting engine.
  //   'manual'               hand-typed historical figure — a real, additive loss
  //   'fulfillment_snapshot' restates a cost already recognised at shipment —
  //                          reclassification only, must NOT be deducted again
  packagingLossSource: text("packaging_loss_source").notNull().default("manual"),
  productWriteOffAmount: numeric("product_write_off_amount").default("0"),
  cogsLoss: numeric("cogs_loss").default("0"),
  restocked: boolean("restocked").default(false),
  restockedAt: timestamp("restocked_at"),
  affectedItems: jsonb("affected_items").$type<{
    productId: string;
    qty: number;
    priceAtPurchase: number;
    cogsAtTime: number;
  }[]>(),
  status: text("status").default("recorded"),
  // recorded | verified | disputed
  note: text("note"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  orderIdx: index("order_return_events_order_idx").on(table.orderId),
  typeIdx: index("order_return_events_type_idx").on(table.type),
  statusIdx: index("order_return_events_status_idx").on(table.status),
  createdAtIdx: index("order_return_events_created_at_idx").on(table.createdAt),
}));

export type OrderReturnEvent = typeof orderReturnEvents.$inferSelect;
export type InsertOrderReturnEvent = typeof orderReturnEvents.$inferInsert;

// ==================== Finance: Groq Audit Runs ====================
// Persists every scheduled or manual AI audit run for history and monitoring.
// Findings are stored in a separate child table (financeAuditFindings).

export const financeAuditRuns = pgTable("finance_audit_runs", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  overallStatus: text("overall_status").notNull(),
  // ok | warning | critical | failed
  model: text("model").notNull(),
  summary: text("summary"),
  snapshot: jsonb("snapshot").notNull().$type<Record<string, unknown>>(),
  invariantChecks: jsonb("invariant_checks").notNull().$type<Record<string, unknown>[]>(),
  startedAt: timestamp("started_at").notNull(),
  completedAt: timestamp("completed_at").notNull(),
  errorMessage: text("error_message"),
  triggeredBy: text("triggered_by").notNull().default("scheduled"),
  // "scheduled" | "manual" | userId of admin who clicked
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  overallStatusIdx: index("far_overall_status_idx").on(table.overallStatus),
  startedAtIdx: index("far_started_at_idx").on(table.startedAt),
}));

export const financeAuditFindings = pgTable("finance_audit_findings", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  runId: text("run_id").references(() => financeAuditRuns.id).notNull(),
  severity: text("severity").notNull(),
  // low | medium | high | critical
  category: text("category").notNull(),
  title: text("title").notNull(),
  explanation: text("explanation").notNull(),
  affectedOrders: jsonb("affected_orders").$type<string[]>(),
  expectedValue: numeric("expected_value"),
  actualValue: numeric("actual_value"),
  difference: numeric("difference"),
  suggestedFix: text("suggested_fix").notNull(),
  requiresHumanApproval: boolean("requires_human_approval").notNull().default(true),
  status: text("status").notNull().default("open"),
  // open | ignored | resolved
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  runIdIdx: index("faf_run_id_idx").on(table.runId),
  severityIdx: index("faf_severity_idx").on(table.severity),
  statusIdx: index("faf_status_idx").on(table.status),
}));

export type FinanceAuditRun = typeof financeAuditRuns.$inferSelect;
export type InsertFinanceAuditRun = typeof financeAuditRuns.$inferInsert;
export type FinanceAuditFinding = typeof financeAuditFindings.$inferSelect;
export type InsertFinanceAuditFinding = typeof financeAuditFindings.$inferInsert;

// ==================== Finance: Manual Accounting Adjustments ====================
// Every manual override of a calculated or stored financial value.
// AI/automated processes may only create pending entries — humans must approve.

export const accountingManualAdjustments = pgTable("accounting_manual_adjustments", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: text("entity_type").notNull(),
  // product | order | order_item | invoice | return_event | settlement | expense | inventory | product_variant | finance_card
  entityId: text("entity_id").notNull(),
  fieldName: text("field_name").notNull(),
  oldValueJson: jsonb("old_value_json"),
  newValueJson: jsonb("new_value_json").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("pending"),
  // pending | approved | rejected | applied
  createdBy: text("created_by").references(() => users.id).notNull(),
  approvedBy: text("approved_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  approvedAt: timestamp("approved_at"),
  appliedAt: timestamp("applied_at"),
  note: text("note"),
}, (table) => ({
  entityIdx: index("ama_entity_idx").on(table.entityType, table.entityId),
  statusIdx: index("ama_status_idx").on(table.status),
  createdAtIdx: index("ama_created_at_idx").on(table.createdAt),
}));

export type AccountingManualAdjustment = typeof accountingManualAdjustments.$inferSelect;
export type InsertAccountingManualAdjustment = typeof accountingManualAdjustments.$inferInsert;

// ==================== Finance: Review Flags ====================
// System-detected anomalies queued for human review — never auto-applied.

export const accountingReviewFlags = pgTable("accounting_review_flags", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  category: text("category").notNull(),
  // product_cost | stock | source | whatsapp | delivery | return | variant | settlement | pricing
  severity: text("severity").notNull().default("medium"),
  // low | medium | high | critical
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  detectedValueJson: jsonb("detected_value_json"),
  suggestedValueJson: jsonb("suggested_value_json"),
  status: text("status").notNull().default("open"),
  // open | resolved | ignored
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: text("resolved_by").references(() => users.id),
}, (table) => ({
  entityIdx: index("arf_entity_idx").on(table.entityType, table.entityId),
  statusIdx: index("arf_status_idx").on(table.status),
  severityIdx: index("arf_severity_idx").on(table.severity),
  createdAtIdx: index("arf_created_at_idx").on(table.createdAt),
}));

export type AccountingReviewFlag = typeof accountingReviewFlags.$inferSelect;
export type InsertAccountingReviewFlag = typeof accountingReviewFlags.$inferInsert;

// ==================== Finance: Universal Audit Trail ====================
// Immutable, append-only log of EVERY financial mutation. Captures before→after
// values, who did it, and why. This is what makes the books trustworthy:
// no financial number can change without leaving a traceable record here.
// Rows are never updated or deleted.

export const accountingAuditTrail = pgTable("accounting_audit_trail", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: text("entity_type").notNull(),
  // order | expense | settlement | return_event | manual_invoice | product_cost
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(),
  // create | update | delete | status_change
  fieldName: text("field_name"),
  // boxCost | financiallyCounted | amount | status | total | ... (null for create/delete of whole row)
  oldValueJson: jsonb("old_value_json"),
  newValueJson: jsonb("new_value_json"),
  reason: text("reason"),
  // required for manual edits of existing financial figures (enforced at route level)
  performedBy: text("performed_by"),
  performedByName: text("performed_by_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  entityIdx: index("aat_entity_idx").on(table.entityType, table.entityId),
  actionIdx: index("aat_action_idx").on(table.action),
  createdAtIdx: index("aat_created_at_idx").on(table.createdAt),
}));

export type AccountingAuditTrail = typeof accountingAuditTrail.$inferSelect;
export type InsertAccountingAuditTrail = typeof accountingAuditTrail.$inferInsert;

// ==================== Finance: Period Closes (immutable snapshots) ============
// When a period (month) is "closed", its computed financials are frozen here.
// This is the authoritative record of "what the books said" for that period.
// Reconciliation later recomputes from source and flags any drift vs this snapshot.

export const accountingPeriodCloses = pgTable("accounting_period_closes", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  periodKey: text("period_key").notNull(), // "YYYY-MM"
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  // Frozen key figures (denormalized for fast listing + drift compare)
  revenue: numeric("revenue").notNull().default("0"),
  cogs: numeric("cogs").notNull().default("0"),
  grossProfit: numeric("gross_profit").notNull().default("0"),
  expensesTotal: numeric("expenses_total").notNull().default("0"),
  salesReturnDeduction: numeric("sales_return_deduction").notNull().default("0"),
  actualReturnLoss: numeric("actual_return_loss").notNull().default("0"),
  finalNetProfit: numeric("final_net_profit").notNull().default("0"),
  deliveredOrders: integer("delivered_orders").notNull().default(0),
  // Full snapshot for audit/forensics
  snapshotJson: jsonb("snapshot_json"),
  status: text("status").notNull().default("closed"), // closed | reopened
  closedBy: text("closed_by"),
  closedByName: text("closed_by_name"),
  closedAt: timestamp("closed_at").defaultNow().notNull(),
  reopenedBy: text("reopened_by"),
  reopenedReason: text("reopened_reason"),
  reopenedAt: timestamp("reopened_at"),
}, (table) => ({
  periodKeyIdx: uniqueIndex("apc_period_key_idx").on(table.periodKey),
  statusIdx: index("apc_status_idx").on(table.status),
}));

export type AccountingPeriodClose = typeof accountingPeriodCloses.$inferSelect;
export type InsertAccountingPeriodClose = typeof accountingPeriodCloses.$inferInsert;

// Social Interactions Tracking for Auto-Responses
export const socialInteractions = pgTable('social_interactions', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  platform: text('platform').notNull(), // instagram, facebook
  mediaId: text('media_id').notNull(),
  commentId: text('comment_id').notNull().unique(),
  username: text('username').notNull(),
  keywordMatched: text('keyword_matched').notNull(),
  dmSent: boolean('dm_sent').default(false),
  replySent: boolean('reply_sent').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  commentIdIdx: uniqueIndex('social_interactions_comment_id_idx').on(table.commentId),
  mediaIdIdx: index('social_interactions_media_id_idx').on(table.mediaId),
}));

export const insertSocialInteractionSchema = createInsertSchema(socialInteractions);
export type SocialInteraction = typeof socialInteractions.$inferSelect;

// ─────────────────────────────────────────────────────────────────────────────
// Per-order fulfillment-cost system (additive). Mirrors add_fulfillment_costing.sql.
// Money columns are NULLABLE — NULL means UNKNOWN (never 0). Snapshots immutable.
// Many fulfillment EVENTS per order; stock derived from an immutable movement ledger.
// ─────────────────────────────────────────────────────────────────────────────

export const fulfillmentMaterials = pgTable("fulfillment_materials", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  name: text("name").notNull(),
  category: text("category"),
  costComponentType: text("cost_component_type").notNull().default("aquavo_fulfillment_material"),
  unit: text("unit"),
  // Mirror of the single active APPROVED material_cost_records row. A DB trigger
  // rejects any state where these three disagree with that record.
  currentUnitCost: numeric("current_unit_cost"),        // current approved standard cost; NULL = unknown
  currentCostPurchaseId: text("current_cost_purchase_id"),
  currentCostRecordId: text("current_cost_record_id"),
  currency: text("currency").notNull().default("IQD"),
  costConfidence: text("cost_confidence"),
  taxClassification: text("tax_classification"),
  accountingCode: text("accounting_code"),
  active: boolean("active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  // ── carton catalogue (migration 0040) ──────────────────────────────────────
  // A carton IS a fulfillment material here: bought through packagingPurchases,
  // costed through materialCostRecords, consumed through the movement ledger.
  // These are new columns, not existing ones reinterpreted.
  sku: text("sku"),
  materialKind: text("material_kind").notNull().default("consumable"), // carton | consumable
  calculationBasis: text("calculation_basis").notNull().default("per_order"), // per_order | per_carton | per_product_unit
  stockTracked: boolean("stock_tracked").notNull().default(false),
  lowStockThreshold: numeric("low_stock_threshold"),
  // Internal dimensions are what the planner fits against. NULL = unknown.
  internalLengthCm: numeric("internal_length_cm"),
  internalWidthCm: numeric("internal_width_cm"),
  internalHeightCm: numeric("internal_height_cm"),
  externalLengthCm: numeric("external_length_cm"),
  externalWidthCm: numeric("external_width_cm"),
  externalHeightCm: numeric("external_height_cm"),
  maxWeightKg: numeric("max_weight_kg"),
  safetyPaddingCm: numeric("safety_padding_cm"),
  // Soft archive: a material referenced by a historical line is never deleted.
  archivedAt: timestamp("archived_at", { withTimezone: true }),
});

export const packagingPurchases = pgTable("packaging_purchases", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  materialId: text("material_id").references(() => fulfillmentMaterials.id).notNull(),
  quantity: numeric("quantity").notNull(),              // units of use bought
  totalCost: numeric("total_cost"),                     // NULL = unknown
  unitCost: numeric("unit_cost"),                       // derived; NULL = unknown
  currency: text("currency").notNull().default("IQD"),
  supplier: text("supplier"),
  purchaseInvoiceUrl: text("purchase_invoice_url"),
  purchaseDate: timestamp("purchase_date"),
  reorderThreshold: numeric("reorder_threshold"),
  approved: boolean("approved").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({ materialIdx: index("packaging_purchases_material_idx").on(t.materialId) }));

// Profile IDENTITY. A family owns many immutable-once-used VERSIONS.
export const packagingProfileFamilies = pgTable("packaging_profile_families", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  familyKey: text("family_key").notNull(),
  name: text("name").notNull(),
  appliesTo: jsonb("applies_to"),
  active: boolean("active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({ keyUidx: uniqueIndex("ppf_key_uidx").on(t.familyKey) }));

// A packaging profile row is a VERSION of a family. Once `locked` (used by a
// confirmed event) it is immutable — editing creates a new version instead.
export const packagingProfiles = pgTable("packaging_profiles", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  profileFamilyId: text("profile_family_id").references(() => packagingProfileFamilies.id),
  name: text("name").notNull(),
  appliesTo: jsonb("applies_to"),
  expectedCost: numeric("expected_cost"),
  effectiveDate: timestamp("effective_date"),
  version: integer("version").notNull().default(1),
  previousVersionId: text("previous_version_id"),
  supersededById: text("superseded_by_id"),
  creationReason: text("creation_reason"),
  locked: boolean("locked").notNull().default(false),
  lockedAt: timestamp("locked_at"),
  createdBy: text("created_by"),
  active: boolean("active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  familyVersionUidx: uniqueIndex("pp_family_version_uidx").on(t.profileFamilyId, t.version),
  familyIdx: index("pp_family_idx").on(t.profileFamilyId),
}));

export const packagingProfileItems = pgTable("packaging_profile_items", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  profileId: text("profile_id").references(() => packagingProfiles.id, { onDelete: "cascade" }).notNull(),
  materialId: text("material_id").references(() => fulfillmentMaterials.id).notNull(),
  quantity: numeric("quantity").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({ profileIdx: index("packaging_profile_items_profile_idx").on(t.profileId) }));

export const orderFulfillmentEvents = pgTable("order_fulfillment_events", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  orderId: text("order_id").references(() => orders.id).notNull(),
  eventType: text("event_type").notNull().default("original"), // original|reshipment|return_handling|replacement|adjustment
  sequenceNumber: integer("sequence_number").notNull().default(1),
  parentEventId: text("parent_event_id"),
  reversalOfEventId: text("reversal_of_event_id"),
  idempotencyKey: text("idempotency_key").notNull(),
  workflowState: text("workflow_state").notNull().default("confirmed"), // not_started|suggested|awaiting_confirmation|confirmed|adjusted|reversed
  costStatus: text("cost_status").notNull().default("incomplete"),       // exact|estimated|incomplete|unknown
  profileFamilyId: text("profile_family_id").references(() => packagingProfileFamilies.id),
  profileId: text("profile_id").references(() => packagingProfiles.id),
  profileVersion: integer("profile_version"),
  draftId: text("draft_id"),
  expectedCost: numeric("expected_cost"),
  actualCost: numeric("actual_cost"),
  variance: numeric("variance"),
  varianceReason: text("variance_reason"),
  confidence: text("confidence"),
  recordedBy: text("recorded_by"),
  recordedAt: timestamp("recorded_at").notNull().defaultNow(),
  adjustmentReason: text("adjustment_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  idemUidx: uniqueIndex("ofe_idempotency_uidx").on(t.idempotencyKey),
  orderIdx: index("ofe_order_idx").on(t.orderId),
}));

export const orderFulfillmentLines = pgTable("order_fulfillment_lines", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  eventId: text("event_id").references(() => orderFulfillmentEvents.id, { onDelete: "cascade" }).notNull(),
  orderId: text("order_id").references(() => orders.id).notNull(),
  materialId: text("material_id").references(() => fulfillmentMaterials.id),
  materialNameSnapshot: text("material_name_snapshot").notNull(),
  costComponentType: text("cost_component_type").notNull().default("aquavo_fulfillment_material"),
  quantity: numeric("quantity").notNull(),
  unitCostSnapshot: numeric("unit_cost_snapshot"),     // NULL = unknown (never 0)
  totalCost: numeric("total_cost"),                    // NULL when unit cost unknown
  source: text("source"),                              // catalog|profile|manual|none
  costStatus: text("cost_status").notNull().default("unknown"),
  confidence: text("confidence"),
  // Manual quick-entry descriptors, frozen with the line (item 8).
  category: text("category"),
  description: text("description"),
  unit: text("unit"),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  eventIdx: index("ofl_event_idx").on(t.eventId),
  orderIdx: index("ofl_order_idx").on(t.orderId),
}));

export const packagingInventoryMovements = pgTable("packaging_inventory_movements", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  materialId: text("material_id").references(() => fulfillmentMaterials.id).notNull(),
  purchaseId: text("purchase_id").references(() => packagingPurchases.id),
  movementType: text("movement_type").notNull(),       // purchase_receipt|fulfillment_usage|damage_waste|return_to_stock|correction|reversal
  quantity: numeric("quantity").notNull(),             // signed
  orderId: text("order_id").references(() => orders.id),
  eventId: text("event_id").references(() => orderFulfillmentEvents.id),
  idempotencyKey: text("idempotency_key").notNull(),
  // F-4: the order_fulfillment_lines row this movement deducted stock for.
  // Gives the idempotency key a per-line component so one event may legitimately
  // list the same material on two lines. NULL for pre-migration rows and for
  // movements not derived from a fulfillment line (purchases, reversals).
  // Requires migrations/add_pim_line_identity.sql applied BEFORE deploy.
  lineId: text("line_id"),
  sourceDocument: text("source_document"),
  reversalOfMovementId: text("reversal_of_movement_id"),
  recordedBy: text("recorded_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  idemUidx: uniqueIndex("pim_idempotency_uidx").on(t.idempotencyKey),
  materialIdx: index("pim_material_idx").on(t.materialId),
  // at most ONE movement per fulfillment line (strictly stronger than before)
  lineUidx: uniqueIndex("pim_line_uidx").on(t.lineId),
}));

export const fulfillmentAdjustments = pgTable("fulfillment_adjustments", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  orderId: text("order_id").references(() => orders.id).notNull(),
  eventId: text("event_id").references(() => orderFulfillmentEvents.id),
  type: text("type").notNull().default("adjustment"),  // adjustment|reversal
  amount: numeric("amount"),
  reason: text("reason").notNull(),
  recordedBy: text("recorded_by"),
  recordedAt: timestamp("recorded_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({ orderIdx: index("fulfillment_adjustments_order_idx").on(t.orderId) }));

// Per-order sequence ALLOCATION counter. One row per order; allocation is a single
// atomic INSERT…ON CONFLICT DO UPDATE…RETURNING that row-locks only this order.
export const orderFulfillmentSequences = pgTable("order_fulfillment_sequences", {
  orderId: text("order_id").primaryKey().references(() => orders.id),
  nextSequence: integer("next_sequence").notNull().default(1),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Auditable cost-approval evidence. The SOURCE OF TRUTH for a material's unit cost;
// fulfillment_materials.current_unit_cost is a mirror of the single active approved row.
export const materialCostRecords = pgTable("material_cost_records", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  materialId: text("material_id").references(() => fulfillmentMaterials.id).notNull(),
  costBasis: text("cost_basis").notNull(),            // purchase_batch | verified_manual_standard
  purchaseId: text("purchase_id").references(() => packagingPurchases.id),
  unitCost: numeric("unit_cost"),                     // NULL = unknown; 0 only when verified+approved
  currency: text("currency").notNull().default("IQD"),
  approvalStatus: text("approval_status").notNull().default("pending"),
  approvedBy: text("approved_by"),
  approvedAt: timestamp("approved_at"),
  effectiveDate: timestamp("effective_date").notNull().defaultNow(),
  reason: text("reason").notNull(),
  evidenceUrl: text("evidence_url"),
  supersededById: text("superseded_by_id"),
  supersededAt: timestamp("superseded_at"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({ materialIdx: index("mcr_material_idx").on(t.materialId) }));

// ── Mutable preparation DRAFTS (never accounting events) ─────────────────────
// A draft has NO effect on profit, fulfillment totals, packaging stock or reports.
// Confirmation converts it into ONE immutable event and marks the draft consumed.
export const fulfillmentPreparationDrafts = pgTable("fulfillment_preparation_drafts", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  orderId: text("order_id").references(() => orders.id).notNull(),
  eventType: text("event_type").notNull().default("original"),
  state: text("state").notNull().default("suggested"), // suggested|editing|awaiting_confirmation|consumed|discarded
  profileFamilyId: text("profile_family_id").references(() => packagingProfileFamilies.id),
  profileId: text("profile_id").references(() => packagingProfiles.id),
  profileVersion: integer("profile_version"),
  suggestionReason: text("suggestion_reason"),
  expectedCost: numeric("expected_cost"),
  costStatus: text("cost_status").notNull().default("unknown"),
  confirmedEventId: text("confirmed_event_id"),
  consumedAt: timestamp("consumed_at"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({ orderIdx: index("fpd_order_idx").on(t.orderId) }));

export const fulfillmentPreparationDraftLines = pgTable("fulfillment_preparation_draft_lines", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  draftId: text("draft_id").references(() => fulfillmentPreparationDrafts.id, { onDelete: "cascade" }).notNull(),
  materialId: text("material_id").references(() => fulfillmentMaterials.id), // NULL = named manual line
  materialName: text("material_name").notNull(),
  category: text("category"),
  description: text("description"),
  quantity: numeric("quantity").notNull(),
  unit: text("unit"),
  unitCost: numeric("unit_cost"),                     // NULL = unknown (never 0)
  costStatus: text("cost_status").notNull().default("unknown"),
  source: text("source").notNull().default("manual"), // catalog|profile|manual
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({ draftIdx: index("fpdl_draft_idx").on(t.draftId) }));

export type PackagingProfileFamily = typeof packagingProfileFamilies.$inferSelect;
export type OrderFulfillmentSequence = typeof orderFulfillmentSequences.$inferSelect;
export type MaterialCostRecord = typeof materialCostRecords.$inferSelect;
export type FulfillmentPreparationDraft = typeof fulfillmentPreparationDrafts.$inferSelect;
export type FulfillmentPreparationDraftLine = typeof fulfillmentPreparationDraftLines.$inferSelect;
export type FulfillmentMaterial = typeof fulfillmentMaterials.$inferSelect;
export type PackagingPurchase = typeof packagingPurchases.$inferSelect;
export type PackagingProfile = typeof packagingProfiles.$inferSelect;
export type PackagingProfileItem = typeof packagingProfileItems.$inferSelect;
export type OrderFulfillmentEvent = typeof orderFulfillmentEvents.$inferSelect;
export type OrderFulfillmentLine = typeof orderFulfillmentLines.$inferSelect;
export type PackagingInventoryMovement = typeof packagingInventoryMovements.$inferSelect;
export type FulfillmentAdjustment = typeof fulfillmentAdjustments.$inferSelect;
