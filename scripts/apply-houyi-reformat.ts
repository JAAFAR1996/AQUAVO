import { neon } from "@neondatabase/serverless";
import * as fs from "fs";
import * as path from "path";

const sql = neon("postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require");

const batches = [
    "houyi_reformat_batch1.sql",
    "houyi_reformat_batch2.sql",
    "houyi_reformat_batch3.sql",
    "houyi_reformat_batch4.sql",
    "houyi_reformat_batch5.sql",
    "houyi_reformat_batch6.sql",
];

async function main() {
    console.log("🚀 Starting Houyi products reformat (YEE style)...\n");

    let totalUpdated = 0;
    let totalErrors = 0;

    for (const batchFile of batches) {
        const filePath = path.join(process.cwd(), batchFile);
        if (!fs.existsSync(filePath)) {
            console.log(`❌ File not found: ${batchFile}`);
            continue;
        }

        // Normalize line endings to \n
        const content = fs.readFileSync(filePath, "utf-8").replace(/\r\n/g, "\n").replace(/\r/g, "\n");

        // Extract UPDATE...WHERE id = '...' blocks
        const regex = /UPDATE\s+products[\s\S]*?WHERE\s+id\s*=\s*'[^']+'/g;
        const matches = content.match(regex) || [];

        console.log(`📂 ${batchFile}: ${matches.length} UPDATE statements`);

        for (const stmt of matches) {
            const fullStmt = stmt.trim() + ";";
            const idMatch = fullStmt.match(/WHERE\s+id\s*=\s*'([^']+)'/i);
            const productId = idMatch?.[1] || "unknown";

            try {
                await sql(fullStmt);
                totalUpdated++;
                console.log(`  ✅ ${productId}`);
            } catch (err: any) {
                totalErrors++;
                console.log(`  ❌ ${productId}: ${err.message?.substring(0, 120)}`);
            }
        }
        console.log("");
    }

    console.log(`\n🎉 Done! Updated: ${totalUpdated} | Errors: ${totalErrors}`);
}

main().catch(console.error);
