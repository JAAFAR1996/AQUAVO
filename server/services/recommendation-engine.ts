import { getDb } from "../db.js";
import * as schema from "../../shared/schema.js";
import { eq, desc, and, gte, sql, inArray, notInArray, isNotNull, isNull, ne } from "drizzle-orm";

/**
 * متجه المستخدم - تمثيل تفاعلات المستخدم مع المنتجات
 * User Vector - User-Product interaction representation
 */
interface UserVector {
  [productId: string]: number; // product ID -> interaction score
}

/**
 * محرك التوصيات - نظام هجين (Collaborative Filtering + Content-based)
 * Recommendation Engine - Hybrid system
 */
export class RecommendationEngine {
  private get db() {
    const database = getDb();
    if (!database) throw new Error("Database service unavailable");
    return database;
  }

  // أوزان التفاعلات
  private readonly INTERACTION_WEIGHTS = {
    purchase: 5.0,
    favorite: 2.0,
    cart_add: 1.5,
    view: 0.5,
    cart_remove: -0.5, // عقوبة للإزالة من السلة
  };

  /**
   * بناء مصفوفة user-item من التفاعلات
   * Build user-item matrix from interactions
   */
  async buildUserItemMatrix(daysBack: number = 90): Promise<Map<string, UserVector>> {
    try {
      const since = new Date();
      since.setDate(since.getDate() - daysBack);

      // جلب جميع التفاعلات للفترة المحددة
      const interactions = await this.db
        .select()
        .from(schema.productInteractions)
        .where(
          and(
            gte(schema.productInteractions.createdAt, since),
            isNotNull(schema.productInteractions.userId)
          )
        );

      console.log(`[Recommendations] 📊 Building matrix from ${interactions.length} interactions`);

      const userVectors = new Map<string, UserVector>();

      // بناء متجهات المستخدمين
      for (const interaction of interactions) {
        if (!interaction.userId) continue;

        if (!userVectors.has(interaction.userId)) {
          userVectors.set(interaction.userId, {});
        }

        const userVector = userVectors.get(interaction.userId)!;
        const weight = this.INTERACTION_WEIGHTS[interaction.interactionType as keyof typeof this.INTERACTION_WEIGHTS] || 0;

        // تراكم الأوزان للمنتج
        userVector[interaction.productId] = (userVector[interaction.productId] || 0) + weight;
      }

      console.log(`[Recommendations] ✅ Matrix built for ${userVectors.size} users`);
      return userVectors;
    } catch (error) {
      console.error('[Recommendations] Error building user-item matrix:', error);
      return new Map();
    }
  }

  /**
   * حساب تشابه المستخدمين (Cosine Similarity)
   * Calculate user similarity using cosine similarity
   */
  calculateUserSimilarity(user1Vector: UserVector, user2Vector: UserVector): number {
    // الحصول على جميع المنتجات المشتركة
    const allProducts = new Set([
      ...Object.keys(user1Vector),
      ...Object.keys(user2Vector)
    ]);

    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (const productId of allProducts) {
      const score1 = user1Vector[productId] || 0;
      const score2 = user2Vector[productId] || 0;

      dotProduct += score1 * score2;
      magnitude1 += score1 * score1;
      magnitude2 += score2 * score2;
    }

    // تجنب القسمة على صفر
    if (magnitude1 === 0 || magnitude2 === 0) return 0;

    // Cosine Similarity
    return dotProduct / (Math.sqrt(magnitude1) * Math.sqrt(magnitude2));
  }

