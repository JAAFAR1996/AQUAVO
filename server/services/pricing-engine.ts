import { getDb } from "../db.js";
import * as schema from "../../shared/schema.js";
import { eq, desc, and, gte, sql } from "drizzle-orm";

/**
 * محرك التسعير الذكي - تحليل الأسعار الزمني (Time Series)
 * Pricing Engine - Time series analysis for optimal pricing
 */
export class PricingEngine {
  private db = getDb();
  private schemaError = false; // Circuit breaker: stop querying if tables/columns are missing

  /**
   * حساب مرونة الطلب (Demand Elasticity)
   * ΔQ/Q ÷ ΔP/P
   */
  /**
   * Check if error is a schema/table mismatch (missing column or relation)
   */
  private isSchemaError(error: any): boolean {
    const msg = String(error?.message || error || '');
    return msg.includes('does not exist') || msg.includes('undefined_column') || msg.includes('42703') || msg.includes('42P01');
  }

  async calculateDemandElasticity(productId: string): Promise<number | null> {
    if (this.schemaError) return null;
    try {
      console.log(`[Pricing] 📊 Calculating demand elasticity for: ${productId}`);

      // جلب تاريخ الأسعار لآخر 60 يوم
      const since = new Date();
      since.setDate(since.getDate() - 60);

      const priceHistory = await this.db
        .select()
        .from(schema.priceHistory)
        .where(
          and(
            eq(schema.priceHistory.productId, productId),
            gte(schema.priceHistory.createdAt, since)
          )
        )
        .orderBy(schema.priceHistory.createdAt);

      if (priceHistory.length < 10) {
        console.log(`[Pricing] ⚠️ Not enough data points (${priceHistory.length}) for elasticity`);
        return null;
      }

      // حساب متوسطات لنقاط البداية والنهاية
      const firstHalf = priceHistory.slice(0, Math.floor(priceHistory.length / 2));
      const secondHalf = priceHistory.slice(Math.floor(priceHistory.length / 2));

      const avgPrice1 = firstHalf.reduce((sum, p) => sum + parseFloat(p.price), 0) / firstHalf.length;
      const avgSales1 = firstHalf.reduce((sum, p) => sum + p.salesVelocity, 0) / firstHalf.length;

      const avgPrice2 = secondHalf.reduce((sum, p) => sum + parseFloat(p.price), 0) / secondHalf.length;
      const avgSales2 = secondHalf.reduce((sum, p) => sum + p.salesVelocity, 0) / secondHalf.length;

      // تجنب القسمة على صفر
      if (avgPrice1 === 0 || avgSales1 === 0) return null;

      // حساب النسبة المئوية للتغيير
      const percentChangePrice = (avgPrice2 - avgPrice1) / avgPrice1;
      const percentChangeSales = (avgSales2 - avgSales1) / avgSales1;

      // المرونة = (% تغير الكمية) / (% تغير السعر)
      if (percentChangePrice === 0) return null;

      const elasticity = percentChangeSales / percentChangePrice;

      console.log(`[Pricing] 📈 Elasticity: ${elasticity.toFixed(2)}`);
      return elasticity;
    } catch (error) {
      if (this.isSchemaError(error)) {
        this.schemaError = true;
        console.warn('[Pricing] ⚠️ Schema mismatch detected (price_history table). Disabling advanced pricing until DB migration is run.');
      } else {
        console.error('[Pricing] Error calculating elasticity:', error);
      }
      return null;
    }
  }

  /**
   * تحديد العامل الموسمي للفئة
   * Get seasonal factor for category
   */
  getSeasonalFactor(category: string): number {
    const month = new Date().getMonth(); // 0-11

    // الصيف (يونيو-أغسطس): 5, 6, 7
    const isSummer = month >= 5 && month <= 7;

    // الشتاء (ديسمبر-فبراير): 11, 0, 1
    const isWinter = month === 11 || month === 0 || month === 1;

    const categoryLower = category.toLowerCase();

    // أحواض: ذروة في الصيف
    if (categoryLower.includes('حوض') || categoryLower.includes('aquarium') || categoryLower.includes('tank')) {
      return isSummer ? 1.4 : (isWinter ? 0.8 : 1.0);
    }

    // سخانات: ذروة في الشتاء
    if (categoryLower.includes('سخان') || categoryLower.includes('heater')) {
      return isWinter ? 1.4 : (isSummer ? 0.7 : 1.0);
    }

    // فلاتر: تتبع مبيعات الأحواض (ذروة في الصيف)
    if (categoryLower.includes('فلتر') || categoryLower.includes('filter') || categoryLower.includes('مضخة')) {
      return isSummer ? 1.2 : (isWinter ? 0.9 : 1.0);
    }

    // طعام وزينة: ثابت على مدار السنة
    if (categoryLower.includes('طعام') || categoryLower.includes('food') || categoryLower.includes('زينة')) {
      return 1.0;
    }

    // افتراضي
    return 1.0;
  }

