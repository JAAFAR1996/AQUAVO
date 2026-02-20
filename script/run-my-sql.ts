import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { join } from "path";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function runArbitrarySql(sqlFile: string) {
  const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

  if (!databaseUrl) {
    console.error("❌ DATABASE_URL غير موجود في متغيرات البيئة");
    process.exit(1);
  }

  try {
    console.log(`\n⏳ تشغيل ملف SQL: ${sqlFile}\n`);
    
    // Connect using serverless Neon
    const sql = neon(databaseUrl);

    // Read SQL file from project root
    const filePath = join(process.cwd(), sqlFile);
    const fileContent = readFileSync(filePath, "utf-8");
    
    // Quick split by semicolon (a bit naive but works for simple updates)
    const statements = fileContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

    console.log(`⏳ تنفيذ ${statements.length} أوامر SQL...\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        console.log(`  [${i + 1}/${statements.length}] تنفيذ...`);
        await sql(statement);
      }
    }

    console.log("\n✅ تم التنفيذ بنجاح!");
    
  } catch (error: any) {
    console.error("\n❌ حدث خطأ:");
    console.error(error.message);
    process.exit(1);
  }
}

const fileToRun = process.argv[2];
if (!fileToRun) {
  console.error("يرجى تزويد اسم الملف، مثال: npx tsx script/run-my-sql.ts fix_image_paths.sql");
  process.exit(1);
}

runArbitrarySql(fileToRun);
