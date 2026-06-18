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

// ─── Shared helper ───────────────────────────────────────────
function parseJSON(text: string): any | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

// ============================================================
// 1. محكمة الألف سيناريو
//    كل طريقة علاج = agent مستقل يشتغل بالتوازي
//    125 سيناريو لكل واحدة = 1000 إجمالي
// POST /api/simulation/thousand-scenarios
// ============================================================

const TREATMENT_AGENTS = [
  { id: 1, name: "ملح الطعام",              nameEn: "Salt Treatment",          protocol: "إضافة 1-3 ملاعق ملح طعام لكل 10 لتر ماء" },
  { id: 2, name: "تغيير الماء + ملح",       nameEn: "Water Change + Salt",     protocol: "تغيير 30-50% من الماء مع إضافة ملح" },
  { id: 3, name: "ميثيلين بلو",             nameEn: "Methylene Blue",          protocol: "5 قطرات ميثيلين بلو لكل 10 لتر — يُكرر يومياً" },
  { id: 4, name: "مضاد الطفيليات",          nameEn: "Anti-Parasitic Med",      protocol: "دواء مخصص للطفيليات (فورمالين 37% أو مشابه)" },
  { id: 5, name: "رفع الحرارة",             nameEn: "Temperature Increase",    protocol: "رفع درجة الحرارة تدريجياً لـ 30-32°م لمدة 5-7 أيام" },
  { id: 6, name: "عزل + مراقبة",            nameEn: "Quarantine Only",         protocol: "نقل السمكة لحوض عزل نظيف بدون علاج كيميائي" },
  { id: 7, name: "مضاد حيوي",              nameEn: "Antibiotics",             protocol: "مضاد حيوي واسع الطيف (كاناميسين أو مشابه)" },
  { id: 8, name: "بدون علاج / مراقبة",     nameEn: "Watchful Waiting",        protocol: "مراقبة فقط — قد تشفى من تلقاء نفسها" },
];

async function runTreatmentAgent(
  agent: typeof TREATMENT_AGENTS[0],
  patientContext: string,
  scenarioCount: number
): Promise<any> {
  const prompt = `أنت وكيل تقييم بيطري متخصص. مهمتك: تقييم طريقة علاج واحدة فقط على المريض المذكور.

طريقة العلاج التي تقيّمها: "${agent.name}"
البروتوكول: ${agent.protocol}

بيانات المريض:
${patientContext}

افترض أنك شغّلت ${scenarioCount} سيناريو مختلف لهذه الطريقة (تنوع في الجرعة، التوقيت، حالة الماء، مناعة السمكة). أعطِ نتائج إحصائية واقعية بناءً على معرفتك الحقيقية بهذه الطريقة.

أجب بـ JSON فقط، بدون أي نص خارجه:
{
  "successRate": 72,
  "avgRecoveryDays": 5,
  "riskLevel": "medium",
  "costRangeIQD": "0 - 5,000",
  "steps": ["خطوة 1 محددة", "خطوة 2 محددة", "خطوة 3 محددة"],
  "sideEffects": ["تأثير جانبي واقعي إن وجد"],
  "bestFor": "هذه الطريقة الأنسب عندما...",
  "worstCase": "ماذا يحدث في أسوأ سيناريو",
  "survivorCount": 720
}

قواعد صارمة: الأرقام يجب أن تعكس فاعلية الطريقة الحقيقية لهذا المرض تحديداً. survivorCount = ${scenarioCount} × successRate / 100.`;

  const text = await groqClient.chatText(
    [{ role: "user", content: prompt }],
    { temperature: 0.2, maxTokens: 600, model: "llama-3.3-70b-versatile" }
  );
  const data = parseJSON(text);
  if (!data) return null;
  return {
    id: agent.id,
    name: agent.name,
    nameEn: agent.nameEn,
    ...data,
    survivorCount: Math.round((scenarioCount * (data.successRate || 0)) / 100),
  };
}

