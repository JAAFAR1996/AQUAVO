CREATE TABLE "email_logs" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email_type" text NOT NULL,
	"recipient_email" text NOT NULL,
	"product_id" text,
	"product_name" text,
	"discount_percentage" integer,
	"status" text DEFAULT 'sent' NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_logs_email_type_idx" ON "email_logs" USING btree ("email_type");--> statement-breakpoint
CREATE INDEX "email_logs_recipient_idx" ON "email_logs" USING btree ("recipient_email");--> statement-breakpoint
CREATE INDEX "email_logs_created_at_idx" ON "email_logs" USING btree ("created_at");