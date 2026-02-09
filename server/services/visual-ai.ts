import { geminiClient } from "./gemini-client.js";
import { db } from "../db.js";
import { imageAnalyses, products, type InsertImageAnalysis } from "../../shared/schema.js";
import { eq, desc, inArray, sql } from "drizzle-orm";

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

      return {
        id: savedAnalysis.id,
        analysisType,
        analysis,
        recommendedProducts,
        processingTimeMs: processingTime,
      };
    } catch (error) {
      console.error("Visual AI Error:", error);
      throw new Error(
        `فشل تحليل الصورة: ${error instanceof Error ? error.message : "خطأ غير معروف"}`
      );
    }
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

      health: `أنت طبيب بيطري متخصص في أسماك الزينة. قم بتحليل هذه الصورة وحدد:
1. علامات المرض أو الإصابة
2. التشخيص المحتمل
3. العلاج المقترح
4. الأدوية أو المنتجات اللازمة

قدم الإجابة بصيغة JSON:
{
  "detected": ["عرض 1", "عرض 2"],
  "confidence": 0.80,
  "suggestions": ["علاج 1", "علاج 2"],
  "details": {
    "symptoms": ["عرض 1"],
    "diagnosis": "التشخيص المحتمل",
    "treatment": "خطة العلاج",
    "urgency": "عاجل/متوسط/روتيني"
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
