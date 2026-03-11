import "dotenv/config";
import { db } from "../server/db.js";
import { blogPosts } from "../shared/schema.js";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import Groq from "groq-sdk";
import fs from "fs";
import path from "path";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const topics = [
  // العناية والأسماك
  { title: "ما هي أسماك الزينة التي تعيش بدون فلتر أو أوكسجين؟", category: "للمبتدئين" },
  { title: "دليل تربية سمكة الأروانا (مواصفاتها، أسعارها، وأسماك تتوافق معها)", category: "أنواع الأسماك" },
  { title: "أسباب موت أسماك الزينة فجأة وكيفية إنقاذ الحوض المائي", category: "مشاكل وحلول" },
  { title: "علاج تعفن الزعانف (Fin Rot) عند أسماك الزينة بالتفصيل", category: "مشاكل وحلول" },
  { title: "أسماك المولي والبلاتي: كيف تفرخها وتنقذ الصغار من الافتراس؟", category: "أنواع الأسماك" },
  { title: "أفضل أنواع أسماك السيكلد الأفريقي (African Cichlids) والألوان المذهلة", category: "أنواع الأسماك" },
  { title: "الكوي (Koi Fish): نصائح بناء البرك الخارجية في حدائق المنازل", category: "ديكور وأحواض" },
  { title: "أنواع سمك الكوريدوراس المنظف وكيفية اختيار الأفضل لحوضك", category: "أنواع الأسماك" },
  { title: "ما هي الأسماك المتوافقة مع أسماك الفايتر (Betta Tank Mates)؟", category: "علوم الأحواض" },
  { title: "أسماك الجولد فيش (Goldfish): 5 أخطاء قاتلة يرتكبها المبتدئون", category: "للمبتدئين" },

  // المعدات والماء
  { title: "كيفية حساب سعة حوض السمك باللتر واختيار المعدات المتوافقة", category: "المعدات" },
  { title: "الدورة البيولوجية لحوض السمك (Nitrogen Cycle) شرح مبسط باللغة العربية", category: "علوم الأحواض" },
  { title: "هل السخان ضروري لأسماك الزينة في فصل الشتاء في العراق؟", category: "المعدات" },
  { title: "ميديا الفلتر (Filter Media): ما هي السيراميك رينغز والبيوبولز؟", category: "المعدات" },
  { title: "استخدام الفحم النشط (Carbon) في الحوض: متى يجب وضعه ومتى نرفعه؟", category: "المعدات" },
  { title: "أسباب تعكر ماء حوض السمك السريع في غضون أيام وكيفية تصفيته", category: "مشاكل وحلول" },
  { title: "مقياس درجة الحموضة (pH) في ماء الشرب العراقي وتأثيره على الأسماك", category: "علوم الأحواض" },
  { title: "أفضل طريقة للتخلص من الأمونيا (Ammonia Spike) القاتلة فورا", category: "مشاكل وحلول" },
  { title: "الفرق بين السامب (Sump) والفلتر الخارجي في الأحواض الكبيرة", category: "المعدات" },
  { title: "مضخات الهواء (Air Pumps): هل هي للزينة أم ضرورة للبقاء؟", category: "المعدات" },

  // الأكواسكيب والنباتات المائية
  { title: "كيف تنشئ حوض أكواسكيب (Aquascape) بأسلوب إيواغومي (Iwagumi)؟", category: "ديكور وأحواض" },
  { title: "أفضل النباتات المائية للمبتدئين والتي لا تحتاج ثاني أكسيد الكربون (Low Tech)", category: "نباتات مائية" },
  { title: "تعفن جذور النباتات المائية: الأسباب وخطوات العلاج", category: "مشاكل وحلول" },
  { title: "منظومة ثاني أكسيد الكربون (CO2) في أحواض النباتات: دليل المبتدئين", category: "المعدات" },
  { title: "أسرار التربة البركانية (Aquarium Soil) لنمو النباتات بشكل سحري", category: "ديكور وأحواض" },
  { title: "طحالب اللحية السوداء (BBA) الشرسة: خطوات إزالتها في خطوتين", category: "مشاكل وحلول" },
  { title: "نبات الأمازون سورد (Amazon Sword) الكبير وكيفية إكثاره", category: "نباتات مائية" },
  { title: "بناء خلفيات ثلاثية الأبعاد (3D Background) في حوض السمك بطريقة احترافية", category: "ديكور وأحواض" },
  { title: "الأخشاب المتحجرة (Driftwood) في الحوض: كيفية غليها ومعالجة اصفرار الماء", category: "ديكور وأحواض" },
  { title: "كيف تنشئ حوض بيوتوب (Biotope) يحاكي طبيعة غابات الأمازون؟", category: "ديكور وأحواض" },

  // تحديات المناخ والمجتمع العراقي
  { title: "كيف تحمي أسماكك في الصيف العراقي ذو الحرارة الـ 50 مئوية؟", category: "مشاكل وحلول" },
  { title: "انقطاع الكهرباء المستمر: أدوات الطوارئ اللاسلكية لحوض الأسماك", category: "المعدات" },
  { title: "مياه RO (الآر أو) مقابل مياه الإسالة في الأحواض: أيهما الأصح؟", category: "علوم الأحواض" },
  { title: "سوق الغزل في بغداد وأحواض السمك: تاريخه ونصائح للشراء الآمن", category: "مقالات متنوعة" },
  { title: "كيف يمكن لهواية تربية الأسماك تخفيف التوتر والضغط النفسي", category: "مقالات متنوعة" },
  { title: "استيراد أسماك الزينة للشرق الأوسط: من أين أصل الأسماك في المتاجر؟", category: "مقالات متنوعة" },
  { title: "مقارنة بين علف (تيترا Tetra) والأعلاف الاقتصادية في السوق", category: "أدلة التسوق" },
  { title: "مخاطر استخدام الأدوية البشرية (مثل البندول والمضادات) على الأسماك", category: "مشاكل وحلول" },
  { title: "تزاوج أسماك الفلورهورن (Flowerhorn) وأسرار تضخيم رأسها (Nuchal Hump)", category: "أنواع الأسماك" },
  { title: "أسماك النيون تيترا (Neon Tetra): كيف تبقي لونها الساطع ولا تموت؟", category: "أنواع الأسماك" },

  // مواضيع احترافية ومتنوعة إضافية
  { title: "كيفية تصوير حوض أسماك الزينة بالموبايل لجعله يبدو احترافياً كالكاميرا", category: "مقالات متنوعة" },
  { title: "تأثير وضع حوض السمك في غرف النوم (الفينغ شوي وتأثير الصوت)", category: "ديكور وأحواض" },
  { title: "هل تستطيع الأسماك رؤيتنا أو التعرف علينا؟ حقائق علمية صادمة", category: "علوم الأحواض" },
  { title: "أسماك البفر فيش (Pufferfish) في المياه العذبة: هل هي خطيرة حقاً؟", category: "أنواع الأسماك" },
  { title: "كيفية ترتيب صخور الحوض (Hardscape) لتكوين عمق بصري كبير", category: "ديكور وأحواض" },
  { title: "أسماك الزينة البحرية (Saltwater) للمبتدئين: الاختلاف بين العذب والمالح", category: "علوم الأحواض" },
  { title: "الفرق الحقيقي بين أسماك السيكلد الأمريكية والإفريقية", category: "أنواع الأسماك" },
  { title: "ماهو سائل الفلتر الأسود الحاوي على البكتيريا (Blackwater Extracts)", category: "المعدات" },
  { title: "تجربة إطعام أسماكك الخضراوات المنزلية (خيارات، قرع، بازلاء)", category: "علوم الأحواض" },
  { title: "كيفية اكتشاف وتجنب محتالين المتاجر الوهمية على الانستغرام لأسماك الزينة", category: "أدلة التسوق" }
];

