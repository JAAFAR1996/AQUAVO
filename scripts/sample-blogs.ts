import "dotenv/config";
import { db } from "../server/db.js";
import { blogPosts } from "../shared/schema.js";
import fs from "fs";

async function run() {
  const posts = await db.query.blogPosts.findMany();
  
  // Sample 3 short posts + 3 epic posts to check content quality
  const shortPosts = posts.filter(p => p.content.length < 1200).slice(0, 3);
  const epicPosts = posts.filter(p => p.slug.startsWith("epic-")).slice(0, 3);
  
  const samples = [...shortPosts, ...epicPosts];
  
  for (const p of samples) {
    console.log("=".repeat(80));
    console.log(`TITLE: ${p.title}`);
    console.log(`SLUG: ${p.slug}`);
    console.log(`CATEGORY: ${p.category}`);
    console.log(`EXCERPT: ${p.excerpt}`);
    console.log(`CONTENT LENGTH: ${p.content.length} chars`);
    console.log(`IMAGE: ${p.imageUrl}`);
    console.log("--- CONTENT START ---");
    console.log(p.content.substring(0, 1500));
    console.log("--- CONTENT END ---");
  }
  
  process.exit(0);
}

run();
