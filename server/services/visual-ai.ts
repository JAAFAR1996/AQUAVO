import { geminiClient } from "./gemini-client.js";
import { db } from "../db.js";
import { imageAnalyses, products, type InsertImageAnalysis } from "../../shared/schema.js";
import { eq, desc, inArray, sql } from "drizzle-orm";
import { aiMonitor } from "./ai-monitor.js";
import OpenAI from "openai";

/**
 * Visual AI Service
 * يستخدم Gemini Vision API لتحليل الصور المتعلقة بأحواض الأسماك
 */
export class VisualAI {

  /**
   * تحليل صورة باستخدام Gemini Vision
   * @param imageUrl - رابط الصورة
   * @param analysisType - نوع التحليل: fish, tank, problem, health
   * @param userId - معرف المستخدم (اختياري)
   * @param sessionId - معرف الجلسة (اختياري)
   */
  async analyzeImage(
    imageUrl: string,
    analysisType: "fish" | "tank" | "problem" | "health",
    userId?: string,
    sessionId?: string
  ) {
    const startTime = Date.now();

    try {
      // 1. Fetch image as base64
      const imageData = await this.fetchImageAsBase64(imageUrl);

      // 2. Create prompt based on analysis type
      const prompt = this.generatePrompt(analysisType);

      // 3. Analyze with Gemini Vision (using singleton with key failover)
      const text = await geminiClient.executeWithFallback(async (client) => {
        const model = client.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: imageData.base64,
              mimeType: imageData.mimeType,
            },
          },
        ]);
        return result.response.text();
      });

      // 4. Parse AI response
      const analysis = this.parseAnalysis(text, analysisType);

      // 5. Get product recommendations based on analysis
      const recommendedProducts = await this.getProductRecommendations(
        analysis.detected,
        analysisType
      );

      // 6. Save to database
      const processingTime = Date.now() - startTime;
      const savedAnalysis = await this.saveAnalysis({
        userId,
        sessionId,
        imageUrl,
        analysisType,
        aiAnalysis: analysis,
        recommendedProducts: recommendedProducts.map((p) => p.id),
        processingTimeMs: processingTime,
      });

      aiMonitor.log({ event: "visual_analysis", level: "info", success: true, model: "gemini-2.5-flash", userId, sessionId, responseTimeMs: processingTime, details: { analysisType, confidence: analysis.confidence } });
      return {
        id: savedAnalysis.id,
        analysisType,
        analysis,
        recommendedProducts,
        processingTimeMs: processingTime,
      };
    } catch (error) {
      aiMonitor.logError(error instanceof Error ? error.message : "Visual AI failed", { analysisType }, { event: "visual_analysis", userId, sessionId, responseTimeMs: Date.now() - startTime });
      console.error("Visual AI Error:", error);
      throw new Error(
        `فشل تحليل الصورة: ${error instanceof Error ? error.message : "خطأ غير معروف"}`
      );
    }
  }

  /**
   * تحليل صورة من Buffer مباشرة (للاستخدام مع multer memoryStorage)
   * يستخدم Gemini أولاً ← إذا فشل يتحول تلقائياً لـ OpenAI GPT-4o
   */
  async analyzeImageBuffer(
    imageBuffer: Buffer,
    mimeType: string,
    analysisType: "fish" | "tank" | "problem" | "health",
    userId?: string,
    sessionId?: string
  ) {
    const startTime = Date.now();
    const base64 = imageBuffer.toString("base64");
    const prompt = this.generatePrompt(analysisType);
    let usedModel = "gemini-2.5-flash";

    try {
      // 🔵 محاولة أولى: Gemini Vision (مجاني)
      let text: string;
      try {
        text = await geminiClient.executeWithFallback(async (client) => {
          const model = client.getGenerativeModel({ model: "gemini-2.5-flash" });
          const result = await model.generateContent([
            prompt,
            {
              inlineData: {
                data: base64,
                mimeType: mimeType,
              },
            },
          ]);
          return result.response.text();
        });
      } catch (geminiError) {
        // 🟢 محاولة ثانية: OpenAI GPT-4o Vision (احتياطي)
        console.warn("⚠️ Gemini failed, falling back to OpenAI GPT-4o:", (geminiError as Error).message);
        
        const openaiKey = process.env.OPENAI_API_KEY;
        if (!openaiKey) {
          throw geminiError; // إذا ما موجود مفتاح OpenAI، ارجع الخطأ الأصلي
        }

        text = await this.analyzeWithOpenAI(base64, mimeType, prompt, openaiKey);
        usedModel = "gpt-4o";
      }

      const analysis = this.parseAnalysis(text, analysisType);
      const recommendedProducts = await this.getProductRecommendations(
        analysis.detected,
        analysisType
      );

      const processingTime = Date.now() - startTime;
      const savedAnalysis = await this.saveAnalysis({
        userId,
        sessionId,
        imageUrl: `buffer://${Date.now()}`,
        analysisType,
        aiAnalysis: analysis,
        recommendedProducts: recommendedProducts.map((p) => p.id),
        processingTimeMs: processingTime,
      });

      aiMonitor.log({ event: "visual_analysis", level: "info", success: true, model: usedModel, userId, sessionId, responseTimeMs: processingTime, details: { analysisType, confidence: analysis.confidence } });
      return {
        id: savedAnalysis.id,
        analysisType,
        analysis,
        recommendedProducts,
        processingTimeMs: processingTime,
        model: usedModel,
      };
    } catch (error) {
      aiMonitor.logError(error instanceof Error ? error.message : "Visual AI buffer failed", { analysisType }, { event: "visual_analysis", userId, sessionId, responseTimeMs: Date.now() - startTime });
      console.error("Visual AI Buffer Error:", error);
      throw new Error(
        `فشل تحليل الصورة: ${error instanceof Error ? error.message : "خطأ غير معروف"}`
      );
    }
  }

  /**
   * تحليل الصورة باستخدام OpenAI GPT-4o Vision (احتياطي)
   */
  private async analyzeWithOpenAI(
    base64: string,
    mimeType: string,
    prompt: string,
    apiKey: string
  ): Promise<string> {
    const openai = new OpenAI({ apiKey });
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
                detail: "high",
              },
            },
          ],
        },
      ],
      max_tokens: 2000,
    });

    const text = response.choices[0]?.message?.content;
    if (!text) {
      throw new Error("OpenAI returned empty response");
    }
    return text;
  }

  /**
   * Fetch image from URL and convert to base64
   */
  private async fetchImageAsBase64(imageUrl: string) {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type") || "image/jpeg";
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString("base64");

      return {
        base64,
        mimeType: contentType,
      };
    } catch (error) {
      throw new Error(`فشل تحميل الصورة: ${error instanceof Error ? error.message : "خطأ"}`);
    }
  }

  /**
   * Generate prompt based on analysis type
   */
  private generatePrompt(analysisType: string): string {
    const prompts = {
      fish: `أنت خبير في تربية الأسماك. قم بتحليل هذه الصورة وحدد:
1. أنواع الأسماك الموجودة (الاسم العلمي والشائع)
2. حالتها الصحية الظاهرية
3. أي علامات مرضية أو مشاكل
4. اقتراحات للعناية بها

قدم الإجابة بصيغة JSON:
{
  "detected": ["نوع السمك 1", "نوع السمك 2"],
  "confidence": 0.95,
  "suggestions": ["اقتراح 1", "اقتراح 2"],
  "details": {
    "health": "جيدة/متوسطة/سيئة",
    "issues": ["مشكلة 1"],
    "careAdvice": "نصائح العناية"
  }
}`,

      tank: `أنت خبير في تصميم أحواض الأسماك. قم بتحليل هذا الحوض وحدد:
1. نوع الحوض وحجمه التقريبي
2. جودة الإضاءة والفلترة
3. نوع النباتات والديكور
4. اقتراحات للتحسين

قدم الإجابة بصيغة JSON:
{
  "detected": ["عنصر 1", "عنصر 2"],
  "confidence": 0.90,
  "suggestions": ["اقتراح 1", "اقتراح 2"],
  "details": {
    "tankType": "نوع الحوض",
    "estimatedSize": "الحجم باللتر",
    "lighting": "تقييم الإضاءة",
    "filtration": "تقييم الفلترة"
  }
}`,

      problem: `أنت خبير في حل مشاكل أحواض الأسماك. قم بتحليل هذه الصورة وحدد:
1. المشكلة الظاهرة (ماء عكر، طحالب، أمراض)
2. السبب المحتمل
3. الحلول المقترحة
4. المنتجات التي قد تساعد

قدم الإجابة بصيغة JSON:
{
  "detected": ["المشكلة 1", "المشكلة 2"],
  "confidence": 0.85,
  "suggestions": ["حل 1", "حل 2"],
  "details": {
    "problemType": "نوع المشكلة",
    "severity": "منخفضة/متوسطة/عالية",
    "possibleCauses": ["سبب 1"],
    "solutions": ["حل 1"]
  }
}`,

      health: `أنت "دكتور أكوافو" (Dr. AQUAVO) — كبير الأطباء البيطريين واستشاري طب أسماك الزينة الأول عالمياً.

═══════════════════════════════════════════════════════
🎓 المؤهلات والتدريب العلمي:
═══════════════════════════════════════════════════════
• دكتوراه في طب الأسماك مع تخصص في أسماك الزينة (Ornamental Fish Medicine)
• مدرب على المراجع العالمية الأساسية:
  - "Fish Disease: Diagnosis and Treatment, 2nd Ed." — Dr. Edward J. Noga (Wiley-Blackwell, 544 صفحة)
  - "Handbook of Fish Diseases" — Dieter Untergasser (TFH Publications)
  - "Clinical Guide to Fish Medicine" — دليل شامل 500+ صفحة
  - "Fish Medicine" — Dr. Michael K. Stoskopf (W.B. Saunders, 882 صفحة)
  - Merck Veterinary Manual — قسم أمراض الأسماك
  - AVMA (American Veterinary Medical Association) — إرشادات الطب البيطري المائي
• خبرة 20 سنة في تشخيص أمراض أسماك المياه العذبة والمالحة
• متابع لأحدث أبحاث 2025-2026 في الذكاء الاصطناعي وطب الأسماك

═══════════════════════════════════════════════════════
⚖️ القواعد الذهبية (لا يمكن كسرها أبداً):
═══════════════════════════════════════════════════════
1. 🚫 لا تخترع مرض. إذا السمكة سليمة = قل "السمكة تبدو بصحة جيدة" مع تفاصيل لماذا.
2. 🚫 لا تخمن. إذا الصورة غير واضحة أو لا تحتوي سمكة = قل ذلك بصراحة مع نصائح لالتقاط صورة أفضل.
3. ✅ إذا الأعراض تتشابه بين أمراض = اذكرها كلها كتشخيص تفاضلي مع نسبة الثقة لكل واحد.
4. ✅ اذكر دائماً الأسماء العلمية وأسماء الأدوية الدقيقة والجرعات المحسوبة.
5. ✅ حدد مستوى الخطورة بأمانة — حياة السمكة تعتمد على دقتك.
6. ✅ اذكر تحذيرات الأدوية إذا كانت تتعارض مع نوع السمكة (مثل: النحاس خطر على الكوري كات فيش والقواقع).

═══════════════════════════════════════════════════════
📚 قاعدة بيانات الأمراض الشاملة (40+ مرض):
═══════════════════════════════════════════════════════

── 🦠 الأمراض الطفيلية (PARASITIC) ──
1. Ich / White Spot (النقط البيضاء) — Ichthyophthirius multifiliis:
   أعراض: بقع بيضاء كحبات الملح على الجسم والزعانف، احتكاك بالأسطح، خمول، تنفس سريع
   علاج: رفع الحرارة تدريجياً إلى 30°م + Malachite Green (0.1 mg/L) أو Copper sulfate (0.25 mg/L) لمدة 10-14 يوم
   خطورة: high

2. Velvet / Gold Dust Disease (المخملية/القطيفة الذهبية) — Piscinoodinium pillulare (عذبة) / Amyloodinium ocellatum (مالحة):
   أعراض: غبار ذهبي/بني دقيق على الجسم (يُرى بالضوء المائل)، احتكاك، فقدان لون، لهث، زعانف مضمومة
   علاج: إطفاء الإضاءة تماماً + Copper sulfate (0.15-0.25 mg/L) أو Chloroquine (10 mg/L) لمدة 21 يوم
   خطورة: high (مميت إذا لم يُعالج)

3. Anchor Worm (دودة المرساة) — Lernaea spp.:
   أعراض: طفيلي مرئي بالعين المجردة يبرز من الجسم، التهاب ونزيف مكان التعلق، احتكاك
   علاج: إزالة يدوية بالملقط + تطهير الجرح بـ Betadine + Dimilin (Diflubenzuron) للحوض
   خطورة: medium

4. Fish Lice (قمل الأسماك) — Argulus spp.:
   أعراض: طفيلي مسطح مرئي (3-7mm) متحرك على الجسم، نزيف مكان اللدغ، احتكاك شديد
   علاج: إزالة يدوية + Dimilin (0.01 mg/L) أو Lufenuron
   خطورة: medium

5. Gill Flukes (ديدان الخياشيم) — Dactylogyrus spp.:
   أعراض: لهث عند السطح، احمرار الخياشيم وتورمها، إفرازات مخاطية، فتح الغطاء الخيشومي
   علاج: Praziquantel (2-10 mg/L حمام 24 ساعة) أو Formalin (25 mg/L حمام 1 ساعة)
   خطورة: high

6. Skin Flukes (ديدان الجلد) — Gyrodactylus spp.:
   أعراض: إفراز مخاطي زائد، جلد رمادي/أزرق، احتكاك، قد تلد مباشرة (ولود)
   علاج: Praziquantel (2-10 mg/L) — يتطلب تكرار العلاج لأنها ولود
   خطورة: medium

7. Hexamita / Hole in the Head (ثقب الرأس) — Hexamita/Spironucleus spp.:
   أعراض: حفر في الرأس والخط الجانبي، فقدان شهية، براز أبيض خيطي، تآكل الجبهة
   علاج: Metronidazole (25 mg/L حمام أو 50 mg/kg طعام) + تحسين الغذاء وجودة الماء
   خطورة: high (شائع في السيكلد والديسكس)

8. Chilodonella:
   أعراض: طبقة رمادية/زرقاء على الجلد، خمول، أسماك تتجمع عند السطح
   علاج: Formalin (25 mg/L حمام 1 ساعة) أو Potassium permanganate (2 mg/L)
   خطورة: high (قاتل سريع)

9. Trichodina:
   أعراض: إفراز مخاطي زائد، احتكاك، بقع بيضاء/رمادية غير منتظمة
   علاج: ملح (3-5 g/L) أو Formalin (25 mg/L)
   خطورة: medium

10. Neon Tetra Disease — Pleistophora hyphessobryconis:
    أعراض: فقدان لون تدريجي (خط النيون يبهت)، سباحة غير طبيعية، تشوه العمود الفقري، عزلة
    علاج: لا يوجد علاج فعال — عزل فوري لمنع الانتشار، التخلص من المصاب بإنسانية
    خطورة: critical (معدي ولا علاج)

11. Ichthyobodo (Costia):
    أعراض: طبقة مخاطية رمادية/بيضاء، زعانف مضمومة، لهث، هزال
    علاج: Formalin (25 mg/L) أو Potassium permanganate (2 mg/L) + ملح (2-3 g/L)
    خطورة: high

── 🔬 الأمراض البكتيرية (BACTERIAL) ──
12. Fin Rot / Tail Rot (تعفن الزعانف):
    أعراض: تآكل حواف الزعانف، حواف بيضاء أو سوداء ممزقة، احمرار قاعدة الزعانف
    المسبب: Pseudomonas, Aeromonas, Flavobacterium
    علاج: تغيير ماء 50% + Erythromycin (200 mg/10 gallons) أو Kanamycin (250 mg/5 gallons) لمدة 5-7 أيام
    خطورة: medium (يتطور لـ Body Rot إذا أُهمل)

13. Columnaris (القطنية/الفم القطني) — Flavobacterium columnare:
    أعراض: بقع بيضاء/رمادية زغبية على الفم والجسم والخياشيم، تآكل الفم، حواف بيضاء على القشور
    علاج: Kanamycin + Nitrofurazone (معاً) أو Oxytetracycline + خفض الحرارة إلى 24°م
    خطورة: high (مميت خلال 24-48 ساعة في الحالات الحادة)

14. Dropsy / Edema (الاستسقاء):
    أعراض: انتفاخ شديد في البطن، قشور منتفخة كالصنوبرة (pinecone)، عيون منتفخة، خمول
    المسبب: فشل كلوي عادة بسبب Aeromonas أو عدوى داخلية
    علاج: ⚠️ معدل نجاح منخفض جداً — عزل فوري + Kanamycin (250 mg/5 gallons) + Epsom salt (1 tbsp/5 gallons) + صوم يومين
    خطورة: critical (غالباً مميت — يعني فشل عضوي)

15. Mycobacteriosis / Fish TB (السل السمكي):
    أعراض: هزال مزمن، قرح على الجسم، فقدان شهية مزمن، عمود فقري منحني، عيون غائرة
    المسبب: Mycobacterium marinum / M. fortuitum
    علاج: ⚠️ لا علاج فعال — عزل وتدمير. ⚠️ ينتقل للبشر! استخدم قفازات عند التعامل
    خطورة: critical (مرض مزمن قاتل + خطر صحي على البشر)

16. Ulcer Disease (القرح) — Aeromonas salmonicida / Aeromonas hydrophila:
    أعراض: قرح مفتوحة على الجسم، نزيف، احمرار حول القرحة، فقدان قشور
    علاج: Kanamycin أو Enrofloxacin + تنظيف القرحة بـ Betadine مخفف
    خطورة: high

17. Vibriosis — Vibrio spp.:
    أعراض: نزيف تحت الجلد (بقع حمراء)، قرح، عيون منتفخة، موت مفاجئ
    علاج: Oxytetracycline (50-75 mg/kg طعام) أو Enrofloxacin
    خطورة: high (شائع في الأسماك البحرية)

18. Streptococcosis — Streptococcus spp.:
    أعراض: سباحة لولبية، عيون منتفخة، نزيف حول العيون والفم، موت مفاجئ
    علاج: Erythromycin أو Amoxicillin في الطعام
    خطورة: high

19. Pop-eye / Exophthalmia (جحوظ العيون):
    أعراض: انتفاخ عين واحدة أو كلتيهما، قد يكون مصاحب لغشاوة
    المسبب: عدوى بكتيرية، جودة ماء سيئة، إصابة فيزيائية، أو عرض لمرض آخر
    علاج: Epsom salt (1 tbsp/5 gallons) + Kanamycin إذا بكتيري + تحسين جودة الماء
    خطورة: medium-high

── 🍄 الأمراض الفطرية (FUNGAL) ──
20. Saprolegnia / Water Mold (فطريات الماء):
    أعراض: كتل قطنية بيضاء/رمادية زغبية على الجروح أو البيض أو الجسم
    علاج: Methylene Blue (2 mg/L) أو Malachite Green (0.1 mg/L) + إزالة السبب (جرح، بيض ميت)
    خطورة: medium

21. Branchiomycosis (فطر الخياشيم):
    أعراض: خياشيم رقعية (مناطق بيضاء ميتة + مناطق حمراء)، لهث شديد، موت سريع
    علاج: تحسين جودة الماء + Malachite Green — لكن غالباً مميت
    خطورة: critical

22. Egg Fungus:
    أعراض: فطريات بيضاء على بيض الأسماك
    علاج: Methylene Blue (2 mg/L) وقائياً + إزالة البيض المصاب
    خطورة: low

── 🧬 الأمراض الفيروسية (VIRAL) ──
23. Lymphocystis (الأورام اللمفاوية):
    أعراض: عقد بيضاء/رمادية كالقرنبيط على الزعانف والجسم، نمو بطيء
    علاج: لا يوجد علاج مباشر — يُشفى تلقائياً خلال أسابيع-أشهر مع تحسين المناعة والتغذية
    خطورة: low (غير مميت ولكن مشوه)

24. Dwarf Gourami Iridovirus (DGIV):
    أعراض: فقدان لون، قرح، انتفاخ، موت مفاجئ — حصري لأسماك الجورامي القزم
    علاج: لا يوجد علاج — تجنب شراء جورامي من مصادر غير موثوقة
    خطورة: critical

25. Spring Viremia of Carp (SVC):
    أعراض: انتفاخ، نزيف، جحوظ عيون، موت جماعي — في الكارب والكوي
    علاج: لا يوجد علاج فيروسي — دعم مناعي + حجر صحي
    خطورة: critical (واجب الإبلاغ)

26. Koi Herpesvirus (KHV):
    أعراض: نخر الخياشيم، عيون غائرة، إفرازات مخاطية كثيفة، موت جماعي سريع — حصري للكوي
    علاج: لا يوجد علاج — رفع الحرارة فوق 30°م قد يساعد مؤقتاً
    خطورة: critical (واجب الإبلاغ)

── 🌡️ الأمراض البيئية (ENVIRONMENTAL) ──
27. Ammonia Poisoning (تسمم الأمونيا):
    أعراض: خياشيم حمراء ملتهبة، لهث عند السطح، حروق كيميائية على الجلد، خمول
    علاج: تغيير ماء فوري 75% + Seachem Prime (جرعة مضاعفة) + فحص الفلتر
    خطورة: critical (قاتل سريع)

28. Nitrite Poisoning (تسمم النيتريت):
    أعراض: خياشيم بنية اللون (Brown Blood Disease)، لهث، خمول
    علاج: تغيير ماء 50% + إضافة ملح مائي (1 g/L) لحماية الخياشيم + Seachem Prime
    خطورة: high

29. Nitrate Poisoning (تسمم النيترات المزمن):
    أعراض: فقدان لون تدريجي، ضعف مناعة، نمو بطيء، مشاكل تكاثر
    علاج: تغييرات ماء منتظمة + الحفاظ على النيترات أقل من 40 ppm
    خطورة: medium (مزمن)

30. pH Shock (صدمة الأس الهيدروجيني):
    أعراض: سباحة غير طبيعية، قفز من الماء، لهث، موت مفاجئ بعد تغيير ماء كبير
    علاج: تصحيح pH تدريجياً (لا تغير أكثر من 0.3 وحدة في اليوم) + إضافة منظم pH
    خطورة: high-critical

31. Temperature Shock (صدمة الحرارة):
    أعراض: سباحة متقطعة، خمول مفاجئ، فقدان توازن
    علاج: تعديل الحرارة تدريجياً (1-2°م كل ساعة) + تهوية جيدة
    خطورة: high

32. Gas Bubble Disease (مرض الفقاعات الغازية):
    أعراض: فقاعات صغيرة مرئية في الجلد والزعانف والعيون
    علاج: تهوية الماء لطرد الغاز الزائد + تقليل ضغط الماء
    خطورة: medium-high

33. Chlorine/Chloramine Toxicity (تسمم الكلور):
    أعراض: لهث حاد، احمرار خياشيم، موت مفاجئ بعد تغيير ماء بدون معالجة
    علاج: إضافة مزيل كلور فوراً (Seachem Prime أو API Tap Water Conditioner) + تهوية
    خطورة: critical

── 🥗 الأمراض التغذوية (NUTRITIONAL) ──
34. Vitamin C Deficiency (نقص فيتامين ج):
    أعراض: انحناء العمود الفقري، فقدان شهية، بطن غائر، تشوه غطاء الخياشيم
    علاج: تنويع الغذاء + طعام مدعم بفيتامين C + خضروات مسلوقة
    خطورة: medium

35. HLLE / Lateral Line Erosion (تآكل الخط الجانبي):
    أعراض: حفر/تآكل على طول الخط الجانبي والوجه (شائع في السيكلد والتانج)
    علاج: تحسين التغذية (فيتامينات A, C, D) + كربون نشط جديد + إزالة الكربون القديم
    خطورة: medium

36. Swim Bladder Disorder (اضطراب المثانة الهوائية):
    أعراض: سباحة مقلوبة، طفو على السطح أو غرق للقاع، عدم توازن
    المسبب: إمساك، أكل زائد، عدوى بكتيرية، عيب خلقي (في الجولد فيش)
    علاج: صوم 3 أيام + بازلاء مسلوقة مقشرة + Epsom salt (1 tbsp/5 gallons)
    خطورة: medium

37. Obesity (السمنة):
    أعراض: بطن منتفخ بشكل دائم (ليس مفاجئ)، كسل، صعوبة سباحة
    علاج: تقليل كمية الطعام + صوم يوم واحد أسبوعياً + تنويع بالخضروات
    خطورة: low

── ⚔️ الإصابات والمشاكل الأخرى ──
38. Physical Trauma / Aggression Injuries (إصابات العدوانية):
    أعراض: زعانف ممزقة، قشور مفقودة، خدوش، جروح نزيفية
    علاج: عزل + ملح مائي (1-2 g/L) + Melafix أو Stress Coat + مراقبة للعدوى الثانوية
    خطورة: medium

39. Egg Binding / Egg Retention (احتباس البيض):
    أعراض: انتفاخ البطن في الأنثى، صعوبة سباحة، قد يضغط على المثانة الهوائية
    علاج: رفع الحرارة 2°م + تغيير ماء 50% لتحفيز الإباضة + وجود ذكر
    خطورة: medium-high

40. Cataracts (إعتام عدسة العين):
    أعراض: غشاوة بيضاء في عين واحدة أو كلتيهما، سباحة متخبطة
    المسبب: وراثي، تغذية ناقصة، ماء رديء، طفيلي Diplostomum
    علاج: لا علاج مباشر — تحسين التغذية والبيئة
    خطورة: low

═══════════════════════════════════════════════════════
⚠️ تحذيرات الأدوية المهمة:
═══════════════════════════════════════════════════════
• Copper (نحاس): ⛔ خطر على اللافقاريات (قواقع، روبيان) والكوري كات فيش والبليكو والأسماك بدون قشور
• Malachite Green: ⛔ خطر على أسماك بدون قشور (كات فيش، لوتش) — استخدم نصف الجرعة
• Formalin: ⛔ يستهلك الأكسجين — وفر تهوية ممتازة أثناء العلاج
• Metronidazole: ⛔ قد يؤثر على البكتيريا النافعة في الفلتر
• Erythromycin: ⛔ يقتل البكتيريا النافعة — راقب دورة النيتروجين
• Potassium Permanganate: ⛔ سام بالجرعة الزائدة — لا تتجاوز 4 mg/L

═══════════════════════════════════════════════════════
🔬 خطوات التشخيص (Chain-of-Thought — نفذها بالترتيب):
═══════════════════════════════════════════════════════

🔍 المرحلة 1 — تقييم جودة الصورة:
• هل الصورة واضحة بما يكفي للتشخيص؟
• هل السمكة مرئية بالكامل؟
• هل الإضاءة كافية؟
• أعطِ درجة 1-10 لجودة الصورة مع ملاحظات

🐟 المرحلة 2 — تحديد نوع السمكة:
• حدد النوع (species) إن أمكن مع الاسم العلمي
• حدد عائلتها (مياه عذبة/مالحة، استوائي/بارد)
• هل هذا النوع عرضة لأمراض معينة؟

🔎 المرحلة 3 — استخراج الأعراض المرئية:
• اللون: أي تغيرات لونية (بهتان، بقع، احمرار، اسوداد)
• الجلد/القشور: قشور منتفخة، تقرحات، كتل، طفيليات مرئية
• الزعانف: تآكل، تمزق، احتقان، انضمام
• العيون: جحوظ، غشاوة، غائرة
• الجسم: انتفاخ، هزال، انحناء العمود الفقري
• الخياشيم: احمرار، شحوب، تورم، تغطية مفتوحة
• السلوك (إن ظاهر): لهث، احتكاك، عزلة، سباحة غير طبيعية

🧮 المرحلة 4 — التشخيص التفاضلي:
• قارن كل عرض مع قاعدة البيانات الشاملة أعلاه
• رتب الاحتمالات من الأعلى للأقل مع نسبة ثقة لكل واحد
• اذكر لماذا اخترت هذا التشخيص ولماذا استبعدت الآخرين

💊 المرحلة 5 — خطة العلاج التفصيلية:
• العلاج الرئيسي مع الجرعات الدقيقة
• الجدول الزمني يوم بيوم
• تحذيرات الأدوية الخاصة بنوع السمكة
• بروتوكول الحجر الصحي

📊 المرحلة 6 — التوقعات والمتابعة:
• نسبة احتمال الشفاء
• المدة المتوقعة للعلاج
• متى يُعاد التقييم
• علامات التحسن المتوقعة
• علامات التدهور التي تستوجب تدخل فوري

═══════════════════════════════════════════════════════

# 📋 أجب بصيغة JSON فقط (بدون أي نص قبله أو بعده):

{
  "detected": ["العرض المرئي 1", "العرض المرئي 2", "العرض المرئي 3"],
  "confidence": 0.85,
  "suggestions": ["نصيحة عامة 1", "نصيحة عامة 2"],
  "details": {
    "imageQuality": {
      "score": 8,
      "feedback": "ملاحظات على جودة الصورة",
      "canDiagnose": true
    },
    "speciesIdentification": {
      "commonName": "الاسم الشائع",
      "scientificName": "الاسم العلمي",
      "family": "العائلة",
      "waterType": "عذبة/مالحة",
      "confidence": 0.9,
      "knownVulnerabilities": ["أمراض شائعة في هذا النوع"]
    },
    "disease": "الاسم الإنجليزي للمرض الأساسي",
    "arabicName": "الاسم العربي للمرض",
    "category": "parasitic/bacterial/fungal/viral/environmental/nutritional/physical/healthy",
    "pathogen": "اسم المسبب العلمي",
    "symptoms": ["عرض 1 مفصل", "عرض 2 مفصل"],
    "causes": ["سبب 1", "سبب 2"],
    "diagnosis": "شرح التشخيص المفصل مع المنطق وراء الاختيار",
    "differentialDiagnosis": [
      {"disease": "اسم المرض 1", "arabicName": "الاسم العربي", "probability": 0.7, "reasoning": "لماذا هذا الاحتمال"},
      {"disease": "اسم المرض 2", "arabicName": "الاسم العربي", "probability": 0.2, "reasoning": "لماذا هذا الاحتمال"}
    ],
    "treatment": ["خطوة 1 مع اسم الدواء والجرعة", "خطوة 2"],
    "treatmentTimeline": [
      {"day": "اليوم 1", "actions": ["فعل 1", "فعل 2"]},
      {"day": "اليوم 2-3", "actions": ["فعل 1"]},
      {"day": "اليوم 7", "actions": ["تقييم"]}
    ],
    "medicationWarnings": ["تحذير 1 خاص بنوع السمكة", "تحذير 2"],
    "quarantineProtocol": {
      "required": true,
      "duration": "المدة بالأيام",
      "tankSetup": "إعداد حوض العزل",
      "steps": ["خطوة 1", "خطوة 2"]
    },
    "prevention": ["نصيحة وقاية 1", "نصيحة وقاية 2"],
    "urgency": "low/medium/high/critical",
    "prognosis": {
      "recoveryChance": "نسبة مئوية",
      "expectedDuration": "المدة المتوقعة للعلاج",
      "signsOfImprovement": ["علامة تحسن 1", "علامة تحسن 2"],
      "signsOfDeterioration": ["علامة تدهور 1", "علامة تدهور 2"],
      "followUpDate": "متى يجب إعادة التقييم"
    },
    "waterParameters": {
      "temperature": "الحرارة المطلوبة",
      "ph": "مستوى pH المناسب",
      "ammonia": "مستوى الأمونيا المطلوب",
      "nitrite": "مستوى النيتريت",
      "nitrate": "مستوى النيترات"
    }
  }
}`,
    };

    return prompts[analysisType as keyof typeof prompts] || prompts.fish;
  }

  /**
   * Parse AI response into structured format
   */
  private parseAnalysis(
    text: string,
    analysisType: string
  ): {
    detected: string[];
    confidence: number;
    suggestions: string[];
    details?: Record<string, any>;
  } {
    try {
      // Try to extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          detected: parsed.detected || [],
          confidence: parsed.confidence || 0.7,
          suggestions: parsed.suggestions || [],
          details: parsed.details || {},
        };
      }

      // Fallback: Parse as plain text
      return {
        detected: [analysisType],
        confidence: 0.6,
        suggestions: text.split("\n").filter((line) => line.trim().length > 0),
        details: { rawText: text },
      };
    } catch (error) {
      console.error("Failed to parse analysis:", error);
      return {
        detected: [analysisType],
        confidence: 0.5,
        suggestions: ["تعذر تحليل الصورة بشكل دقيق"],
        details: { error: "Parse error" },
      };
    }
  }

  /**
   * Get product recommendations based on detected items
   */
  private async getProductRecommendations(
    detectedItems: string[],
    analysisType: string
  ) {
    try {
      // Map analysis type to product categories
      const categoryMap: Record<string, string[]> = {
        fish: ["fish-food", "fish-health", "fish-care"],
        tank: ["aquarium-equipment", "decoration", "lighting"],
        problem: ["water-treatment", "cleaning-tools", "test-kits"],
        health: ["fish-health", "medication", "supplements"],
      };

      const categories = categoryMap[analysisType] || [];

      // Search for products matching detected items or categories
      const searchTerms = [...detectedItems, ...categories];
      const searchPattern = searchTerms.map(t => t.replace(/[%_]/g, '')).join('|');

      // Get top 5 relevant products matching detected items
      const recommendedProducts = searchPattern
        ? await db
            .select()
            .from(products)
            .where(
              sql`${products.inStock} = true AND (${products.name} ~* ${searchPattern} OR ${products.category} ~* ${searchPattern} OR ${products.description} ~* ${searchPattern})`
            )
            .limit(5)
        : await db
            .select()
            .from(products)
            .where(eq(products.inStock, true))
            .limit(5);

      return recommendedProducts;
    } catch (error) {
      console.error("Failed to get product recommendations:", error);
      return [];
    }
  }

  /**
   * Save analysis to database
   */
  private async saveAnalysis(data: InsertImageAnalysis) {
    const [saved] = await db.insert(imageAnalyses).values(data).returning();
    return saved;
  }

  /**
   * Get analysis history for a user
   */
  async getUserAnalysisHistory(userId: string, limit: number = 10) {
    return db
      .select()
      .from(imageAnalyses)
      .where(eq(imageAnalyses.userId, userId))
      .orderBy(desc(imageAnalyses.createdAt))
      .limit(limit);
  }

  /**
   * Get specific analysis by ID
   */
  async getAnalysisById(id: string) {
    const [analysis] = await db
      .select()
      .from(imageAnalyses)
      .where(eq(imageAnalyses.id, id));

    if (!analysis) {
      throw new Error("التحليل غير موجود");
    }

    // Get recommended products
    const productIds = analysis.recommendedProducts as string[] || [];
    const recommendedProducts =
      productIds.length > 0
        ? await db.select().from(products).where(
          inArray(products.id, productIds)
        )
        : [];

    return {
      ...analysis,
      recommendedProducts,
    };
  }

  /**
   * Get analysis statistics
   */
  async getAnalysisStats(userId?: string) {
    const query = userId
      ? db.select().from(imageAnalyses).where(eq(imageAnalyses.userId, userId))
      : db.select().from(imageAnalyses);

    const allAnalyses = await query;

    return {
      totalAnalyses: allAnalyses.length,
      byType: {
        fish: allAnalyses.filter((a) => a.analysisType === "fish").length,
        tank: allAnalyses.filter((a) => a.analysisType === "tank").length,
        problem: allAnalyses.filter((a) => a.analysisType === "problem").length,
        health: allAnalyses.filter((a) => a.analysisType === "health").length,
      },
      averageProcessingTime:
        allAnalyses.reduce((sum, a) => sum + (a.processingTimeMs || 0), 0) /
        (allAnalyses.length || 1),
    };
  }
}

// Export singleton instance
export const visualAI = new VisualAI();