router.post("/thousand-scenarios", requireAdmin as any, simLimiter, async (req: Request, res: Response) => {
  try {
    const { species, symptoms, waterTemp, waterPh, waterAmmonia, diagnosis, tankSize } = req.body;

    if (!symptoms && !diagnosis) {
      return res.status(400).json({ success: false, error: "الأعراض أو التشخيص مطلوب" });
    }

    const patientContext = [
      `النوع: ${species || "غير محدد"}`,
      `التشخيص: ${diagnosis || "غير محدد"}`,
      `الأعراض: ${symptoms || "غير محددة"}`,
      `حجم الحوض: ${tankSize || "غير محدد"} لتر`,
      `الحرارة: ${waterTemp || "غير محددة"}°م`,
      `pH: ${waterPh || "غير محدد"}`,
      `أمونيا: ${waterAmmonia || "0"} ppm`,
    ].join("\n");

    // 8 agents × 125 سيناريو = 1000 إجمالي
    const scenariosPerAgent = 125;

    // شغّل كل الـ agents بالتوازي الحقيقي
    const agentResults = await Promise.allSettled(
      TREATMENT_AGENTS.map(agent => runTreatmentAgent(agent, patientContext, scenariosPerAgent))
    );

    const treatments = agentResults
      .map((r, i) => {
        if (r.status === "fulfilled" && r.value) return r.value;
        // Fallback if an agent failed
        return {
          id: TREATMENT_AGENTS[i].id,
          name: TREATMENT_AGENTS[i].name,
          nameEn: TREATMENT_AGENTS[i].nameEn,
          successRate: 0,
          avgRecoveryDays: 0,
          riskLevel: "unknown",
          costRangeIQD: "غير معروف",
          steps: [],
          sideEffects: [],
          bestFor: "—",
          survivorCount: 0,
        };
      })
      .filter(t => t.successRate > 0)
      .sort((a, b) => b.successRate - a.successRate);

    if (treatments.length === 0) {
      return res.status(500).json({ success: false, error: "فشلت جميع محاكاة العلاجات" });
    }

    // البحث عن أفضل علاج
    const best = treatments[0];

    // نستدعي Groq مرة أخيرة للحصول على توصية نهائية ذكية
    const summaryText = await groqClient.chatText(
      [{
        role: "user",
        content: `بيانات المريض:\n${patientContext}\n\nنتائج تقييم العلاجات:\n${treatments.map(t => `${t.name}: نجاح ${t.successRate}%، شفاء ${t.avgRecoveryDays} يوم`).join("\n")}\n\nأعطِ: 1) توصية نهائية موجزة 2) هل يمكن دمج أفضل علاجين؟ 3) درجة الاستعجالية. بـ JSON: {"reasoning":"...","combinedApproach":"...","urgency":"فوري|خلال 24ساعة|خلال أسبوع","statisticalInsight":"..."}`
      }],
      { temperature: 0.3, maxTokens: 500, model: "llama-3.3-70b-versatile" }
    );
    const summary = parseJSON(summaryText) || {};

    return res.json({
      success: true,
      data: {
        totalSimulations: TREATMENT_AGENTS.length * scenariosPerAgent,
        agentsRun: treatments.length,
        patientProfile: `${species || "سمكة"} — ${diagnosis || symptoms}`,
        treatments,
        recommendation: {
          primaryTreatmentId: best.id,
          reasoning: summary.reasoning || `${best.name} أعطى أعلى نسبة نجاح (${best.successRate}%)`,
          urgency: summary.urgency || "في أقرب وقت",
          combinedApproach: summary.combinedApproach || "—",
        },
        statisticalInsight: summary.statisticalInsight || `من أصل ${TREATMENT_AGENTS.length * scenariosPerAgent} سيناريو، ${best.name} نجح في ${best.survivorCount} حالة`,
      },
    });
  } catch (error: any) {
    console.error("[Simulation] Thousand Scenarios error:", error);
    return res.status(500).json({ success: false, error: "حدث خطأ: " + error.message });
  }
});

// ============================================================
// 2. نبي الموجة — 6-Month Iraqi Market Forecast
// POST /api/simulation/wave-prophet
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