  /**
   * اقتراح السعر الأمثل
   * Suggest optimal price
   */
  async suggestOptimalPrice(productId: string): Promise<{
    currentPrice: number;
    suggestedPrice: number;
    change: number;
    changePercent: number;
    reason: string;
    reasonType: 'increase' | 'decrease' | 'maintain';
    confidence: number;
    expectedImpact: {
      revenueChange: string;
      salesChange: string;
    };
  } | null> {
    // Circuit breaker: if schema is broken, fallback to stock-based suggestions
    if (this.schemaError) {
      try {
        const product = await this.db
          .select({ id: schema.products.id, name: schema.products.name, stock: schema.products.stock, price: schema.products.price, category: schema.products.category })
          .from(schema.products)
          .where(eq(schema.products.id, productId))
          .limit(1);
        if (product.length === 0) return null;
        return this.suggestBasedOnStock(product[0]);
      } catch {
        return null;
      }
    }

    try {
      console.log(`[Pricing] 💰 Calculating optimal price for: ${productId}`);

      // جلب معلومات المنتج
      const product = await this.db
        .select()
        .from(schema.products)
        .where(eq(schema.products.id, productId))
        .limit(1);

      if (product.length === 0) {
        console.log(`[Pricing] ❌ Product not found: ${productId}`);
        return null;
      }

      const currentProduct = product[0];
      const currentPrice = parseFloat(currentProduct.price);
      const currentStock = currentProduct.stock || 0;

      // جلب أحدث بيانات تاريخ السعر
      const recentHistory = await this.db
        .select()
        .from(schema.priceHistory)
        .where(eq(schema.priceHistory.productId, productId))
        .orderBy(desc(schema.priceHistory.createdAt))
        .limit(30);

      if (recentHistory.length === 0) {
        // لا يوجد تاريخ - اقتراح بناءً على المخزون فقط
        return this.suggestBasedOnStock(currentProduct);
      }

      // حساب متوسط سرعة المبيعات
      const avgSalesVelocity = recentHistory.reduce((sum, h) => sum + h.salesVelocity, 0) / recentHistory.length;

      // حساب متوسط الطلب
      const avgDemandScore = recentHistory.reduce((sum, h) => sum + h.demandScore, 0) / recentHistory.length;

      // العامل الموسمي
      const seasonalFactor = this.getSeasonalFactor(currentProduct.category);

      // القرارات:
      let suggestedPrice = currentPrice;
      let reason = '';
      let reasonType: 'increase' | 'decrease' | 'maintain' = 'maintain';
      let confidence = 0.5;

      // 1. مخزون منخفض + طلب مرتفع → زيادة السعر
      if (currentStock < 10 && avgDemandScore > 70) {
        const increasePercent = 0.05 + (avgDemandScore / 100) * 0.1; // 5-15%
        suggestedPrice = currentPrice * (1 + increasePercent);
        reason = `مخزون منخفض (${currentStock}) وطلب مرتفع (${Math.round(avgDemandScore)}%) - زيادة السعر للاستفادة من الطلب`;
        reasonType = 'increase';
        confidence = 0.8;
      }
      // 2. مخزون زائد + مبيعات بطيئة → تخفيض السعر
      else if (currentStock > 50 && avgSalesVelocity < 2) {
        const decreasePercent = 0.1 + (currentStock / 100) * 0.1; // 10-20%
        suggestedPrice = currentPrice * (1 - decreasePercent);
        reason = `مخزون زائد (${currentStock}) ومبيعات بطيئة (${avgSalesVelocity.toFixed(1)}/يوم) - تخفيض السعر لتصريف المخزون`;
        reasonType = 'decrease';
        confidence = 0.75;
      }
      // 3. تعديل موسمي
      else if (seasonalFactor !== 1.0) {
        if (seasonalFactor > 1.1) {
          suggestedPrice = currentPrice * Math.min(seasonalFactor, 1.3);
          reason = `موسم الذروة للفئة "${currentProduct.category}" - زيادة السعر بـ ${Math.round((seasonalFactor - 1) * 100)}%`;
          reasonType = 'increase';
          confidence = 0.7;
        } else if (seasonalFactor < 0.9) {
          suggestedPrice = currentPrice * Math.max(seasonalFactor, 0.8);
          reason = `خارج موسم الذروة للفئة "${currentProduct.category}" - تخفيض السعر بـ ${Math.round((1 - seasonalFactor) * 100)}%`;
          reasonType = 'decrease';
          confidence = 0.7;
        }
      }
      // 4. طلب متوسط + مخزون متوسط → الحفاظ على السعر
      else {
        reason = `الطلب والمخزون متوازنين - الحفاظ على السعر الحالي`;
        reasonType = 'maintain';
        confidence = 0.6;
      }

      // حساب التغيير
      const change = suggestedPrice - currentPrice;
      const changePercent = (change / currentPrice) * 100;

      // تقدير التأثير
      const elasticity = await this.calculateDemandElasticity(productId);
      let expectedSalesChange = 'غير محدد';
      let expectedRevenueChange = 'غير محدد';

      if (elasticity !== null && changePercent !== 0) {
        // التغيير المتوقع في المبيعات = المرونة × التغيير في السعر%
        const salesChangePercent = elasticity * changePercent;

        // التغيير المتوقع في الإيرادات = التغيير في السعر% + التغيير في المبيعات%
        const revenueChangePercent = changePercent + salesChangePercent;

        expectedSalesChange = salesChangePercent > 0
          ? `+${salesChangePercent.toFixed(1)}%`
          : `${salesChangePercent.toFixed(1)}%`;

        expectedRevenueChange = revenueChangePercent > 0
          ? `+${revenueChangePercent.toFixed(1)}%`
          : `${revenueChangePercent.toFixed(1)}%`;
      }

      console.log(`[Pricing] ✅ Suggested price: ${suggestedPrice.toFixed(0)} (${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%)`);

      return {
        currentPrice,
        suggestedPrice: Math.round(suggestedPrice),
        change: Math.round(change),
        changePercent: Math.round(changePercent * 10) / 10,
        reason,
        reasonType,
        confidence: Math.round(confidence * 100) / 100,
        expectedImpact: {
          revenueChange: expectedRevenueChange,
          salesChange: expectedSalesChange
        }
      };
    } catch (error) {
      if (this.isSchemaError(error)) {
        this.schemaError = true;
        console.warn('[Pricing] ⚠️ Schema mismatch detected. Falling back to stock-based pricing. Run `drizzle-kit push` to fix.');
        // Try fallback for this product
        try {
          const product = await this.db
            .select({ id: schema.products.id, name: schema.products.name, stock: schema.products.stock, price: schema.products.price, category: schema.products.category })
            .from(schema.products)
            .where(eq(schema.products.id, productId))
            .limit(1);
          if (product.length > 0) return this.suggestBasedOnStock(product[0]);
        } catch { /* fallback also failed */ }
      } else {
        console.error('[Pricing] Error calculating optimal price:', error);
      }
      return null;
    }
  }

