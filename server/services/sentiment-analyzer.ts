import { groqClient } from "./groq-client.js";
import { db } from "../db.js";
import { sentimentHistory, type InsertSentimentHistory } from "../../shared/schema.js";
import { eq, desc, and, gte } from "drizzle-orm";

export interface SentimentResult {
  sentiment: "positive" | "neutral" | "negative";
  score: number; // -1 to 1 (-1 very negative, 0 neutral, 1 very positive)
  confidence: number; // 0 to 1
  emotions: string[]; // e.g., ["happy", "excited", "frustrated"]
  indicators: {
    keywords: string[];
    tone: string;
    urgency: "low" | "medium" | "high";
  };
}

/**
 * Sentiment Analysis Service
 * يحلل مشاعر المستخدمين في المحادثات ويعدل استجابات AI وفقاً لها
 */
export class SentimentAnalyzer {

  /**
   * تحليل مشاعر رسالة
   * @param message - نص الرسالة
   * @param userId - معرف المستخدم (اختياري)
   * @param sessionId - معرف الجلسة (اختياري)
   */
  async analyzeSentiment(
    message: string,
    userId?: string,
    sessionId?: string
  ): Promise<SentimentResult> {
    try {
      if (!groqClient.hasKeys()) {
        return this.basicSentimentAnalysis(message);
      }

      const prompt = `أنت محلل مشاعر خبير. قم بتحليل المشاعر في النص التالي وحدد:
1. المشاعر العامة (positive/neutral/negative)
2. درجة المشاعر من -1 (سلبي جداً) إلى 1 (إيجابي جداً)
3. مستوى الثقة في التحليل (0 to 1)
4. العواطف المحددة (مثل: سعيد، محبط، غاضب، متحمس، قلق)
5. مؤشرات:
   - الكلمات المفتاحية التي تدل على المشاعر
   - نبرة الرسالة (ودية، محايدة، عدائية، رسمية، غير رسمية)
   - مستوى الإلحاح (low/medium/high)

النص:
"""
${message}
"""

قدم الإجابة بصيغة JSON فقط:
{
  "sentiment": "positive/neutral/negative",
  "score": 0.5,
  "confidence": 0.9,
  "emotions": ["emotion1", "emotion2"],
  "indicators": {
    "keywords": ["كلمة1", "كلمة2"],
    "tone": "ودية",
    "urgency": "low"
  }
}`;

      const responseText = await groqClient.chat([{ role: "user", content: prompt }], {
        temperature: 0.2, // Low temperature for consistent JSON
        maxTokens: 512,
        model: "llama-3.1-8b-instant" // Use smaller model for sentiment
      });

      // Parse JSON response
      const sentimentData = this.parseSentimentResponse(responseText);

      // Save to history if userId or sessionId provided
      if (userId || sessionId) {
        const indicatorsArray = [
          ...(sentimentData.indicators.keywords || []),
          `Tone: ${sentimentData.indicators.tone}`,
          `Urgency: ${sentimentData.indicators.urgency}`
        ];

        await this.saveSentimentHistory({
          userId,
          sessionId,
          message,
          sentiment: sentimentData.sentiment,
          score: sentimentData.score.toString(),
          confidence: sentimentData.confidence.toString(),
          indicators: indicatorsArray,
        } as InsertSentimentHistory);
      }

      return sentimentData;
    } catch (error) {
      console.error("Sentiment analysis error:", error);

      // Fallback to basic sentiment analysis
      return this.basicSentimentAnalysis(message);
    }
  }

