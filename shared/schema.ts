import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, numeric, index, check } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name"),
  phone: text("phone"),
  role: text("role").notNull().default("user"), // user, admin
  emailVerified: boolean("email_verified").default(false),
  verificationToken: text("verification_token"),
  verificationTokenExpiresAt: timestamp("verification_token_expires_at"),
  loyaltyPoints: integer("loyalty_points").default(0),
  loyaltyTier: text("loyalty_tier").default("bronze"),
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
  status: text("status").notNull().default("approved"), // pending, approved, rejected
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

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  passwordHash: true,
  fullName: true,
  role: true,
  phone: true,
}).extend({
  email: z.string().email("Valid email is required"),
  passwordHash: z.string().min(1, "Password is required"),
  fullName: z.string().optional(),
  phone: z.string().optional(),
  role: z.enum(["user", "admin"]).optional(),
});

export const insertUserAddressSchema = createInsertSchema(userAddresses);

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true
}).extend({
  images: z.array(z.string()),
  specifications: z.record(z.string(), z.any()),
});
export const insertOrderSchema = createInsertSchema(orders);
export const insertReviewSchema = createInsertSchema(reviews).extend({
  rating: z.number().min(1).max(5),
  title: z.string().max(100).optional(),
  comment: z.string().max(2000).optional(),
  images: z.array(z.string()).max(5).optional(),
});
export const insertReviewRatingSchema = createInsertSchema(reviewRatings);
export const insertDiscountSchema = createInsertSchema(discounts);
export const insertAuditLogSchema = createInsertSchema(auditLogs);
export const insertCouponSchema = createInsertSchema(coupons);
export const insertCartItemSchema = createInsertSchema(cartItems);
export const insertFavoriteSchema = createInsertSchema(favorites);
export const insertFishSpeciesSchema = createInsertSchema(fishSpecies);
export const insertGallerySubmissionSchema = createInsertSchema(gallerySubmissions).omit({
  id: true,
  isWinner: true,
  winnerMonth: true,
  prize: true,
  isApproved: true,
  likes: true,
  createdAt: true,
  updatedAt: true
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

export const insertNewsletterSubscriptionSchema = createInsertSchema(newsletterSubscriptions).pick({
  email: true,
}).extend({
  email: z.string().email("Valid email is required"),
});

export type NewsletterSubscription = typeof newsletterSubscriptions.$inferSelect;
export type InsertNewsletterSubscription = z.infer<typeof insertNewsletterSubscriptionSchema>;

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens);
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
