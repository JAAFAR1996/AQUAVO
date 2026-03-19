import { Router, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { requireAdmin } from "../middleware/auth.js";
import { groqClient } from "../services/groq-client.js";

const router = Router();

const simLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { success: false, error: "تجاوزت الحد. حاول بعد دقيقة." },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
});

// ============================================================
// 1. محكمة الألف سيناريو — Parallel Treatment Simulation
// POST /api/simulation/thousand-scenarios
// ============================================================

router.post("/thousand-scenarios", simLimiter, async (req: Request, res: Response) => {
  try {
    const { species, symptoms, waterTemp, waterPh, waterAmmonia, diagnosis, tankSize } = req.body;

    if (!symptoms && !diagnosis) {
      return res.status(400).json({ success: false, error: "الأعراض أو التشخيص مطلوب" });
    }

    const systemPrompt = `أنت محاكي بيطري متخصص بأسماك الزينة. مهمتك تشغيل محاكاة موازية لـ 1000 سيناريو علاجي وتلخيص النتائج الإحصائية.

أجب بـ JSON صحيح فقط، بدون أي نص خارج الـ JSON:
{
  "totalSimulations": 1000,
  "patientProfile": "وصف موجز للحالة",
  "treatments": [
    {
      "id": 1,
      "name": "اسم العلاج",
      "nameEn": "English name",
      "successRate": 85,
      "avgRecoveryDays": 7,
      "riskLevel": "low",
      "costRangeIQD": "5,000 - 15,000",
      "steps": ["خطوة 1", "خطوة 2", "خطوة 3"],
      "sideEffects": ["تأثير جانبي إن وجد"],
      "bestFor": "متى يناسب هذا العلاج",
      "survivorCount": 850,
      "rank": 1
    }
  ],
  "recommendation": {
    "primaryTreatmentId": 1,
    "reasoning": "السبب",
    "urgency": "فوري",
    "combinedApproach": "هل يمكن دمج علاجات؟"
  },
  "statisticalInsight": "ملاحظة مهمة من المحاكاة"
}

قواعد: successRate من 0-100، riskLevel إما low أو medium أو high، survivorCount = totalSimulations × successRate/100، rank من 1 للأفضل.`;

    const userMessage = `بيانات المريض:
- النوع: ${species || "غير محدد"}
- التشخيص الأولي: ${diagnosis || "غير محدد"}
- الأعراض: ${symptoms || "غير محددة"}
- حجم الحوض: ${tankSize || "غير محدد"} لتر
- الحرارة: ${waterTemp || "غير محددة"}°م
- pH: ${waterPh || "غير محدد"}
- الأمونيا: ${waterAmmonia || "0"} ppm

شغّل محاكاة الـ 1000 سيناريو لـ 8 طرق علاجية مختلفة ومتنوعة. رتبها من الأعلى نجاحاً للأدنى.`;

    const response = await groqClient.chatText(
      [{ role: "user", content: userMessage }],
      { systemPrompt, temperature: 0.3, maxTokens: 3000, model: "llama-3.3-70b-versatile" }
    );

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("لم يُنتج JSON صحيح");

    const simulation = JSON.parse(jsonMatch[0]);
    return res.json({ success: true, data: simulation });
  } catch (error: any) {
    console.error("[Simulation] Thousand Scenarios error:", error);
    return res.status(500).json({ success: false, error: "حدث خطأ في المحاكاة: " + error.message });
  }
});

// ============================================================
// 2. نبي الموجة — 6-Month Iraqi Market Forecast
// POST /api/simulation/wave-prophet
// Admin only
// ============================================================

