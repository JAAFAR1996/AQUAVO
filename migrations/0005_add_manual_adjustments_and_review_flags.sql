CREATE TABLE "accounting_manual_adjustments" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"field_name" text NOT NULL,
	"old_value_json" jsonb,
	"new_value_json" jsonb NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_by" text NOT NULL,
	"approved_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"approved_at" timestamp,
	"applied_at" timestamp,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "accounting_review_flags" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" text NOT NULL,
	"severity" text DEFAULT 'medium' NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"detected_value_json" jsonb,
	"suggested_value_json" jsonb,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp,
	"resolved_by" text
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" text NOT NULL,
	"amount" numeric NOT NULL,
	"description" text,
	"expense_date" timestamp NOT NULL,
	"is_recurring" boolean DEFAULT false NOT NULL,
	"recurring_period" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_audit_findings" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"severity" text NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"explanation" text NOT NULL,
	"affected_orders" jsonb,
	"expected_value" numeric,
	"actual_value" numeric,
	"difference" numeric,
	"suggested_fix" text NOT NULL,
	"requires_human_approval" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_audit_runs" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"overall_status" text NOT NULL,
	"model" text NOT NULL,
	"summary" text,
	"snapshot" jsonb NOT NULL,
	"invariant_checks" jsonb NOT NULL,
	"started_at" timestamp NOT NULL,
	"completed_at" timestamp NOT NULL,
	"error_message" text,
	"triggered_by" text DEFAULT 'scheduled' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_return_events" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" text NOT NULL,
	"type" text NOT NULL,
	"reason" text,
	"refund_amount" numeric DEFAULT '0',
	"delivery_cost_loss" numeric DEFAULT '0',
	"return_shipping_cost" numeric DEFAULT '0',
	"packaging_loss" numeric DEFAULT '0',
	"product_write_off_amount" numeric DEFAULT '0',
	"cogs_loss" numeric DEFAULT '0',
	"restocked" boolean DEFAULT false,
	"restocked_at" timestamp,
	"affected_items" jsonb,
	"status" text DEFAULT 'recorded',
	"note" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_cost_history" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" text NOT NULL,
	"cost_price" numeric DEFAULT '0' NOT NULL,
	"packaging_cost" numeric DEFAULT '0' NOT NULL,
	"insert_cost" numeric DEFAULT '0' NOT NULL,
	"effective_from" timestamp NOT NULL,
	"note" text,
	"changed_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipping_settlements" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"carrier" text NOT NULL,
	"amount" numeric NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_interactions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" text NOT NULL,
	"media_id" text NOT NULL,
	"comment_id" text NOT NULL,
	"username" text NOT NULL,
	"keyword_matched" text NOT NULL,
	"dm_sent" boolean DEFAULT false,
	"reply_sent" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "store_social_interactions_comment_id_unique" UNIQUE("comment_id")
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "cod_received" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "box_cost" numeric DEFAULT '0';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "source" text DEFAULT 'website';--> statement-breakpoint
ALTER TABLE "accounting_manual_adjustments" ADD CONSTRAINT "accounting_manual_adjustments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting_manual_adjustments" ADD CONSTRAINT "accounting_manual_adjustments_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting_review_flags" ADD CONSTRAINT "accounting_review_flags_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_audit_findings" ADD CONSTRAINT "finance_audit_findings_run_id_finance_audit_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."finance_audit_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_return_events" ADD CONSTRAINT "order_return_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_return_events" ADD CONSTRAINT "order_return_events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_cost_history" ADD CONSTRAINT "product_cost_history_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ama_entity_idx" ON "accounting_manual_adjustments" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "ama_status_idx" ON "accounting_manual_adjustments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ama_created_at_idx" ON "accounting_manual_adjustments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "arf_entity_idx" ON "accounting_review_flags" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "arf_status_idx" ON "accounting_review_flags" USING btree ("status");--> statement-breakpoint
CREATE INDEX "arf_severity_idx" ON "accounting_review_flags" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "arf_created_at_idx" ON "accounting_review_flags" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "expenses_category_idx" ON "expenses" USING btree ("category");--> statement-breakpoint
CREATE INDEX "expenses_expense_date_idx" ON "expenses" USING btree ("expense_date");--> statement-breakpoint
CREATE INDEX "faf_run_id_idx" ON "finance_audit_findings" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "faf_severity_idx" ON "finance_audit_findings" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "faf_status_idx" ON "finance_audit_findings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "far_overall_status_idx" ON "finance_audit_runs" USING btree ("overall_status");--> statement-breakpoint
CREATE INDEX "far_started_at_idx" ON "finance_audit_runs" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "order_return_events_order_idx" ON "order_return_events" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_return_events_type_idx" ON "order_return_events" USING btree ("type");--> statement-breakpoint
CREATE INDEX "order_return_events_status_idx" ON "order_return_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "order_return_events_created_at_idx" ON "order_return_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "pch_product_id_idx" ON "product_cost_history" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "pch_effective_from_idx" ON "product_cost_history" USING btree ("effective_from");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "social_interactions_comment_id_idx" ON "social_interactions" USING btree ("comment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_interactions_media_id_idx" ON "social_interactions" USING btree ("media_id");--> statement-breakpoint
CREATE INDEX "orders_source_idx" ON "orders" USING btree ("source");
