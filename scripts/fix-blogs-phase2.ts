import "dotenv/config";
import { db } from "../server/db.js";
import { blogPosts } from "../shared/schema.js";
import { eq } from "drizzle-orm";

async function run() {
  console.log("Phase 2: Cleaning content errors...");
  const posts = await db.query.blogPosts.findMany();
  let cleaned = 0;

  for (const post of posts) {
    let content = post.content;
    let changed = false;

    // 1. Fix Spanish words leaked from AI
    const spanishFixes: [RegExp, string][] = [
      [/capacidad/gi, "سعة"],
      [/también/gi, "أيضاً"],
      [/ejemplo/gi, "مثال"],
      [/información/gi, "معلومات"],
      [/importante/gi, "مهم"],
      [/necesario/gi, "ضروري"],
      [/temperatura/gi, "درجة حرارة"],
      [/problema/gi, "مشكلة"],
    ];

    for (const [pattern, replacement] of spanishFixes) {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        changed = true;
        console.log(`  🔤 Fixed Spanish word in: ${post.title}`);
      }
    }

    // 2. Fix markdown bold **text** inside HTML (won't render)
    const mdBoldRegex = /\*\*([^*]+)\*\*/g;
    if (mdBoldRegex.test(content)) {
      content = content.replace(mdBoldRegex, "<strong>$1</strong>");
      changed = true;
      console.log(`  📝 Fixed markdown-in-HTML in: ${post.title}`);
    }

    // 3. Fix markdown italic *text* inside HTML
    const mdItalicRegex = /(?<!\*)\*([^*]+)\*(?!\*)/g;
    if (mdItalicRegex.test(content)) {
      content = content.replace(mdItalicRegex, "<em>$1</em>");
      changed = true;
    }

    // 4. Remove "الخلاصة للذكاء الاصطناعي" boxes (looks weird to users)
    if (content.includes("الخلاصة للذكاء الاصطناعي")) {
      content = content.replace(
        /<div[^>]*>[\s\S]*?الخلاصة للذكاء الاصطناعي[\s\S]*?<\/div>/gi,
        ""
      );
      changed = true;
      console.log(`  🗑️ Removed AI summary box in: ${post.title}`);
    }

    // 5. Wrap loose text in <p> tags (content not inside any tag)
    content = content.replace(/^([^<\s].{20,})$/gm, "<p>$1</p>");

    // 6. Fix empty paragraphs
    content = content.replace(/<p>\s*<\/p>/g, "");

    // 7. Add AQUAVO branding box at the end if missing
    if (!content.includes("AQUAVO") && !content.includes("أكوافو")) {
      content += `
<div style="background: linear-gradient(135deg, rgba(0,150,136,0.1), rgba(0,150,136,0.05)); border: 1px solid rgba(0,150,136,0.2); border-radius: 16px; padding: 24px; margin-top: 32px;">
  <h3 style="color: #009688; margin-bottom: 12px;">🐟 AQUAVO — شريكك في عالم الأحواض</h3>
  <p>نوفر لك في <strong>AQUAVO</strong> كل ما تحتاجه لحوض أسماك ناجح وصحي. تسوق الآن من أول متجر إلكتروني متخصص بأسماك الزينة في العراق — توصيل لجميع المحافظات الـ 18!</p>
</div>`;
      changed = true;
    }

    if (changed) {
      await db.update(blogPosts)
        .set({ content })
        .where(eq(blogPosts.id, post.id));
      cleaned++;
      console.log(`✅ Cleaned: ${post.title}`);
    }
  }

  console.log(`\n🎉 Phase 2 done! Cleaned ${cleaned} posts.`);
  process.exit(0);
}

run();
