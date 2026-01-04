import { neon } from "@neondatabase/serverless";

// Apply email_logs migration
async function applyMigration() {
    const sql = neon(process.env.DATABASE_URL!);

    console.log("🚀 Creating email_logs table...");

    try {
        // Create the table
        await sql`
      CREATE TABLE IF NOT EXISTS "email_logs" (
        "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "email_type" text NOT NULL,
        "recipient_email" text NOT NULL,
        "product_id" text,
        "product_name" text,
        "discount_percentage" integer,
        "status" text DEFAULT 'sent' NOT NULL,
        "error_message" text,
        "created_at" timestamp DEFAULT now() NOT NULL
      )
    `;
        console.log("✅ Table created");

        // Add foreign key constraint
        await sql`
      ALTER TABLE "email_logs" 
      ADD CONSTRAINT IF NOT EXISTS "email_logs_product_id_products_id_fk" 
      FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") 
      ON DELETE no action ON UPDATE no action
    `.catch(() => console.log("⚠️  Foreign key may already exist"));

        // Create indexes
        await sql`CREATE INDEX IF NOT EXISTS "email_logs_email_type_idx" ON "email_logs" USING btree ("email_type")`;
        await sql`CREATE INDEX IF NOT EXISTS "email_logs_recipient_idx" ON "email_logs" USING btree ("recipient_email")`;
        await sql`CREATE INDEX IF NOT EXISTS "email_logs_created_at_idx" ON "email_logs" USING btree ("created_at")`;
        console.log("✅ Indexes created");

        console.log("\n🎉 Migration complete! email_logs table is ready.");

    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    }
}

applyMigration();
