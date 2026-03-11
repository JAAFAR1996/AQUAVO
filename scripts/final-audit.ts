import "dotenv/config";
import { db } from "../server/db.js";
import { blogPosts } from "../shared/schema.js";

async function run() {
  const posts = await db.query.blogPosts.findMany();
  let shortCount = 0;
  let uglySlugCount = 0;
  let spamExcerpt = 0;
  for (const p of posts) {
    if (p.content.length < 1200) shortCount++;
    if (p.slug.includes("epic-") || /[0-9]{3}$/.test(p.slug)) uglySlugCount++;
    if ((p.excerpt || "").startsWith("دليل تفصيلي وحصري")) spamExcerpt++;
  }
  console.log("TOTAL POSTS:", posts.length);
  console.log("Short posts (<1200 chars):", shortCount);
  console.log("Ugly slugs remaining:", uglySlugCount);
  console.log("Spam excerpts remaining:", spamExcerpt);
  console.log("Avg content length:", Math.round(posts.reduce((s, p) => s + p.content.length, 0) / posts.length));
  process.exit(0);
}
run();