  /**
   * اقتراح بناءً على المخزون فقط (عندما لا يوجد تاريخ)
   * Suggest based on stock only (when no history available)
   */
  private suggestBasedOnStock(product: any): {
    currentPrice: number;
    suggestedPrice: number;
    change: number;
    changePercent: number;
    reason: string;
    reasonType: 'increase' | 'decrease' | 'maintain';
    confidence: number;
    expectedImpact: {
      revenueChange: string;
      salesChange: string;
    };
  } {
    const currentPrice = parseFloat(product.price);
    const stock = product.stock || 0;

    let suggestedPrice = currentPrice;
    let reason = '';
    let reasonType: 'increase' | 'decrease' | 'maintain' = 'maintain';

    if (stock < 5) {
      suggestedPrice = currentPrice * 1.1; // +10%
      reason = 'مخزون منخفض جداً - زيادة السعر بـ 10%';
      reasonType = 'increase';
    } else if (stock > 80) {
      suggestedPrice = currentPrice * 0.9; // -10%
      reason = 'مخزون زائد - تخفيض السعر بـ 10% لتصريف المخزون';
      reasonType = 'decrease';
    } else {
      reason = 'لا يوجد تاريخ سعري كافٍ - الحفاظ على السعر الحالي';
    }

    return {
      currentPrice,
      suggestedPrice: Math.round(suggestedPrice),
      change: Math.round(suggestedPrice - currentPrice),
      changePercent: Math.round(((suggestedPrice - currentPrice) / currentPrice) * 1000) / 10,
      reason,
      reasonType,
      confidence: 0.3, // ثقة منخفضة بدون تاريخ
      expectedImpact: {
        revenueChange: 'غير محدد',
        salesChange: 'غير محدد'
      }
    };
  }

  /**
   * الحصول على اقتراحات أسعار لمنتجات متعددة
   * Get price suggestions for multiple products
   */
  async getBulkPriceSuggestions(productIds: string[]): Promise<Map<string, any>> {
    const suggestions = new Map();

    for (const productId of productIds) {
      const suggestion = await this.suggestOptimalPrice(productId);
      if (suggestion && Math.abs(suggestion.changePercent) >= 2) {
        // فقط إذا كان التغيير أكبر من 2%
        suggestions.set(productId, suggestion);
      }
    }

    return suggestions;
  }

