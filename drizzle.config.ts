import { defineConfig } from "drizzle-kit";
import {
  loadEnvFilesPreservingDatabaseTargets,
  resolveDatabaseTarget,
  logResolvedDatabaseTarget,
} from "./server/db-target.js";

const envLoad = loadEnvFilesPreservingDatabaseTargets();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

logResolvedDatabaseTarget(resolveDatabaseTarget("primary", { inherited: envLoad.inherited }));

/**
 * Accounting V2 is governed exclusively by migrations/0051..0055.
 *
 * `orders`, `expenses`, `accounting_period_closes`, and all V2 tables are
 * deliberately excluded from drizzle-kit push until the legacy monolithic
 * schema is consolidated byte-for-byte with the live database. Including a
 * partial declaration would let db:push propose dropping delivered_at,
 * carrier_fee, evidence columns, triggers, checks, or foreign keys.
 *
 * The V2 schema file remains available for application typing; migration SQL is
 * the sole DDL authority for this protected zone.
 */
export default defineConfig({
  out: "./migrations",
  schema: ["./shared/schema.ts", "./shared/accounting-schema-v2.ts"],
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  tablesFilter: [
    "users",
    "password_reset_tokens",
    "products",
    "product_cost_history",
    "reviews",
    "review_ratings",
    "express_sessions",
    "discounts",
    "store_audit_logs",
    "coupons",
    "cart_items",
    "favorites",
    "fish_species",
    "gallery_submissions",
    "gallery_votes",
    "categories",
    "order_items_relational",
    "payments",
    "translations",
    "user_addresses",
    "gallery_prizes",
    "newsletter_subscriptions",
    "email_logs",
    "journey_plans",
    "referral_codes",
    "referrals",
    "login_attempts",
    "blocked_ips",
    "page_views",
    "sales_stats",
    "email_campaigns",
    "push_subscriptions",
    "chat_messages",
    "support_tickets",
    "product_interactions",
    "product_embeddings",
    "price_history",
    "search_queries",
    "customer_profiles",
    "image_analyses",
    "sentiment_history",
    "predicted_needs",
    "churn_predictions",
    "ai_email_metrics",
    "inventory_recommendations",
    "auto_orders",
    "accounting_manual_adjustments",
    "accounting_review_flags",
    "accounting_audit_trail",
    "ai_agent_settings",
    "store_social_interactions",
    "settings"
  ]
});
