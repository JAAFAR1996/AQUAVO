CREATE TABLE "ai_agent_settings" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_name" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
	"is_enabled" boolean DEFAULT true,
	"auto_run" boolean DEFAULT false,
	"run_frequency" text DEFAULT 'manual',
	"config" jsonb,
	"last_run_at" timestamp,
	"last_run_status" text,
	"actions_today" integer DEFAULT 0,
	"total_actions" integer DEFAULT 0,
	"updated_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ai_agent_settings_agent_name_unique" UNIQUE("agent_name")
);
--> statement-breakpoint
CREATE TABLE "ai_email_metrics" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"email_type" text NOT NULL,
	"subject" text NOT NULL,
	"personalized_content" boolean DEFAULT true,
	"ai_generated" boolean DEFAULT false,
	"opened" boolean DEFAULT false,
	"clicked" boolean DEFAULT false,
	"converted" boolean DEFAULT false,
	"revenue" numeric DEFAULT '0',
	"opened_at" timestamp,
	"clicked_at" timestamp,
	"converted_at" timestamp,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aquarium_designs" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"session_id" text,
	"name" text NOT NULL,
	"tank_size" text NOT NULL,
	"tank_type" text,
	"budget" numeric,
	"selected_fish" jsonb,
	"selected_equipment" jsonb,
	"selected_decor" jsonb,
	"compatibility_score" numeric,
	"ai_notes" text,
	"ai_warnings" jsonb,
	"shopping_list" jsonb,
	"estimated_cost" numeric,
	"status" text DEFAULT 'draft',
	"image_url" text,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auto_orders" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"product_id" text NOT NULL,
	"frequency" text NOT NULL,
	"quantity" integer NOT NULL,
	"next_scheduled_date" timestamp NOT NULL,
	"last_order_date" timestamp,
	"last_order_id" text,
	"status" text DEFAULT 'active',
	"ai_suggested_quantity" integer,
	"ai_reason" text,
	"paused_until" timestamp,
	"pause_reason" text,
	"cancelled_at" timestamp,
	"cancel_reason" text,
	"total_orders_placed" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"excerpt" text NOT NULL,
	"content" text NOT NULL,
	"category" text NOT NULL,
	"read_time" text,
	"author" text DEFAULT 'شريمب 🦐',
	"image_url" text,
	"icon_name" text DEFAULT 'Fish',
	"is_published" boolean DEFAULT false,
	"is_featured" boolean DEFAULT false,
	"is_auto_generated" boolean DEFAULT false,
	"view_count" integer DEFAULT 0,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "blog_posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "churn_predictions" (
	"user_id" text PRIMARY KEY NOT NULL,
	"churn_score" numeric NOT NULL,
	"risk_level" text NOT NULL,
	"indicators" jsonb,
	"contributing_factors" jsonb,
	"action_plan" text,
	"action_taken" boolean DEFAULT false,
	"action_date" timestamp,
	"action_result" text,
	"last_analyzed_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "competitor_prices" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" text NOT NULL,
	"competitor_name" text NOT NULL,
	"competitor_price" numeric NOT NULL,
	"competitor_url" text,
	"our_price" numeric NOT NULL,
	"price_difference" numeric NOT NULL,
	"price_difference_percent" numeric,
	"competitive" boolean,
	"ai_suggested_price" numeric,
	"ai_reason" text,
	"last_checked_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "early_access_leads" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" varchar(20) NOT NULL,
	"name" varchar(255),
	"source" varchar(50) DEFAULT 'landing_page',
	"status" text DEFAULT 'pending',
	"notes" text,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"contacted_at" timestamp,
	"converted_at" timestamp,
	CONSTRAINT "early_access_leads_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "generated_content" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" text,
	"content_type" text NOT NULL,
	"generated_text" text NOT NULL,
	"prompt" text,
	"metadata" jsonb,
	"status" text DEFAULT 'draft',
	"quality_score" numeric,
	"human_reviewed" boolean DEFAULT false,
	"feedback" text,
	"published_at" timestamp,
	"generated_by" text DEFAULT 'gemini-2.5-flash',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "image_analyses" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"session_id" text,
	"image_url" text NOT NULL,
	"analysis_type" text NOT NULL,
	"ai_analysis" jsonb,
	"recommended_products" jsonb,
	"processing_time_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_recommendations" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" text NOT NULL,
	"current_stock" integer NOT NULL,
	"suggested_order_quantity" integer NOT NULL,
	"urgency" text NOT NULL,
	"estimated_runout_date" timestamp,
	"expected_demand" jsonb,
	"ai_reason" text,
	"estimated_cost" numeric,
	"potential_revenue_loss" numeric,
	"status" text DEFAULT 'pending',
	"ordered_quantity" integer,
	"ordered_at" timestamp,
	"dismissed_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "predicted_needs" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"product_id" text NOT NULL,
	"probability" numeric NOT NULL,
	"predicted_date" timestamp NOT NULL,
	"reason" text,
	"category" text,
	"based_on" jsonb,
	"notified" boolean DEFAULT false,
	"notified_at" timestamp,
	"converted" boolean DEFAULT false,
	"converted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_rules" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" text,
	"category_id" text,
	"strategy" text NOT NULL,
	"parameters" jsonb,
	"min_price" numeric,
	"max_price" numeric,
	"target_margin" numeric,
	"is_active" boolean DEFAULT true,
	"priority" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_views" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" text,
	"user_id" text,
	"session_id" text,
	"viewed_at" timestamp DEFAULT now() NOT NULL,
	"view_duration" integer,
	"source" text
);
--> statement-breakpoint
CREATE TABLE "return_requests" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" text NOT NULL,
	"user_id" text NOT NULL,
	"product_id" text NOT NULL,
	"quantity" integer DEFAULT 1,
	"reason" text NOT NULL,
	"reason_category" text,
	"detailed_description" text,
	"status" text DEFAULT 'pending',
	"ai_decision" text,
	"ai_confidence" numeric,
	"ai_reasoning" text,
	"refund_amount" numeric,
	"refund_method" text,
	"restocking_fee" numeric DEFAULT '0',
	"images" jsonb,
	"admin_notes" text,
	"processed_by" text,
	"fraud_score" numeric,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp,
	"completed_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sentiment_history" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"conversation_id" text,
	"session_id" text,
	"sentiment" text NOT NULL,
	"score" numeric NOT NULL,
	"confidence" numeric,
	"message" text,
	"ai_response" text,
	"indicators" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_analytics_cache" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connection_id" text NOT NULL,
	"data_type" text NOT NULL,
	"data" jsonb NOT NULL,
	"period_start" timestamp,
	"period_end" timestamp,
	"fetched_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_connections" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"platform" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"token_expires_at" timestamp,
	"page_id" text,
	"account_id" text,
	"account_name" text,
	"account_username" text,
	"profile_image_url" text,
	"permissions" jsonb,
	"is_active" boolean DEFAULT true,
	"last_sync_at" timestamp,
	"sync_status" text DEFAULT 'pending',
	"sync_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "preferences" jsonb;--> statement-breakpoint
