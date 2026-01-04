import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, numeric, index, check } from "drizzle-orm/pg-core";
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
  loyaltyTier: text("loyalty_tier").default("bronze"),
  cashbackBalance: integer("cashback_balance").default(0),
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
}));

export const orders = pgTable("orders", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  orderNumber: text("order_number").unique(),
  userId: text("user_id").references(() => users.id),
  status: text("status").notNull().default("pending"),
  paymentStatus: text("payment_status").notNull().default("pending"), // pending, paid, failed, refunded
  total: numeric("total").notNull(),
  shippingCost: numeric("shipping_cost").notNull().default("0"),
  couponId: text("coupon_id"),
  discountTotal: numeric("discount_total").default("0"),
  // Stronger Typing for JSONB
  items: jsonb("items").notNull().$type<{ productId: string; quantity: number; priceAtPurchase: number; }[]>(),
  shippingAddress: jsonb("shipping_address").$type<{ addressLine1: string; city: string; country: string; }>(),
  // Customer info (for guest orders or quick access)
  customerName: text("customer_name"),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone"),
  carrier: text("carrier"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("orders_user_id_idx").on(table.userId),
  createdAtIdx: index("orders_created_at_idx").on(table.createdAt),
  statusIdx: index("orders_status_idx").on(table.status),
}));

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
  metadata: jsonb("metadata"), // For variants like size, color
});

export const payments = pgTable("payments", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: text("order_id").references(() => orders.id).unique().notNull(), // One-to-One
  amount: numeric("amount").notNull(),
  currency: text("currency").default("IQD"),
  method: text("method").notNull(), // cache_on_delivery, credit_card, zain_cash
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
  blockedAt: timestamp("blocked_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"), // null = حظر دائم
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("page_views_user_idx").on(table.userId),
  pathIdx: index("page_views_path_idx").on(table.pagePath),
  createdAtIdx: index("page_views_created_at_idx").on(table.createdAt),
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