  /**
   * تحليل اتجاه السعر (Trend Analysis)
   * Analyze price trend
   */
  async analyzePriceTrend(productId: string, days: number = 30): Promise<{
    trend: 'up' | 'down' | 'stable';
    trendStrength: number;
    avgPrice: number;
    minPrice: number;
    maxPrice: number;
    volatility: number;
  } | null> {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const history = await this.db
        .select()
        .from(schema.priceHistory)
        .where(
          and(
            eq(schema.priceHistory.productId, productId),
            gte(schema.priceHistory.createdAt, since)
          )
        )
        .orderBy(schema.priceHistory.createdAt);

      if (history.length < 5) return null;

      const prices = history.map(h => parseFloat(h.price));
      const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);

      // حساب الاتجاه (Linear Regression Slope)
      let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
      const n = prices.length;

      for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += prices[i];
        sumXY += i * prices[i];
        sumXX += i * i;
      }

      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      const slopePercent = (slope / avgPrice) * 100;

      // تحديد الاتجاه
      let trend: 'up' | 'down' | 'stable';
      if (slopePercent > 0.05) trend = 'up';
      else if (slopePercent < -0.05) trend = 'down';
      else trend = 'stable';

      // قوة الاتجاه (0-1)
      const trendStrength = Math.min(Math.abs(slopePercent) / 5, 1);

      // التقلب (Volatility) - الانحراف المعياري
      const variance = prices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / n;
      const volatility = Math.sqrt(variance) / avgPrice;

      return {
        trend,
        trendStrength: Math.round(trendStrength * 100) / 100,
        avgPrice: Math.round(avgPrice),
        minPrice: Math.round(minPrice),
        maxPrice: Math.round(maxPrice),
        volatility: Math.round(volatility * 1000) / 1000
      };
    } catch (error) {
      if (this.isSchemaError(error)) {
        this.schemaError = true;
        console.warn('[Pricing] ⚠️ Schema mismatch in trend analysis. Disabled until DB migration.');
      } else {
        console.error('[Pricing] Error analyzing trend:', error);
      }
      return null;
    }
  }

  /**
   * تحديث تاريخ السعر (استدعاء دوري)
   * Update price history (periodic call)
   */
  async updatePriceHistory(): Promise<number> {
    if (this.schemaError) {
      console.warn('[Pricing] ⚠️ Skipping price history update - schema mismatch. Run `drizzle-kit push`.');
      return 0;
    }
    try {
      console.log('[Pricing] 🔄 Updating price history...');

      const products = await this.db.select().from(schema.products);
      let updated = 0;

      for (const product of products) {
        // حساب سرعة المبيعات من التفاعلات
        const since = new Date();
        since.setDate(since.getDate() - 1); // آخر 24 ساعة

        const purchases = await this.db
          .select()
          .from(schema.productInteractions)
          .where(
            and(
              eq(schema.productInteractions.productId, product.id),
              eq(schema.productInteractions.interactionType, 'purchase'),
              gte(schema.productInteractions.createdAt, since)
            )
          );

        const salesVelocity = purchases.length;

        // حساب درجة الطلب من المشاهدات والإضافات للسلة
        const views = await this.db
          .select()
          .from(schema.productInteractions)
          .where(
            and(
              eq(schema.productInteractions.productId, product.id),
              eq(schema.productInteractions.interactionType, 'view'),
              gte(schema.productInteractions.createdAt, since)
            )
          );

        const cartAdds = await this.db
          .select()
          .from(schema.productInteractions)
          .where(
            and(
              eq(schema.productInteractions.productId, product.id),
              eq(schema.productInteractions.interactionType, 'cart_add'),
              gte(schema.productInteractions.createdAt, since)
            )
          );

        // درجة الطلب (0-100)
        const demandScore = Math.min(
          (views.length * 1 + cartAdds.length * 5 + purchases.length * 10),
          100
        );

        // إدخال سجل جديد
        await this.db.insert(schema.priceHistory).values({
          productId: product.id,
          price: product.price,
          stock: product.stock || 0,
          salesVelocity,
          demandScore,
          createdAt: new Date(),
        });

        updated++;
      }

      console.log(`[Pricing] ✅ Updated price history for ${updated} products`);
      return updated;
    } catch (error) {
      if (this.isSchemaError(error)) {
        this.schemaError = true;
        console.warn('[Pricing] ⚠️ Schema mismatch in updatePriceHistory. Disabled until DB migration.');
      } else {
        console.error('[Pricing] Error updating price history:', error);
      }
      return 0;
    }
  }
}

// مثيل واحد مشترك
export const pricingEngine = new PricingEngine();