router.post("/wave-prophet", requireAdmin as any, simLimiter, async (req: Request, res: Response) => {
  try {
    const { topProducts, monthlyRevenue, topCategories } = req.body;

    const currentDate = new Date();
    const months: string[] = [];
    for (let i = 1; i <= 6; i++) {
      const d = new Date(currentDate);
      d.setMonth(d.getMonth() + i);
      months.push(d.toLocaleDateString("ar-IQ", { month: "long", year: "numeric" }));
    }

    const systemPrompt = `أنت محلل السوق العراقي لمنتجات الأحواض المائية وأسماك الزينة.

خبرتك:
- موسمية الطلب العراقي (رمضان، عيد الأضحى، عيد الفطر، العودة للمدارس، الصيف)
- تأثير الصيف العراقي (45°م+) على أسماك الزينة — يموت منها كثير = طلب على هيترات، أوكسجين، تبريد
- الوضع الاقتصادي العراقي: دخل متوسط، حساسية عالية للسعر
- المنافسون: أكوا العراق، بايوتك البصرة، معرض الشايب
- مصدر البضاعة: الصين، شحن ~250$ للمتر المكعب، يستغرق 30-45 يوم

أجب بـ JSON صحيح فقط:
{
  "forecastPeriod": "6 أشهر",
  "marketOverview": "نظرة عامة",
  "months": [
    {
      "monthName": "اسم الشهر",
      "demandIndex": 85,
      "keyEvents": ["حدث 1"],
      "topProducts": [
        {"category": "الفئة", "expectedDemand": "عالي", "importQuantity": "التوصية", "reasoning": "السبب"}
      ],
      "importRecommendation": "توصية الاستيراد",
      "pricingAdvice": "نصيحة التسعير",
      "marketingFocus": "تركيز التسويق",
      "alertLevel": "طبيعي|تنبيه|طوارئ"
    }
  ],
  "annualInsights": ["رؤية 1", "رؤية 2", "رؤية 3"],
  "riskFactors": ["خطر 1", "خطر 2"],
  "opportunities": ["فرصة 1", "فرصة 2"],
  "topImportRecommendations": [
    {"product": "المنتج", "quantity": "الكمية", "timing": "التوقيت", "expectedROI": "العائد المتوقع"}
  ]
}`;

    const userMessage = `حلل السوق العراقي لأسماك الزينة للـ 6 أشهر القادمة:
الأشهر: ${months.join("، ")}
${topProducts ? `أعلى المنتجات: ${topProducts}` : ""}
${topCategories ? `أعلى الفئات: ${topCategories}` : ""}
${monthlyRevenue ? `متوسط المبيعات الشهرية: ${monthlyRevenue} دينار` : ""}

ركز على: الطلب الموسمي، تأثير الصيف الحارق، رمضان والأعياد، العودة للمدارس، الوضع الاقتصادي.`;

    const response = await groqClient.chatText(
      [{ role: "user", content: userMessage }],
      { systemPrompt, temperature: 0.4, maxTokens: 4000, model: "llama-3.3-70b-versatile" }
    );

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("لم يُنتج JSON صحيح");

    const forecast = JSON.parse(jsonMatch[0]);
    return res.json({ success: true, data: forecast });
  } catch (error: any) {
    console.error("[Simulation] Wave Prophet error:", error);
    return res.status(500).json({ success: false, error: "حدث خطأ في التوقع: " + error.message });
  }
});

// ============================================================
// 3. الكتالوج الحي — Product Market Simulation
// POST /api/simulation/catalog-live
// Admin only
// ============================================================

router.post("/catalog-live", requireAdmin as any, simLimiter, async (req: Request, res: Response) => {
  try {
    const { productName, priceIQD, costUSD, category, description, shippingCostEstimate } = req.body;

    if (!productName || !priceIQD) {
      return res.status(400).json({ success: false, error: "اسم المنتج والسعر مطلوبان" });
    }

    const systemPrompt = `أنت محاكي السوق العراقي المتخصص في تجارة أسماك الزينة ومستلزمات الأحواض.

سياق السوق:
- الجمهور: هواة الأحواض 25-44 سنة، أغلبهم ذكور، بغداد والمدن الكبيرة
- المنافسون: أكوا العراق، بايوتك البصرة، معرض الشايب + باعة فيسبوك
- الزبون العراقي: حساس جداً للسعر، يقارن، يحتاج ثقة قبل الشراء
- الدولار = 1500 دينار تقريباً
- الشحن من الصين = ~250$ لكل متر مكعب (30-45 يوم)
- هامش الربح الصحي = 40-80% للمنتجات الصغيرة، 25-40% للكبيرة

أجب بـ JSON صحيح فقط:
{
  "productName": "اسم المنتج",
  "overallScore": 78,
  "verdict": "جدير بالاستيراد",
  "adoptionProbability": 72,
  "financialAnalysis": {
    "costUSD": 0,
    "shippingPerUnitUSD": 0,
    "totalCostIQD": 0,
    "recommendedPriceIQD": 0,
    "profitMarginPercent": 0,
    "breakEvenUnits": 0,
    "monthlyRevenuePotential": "نطاق المبيعات المتوقع"
  },
  "marketSimulation": {
    "earlyAdopters": {"percent": 15, "profile": "من سيشتري أول"},
    "massMarket": {"percent": 45, "profile": "السوق الرئيسي"},
    "resistors": {"percent": 40, "profile": "من لن يشتري ولماذا"}
  },
  "competitorAnalysis": [
    {"name": "المنافس", "estimatedPrice": "سعره التقديري", "ourAdvantage": "ميزتنا عليه"}
  ],
  "pricingOptions": [
    {"strategy": "استراتيجية", "priceIQD": 0, "expectedMonthlySales": "عدد", "isRecommended": true}
  ],
  "marketingMessages": {
    "tiktok": "نص إعلان تيك توك بالعراقي جاهز للنشر",
    "instagram": "نص إعلان انستغرام",
    "facebook": "نص إعلان فيسبوك"
  },
  "risks": ["خطر 1", "خطر 2"],
  "recommendations": ["توصية 1", "توصية 2"],
  "idealLaunchMonth": "متى تطلق المنتج",
  "importQuantityAdvice": "كم تستورد في الشحنة الأولى"
}`;

    const userMessage = `حاكي السوق العراقي لهذا المنتج:

اسم المنتج: ${productName}
الفئة: ${category || "غير محدد"}
الوصف: ${description || "لا يوجد"}
سعر البيع المقترح: ${Number(priceIQD).toLocaleString()} دينار
تكلفة الشراء: ${costUSD ? `$${costUSD}` : "غير محددة"}
تكلفة الشحن التقديرية: ${shippingCostEstimate || "غير محددة"}`;

    const response = await groqClient.chatText(
      [{ role: "user", content: userMessage }],
      { systemPrompt, temperature: 0.35, maxTokens: 3500, model: "llama-3.3-70b-versatile" }
    );

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("لم يُنتج JSON صحيح");

    const simulation = JSON.parse(jsonMatch[0]);
    return res.json({ success: true, data: simulation });
  } catch (error: any) {
    console.error("[Simulation] Catalog Live error:", error);
    return res.status(500).json({ success: false, error: "حدث خطأ في المحاكاة: " + error.message });
  }
});