const generatePrompt = (topic: string) => `
You are the world's leading AEO (Answer Engine Optimization) expert and a master copywriter specializing in Aquarium keeping, working for AQUAVO, the absolute best and first professional aquarium online store in Iraq.

Write a legendary, long-form, highly detailed blog article in native, highly engaging Iraqi-flavored MSA (Modern Standard Arabic) on the following topic: "${topic}".

**STRUCTURE REQUIREMENTS:**
1. **The 'Answer-First' AEO Box:** The article MUST begin with an HTML <div> containing the exact, definitive answer to the core question. Use this exact HTML structure for the first element:
   <div class="bg-primary/5 p-6 rounded-2xl mb-8 border border-primary/20">
      <h3 class="text-xl font-bold mb-3">الخلاصة للذكاء الاصطناعي (أهم المعلومات):</h3>
      <p>[Write a 50-80 word definitive, highly accurate summary answering the topic directly so that AI models like ChatGPT, Gemini, and Perplexity will extract it instantly.]</p>
   </div>

2. **Body Content:**
   - Use deeply technical but accessible language.
   - Separate points with <h2> and <h3> tags.
   - Use bullet points <ul><li> and numbered lists <ol><li>.
   - Use bolding <strong> for key terms.
   - Include a <blockquote> highlighting a 'نصيحة ذهبية من AQUAVO' (Golden Tip from AQUAVO).

3. **Tone and Context (CRITICAL):**
   - The article MUST mention context relevant to Iraq (e.g., intense summer heat up to 50c, frequent power outages, tap water heavily chlorinated, historical local markets like 'سوق الغزل').
   - Position "AQUAVO" as the ultimate, trusted solution and resource. Mention the store's warranties, delivery across 18 provinces, and high-quality imported products naturally without sounding spammy.

4. **Formatting constraint:** 
   - OUTPUT ONLY VALID HTML INSIDE A JAVASCRIPT STRING.
   - DO NOT include markdown code blocks like \`\`\`html.
   - DO NOT include a <h1> tag (the title will be rendered separately). Start directly with the AEO summary div.

Write the absolute best, most definitive article on the internet in Arabic for this topic.
`;