  /**
   * الحصول على توصيات Collaborative Filtering
   * Get collaborative filtering recommendations
   */
  async getCollaborativeRecommendations(
    userId: string,
    limit: number = 10,
    excludeProductIds: string[] = []
  ): Promise<string[]> {
    try {
      console.log(`[Recommendations] 🤝 Getting collaborative recommendations for user: ${userId}`);

      // بناء المصفوفة
      const userVectors = await this.buildUserItemMatrix();

      if (!userVectors.has(userId)) {
        console.log(`[Recommendations] ⚠️ User ${userId} not found in matrix, using cold start`);
        return this.getColdStartRecommendations(userId, limit, excludeProductIds);
      }

      const targetUserVector = userVectors.get(userId)!;

      // حساب تشابه المستخدم المستهدف مع جميع المستخدمين
      const similarities: { userId: string; similarity: number }[] = [];

      for (const [otherUserId, otherUserVector] of userVectors.entries()) {
        if (otherUserId === userId) continue;

        const similarity = this.calculateUserSimilarity(targetUserVector, otherUserVector);
        if (similarity > 0.1) { // عتبة الحد الأدنى للتشابه
          similarities.push({ userId: otherUserId, similarity });
        }
      }

      // ترتيب حسب التشابه
      similarities.sort((a, b) => b.similarity - a.similarity);

      // أخذ أفضل 10 مستخدمين متشابهين
      const topSimilarUsers = similarities.slice(0, 10);

      if (topSimilarUsers.length === 0) {
        console.log(`[Recommendations] ⚠️ No similar users found, using cold start`);
        return this.getColdStartRecommendations(userId, limit, excludeProductIds);
      }

      console.log(`[Recommendations] Found ${topSimilarUsers.length} similar users`);

      // جمع توصيات من المستخدمين المتشابهين
      const productScores = new Map<string, number>();

      for (const { userId: similarUserId, similarity } of topSimilarUsers) {
        const similarUserVector = userVectors.get(similarUserId)!;

        for (const [productId, score] of Object.entries(similarUserVector)) {
          // تخطي المنتجات التي تفاعل معها المستخدم بالفعل
          if (targetUserVector[productId]) continue;

          // تخطي المنتجات المستثناة
          if (excludeProductIds.includes(productId)) continue;

          // تجميع الدرجات مع الوزن بالتشابه
          const weightedScore = score * similarity;
          productScores.set(
            productId,
            (productScores.get(productId) || 0) + weightedScore
          );
        }
      }

      // ترتيب المنتجات حسب الدرجة
      const recommendedProducts = Array.from(productScores.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([productId]) => productId);

      console.log(`[Recommendations] ✅ Generated ${recommendedProducts.length} collaborative recommendations`);
      return recommendedProducts;
    } catch (error) {
      console.error('[Recommendations] Error in collaborative filtering:', error);
      return this.getColdStartRecommendations(userId, limit, excludeProductIds);
    }
  }

  /**
   * توصيات Cold Start للمستخدمين الجدد
   * Cold start recommendations for new users
   */
  async getColdStartRecommendations(
    userId: string,
    limit: number = 10,
    excludeProductIds: string[] = []
  ): Promise<string[]> {
    try {
      console.log(`[Recommendations] 🆕 Getting cold start recommendations for user: ${userId}`);

      // استراتيجية Cold Start:
      // 1. المنتجات الشائعة (الأكثر مشاهدة + شراء)
      const since = new Date();
      since.setDate(since.getDate() - 30); // آخر 30 يوم

      const trendingProducts = await this.db
        .select({
          productId: schema.productInteractions.productId,
          viewCount: sql<number>`COUNT(CASE WHEN ${schema.productInteractions.interactionType} = 'view' THEN 1 END)`,
          purchaseCount: sql<number>`COUNT(CASE WHEN ${schema.productInteractions.interactionType} = 'purchase' THEN 1 END)`,
          score: sql<number>`
            COUNT(CASE WHEN ${schema.productInteractions.interactionType} = 'view' THEN 1 END) * 0.5 +
            COUNT(CASE WHEN ${schema.productInteractions.interactionType} = 'purchase' THEN 1 END) * 5
          `,
        })
        .from(schema.productInteractions)
        .where(
          and(
            gte(schema.productInteractions.createdAt, since),
            excludeProductIds.length > 0
              ? notInArray(schema.productInteractions.productId, excludeProductIds)
              : undefined
          )
        )
        .groupBy(schema.productInteractions.productId)
        .orderBy(desc(sql`
            COUNT(CASE WHEN ${schema.productInteractions.interactionType} = 'view' THEN 1 END) * 0.5 +
            COUNT(CASE WHEN ${schema.productInteractions.interactionType} = 'purchase' THEN 1 END) * 5
          `))
        .limit(limit);

      const recommendations = trendingProducts.map(p => p.productId);

      console.log(`[Recommendations] ✅ Generated ${recommendations.length} cold start recommendations`);
      return recommendations;
    } catch (error) {
      console.error('[Recommendations] Error in cold start:', error);
      return [];
    }
  }