سياقك:
- الجمهور: هواة أحواض، 25-44 سنة، بغداد والمدن
- الصيف العراقي (مايو-سبتمبر): حرارة 45-50°م = أسماك تموت بكثرة = طلب عالٍ على هيترات، أوكسجين، مضخات هواء، أدوية
- رمضان: مشتريات تنزل 20-30% (ناس منشغلين بالعبادة والإفطار)
- العيد (فطر/أضحى): ارتفاع مفاجئ 40-60% — الناس يشترون كهدايا
- العودة للمدارس (سبتمبر): أولياء أمور يشترون أحواض للأطفال
- الشتاء (ديسمبر-فبراير): طلب على هيترات وأدوات تدفئة
- الدولار = 1500 دينار، شحن الصين 30-45 يوم

أجب بـ JSON صحيح فقط:
{
  "marketOverview": "نظرة عامة على الـ 6 أشهر",
  "months": [
    {
      "monthName": "اسم الشهر",
      "demandIndex": 75,
      "keyEvents": ["حدث 1"],
      "topProducts": [{"category": "فئة", "expectedDemand": "عالي", "importQuantity": "كمية", "reasoning": "سبب"}],
      "importRecommendation": "توصية الاستيراد",
      "pricingAdvice": "نصيحة التسعير",
      "marketingFocus": "تركيز التسويق",
      "alertLevel": "طبيعي"
    }
  ],
  "annualInsights": ["رؤية 1", "رؤية 2"],
  "riskFactors": ["خطر 1"],
  "opportunities": ["فرصة 1"],
  "topImportRecommendations": [{"product": "منتج", "quantity": "كمية", "timing": "التوقيت", "expectedROI": "العائد"}]
}`;

    const userMessage = `الأشهر القادمة: ${months.join("، ")}
${topProducts ? `أعلى المنتجات مبيعاً: ${topProducts}` : ""}
${topCategories ? `أعلى الفئات: ${topCategories}` : ""}
${monthlyRevenue ? `متوسط المبيعات الشهرية: ${monthlyRevenue} دينار` : ""}

اعطِ توقعاً دقيقاً وواقعياً لكل شهر. demandIndex من 0-100 (60 = طبيعي، 80+ = موسم ذروة، 40- = هدوء).`;

    const response = await groqClient.chatText(
      [{ role: "user", content: userMessage }],
      { systemPrompt, temperature: 0.35, maxTokens: 4000, model: "llama-3.3-70b-versatile" }
    );

    const forecast = parseJSON(response);
    if (!forecast) throw new Error("لم يُنتج JSON صحيح");
    return res.json({ success: true, data: forecast });
  } catch (error: any) {
    console.error("[Simulation] Wave Prophet error:", error);
    return res.status(500).json({ success: false, error: "حدث خطأ: " + error.message });
  }
});

// ============================================================
// 3. الكتالوج الحي
//    كل زبون = agent مستقل — 6 agents بالتوازي
// POST /api/simulation/catalog-live
// ============================================================

const BUYER_AGENTS = [
  { id: 1, persona: "مبتدئ شاب 22 سنة", profile: "طالب جامعي، أول حوض له، ميزانية محدودة جداً، يبحث على يوتيوب قبل الشراء، يخاف يضيع فلوسه" },
  { id: 2, persona: "هاوي متقدم 35 سنة", profile: "عنده حوض 5 سنوات، يعرف الأسعار من الصين، يقارن المواصفات، لا يشتري إلا إذا ثقة بالجودة" },
  { id: 3, persona: "أب 40 سنة", profile: "يشتري لأولاده، يهمه السعر والأمان، يسأل الكاشير قبل الشراء، ميزانية متوسطة" },
  { id: 4, persona: "صاحب محل أكواريوم صغير", profile: "يشتري بالجملة، يريد هامش ربح، يقارن مع الموردين الآخرين، يهمه وقت التوصيل" },
  { id: 5, persona: "زبون فيسبوك 28 سنة", profile: "رأى الإعلان على فيسبوك، يحب العروض والخصومات، يتردد كثيراً قبل الشراء" },
  { id: 6, persona: "مقتصد 45 سنة", profile: "يشتري فقط عند الضرورة القصوى، يبحث عن أرخص خيار، يقارن 10 بدائل قبل القرار" },
];

async function runBuyerAgent(
  agent: typeof BUYER_AGENTS[0],
  productContext: string
): Promise<any> {
  const prompt = `أنت زبون عراقي محدد الشخصية تقيّم منتجاً قبل الشراء.

