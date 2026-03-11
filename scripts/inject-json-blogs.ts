import "dotenv/config";
import { db } from "../server/db.js";
import { blogPosts } from "../shared/schema.js";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

async function run() {
  console.log("Loading generated articles from JSON backup...");
  const jsonPath = path.join(process.cwd(), "data", "generated-50-blogs.json");
  
  if (!fs.existsSync(jsonPath)) {
    console.error("Backup file not found at " + jsonPath);
    process.exit(1);
  }

  const articles = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  console.log(`Found ${articles.length} articles in backup.`);
  
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const article of articles) {
    try {
      if (!article.id) {
        article.id = uuidv4();
      }
      article.publishedAt = new Date(article.publishedAt);
      
      await db.insert(blogPosts).values(article);
      successCount++;
      console.log(`✅ Injected: ${article.title}`);
    } catch (e: any) {
      if (e.code === '23505') {
        skipCount++;
        console.log(`⚠️ Skipped (already exists): ${article.title}`);
      } else {
        errorCount++;
        console.error(`❌ Error inserting ${article.title}:`, e.message);
      }
    }
  }

  console.log(`\\n🎉 Injection Complete!`);
  console.log(`Success: ${successCount}`);
  console.log(`Skipped: ${skipCount}`);
  console.log(`Errors: ${errorCount}`);
  process.exit(0);
}

run();