// ============================================================
// 4. التوأم الثقافي — Cultural Aquarium Daily Event
// GET /api/simulation/cultural-twin
// Public
// ============================================================

const CULTURAL_FISH_MAP = [
  { species: "Betta Splendens", arabicName: "سمكة البيتا", segment: "الشباب المستقل", color: "#3b82f6", trait: "تحب الحرية، تقاتل إذا ضيّقت عليها" },
  { species: "Koi Carp", arabicName: "سمكة الكوي", segment: "رجال الأعمال والتجار", color: "#f59e0b", trait: "تحتاج مساحة وتزدهر في التجمع والوفرة" },
  { species: "Neon Tetra", arabicName: "النيون تيترا", segment: "الشباب والطلاب", color: "#06b6d4", trait: "تعيش في مجموعات وتضعف منفردةً" },
  { species: "Goldfish", arabicName: "سمكة الذهب", segment: "العائلات التقليدية", color: "#ef4444", trait: "متكيفة، صابرة، تحب الجميع" },
  { species: "Oscar Cichlid", arabicName: "سمكة الأوسكار", segment: "أصحاب السلطة والمؤثرون", color: "#8b5cf6", trait: "تهيمن على الحوض، ذكاء استثنائي" },
  { species: "Parrot Cichlid", arabicName: "سمكة الببغاء", segment: "الفنانون والمبدعون", color: "#ec4899", trait: "ألوان مبهجة، غير متوقعة، تخترع قواعدها" },
  { species: "Corydoras Catfish", arabicName: "سمكة القاع", segment: "العمال والحرفيون", color: "#6b7280", trait: "يعملون في الخفاء ويحافظون على نظافة البيئة" },
  { species: "Molly Fish", arabicName: "سمكة المولي", segment: "الأمهات والنساء", color: "#10b981", trait: "تتكاثر بسرعة، تغذي أبناءها، تتكيف مع كل ظرف" },
];

router.get("/cultural-twin", async (req: Request, res: Response) => {
  try {
    const today = new Date().toLocaleDateString("ar-IQ", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const systemPrompt = `أنت راوي "التوأم الثقافي لـ AQUAVO" — حوض افتراضي يمثل شرائح المجتمع العراقي باستعارة شعرية جميلة وغير مباشرة.

خريطة الأسماك:
- البيتا = الشباب المستقل
- الكوي = رجال الأعمال
- النيون تيترا = الشباب والطلاب
- الجولد فيش = العائلات التقليدية
- الأوسكار = أصحاب السلطة
- الببغاء = المبدعون والفنانون
- الكاتفيش = العمال والحرفيون
- المولي = الأمهات والنساء

اكتب "حدث الحوض اليوم" — قصة قصيرة (4-5 جمل) استعارية تعكس روح المجتمع العراقي اليوم. لا تذكر السياسة صراحة. أسلوب شعري ودافئ.

أجب بـ JSON صحيح فقط:
{
  "date": "التاريخ",
  "dailyEvent": {
    "title": "عنوان الحدث",
    "story": "قصة الحوض اليوم",
    "dominantSpecies": "البيتا",
    "harmonyPercent": 72,
    "tensionPercent": 28,
    "mood": "توصيف المزاج العام"
  },
  "fishStatuses": [
    {"arabicName": "اسم السمكة", "status": "حالتها اليوم", "activity": "نشطة"}
  ],
  "aquavoMessage": "رسالة AQUAVO للمجتمع اليوم — إيجابية وملهمة",
  "shareText": "نص قصير للمشاركة على السوشيال ميديا"
}`;

    const response = await groqClient.chatText(
      [{ role: "user", content: `اليوم: ${today}. اكتب حدث الحوض الثقافي.` }],
      { systemPrompt, temperature: 0.9, maxTokens: 1500, model: "llama-3.3-70b-versatile" }
    );

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const eventData = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

    return res.json({ success: true, data: { fishMap: CULTURAL_FISH_MAP, event: eventData } });
  } catch (error: any) {
    console.error("[Simulation] Cultural Twin error:", error);
    return res.status(500).json({ success: false, error: "حدث خطأ" });
  }
});

export default router;
