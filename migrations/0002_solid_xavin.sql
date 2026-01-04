CREATE TABLE "customer_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"preferred_categories" jsonb,
	"preferred_brands" jsonb,
	"price_range" jsonb,
	"interests" jsonb,
	"average_order_value" numeric,
	"purchase_frequency" text,
	"total_purchases" integer DEFAULT 0,
	"ai_summary" text,
	"ai_notes" text,
	"sentiment_score" numeric,
	"engagement_level" text,
	"last_viewed_products" jsonb,
	"last_search_queries" jsonb,
	"last_interaction_at" timestamp,
	"last_analyzed_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customer_profiles_engagement_idx" ON "customer_profiles" USING btree ("engagement_level");--> statement-breakpoint
CREATE INDEX "customer_profiles_expires_at_idx" ON "customer_profiles" USING btree ("expires_at");