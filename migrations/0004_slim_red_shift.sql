CREATE TABLE "ai_learnings" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"type" text NOT NULL,
	"user_message" text NOT NULL,
	"ai_response" text NOT NULL,
	"corrected_behavior" text,
	"rule" text,
	"severity" text DEFAULT 'medium',
	"applied" boolean DEFAULT false,
	"applied_at" timestamp,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "ai_monitoring_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"event" text NOT NULL,
	"level" text DEFAULT 'info' NOT NULL,
	"model" text,
	"user_id" text,
	"session_id" text,
	"response_time_ms" integer,
	"success" boolean DEFAULT true NOT NULL,
	"error_code" text,
	"error_message" text,
	"token_count" integer,
	"tools_used" jsonb,
	"products_found" integer,
	"fallback_used" boolean DEFAULT false,
	"web_search_used" boolean DEFAULT false,
	"message_length" integer,
	"details" jsonb
);
--> statement-breakpoint
CREATE TABLE "badges" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"icon" text NOT NULL,
	"points_reward" integer DEFAULT 0,
	"criteria" jsonb NOT NULL,
	"sort_order" integer DEFAULT 0,
	CONSTRAINT "badges_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "blog_categories" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"icon_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "blog_categories_name_unique" UNIQUE("name"),
	CONSTRAINT "blog_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "cart_sessions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"session_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"total_value" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cart_sessions_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "challenges" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"month" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" text NOT NULL,
	"target" integer DEFAULT 1 NOT NULL,
	"reward_points" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "diagnosis_cases" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" text,
	"disease" text NOT NULL,
	"arabic_name" text,
	"category" text,
	"symptoms" jsonb,
	"confidence" numeric,
	"treatment" jsonb,
	"outcome" text,
	"verified" boolean DEFAULT false,
	"species_name" text,
	"image_url" text,
	"user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "diagnosis_feedback" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" text NOT NULL,
	"user_id" text,
	"is_correct" boolean NOT NULL,
	"correct_disease" text,
	"notes" text,
	"treatment_worked" boolean,
	"rating" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fish_medical_records" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fish_patient_id" text NOT NULL,
	"analysis_id" text,
	"diagnosis" text,
	"arabic_diagnosis" text,
	"confidence" numeric,
	"category" text,
	"symptoms" jsonb,
	"treatment" jsonb,
	"water_params" jsonb,
	"user_notes" text,
	"outcome" text,
	"follow_up_date" timestamp,
	"follow_up_completed" boolean DEFAULT false,
	"image_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fish_patients" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"species" text,
	"scientific_name" text,
	"age" text,
	"gender" text,
	"tank_size" text,
	"water_type" text,
	"photo_url" text,
	"notes" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loyalty_coupons" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"value" jsonb NOT NULL,
	"min_order_amount" integer DEFAULT 0,
	"max_discount" integer,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"used_order_id" text,
	"source" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loyalty_transactions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"points_type" text DEFAULT 'loyalty' NOT NULL,
	"status" text DEFAULT 'approved' NOT NULL,
	"amount" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"order_id" text,
	"description" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "manual_invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_no" text NOT NULL,
	"token" text NOT NULL,
	"customer_name" text NOT NULL,
	"customer_phone" text NOT NULL,
	"customer_city" text,
	"customer_address" text,
	"customer_notes" text,
	"items" jsonb NOT NULL,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"discount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"delivery" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_by" text,
	"order_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"confirmed_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	CONSTRAINT "manual_invoices_invoice_no_unique" UNIQUE("invoice_no"),
	CONSTRAINT "manual_invoices_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "notification_log" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"channel" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"url" text,
	"metadata" jsonb,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"delivered_at" timestamp,
	"read_at" timestamp,
	"clicked_at" timestamp,
	"failed_at" timestamp,
	"fail_reason" text
);
--> statement-breakpoint
CREATE TABLE "user_badges" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"badge_id" text NOT NULL,
	"earned_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_challenges" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"challenge_id" text NOT NULL,
	"progress" integer DEFAULT 0,
	"completed_at" timestamp,
	"points_awarded" boolean DEFAULT false
);
--> statement-breakpoint
ALTER TABLE "ai_email_metrics" ADD COLUMN "campaign_id" text;--> statement-breakpoint
ALTER TABLE "ai_email_metrics" ADD COLUMN "status" text DEFAULT 'scheduled';--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "variant_price" numeric;--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "variant_label" text;--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "variant_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "rounded_total" numeric;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "points_used" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "cashback_used" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "points_discount" numeric DEFAULT '0';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "points_earned" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "rounding_cashback" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "bonus_prize" jsonb;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "bonus_claimed_at" timestamp;--> statement-breakpoint
ALTER TABLE "page_views" ADD COLUMN "utm_source" text;--> statement-breakpoint
ALTER TABLE "page_views" ADD COLUMN "utm_medium" text;--> statement-breakpoint
ALTER TABLE "page_views" ADD COLUMN "utm_campaign" text;--> statement-breakpoint
ALTER TABLE "page_views" ADD COLUMN "detected_source" text;--> statement-breakpoint
ALTER TABLE "page_views" ADD COLUMN "duration" integer;--> statement-breakpoint
ALTER TABLE "product_views" ADD COLUMN "referrer" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "cost_price" numeric DEFAULT '0';--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "packaging_cost" numeric DEFAULT '0';--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "insert_cost" numeric DEFAULT '0';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pending_loyalty_points" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pending_cashback_balance" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "total_spent" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "welcome_bonus_claimed" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "aquarium_profile" jsonb;--> statement-breakpoint
ALTER TABLE "cart_sessions" ADD CONSTRAINT "cart_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagnosis_cases" ADD CONSTRAINT "diagnosis_cases_analysis_id_image_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."image_analyses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagnosis_cases" ADD CONSTRAINT "diagnosis_cases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagnosis_feedback" ADD CONSTRAINT "diagnosis_feedback_analysis_id_image_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."image_analyses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagnosis_feedback" ADD CONSTRAINT "diagnosis_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fish_medical_records" ADD CONSTRAINT "fish_medical_records_fish_patient_id_fish_patients_id_fk" FOREIGN KEY ("fish_patient_id") REFERENCES "public"."fish_patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fish_medical_records" ADD CONSTRAINT "fish_medical_records_analysis_id_image_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."image_analyses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fish_patients" ADD CONSTRAINT "fish_patients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_coupons" ADD CONSTRAINT "loyalty_coupons_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_coupons" ADD CONSTRAINT "loyalty_coupons_used_order_id_orders_id_fk" FOREIGN KEY ("used_order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badge_id_badges_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_challenges" ADD CONSTRAINT "user_challenges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_challenges" ADD CONSTRAINT "user_challenges_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_learnings_type_idx" ON "ai_learnings" USING btree ("type");--> statement-breakpoint
CREATE INDEX "ai_learnings_applied_idx" ON "ai_learnings" USING btree ("applied");--> statement-breakpoint
CREATE INDEX "ai_learnings_created_at_idx" ON "ai_learnings" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ai_monitor_timestamp_idx" ON "ai_monitoring_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "ai_monitor_level_idx" ON "ai_monitoring_logs" USING btree ("level");--> statement-breakpoint
CREATE INDEX "ai_monitor_event_idx" ON "ai_monitoring_logs" USING btree ("event");--> statement-breakpoint
CREATE INDEX "ai_monitor_user_idx" ON "ai_monitoring_logs" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "challenges_month_type_idx" ON "challenges" USING btree ("month","type");--> statement-breakpoint
CREATE INDEX "diagnosis_cases_disease_idx" ON "diagnosis_cases" USING btree ("disease");--> statement-breakpoint
CREATE INDEX "diagnosis_cases_category_idx" ON "diagnosis_cases" USING btree ("category");--> statement-breakpoint
CREATE INDEX "diagnosis_cases_verified_idx" ON "diagnosis_cases" USING btree ("verified");--> statement-breakpoint
CREATE INDEX "diagnosis_cases_created_at_idx" ON "diagnosis_cases" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "diagnosis_feedback_analysis_idx" ON "diagnosis_feedback" USING btree ("analysis_id");--> statement-breakpoint
CREATE INDEX "diagnosis_feedback_user_idx" ON "diagnosis_feedback" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "diagnosis_feedback_correct_idx" ON "diagnosis_feedback" USING btree ("is_correct");--> statement-breakpoint
CREATE INDEX "fish_medical_records_fish_idx" ON "fish_medical_records" USING btree ("fish_patient_id");--> statement-breakpoint
CREATE INDEX "fish_medical_records_analysis_idx" ON "fish_medical_records" USING btree ("analysis_id");--> statement-breakpoint
CREATE INDEX "fish_medical_records_followup_idx" ON "fish_medical_records" USING btree ("follow_up_date");--> statement-breakpoint
CREATE INDEX "fish_medical_records_created_at_idx" ON "fish_medical_records" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "fish_patients_user_idx" ON "fish_patients" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "fish_patients_active_idx" ON "fish_patients" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "loyalty_coupons_user_id_idx" ON "loyalty_coupons" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "loyalty_coupons_expires_at_idx" ON "loyalty_coupons" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "loyalty_coupons_source_idx" ON "loyalty_coupons" USING btree ("source");--> statement-breakpoint
CREATE INDEX "loyalty_tx_user_id_idx" ON "loyalty_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "loyalty_tx_type_idx" ON "loyalty_transactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "loyalty_tx_order_id_idx" ON "loyalty_transactions" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "loyalty_tx_created_at_idx" ON "loyalty_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "manual_invoices_token_idx" ON "manual_invoices" USING btree ("token");--> statement-breakpoint
CREATE INDEX "manual_invoices_status_idx" ON "manual_invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "manual_invoices_created_by_idx" ON "manual_invoices" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "notification_log_user_idx" ON "notification_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notification_log_type_idx" ON "notification_log" USING btree ("type");--> statement-breakpoint
CREATE INDEX "notification_log_sent_at_idx" ON "notification_log" USING btree ("sent_at");--> statement-breakpoint
CREATE INDEX "notification_log_user_sent_idx" ON "notification_log" USING btree ("user_id","sent_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_badges_unique_idx" ON "user_badges" USING btree ("user_id","badge_id");--> statement-breakpoint
CREATE INDEX "user_badges_user_id_idx" ON "user_badges" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_challenges_unique_idx" ON "user_challenges" USING btree ("user_id","challenge_id");--> statement-breakpoint
CREATE INDEX "user_challenges_user_id_idx" ON "user_challenges" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_email_metrics_campaign_idx" ON "ai_email_metrics" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "page_views_source_idx" ON "page_views" USING btree ("detected_source");--> statement-breakpoint
CREATE INDEX "page_views_session_idx" ON "page_views" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "products_category_deleted_idx" ON "products" USING btree ("category","deleted_at");--> statement-breakpoint
CREATE INDEX "products_brand_deleted_idx" ON "products" USING btree ("brand","deleted_at");--> statement-breakpoint
CREATE INDEX "products_created_at_deleted_idx" ON "products" USING btree ("created_at","deleted_at");--> statement-breakpoint
CREATE INDEX "products_best_seller_deleted_idx" ON "products" USING btree ("is_best_seller","deleted_at");