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
    "orders",
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
    "accounting_cutovers",
    "order_accounting_facts",
    "order_accounting_settlements",
    "chart_of_accounts",
    "journal_entries",
    "journal_lines",
    "evidence_files",
    "tax_profiles",
    "opening_inventory_snapshot",
    "ai_agent_settings",
    "store_social_interactions",
    "settings"
  ]
});
