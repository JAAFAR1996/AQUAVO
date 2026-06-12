CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"changes" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blocked_ips" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ip_address" text NOT NULL,
	"reason" text NOT NULL,
	"failed_attempts" integer DEFAULT 0,
	"blocked_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "blocked_ips_ip_address_unique" UNIQUE("ip_address")
);
--> statement-breakpoint
CREATE TABLE "cart_items" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"product_id" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
	"slug" text,
	"image_url" text,
	"parent_id" text,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name"),
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" text NOT NULL,
	"user_id" text,
	"session_id" text,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"discount_type" text NOT NULL,
	"discount_value" numeric NOT NULL,
	"min_order_amount" numeric,
	"max_uses" integer,
	"used_count" integer DEFAULT 0,
	"max_uses_per_user" integer DEFAULT 1,
	"start_date" timestamp,
	"end_date" timestamp,
	"is_active" boolean DEFAULT true,
	"description" text,
	"user_id" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "coupons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "discounts" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" text NOT NULL,
	"type" text NOT NULL,
	"value" numeric NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_campaigns" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"user_id" text NOT NULL,
	"subject" text NOT NULL,
	"content" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp,
	"opened_at" timestamp,
	"clicked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"product_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fish_species" (
	"id" text PRIMARY KEY NOT NULL,
	"common_name" text NOT NULL,
	"arabic_name" text NOT NULL,
	"scientific_name" text NOT NULL,
	"family" text,
	"origin" text,
	"min_size" numeric,
	"max_size" numeric,
	"lifespan" integer,
	"temperament" text,
	"care_level" text,
	"min_tank_size" integer,
	"water_parameters" jsonb NOT NULL,
	"diet" jsonb,
	"breeding" jsonb,
	"schooling" boolean DEFAULT false,
	"minimum_group" integer DEFAULT 1,
	"compatibility" jsonb,
	"description" text NOT NULL,
	"care_tips" jsonb,
	"image" text,
	"category" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gallery_prizes" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"month" text NOT NULL,
	"prize" text NOT NULL,
	"discount_code" text,
	"discount_percentage" integer,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "gallery_prizes_month_unique" UNIQUE("month")
);
--> statement-breakpoint
CREATE TABLE "gallery_submissions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"customer_name" text NOT NULL,
	"customer_phone" text,
	"image_url" text NOT NULL,
	"tank_size" text,
	"description" text,
	"likes" integer DEFAULT 0,
	"is_winner" boolean DEFAULT false,
	"winner_month" text,
	"prize" text,
	"coupon_code" text,
	"has_seen_celebration" boolean DEFAULT false,
	"is_approved" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gallery_votes" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gallery_id" text NOT NULL,
	"user_id" text,
	"ip_address" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journey_plans" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"session_id" text,
	"tank_size" text,
	"tank_type" text,
	"location" jsonb,
	"filter_type" text,
	"heater_wattage" integer,
	"lighting_type" text,
	"substrate_type" text,
	"decorations" jsonb,
	"water_source" text,
	"cycling_method" text,
	"fish_types" jsonb,
	"stocking_level" text,
	"maintenance_preference" text,
	"current_step" integer DEFAULT 0,
	"is_completed" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"email" text NOT NULL,
	"success" boolean NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"failure_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "newsletter_subscriptions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "newsletter_subscriptions_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "order_items_relational" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" text NOT NULL,
	"product_id" text NOT NULL,
	"quantity" integer NOT NULL,
	"price_at_purchase" numeric NOT NULL,
	"total_price" numeric NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" text,
	"user_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"payment_status" text DEFAULT 'pending' NOT NULL,
	"total" numeric NOT NULL,
	"shipping_cost" numeric DEFAULT '0' NOT NULL,
	"coupon_id" text,
	"discount_total" numeric DEFAULT '0',
	"items" jsonb NOT NULL,
	"shipping_address" jsonb,
	"customer_name" text,
	"customer_email" text,
	"customer_phone" text,
	"carrier" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE "page_views" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"session_id" text,
	"page_path" text NOT NULL,
	"page_title" text,
	"referrer" text,
	"user_agent" text,
	"ip_address" text,
	"country" text,
	"city" text,
	"device_type" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" text NOT NULL,
	"amount" numeric NOT NULL,
	"currency" text DEFAULT 'IQD',
	"method" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"transaction_id" text,
	"provider_response" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payments_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE "price_history" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" text NOT NULL,
	"price" numeric NOT NULL,
	"stock" integer,
	"sales_velocity" numeric,
	"demand_score" numeric,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_embeddings" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" text NOT NULL,
	"embedding" jsonb NOT NULL,
	"model" text DEFAULT 'gemini-1.5-flash' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_embeddings_product_id_unique" UNIQUE("product_id")
);
--> statement-breakpoint
CREATE TABLE "product_interactions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"session_id" text,
	"product_id" text NOT NULL,
	"interaction_type" text NOT NULL,
	"duration" integer,
	"scroll_depth" integer,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"brand" text NOT NULL,
	"category" text NOT NULL,
	"category_id" text,
	"subcategory" text NOT NULL,
	"description" text NOT NULL,
	"price" numeric NOT NULL,
	"original_price" numeric,
	"currency" text DEFAULT 'IQD' NOT NULL,
	"images" jsonb NOT NULL,
	"thumbnail" text NOT NULL,
	"rating" numeric DEFAULT '0' NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"low_stock_threshold" integer DEFAULT 10 NOT NULL,
	"is_new" boolean DEFAULT false NOT NULL,
	"is_best_seller" boolean DEFAULT false NOT NULL,
	"is_product_of_week" boolean DEFAULT false NOT NULL,
	"specifications" jsonb NOT NULL,
	"variants" jsonb,
	"has_variants" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "products_slug_unique" UNIQUE("slug"),
	CONSTRAINT "price_check" CHECK ("products"."price" >= 0),
	CONSTRAINT "stock_check" CHECK ("products"."stock" >= 0)
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_agent" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "referral_codes" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"user_id" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"total_referrals" integer DEFAULT 0,
	"total_points_earned" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "referral_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referrer_user_id" text NOT NULL,
	"referred_user_id" text NOT NULL,
	"referral_code_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"referral_date" timestamp DEFAULT now() NOT NULL,
	"signup_date" timestamp,
	"first_order_id" text,
	"first_order_date" timestamp,
	"referrer_points_awarded" integer DEFAULT 0,
	"referred_discount_awarded" boolean DEFAULT false,
	"referred_coupon_code" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_ratings" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" text NOT NULL,
	"user_id" text,
	"ip_address" text,
	"is_helpful" boolean NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" text NOT NULL,
	"user_id" text,
	"rating" integer NOT NULL,
	"title" text,
	"comment" text,
	"images" jsonb,
	"video_url" text,
	"status" text DEFAULT 'approved' NOT NULL,
	"ip_address" text,
	"helpful_count" integer DEFAULT 0,
	"verified_purchase" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_stats" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" timestamp NOT NULL,
	"total_orders" integer DEFAULT 0,
	"total_revenue" integer DEFAULT 0,
	"average_order_value" integer DEFAULT 0,
	"new_customers" integer DEFAULT 0,
	"returning_customers" integer DEFAULT 0,
	"conversion_rate" numeric(5, 2),
	"top_products" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_queries" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"session_id" text,
	"query" text NOT NULL,
	"results_count" integer,
	"clicked_product_id" text,
	"click_position" integer,
	"no_results_found" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" text PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" text NOT NULL,
	"user_id" text,
	"customer_name" text,
	"customer_email" text,
	"status" text DEFAULT 'open' NOT NULL,
	"priority" text DEFAULT 'medium',
	"assigned_to_user_id" text,
	"category" text,
	"escalation_reason" text,
	"ai_confidence" numeric,
	"sentiment" text,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "translations" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"field" text NOT NULL,
	"language" text NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_addresses" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"label" text,
	"address_line1" text NOT NULL,
	"city" text NOT NULL,
	"country" text DEFAULT 'Iraq',
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"full_name" text,
	"phone" text,
	"birth_date" timestamp,
	"role" text DEFAULT 'user' NOT NULL,
	"email_verified" boolean DEFAULT false,
	"verification_token" text,
	"verification_token_expires_at" timestamp,
	"loyalty_points" integer DEFAULT 0,
	"loyalty_tier" text DEFAULT 'bronze',
	"cashback_balance" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "store_audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_campaigns" ADD CONSTRAINT "email_campaigns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_submissions" ADD CONSTRAINT "gallery_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_votes" ADD CONSTRAINT "gallery_votes_gallery_id_gallery_submissions_id_fk" FOREIGN KEY ("gallery_id") REFERENCES "public"."gallery_submissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journey_plans" ADD CONSTRAINT "journey_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "login_attempts" ADD CONSTRAINT "login_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items_relational" ADD CONSTRAINT "order_items_relational_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items_relational" ADD CONSTRAINT "order_items_relational_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_views" ADD CONSTRAINT "page_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_embeddings" ADD CONSTRAINT "product_embeddings_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_interactions" ADD CONSTRAINT "product_interactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_interactions" ADD CONSTRAINT "product_interactions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_user_id_users_id_fk" FOREIGN KEY ("referrer_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_user_id_users_id_fk" FOREIGN KEY ("referred_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referral_code_id_referral_codes_id_fk" FOREIGN KEY ("referral_code_id") REFERENCES "public"."referral_codes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_first_order_id_orders_id_fk" FOREIGN KEY ("first_order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_ratings" ADD CONSTRAINT "review_ratings_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_ratings" ADD CONSTRAINT "review_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_queries" ADD CONSTRAINT "search_queries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_queries" ADD CONSTRAINT "search_queries_clicked_product_id_products_id_fk" FOREIGN KEY ("clicked_product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assigned_to_user_id_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_addresses" ADD CONSTRAINT "user_addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "blocked_ips_ip_idx" ON "blocked_ips" USING btree ("ip_address");--> statement-breakpoint