  /**
   * Parse AI response
   */
  private parseSentimentResponse(text: string): SentimentResult {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          sentiment: parsed.sentiment || "neutral",
          score: parsed.score || 0,
          confidence: parsed.confidence || 0.5,
          emotions: parsed.emotions || [],
          indicators: parsed.indicators || {
            keywords: [],
            tone: "محايدة",
            urgency: "low",
          },
        };
      }

      throw new Error("No JSON found in response");
    } catch (error) {
      console.error("Failed to parse sentiment response:", error);
      return this.basicSentimentAnalysis(text);
    }
  }

  /**
   * Basic sentiment analysis (fallback)
   */
  private basicSentimentAnalysis(message: string): SentimentResult {
    const lowerMessage = message.toLowerCase();

    // Positive keywords
    const positiveKeywords = [
      "ممتاز", "رائع", "شكرا", "جميل", "مفيد", "سعيد", "حب", "أحب",
      "excellent", "great", "thanks", "good", "helpful", "happy", "love"
    ];

    // Negative keywords
    const negativeKeywords = [
      "سيء", "مشكلة", "خطأ", "فشل", "غاضب", "محبط", "صعب", "معقد",
      "bad", "problem", "error", "fail", "angry", "frustrated", "difficult"
    ];

    // Urgent keywords
    const urgentKeywords = [
      "عاجل", "سريع", "فوري", "الآن", "ضروري", "مهم",
      "urgent", "quick", "immediate", "now", "asap", "important"
    ];

    let score = 0;
    const foundKeywords: string[] = [];

    positiveKeywords.forEach((keyword) => {
      if (lowerMessage.includes(keyword)) {
        score += 0.3;
        foundKeywords.push(keyword);
      }
    });

    negativeKeywords.forEach((keyword) => {
      if (lowerMessage.includes(keyword)) {
        score -= 0.3;
        foundKeywords.push(keyword);
      }
    });

    const hasUrgent = urgentKeywords.some((keyword) =>
      lowerMessage.includes(keyword)
    );

    // Normalize score
    score = Math.max(-1, Math.min(1, score));

    let sentiment: "positive" | "neutral" | "negative" = "neutral";
    if (score > 0.2) sentiment = "positive";
    if (score < -0.2) sentiment = "negative";

    return {
      sentiment,
      score,
      confidence: 0.6,
      emotions: sentiment === "positive" ? ["راضٍ"] : sentiment === "negative" ? ["محبط"] : ["محايد"],
      indicators: {
        keywords: foundKeywords,
        tone: "محايدة",
        urgency: hasUrgent ? "high" : "low",
      },
    };
  }

  /**
   * تعديل استجابة AI بناءً على المشاعر
   * @param response - الاستجابة الأصلية
   * @param sentiment - نتيجة تحليل المشاعر
   */
  async adjustResponseForSentiment(
    response: string,
    sentiment: SentimentResult
  ): Promise<string> {
    // If sentiment is very negative, add empathetic tone
    if (sentiment.score < -0.5) {
      if (!groqClient.hasKeys()) {
        return `أتفهم إحباطك، وأنا هنا لمساعدتك. ${response}`;
      }

      const empathyPrompt = `أضف نبرة متعاطفة ومواساة للرد التالي، مع الحفاظ على المحتوى الأساسي:

الرد الأصلي:
"""
${response}
"""

قدم رداً معدلاً يُظهر التعاطف والفهم لإحباط المستخدم، مع تقديم نفس المعلومات بطريقة أكثر دعماً.`;

      try {
        const adjustedResponse = await groqClient.chat([{ role: "user", content: empathyPrompt }], {
          temperature: 0.7,
          maxTokens: 512
        });
        return adjustedResponse;
      } catch (error) {
        console.error("Failed to adjust response:", error);
        // Fallback: add simple empathy prefix
        return `أتفهم إحباطك، وأنا هنا لمساعدتك. ${response}`;
      }
    }

    // If sentiment is very positive, add enthusiastic tone
    if (sentiment.score > 0.5) {
      return `سعيد جداً بمساعدتك! ${response}`;
    }

    // If urgent, add priority indicators
    if (sentiment.indicators.urgency === "high") {
      return `✅ أولوية عالية: ${response}`;
    }

    // Otherwise, return original
    return response;
  }

  /**
   * حفظ سجل المشاعر
   */
  private async saveSentimentHistory(data: InsertSentimentHistory) {
    if (!db) return;
    try {
      await db.insert(sentimentHistory).values(data);
    } catch (error) {
      console.error("Failed to save sentiment history:", error);
    }
  }

  /**
   * الحصول على سجل المشاعر للمستخدم
   */
  async getUserSentimentHistory(userId: string, limit: number = 20) {
    if (!db) return [];

    return db
      .select()
      .from(sentimentHistory)
      .where(eq(sentimentHistory.userId, userId))
      .orderBy(desc(sentimentHistory.createdAt))
      .limit(limit);
  }

  /**
   * الحصول على متوسط المشاعر للمستخدم
   */
  async getUserAverageSentiment(userId: string, days: number = 30) {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    if (!db) {
      return {
        averageScore: 0,
        totalMessages: 0,
        sentimentBreakdown: { positive: 0, neutral: 0, negative: 0 },
        trend: "stable" as const,
      };
    }

    const history = await db
      .select()
      .from(sentimentHistory)
      .where(
        and(
          eq(sentimentHistory.userId, userId),
          gte(sentimentHistory.createdAt, dateThreshold)
        )
      );

    if (history.length === 0) {
      return {
        averageScore: 0,
        totalMessages: 0,
        sentimentBreakdown: {
          positive: 0,
          neutral: 0,
          negative: 0,
        },
        trend: "stable" as "improving" | "stable" | "declining",
      };
    }

    const averageScore =
      history.reduce((sum, item) => sum + parseFloat(item.score as unknown as string), 0) / history.length;

    const sentimentBreakdown = {
      positive: history.filter((h) => h.sentiment === "positive").length,
      neutral: history.filter((h) => h.sentiment === "neutral").length,
      negative: history.filter((h) => h.sentiment === "negative").length,
    };

    // Calculate trend (compare first half vs second half)
    const midpoint = Math.floor(history.length / 2);
    const firstHalf = history.slice(0, midpoint);
    const secondHalf = history.slice(midpoint);

    const firstHalfAvg =
      firstHalf.reduce((sum, item) => sum + parseFloat(item.score as unknown as string), 0) / firstHalf.length;
    const secondHalfAvg =
      secondHalf.reduce((sum, item) => sum + parseFloat(item.score as unknown as string), 0) /
      secondHalf.length;

    let trend: "improving" | "stable" | "declining" = "stable";
    if (secondHalfAvg - firstHalfAvg > 0.2) trend = "improving";
    if (firstHalfAvg - secondHalfAvg > 0.2) trend = "declining";

    return {
      averageScore,
      totalMessages: history.length,
      sentimentBreakdown,
      trend,
      recentEmotions: this.getMostFrequentEmotions(history.slice(0, 10)),
    };
  }

  /**
   * الحصول على أكثر العواطف تكراراً
   */
  private getMostFrequentEmotions(history: any[]) {
    const emotionCount: Record<string, number> = {};

    history.forEach((item) => {
      const emotions = item.emotions as string[];
      emotions.forEach((emotion) => {
        emotionCount[emotion] = (emotionCount[emotion] || 0) + 1;
      });
    });

    return Object.entries(emotionCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([emotion, count]) => ({ emotion, count }));
  }

  /**
   * كشف المستخدمين المحبطين (للدعم الاستباقي)
   */
  async detectFrustratedUsers(threshold: number = -0.3, days: number = 7) {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    if (!db) return [];

    const allHistory = await db
      .select()
      .from(sentimentHistory)
      .where(gte(sentimentHistory.createdAt, dateThreshold));

    // Group by user
    const userSentiments: Record<
      string,
      { scores: number[]; userId: string }
    > = {};

    allHistory.forEach((item) => {
      if (!item.userId) return;

      if (!userSentiments[item.userId]) {
        userSentiments[item.userId] = {
          scores: [],
          userId: item.userId,
        };
      }

      const score = parseFloat(item.score as unknown as string);
      userSentiments[item.userId].scores.push(score);
    });

    // Calculate average and find frustrated users
    const frustratedUsers = Object.values(userSentiments)
      .map((user) => ({
        userId: user.userId,
        averageScore:
          user.scores.reduce((sum, score) => sum + score, 0) /
          user.scores.length,
        messageCount: user.scores.length,
      }))
      .filter((user) => user.averageScore < threshold && user.messageCount >= 3)
      .sort((a, b) => a.averageScore - b.averageScore);

    return frustratedUsers;
  }
}

// Export singleton instance
export const sentimentAnalyzer = new SentimentAnalyzer();