ALTER TABLE "ai_agent_settings" ADD CONSTRAINT "ai_agent_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_email_metrics" ADD CONSTRAINT "ai_email_metrics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aquarium_designs" ADD CONSTRAINT "aquarium_designs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auto_orders" ADD CONSTRAINT "auto_orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auto_orders" ADD CONSTRAINT "auto_orders_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auto_orders" ADD CONSTRAINT "auto_orders_last_order_id_orders_id_fk" FOREIGN KEY ("last_order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "churn_predictions" ADD CONSTRAINT "churn_predictions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitor_prices" ADD CONSTRAINT "competitor_prices_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_content" ADD CONSTRAINT "generated_content_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "image_analyses" ADD CONSTRAINT "image_analyses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_recommendations" ADD CONSTRAINT "inventory_recommendations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predicted_needs" ADD CONSTRAINT "predicted_needs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predicted_needs" ADD CONSTRAINT "predicted_needs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_views" ADD CONSTRAINT "product_views_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_views" ADD CONSTRAINT "product_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sentiment_history" ADD CONSTRAINT "sentiment_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_analytics_cache" ADD CONSTRAINT "social_analytics_cache_connection_id_social_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."social_connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_connections" ADD CONSTRAINT "social_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_agent_settings_agent_name_idx" ON "ai_agent_settings" USING btree ("agent_name");--> statement-breakpoint
CREATE INDEX "ai_agent_settings_is_enabled_idx" ON "ai_agent_settings" USING btree ("is_enabled");--> statement-breakpoint
CREATE INDEX "ai_email_metrics_user_type_idx" ON "ai_email_metrics" USING btree ("user_id","email_type");--> statement-breakpoint
CREATE INDEX "ai_email_metrics_opened_idx" ON "ai_email_metrics" USING btree ("opened");--> statement-breakpoint
CREATE INDEX "ai_email_metrics_converted_idx" ON "ai_email_metrics" USING btree ("converted");--> statement-breakpoint
CREATE INDEX "ai_email_metrics_sent_at_idx" ON "ai_email_metrics" USING btree ("sent_at");--> statement-breakpoint
CREATE INDEX "aquarium_designs_user_idx" ON "aquarium_designs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "aquarium_designs_status_idx" ON "aquarium_designs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "aquarium_designs_created_at_idx" ON "aquarium_designs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "auto_orders_user_idx" ON "auto_orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auto_orders_product_idx" ON "auto_orders" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "auto_orders_scheduled_idx" ON "auto_orders" USING btree ("next_scheduled_date");--> statement-breakpoint
CREATE INDEX "auto_orders_status_idx" ON "auto_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "blog_posts_slug_idx" ON "blog_posts" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "blog_posts_category_idx" ON "blog_posts" USING btree ("category");--> statement-breakpoint
CREATE INDEX "blog_posts_published_at_idx" ON "blog_posts" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "blog_posts_is_published_idx" ON "blog_posts" USING btree ("is_published");--> statement-breakpoint
CREATE INDEX "churn_predictions_risk_idx" ON "churn_predictions" USING btree ("risk_level");--> statement-breakpoint
CREATE INDEX "churn_predictions_score_idx" ON "churn_predictions" USING btree ("churn_score");--> statement-breakpoint
CREATE INDEX "churn_predictions_action_taken_idx" ON "churn_predictions" USING btree ("action_taken");--> statement-breakpoint
CREATE INDEX "competitor_prices_product_idx" ON "competitor_prices" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "competitor_prices_competitor_idx" ON "competitor_prices" USING btree ("competitor_name");--> statement-breakpoint
CREATE INDEX "competitor_prices_last_checked_idx" ON "competitor_prices" USING btree ("last_checked_at");--> statement-breakpoint
CREATE INDEX "competitor_prices_competitive_idx" ON "competitor_prices" USING btree ("competitive");--> statement-breakpoint
CREATE INDEX "early_access_leads_phone_idx" ON "early_access_leads" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "early_access_leads_status_idx" ON "early_access_leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "early_access_leads_created_at_idx" ON "early_access_leads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "generated_content_product_idx" ON "generated_content" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "generated_content_type_idx" ON "generated_content" USING btree ("content_type");--> statement-breakpoint
CREATE INDEX "generated_content_status_idx" ON "generated_content" USING btree ("status");--> statement-breakpoint
CREATE INDEX "generated_content_published_at_idx" ON "generated_content" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "image_analyses_user_idx" ON "image_analyses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "image_analyses_type_idx" ON "image_analyses" USING btree ("analysis_type");--> statement-breakpoint
CREATE INDEX "image_analyses_created_at_idx" ON "image_analyses" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "inventory_recommendations_product_idx" ON "inventory_recommendations" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "inventory_recommendations_urgency_idx" ON "inventory_recommendations" USING btree ("urgency");--> statement-breakpoint
CREATE INDEX "inventory_recommendations_status_idx" ON "inventory_recommendations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "inventory_recommendations_runout_date_idx" ON "inventory_recommendations" USING btree ("estimated_runout_date");--> statement-breakpoint
CREATE INDEX "predicted_needs_user_product_idx" ON "predicted_needs" USING btree ("user_id","product_id");--> statement-breakpoint
CREATE INDEX "predicted_needs_date_idx" ON "predicted_needs" USING btree ("predicted_date");--> statement-breakpoint
CREATE INDEX "predicted_needs_notified_idx" ON "predicted_needs" USING btree ("notified");--> statement-breakpoint
CREATE INDEX "predicted_needs_probability_idx" ON "predicted_needs" USING btree ("probability");--> statement-breakpoint
CREATE INDEX "pricing_rules_product_idx" ON "pricing_rules" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "pricing_rules_category_idx" ON "pricing_rules" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "pricing_rules_active_idx" ON "pricing_rules" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "product_views_product_id_idx" ON "product_views" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_views_user_id_idx" ON "product_views" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "product_views_viewed_at_idx" ON "product_views" USING btree ("viewed_at");--> statement-breakpoint
CREATE INDEX "return_requests_order_idx" ON "return_requests" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "return_requests_user_idx" ON "return_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "return_requests_status_idx" ON "return_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "return_requests_ai_decision_idx" ON "return_requests" USING btree ("ai_decision");--> statement-breakpoint
CREATE INDEX "return_requests_created_at_idx" ON "return_requests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sentiment_history_user_idx" ON "sentiment_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sentiment_history_conversation_idx" ON "sentiment_history" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "sentiment_history_sentiment_idx" ON "sentiment_history" USING btree ("sentiment");--> statement-breakpoint
CREATE INDEX "sentiment_history_created_at_idx" ON "sentiment_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "social_analytics_cache_connection_idx" ON "social_analytics_cache" USING btree ("connection_id");--> statement-breakpoint
CREATE INDEX "social_analytics_cache_data_type_idx" ON "social_analytics_cache" USING btree ("data_type");--> statement-breakpoint
CREATE INDEX "social_analytics_cache_expires_idx" ON "social_analytics_cache" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "social_connections_user_id_idx" ON "social_connections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "social_connections_platform_idx" ON "social_connections" USING btree ("platform");--> statement-breakpoint
CREATE INDEX "social_connections_is_active_idx" ON "social_connections" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "order_items_product_id_idx" ON "order_items_relational" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "order_items_order_id_idx" ON "order_items_relational" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "products_deleted_at_idx" ON "products" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "products_brand_idx" ON "products" USING btree ("brand");--> statement-breakpoint
CREATE INDEX "products_price_idx" ON "products" USING btree ("price");