  /**
   * توصيات بناءً على المنتج (Content-based)
   * Product-based recommendations (similar products)
   */
  async getSimilarProducts(
    productId: string,
    limit: number = 5
  ): Promise<string[]> {
    try {
      console.log(`[Recommendations] 🔗 Getting similar products for: ${productId}`);

      // الحصول على معلومات المنتج
      const product = await this.db
        .select()
        .from(schema.products)
        .where(and(eq(schema.products.id, productId),
          isNull(schema.products.deletedAt), eq(schema.products.isStorefrontVisible, true)))
        .limit(1);

      if (product.length === 0) {
        return [];
      }

      const targetProduct = product[0];

      // استراتيجية التشابه:
      // 1. نفس الفئة
      // 2. نفس العلامة التجارية (إن وجدت)
      // 3. نطاق سعر قريب (±30%)
      // 4. تقييم قريب

      const minPrice = parseFloat(targetProduct.price) * 0.7;
      const maxPrice = parseFloat(targetProduct.price) * 1.3;

      const similarProducts = await this.db
        .select()
        .from(schema.products)
        .where(
          and(
            isNull(schema.products.deletedAt),
            eq(schema.products.isStorefrontVisible, true),
            eq(schema.products.category, targetProduct.category),
            ne(schema.products.id, productId), // استبعاد المنتج نفسه
            gte(sql`CAST(${schema.products.price} AS DECIMAL)`, minPrice),
            sql`CAST(${schema.products.price} AS DECIMAL) <= ${maxPrice}`
          )
        )
        .limit(limit);

      console.log(`[Recommendations] ✅ Found ${similarProducts.length} similar products`);
      return similarProducts.map(p => p.id);
    } catch (error) {
      console.error('[Recommendations] Error finding similar products:', error);
      return [];
    }
  }

  /**
   * المنتجات التي اشتراها معاً (Frequently Bought Together)
   * Frequently bought together analysis
   */
  async getFrequentlyBoughtTogether(
    productId: string,
    limit: number = 5
  ): Promise<string[]> {
    return this.getFrequentlyBoughtTogetherForProducts([productId], limit);
  }

  /** One grouped query for a bounded cart, with a distinct order as one vote. */
  async getFrequentlyBoughtTogetherForProducts(
    productIds: readonly string[],
    limit: number = 20,
  ): Promise<string[]> {
    const ids = [...new Set(productIds)].slice(0, 20);
    if (ids.length === 0) return [];
    try {
      const orderId = sql<string>`${schema.productInteractions.metadata}->>'orderId'`;
      const matchingOrders = this.db
        .select({ orderId })
        .from(schema.productInteractions)
        .where(and(
          inArray(schema.productInteractions.productId, ids),
          eq(schema.productInteractions.interactionType, 'purchase'),
          isNotNull(orderId),
        ));
      // Keep order IDs inside the database. Previously the projection was named
      // orderId but the JS reader looked for metadata, so every result was lost.
      const orderCount = sql<number>`COUNT(DISTINCT ${orderId})`;
      const coPurchasedProducts = await this.db
        .select({
          productId: schema.productInteractions.productId,
          count: orderCount,
        })
        .from(schema.productInteractions)
        .where(
          and(
            eq(schema.productInteractions.interactionType, 'purchase'),
            notInArray(schema.productInteractions.productId, ids),
            inArray(orderId, matchingOrders)
          )
        )
        .groupBy(schema.productInteractions.productId)
        .having(sql`${orderCount} >= 2`)
        .orderBy(desc(orderCount), schema.productInteractions.productId)
        .limit(Math.min(50, Math.max(1, limit)));
      return coPurchasedProducts.map(p => p.productId);
    } catch (error) {
      console.error('[Recommendations] Error finding co-purchased products:', error);
      return [];
    }
  }

