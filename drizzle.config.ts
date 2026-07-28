import { defineConfig } from "drizzle-kit";
import {
  loadEnvFilesPreservingDatabaseTargets,
  resolveDatabaseTarget,
  logResolvedDatabaseTarget,
} from "./server/db-target.js";

// Env files may not override an explicitly inherited DATABASE_URL.
const envLoad = loadEnvFilesPreservingDatabaseTargets();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

// Fails closed if the target cannot be identified; logs redacted identity only.
logResolvedDatabaseTarget(resolveDatabaseTarget("primary", { inherited: envLoad.inherited }));

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  tablesFilter: [
    "users",
    "password_reset_tokens",
    "products",
    "orders",
    // `shipping_settlements` is deliberately ABSENT (2026-07-28). It is archived
    // to `archive.shipping_settlements` by
    // migrations/isolate_legacy_shipping_settlements.sql; listing it here would
    // let `db:push` recreate it in `public` and silently undo the isolation.
    "product_cost_history",
    "expenses",
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
    "accounting_period_closes",
    "ai_agent_settings",
    "store_social_interactions",
    "settings"
  ]
});