شخصيتك: ${agent.persona}
ملفك الشخصي: ${agent.profile}

المنتج المعروض عليك:
${productContext}

قيّم صراحةً — هل ستشتري؟ وبأي سعر؟

أجب بـ JSON فقط:
{
  "willBuy": true,
  "confidence": 75,
  "maxPriceIQD": 35000,
  "mainReason": "لماذا ستشتري أو لن تشتري",
  "mainObjection": "اعتراضك الرئيسي إن وجد",
  "whatWouldSellMe": "ماذا يجعلك تشتري فوراً",
  "priceReaction": "رخيص|مناسب|غالي|غالي جداً"
}

كن صادقاً مع شخصيتك. لا تكن مهذباً — العملية الحسابية تعتمد على صراحتك.`;

  const text = await groqClient.chatText(
    [{ role: "user", content: prompt }],
    { temperature: 0.6, maxTokens: 400, model: "llama-3.3-70b-versatile" }
  );
  const data = parseJSON(text);
  if (!data) return null;
  return { ...agent, ...data };
}

router.post("/catalog-live", requireAdmin as any, simLimiter, async (req: Request, res: Response) => {
  try {
    const { productName, priceIQD, costUSD, category, description, shippingCostEstimate } = req.body;

    if (!productName || !priceIQD) {
      return res.status(400).json({ success: false, error: "اسم المنتج والسعر مطلوبان" });
    }

    const price = Number(String(priceIQD).replace(/,/g, ""));
    const cost = Number(costUSD) || 0;

    // ─── مراجعة مالية أولية ───────────────────────────
    const DOLLAR_RATE = 1500;
    const costIQD = cost * DOLLAR_RATE;
    const shippingPerUnitIQD = shippingCostEstimate
      ? Number(String(shippingCostEstimate).replace(/[^0-9.]/g, "")) * DOLLAR_RATE
      : costIQD * 0.2; // افتراضي: 20% من التكلفة

    const totalCostIQD = costIQD + shippingPerUnitIQD;
    const profitMargin = price > 0 ? Math.round(((price - totalCostIQD) / price) * 100) : 0;

    const financialFlags: string[] = [];
    if (cost > 0 && price <= totalCostIQD) {
      financialFlags.push(`⚠️ خسارة مالية: سعر البيع (${price.toLocaleString()} د.ع) أقل من التكلفة الكاملة (${Math.round(totalCostIQD).toLocaleString()} د.ع). ستخسر ${Math.round(totalCostIQD - price).toLocaleString()} د.ع على كل قطعة!`);
    }
    if (profitMargin > 0 && profitMargin < 15) {
      financialFlags.push(`⚠️ هامش ربح ضعيف جداً (${profitMargin}%). الحد الأدنى الموصى به 30%.`);
    }

    const productContext = [
      `اسم المنتج: ${productName}`,
      `الفئة: ${category || "أدوات أحواض"}`,
      `الوصف: ${description || "لا يوجد وصف"}`,
      `سعر البيع: ${price.toLocaleString()} دينار عراقي`,
      cost > 0 ? `تكلفة الشراء: $${cost} (~${costIQD.toLocaleString()} دينار)` : "",
      totalCostIQD > 0 ? `التكلفة الكاملة بعد الشحن: ~${Math.round(totalCostIQD).toLocaleString()} دينار` : "",
    ].filter(Boolean).join("\n");

    // ─── تشغيل 6 agents بالتوازي الحقيقي ───────────────
    const agentResults = await Promise.allSettled(
      BUYER_AGENTS.map(agent => runBuyerAgent(agent, productContext))
    );

    const agents = agentResults
      .map((r, i) => (r.status === "fulfilled" && r.value ? r.value : { ...BUYER_AGENTS[i], willBuy: false, confidence: 0, maxPriceIQD: 0, mainReason: "لم يُكمل التقييم", mainObjection: "—", whatWouldSellMe: "—", priceReaction: "غير معروف" }))
      .filter(a => a.confidence > 0);

    const buyers = agents.filter(a => a.willBuy);
    const adoptionRate = Math.round((buyers.length / agents.length) * 100);
    const avgMaxPrice = Math.round(agents.filter(a => a.maxPriceIQD > 0).reduce((s, a) => s + a.maxPriceIQD, 0) / Math.max(agents.filter(a => a.maxPriceIQD > 0).length, 1));
    const priceReactions = agents.map(a => a.priceReaction).filter(Boolean);
    const expensiveCount = priceReactions.filter(r => r?.includes("غالي")).length;

    const overallScore = Math.max(5, Math.min(99,
      adoptionRate * 0.5 +
      (profitMargin > 0 ? Math.min(profitMargin, 50) : 0) * 0.3 +
      (expensiveCount < 3 ? 20 : 5)
    ));

    let verdict = "لا يوصى به";
    if (overallScore >= 70) verdict = "جدير بالاستيراد";
    else if (overallScore >= 45) verdict = "محفوف بالمخاطر — يحتاج تعديل";

    // ─── استدعاء نهائي: توصيات مالية + نصوص إعلانية ───
    const marketingPrompt = `منتج: ${productName} | سعر: ${price.toLocaleString()} د.ع | فئة: ${category || "أدوات"}\nآراء الـ${agents.length} زبون: ${agents.map(a => `${a.persona}: ${a.willBuy ? "سيشتري" : "لن يشتري"} — ${a.mainReason}`).join(" || ")}\n\nاكتب: 1) سعر بيع مثالي 2) نص إعلان تيك توك بالعراقي (2-3 جمل) 3) نص انستغرام 4) نص فيسبوك 5) 3 توصيات 6) أفضل شهر للإطلاق\nJSON: {"recommendedPriceIQD":0,"pricingStrategy":"...","tiktok":"...","instagram":"...","facebook":"...","recommendations":[],"idealLaunchMonth":"...","importQuantityAdvice":"..."}`;

    const marketingText = await groqClient.chatText(
      [{ role: "user", content: marketingPrompt }],
      { temperature: 0.5, maxTokens: 1000, model: "llama-3.3-70b-versatile" }
    );
    const marketing = parseJSON(marketingText) || {};

    // تجميع الاعتراضات والمحفزات
    const objections = [...new Set(agents.map(a => a.mainObjection).filter(o => o && o !== "—"))];
    const motivators = [...new Set(agents.map(a => a.whatWouldSellMe).filter(m => m))];

    return res.json({
      success: true,
      data: {
        productName,
        overallScore: Math.round(overallScore),
        verdict,
        adoptionProbability: adoptionRate,
        financialFlags,
        financialAnalysis: {
          costUSD: cost,
          costIQD: Math.round(costIQD),
          shippingPerUnitIQD: Math.round(shippingPerUnitIQD),
          totalCostIQD: Math.round(totalCostIQD),
          currentPriceIQD: price,
          recommendedPriceIQD: marketing.recommendedPriceIQD || avgMaxPrice || price,
          profitMarginPercent: profitMargin,
          breakEvenUnits: totalCostIQD > 0 && (price - totalCostIQD) > 0
            ? Math.ceil(totalCostIQD / (price - totalCostIQD))
            : null,
          monthlyRevenuePotential: marketing.pricingStrategy || "يعتمد على السعر المعدّل",
        },
        agentVerdicts: agents.map(a => ({
          persona: a.persona,
          willBuy: a.willBuy,
          confidence: a.confidence,
          maxPriceIQD: a.maxPriceIQD,
          mainReason: a.mainReason,
          priceReaction: a.priceReaction,
        })),
        marketSimulation: {
          buyersCount: buyers.length,
          totalAgents: agents.length,
          avgMaxPriceIQD: avgMaxPrice,
          priceReactionSummary: `${expensiveCount} من ${agents.length} زبائن اعتبروه غالياً`,
        },
        objections,
        motivators,
        marketingMessages: {
          tiktok: marketing.tiktok || "—",
          instagram: marketing.instagram || "—",
          facebook: marketing.facebook || "—",
        },
        recommendations: marketing.recommendations || ["راجع السعر بناءً على آراء الزبائن"],
        idealLaunchMonth: marketing.idealLaunchMonth || "—",
        importQuantityAdvice: marketing.importQuantityAdvice || "—",
      },
    });
  } catch (error: any) {
    console.error("[Simulation] Catalog Live error:", error);
    return res.status(500).json({ success: false, error: "حدث خطأ: " + error.message });
  }
});

// ============================================================
// 4. التوأم الثقافي — Cultural Twin
// GET /api/simulation/cultural-twin
// ============================================================

const CULTURAL_FISH_MAP = [
  { species: "Betta Splendens",   arabicName: "سمكة البيتا",    segment: "الشباب المستقل",         color: "#3b82f6", trait: "تحب الحرية، تقاتل إذا ضيّقت عليها" },
  { species: "Koi Carp",          arabicName: "سمكة الكوي",     segment: "رجال الأعمال والتجار",   color: "#f59e0b", trait: "تحتاج مساحة وتزدهر في التجمع والوفرة" },
  { species: "Neon Tetra",        arabicName: "النيون تيترا",   segment: "الشباب والطلاب",         color: "#06b6d4", trait: "تعيش في مجموعات وتضعف منفردةً" },
  { species: "Goldfish",          arabicName: "سمكة الذهب",     segment: "العائلات التقليدية",     color: "#ef4444", trait: "متكيفة، صابرة، تحب الجميع" },
  { species: "Oscar Cichlid",     arabicName: "سمكة الأوسكار",  segment: "أصحاب السلطة والمؤثرون", color: "#8b5cf6", trait: "تهيمن على الحوض، ذكاء استثنائي" },
  { species: "Parrot Cichlid",    arabicName: "سمكة الببغاء",   segment: "الفنانون والمبدعون",     color: "#ec4899", trait: "ألوان مبهجة، غير متوقعة، تخترع قواعدها" },
  { species: "Corydoras Catfish", arabicName: "سمكة القاع",     segment: "العمال والحرفيون",       color: "#6b7280", trait: "يعملون في الخفاء ويحافظون على نظافة البيئة" },
  { species: "Molly Fish",        arabicName: "سمكة المولي",    segment: "الأمهات والنساء",        color: "#10b981", trait: "تتكاثر بسرعة، تغذي أبناءها، تتكيف مع كل ظرف" },
];

router.get("/cultural-twin", simLimiter, async (req: Request, res: Response) => {
  try {
    const today = new Date().toLocaleDateString("ar-IQ", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    const systemPrompt = `أنت راوي "التوأم الثقافي لـ AQUAVO" — حوض افتراضي يعكس روح المجتمع العراقي باستعارة شعرية.

