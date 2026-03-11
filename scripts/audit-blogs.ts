import "dotenv/config";
import { db } from "../server/db.js";
import { blogPosts } from "../shared/schema.js";

async function run() {
  const posts = await db.query.blogPosts.findMany();
  
  for (const p of posts) {
    console.log(JSON.stringify({
      id: p.id,
      title: p.title,
      slug: p.slug,
      category: p.category,
      excerpt: (p.excerpt || "").substring(0, 100),
      contentLen: p.content.length,
      imageUrl: p.imageUrl
    }));
  }
  
  console.log("\n===== TOTAL:", posts.length, "=====");
  process.exit(0);
}

run();