  /**
   * توصيات شخصية هجينة (Hybrid)
   * Hybrid personalized recommendations
   */
  async getPersonalizedRecommendations(
    userId: string,
    limit: number = 10
  ): Promise<{ productIds: string[]; method: string }> {
    try {
      console.log(`[Recommendations] 🎯 Getting personalized recommendations for: ${userId}`);

      // جلب تفاعلات المستخدم الأخيرة
      const userInteractions = await this.db
        .select()
        .from(schema.productInteractions)
        .where(eq(schema.productInteractions.userId, userId))
        .orderBy(desc(schema.productInteractions.createdAt))
        .limit(50);

      // المنتجات التي تفاعل معها (للاستثناء)
      const interactedProducts = userInteractions.map(i => i.productId);

      // استراتيجية هجينة:
      // 70% Collaborative Filtering
      // 30% Content-based (من آخر منتج شاهده)

      const collaborativeCount = Math.ceil(limit * 0.7);
      const contentBasedCount = limit - collaborativeCount;

      // الحصول على توصيات collaborative
      const collaborativeRecs = await this.getCollaborativeRecommendations(
        userId,
        collaborativeCount,
        interactedProducts
      );

      // الحصول على توصيات content-based من آخر منتج
      let contentBasedRecs: string[] = [];
      if (userInteractions.length > 0) {
        const lastViewedProduct = userInteractions.find(i => i.interactionType === 'view');
        if (lastViewedProduct) {
          contentBasedRecs = await this.getSimilarProducts(
            lastViewedProduct.productId,
            contentBasedCount
          );
          // إزالة المنتجات المكررة
          contentBasedRecs = contentBasedRecs.filter(
            id => !collaborativeRecs.includes(id) && !interactedProducts.includes(id)
          );
        }
      }

      // دمج التوصيات
      const recommendations = [...collaborativeRecs, ...contentBasedRecs].slice(0, limit);

      // إذا لم نحصل على عدد كافي، استكمل بـ cold start
      if (recommendations.length < limit) {
        const coldStartRecs = await this.getColdStartRecommendations(
          userId,
          limit - recommendations.length,
          [...interactedProducts, ...recommendations]
        );
        recommendations.push(...coldStartRecs);
      }

      const method = collaborativeRecs.length > 0 ? 'hybrid' : 'cold_start';
      console.log(`[Recommendations] ✅ Generated ${recommendations.length} personalized recommendations (${method})`);

      const publicRows = recommendations.length ? await this.db.select({ id: schema.products.id })
        .from(schema.products).where(and(inArray(schema.products.id, recommendations),
          isNull(schema.products.deletedAt), eq(schema.products.isStorefrontVisible, true))) : [];
      const publicIds = new Set(publicRows.map(product => product.id));
      return {
        productIds: recommendations.filter(id => publicIds.has(id)),
        method
      };
    } catch (error) {
      console.error('[Recommendations] Error generating personalized recommendations:', error);
      return {
        productIds: [],
        method: 'error'
      };
    }
  }

  /**
   * توصيات للزوار (بدون حساب)
   * Recommendations for anonymous visitors based on session
   */
  async getSessionBasedRecommendations(
    sessionId: string,
    limit: number = 10
  ): Promise<string[]> {
    try {
      console.log(`[Recommendations] 👤 Getting session-based recommendations for: ${sessionId}`);

      // جلب تفاعلات الجلسة
      const sessionInteractions = await this.db
        .select()
        .from(schema.productInteractions)
        .where(eq(schema.productInteractions.sessionId, sessionId))
        .orderBy(desc(schema.productInteractions.createdAt))
        .limit(20);

      if (sessionInteractions.length === 0) {
        // جلسة جديدة - المنتجات الشائعة
        return this.getColdStartRecommendations('guest', limit);
      }

      // المنتجات التي شاهدها في الجلسة
      const viewedProducts = sessionInteractions
        .filter(i => i.interactionType === 'view')
        .map(i => i.productId);

      // توصيات بناءً على آخر منتج شاهده
      const lastViewed = viewedProducts[0];
      if (lastViewed) {
        const similarProducts = await this.getSimilarProducts(lastViewed, limit);
        const filtered = similarProducts.filter(id => !viewedProducts.includes(id));

        // استكمل بالشائع إذا لم يكن كافياً
        if (filtered.length < limit) {
          const trending = await this.getColdStartRecommendations(
            'guest',
            limit - filtered.length,
            [...viewedProducts, ...filtered]
          );
          filtered.push(...trending);
        }

        return filtered.slice(0, limit);
      }

      return this.getColdStartRecommendations('guest', limit, viewedProducts);
    } catch (error) {
      console.error('[Recommendations] Error generating session-based recommendations:', error);
      return [];
    }
  }
}

// مثيل واحد مشترك
export const recommendationEngine = new RecommendationEngine();