خريطة الأسماك:
- البيتا = الشباب المستقل | الكوي = رجال الأعمال | النيون = الشباب والطلاب
- الجولد فيش = العائلات | الأوسكار = أصحاب السلطة | الببغاء = المبدعون
- الكاتفيش = العمال | المولي = الأمهات

اكتب "حدث الحوض اليوم" — 4-5 جمل شعرية تعكس روح اليوم في العراق. لا سياسة صريحة.

أجب بـ JSON صحيح فقط:
{
  "date": "التاريخ",
  "dailyEvent": {
    "title": "عنوان الحدث",
    "story": "القصة",
    "dominantSpecies": "البيتا",
    "harmonyPercent": 72,
    "tensionPercent": 28,
    "mood": "المزاج"
  },
  "fishStatuses": [{"arabicName": "اسم", "status": "الحالة", "activity": "نشطة"}],
  "aquavoMessage": "رسالة AQUAVO — إيجابية وملهمة",
  "shareText": "نص للسوشيال ميديا"
}`;

    const response = await groqClient.chatText(
      [{ role: "user", content: `اليوم: ${today}. اكتب حدث الحوض الثقافي.` }],
      { systemPrompt, temperature: 0.9, maxTokens: 1500, model: "llama-3.3-70b-versatile" }
    );

    const eventData = parseJSON(response);
    return res.json({ success: true, data: { fishMap: CULTURAL_FISH_MAP, event: eventData } });
  } catch (error: any) {
    console.error("[Simulation] Cultural Twin error:", error);
    return res.status(500).json({ success: false, error: "حدث خطأ" });
  }
});

export default router;