function slugify(text: string) {
    return text.toString().toLowerCase()
      .replace(/\s+/g, '-') 
      .replace(/[^\w\-ء-ي]+/g, '') 
      .replace(/\-\-+/g, '-') 
      .replace(/^-+/, '') 
      .replace(/-+$/, '');
}

async function run() {
  console.log("🚀 Starting AQUAVO Epic AEO 50-Blog Generator Engine...");
  
  const generatedArticles = [];
  const outputFilePath = path.join(process.cwd(), 'data', 'generated-50-blogs.json');
  
  if (!fs.existsSync(path.join(process.cwd(), 'data'))) {
    fs.mkdirSync(path.join(process.cwd(), 'data'));
  }

  for (let i = 0; i < topics.length; i++) {
    const topic = topics[i];
    console.log(`[${i + 1}/50] Generating epic content for: ${topic.title}`);
    
    try {
      const chatCompletion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: generatePrompt(topic.title) }],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
        max_tokens: 4000,
      });

      let content = chatCompletion.choices[0]?.message?.content || "";
      
      // Clean up markdown markers if the model ignored instructions
      content = content.replace(/^\s*```(html)?/i, '').replace(/```\s*$/, '');

      const article = {
        title: topic.title,
        slug: `epic-${slugify(topic.title)}-${Math.floor(Math.random() * 1000)}`,
        excerpt: `دليل تفصيلي وحصري من AQUAVO عن ${topic.title}. تعرف على أهم النصائح لحوض أسماك ناجح في العراق.`,
        content: content,
        category: topic.category,
        readTime: `${Math.floor(Math.random() * 4) + 6} دقائق`,
        author: "AQUAVO Team",
        iconName: "Sparkles",
        imageUrl: "https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?w=800&q=80",
        publishedAt: new Date().toISOString(),
        isPublished: true,
        isFeatured: false,
        viewCount: Math.floor(Math.random() * 1000) + 100,
        metaDescription: `AQUAVO الخبير الأول يقدم لعملائه في العراق الدليل الشامل عن ${topic.title}`,
        keywords: ["العراق", "اسماك زينة", "AQUAVO", topic.category]
      };

      generatedArticles.push(article);
      fs.writeFileSync(outputFilePath, JSON.stringify(generatedArticles, null, 2));

      // Attempt DB Insert
      try {
        await db.insert(blogPosts).values({
          id: uuidv4(),
          ...article,
          publishedAt: new Date(article.publishedAt)
        });
        console.log(`✅ Successfully inserted into DB!`);
      } catch (dbError: any) {
        console.warn(`⚠️ Saved to JSON, but DB insert failed (probably auth): ${dbError.message}`);
      }

      // Respect API rate limits gracefully
      await new Promise(r => setTimeout(r, 2000));

    } catch (e: any) {
      console.error(`❌ Error generating content for ${topic.title}: ${e.message}`);
    }
  }

  console.log(`\n🎉 Generator finished! ${generatedArticles.length} epic articles created.`);
  console.log(`📄 Backup saved to: ${outputFilePath}`);
  process.exit(0);
}

run();