CREATE INDEX "blocked_ips_is_active_idx" ON "blocked_ips" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "cart_items_user_product_idx" ON "cart_items" USING btree ("user_id","product_id");--> statement-breakpoint
CREATE INDEX "chat_messages_conversation_idx" ON "chat_messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "chat_messages_user_id_idx" ON "chat_messages" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "chat_messages_created_at_idx" ON "chat_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "email_campaigns_user_idx" ON "email_campaigns" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "email_campaigns_type_idx" ON "email_campaigns" USING btree ("type");--> statement-breakpoint
CREATE INDEX "email_campaigns_status_idx" ON "email_campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "favorites_user_product_idx" ON "favorites" USING btree ("user_id","product_id");--> statement-breakpoint
CREATE INDEX "gallery_submissions_is_approved_idx" ON "gallery_submissions" USING btree ("is_approved");--> statement-breakpoint
CREATE INDEX "gallery_votes_idx" ON "gallery_votes" USING btree ("gallery_id","ip_address");--> statement-breakpoint
CREATE INDEX "journey_plans_user_id_idx" ON "journey_plans" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "journey_plans_session_id_idx" ON "journey_plans" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "login_attempts_email_idx" ON "login_attempts" USING btree ("email");--> statement-breakpoint
CREATE INDEX "login_attempts_ip_idx" ON "login_attempts" USING btree ("ip_address");--> statement-breakpoint
CREATE INDEX "login_attempts_created_at_idx" ON "login_attempts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "login_attempts_success_idx" ON "login_attempts" USING btree ("success");--> statement-breakpoint
CREATE INDEX "orders_user_id_idx" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "page_views_user_idx" ON "page_views" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "page_views_path_idx" ON "page_views" USING btree ("page_path");--> statement-breakpoint
CREATE INDEX "page_views_created_at_idx" ON "page_views" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "price_history_product_created_idx" ON "price_history" USING btree ("product_id","created_at");--> statement-breakpoint
CREATE INDEX "product_embeddings_product_id_idx" ON "product_embeddings" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_interactions_user_product_idx" ON "product_interactions" USING btree ("user_id","product_id");--> statement-breakpoint
CREATE INDEX "product_interactions_product_idx" ON "product_interactions" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_interactions_type_idx" ON "product_interactions" USING btree ("interaction_type");--> statement-breakpoint
CREATE INDEX "product_interactions_created_at_idx" ON "product_interactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "products_slug_idx" ON "products" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category");--> statement-breakpoint
CREATE INDEX "products_category_id_idx" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "products_is_new_idx" ON "products" USING btree ("is_new");--> statement-breakpoint
CREATE INDEX "products_is_best_seller_idx" ON "products" USING btree ("is_best_seller");--> statement-breakpoint
CREATE INDEX "products_created_at_idx" ON "products" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "products_rating_idx" ON "products" USING btree ("rating");--> statement-breakpoint
CREATE INDEX "push_subscriptions_user_idx" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "push_subscriptions_endpoint_idx" ON "push_subscriptions" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "referral_codes_code_idx" ON "referral_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "referral_codes_user_id_idx" ON "referral_codes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "referrals_referrer_idx" ON "referrals" USING btree ("referrer_user_id");--> statement-breakpoint
CREATE INDEX "referrals_referred_idx" ON "referrals" USING btree ("referred_user_id");--> statement-breakpoint
CREATE INDEX "referrals_status_idx" ON "referrals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "reviews_product_id_idx" ON "reviews" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "reviews_user_id_idx" ON "reviews" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "reviews_status_idx" ON "reviews" USING btree ("status");--> statement-breakpoint
CREATE INDEX "reviews_created_at_idx" ON "reviews" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sales_stats_date_idx" ON "sales_stats" USING btree ("date");--> statement-breakpoint
CREATE INDEX "search_queries_query_idx" ON "search_queries" USING btree ("query");--> statement-breakpoint
CREATE INDEX "search_queries_created_at_idx" ON "search_queries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sessions_expire_idx" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "support_tickets_status_idx" ON "support_tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "support_tickets_assigned_to_idx" ON "support_tickets" USING btree ("assigned_to_user_id");--> statement-breakpoint
CREATE INDEX "support_tickets_created_at_idx" ON "support_tickets" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");
