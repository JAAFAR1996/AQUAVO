import { geminiClient } from "./gemini-client.js";
import { getDb } from "../db.js";
import * as schema from "../../shared/schema.js";
import { eq, and } from "drizzle-orm";

/**
 * مولد Embeddings - تحويل المنتجات إلى متجهات للبحث الدلالي
 * Embedding Generator - Convert products to vectors for semantic search
 */
export class EmbeddingGenerator {
  private db = getDb();

  /**
   * توليد نص غني للمنتج
   * Generate rich text representation of product
   */
  private createProductText(product: any): string {
    const parts: string[] = [];

    // الاسم (أهم عنصر)
    if (product.name) {
      parts.push(`اسم المنتج: ${product.name}`);
    }

    // الفئة
    if (product.category) {
      parts.push(`الفئة: ${product.category}`);
    }

    // العلامة التجارية
    if (product.brand) {
      parts.push(`العلامة التجارية: ${product.brand}`);
    }

    // الوصف
    if (product.description) {
      parts.push(`الوصف: ${product.description}`);
    }

    // السعر (كنطاق وصفي)
    if (product.price) {
      const price = parseFloat(product.price);
      let priceRange = '';
      if (price < 20000) priceRange = 'رخيص ميزانية محدودة';
      else if (price < 50000) priceRange = 'متوسط السعر معقول';
      else if (price < 100000) priceRange = 'مرتفع السعر جودة عالية';
      else priceRange = 'فاخر premium احترافي';

      parts.push(`نطاق السعر: ${priceRange}`);
    }

    // التقييم
    if (product.rating && product.rating > 0) {
      let ratingDesc = '';
      if (product.rating >= 4.5) ratingDesc = 'ممتاز عالي التقييم';
      else if (product.rating >= 4.0) ratingDesc = 'جيد جداً مرضي';
      else if (product.rating >= 3.0) ratingDesc = 'جيد';
      else ratingDesc = 'متوسط';

      parts.push(`التقييم: ${ratingDesc} (${product.rating}/5)`);
    }

    // الكلمات المفتاحية (استخراج من الاسم والوصف)
    const keywords = this.extractKeywords(product);
    if (keywords.length > 0) {
      parts.push(`الكلمات المفتاحية: ${keywords.join(' ')}`);
    }

    return parts.join('\n');
  }

  /**
   * استخراج كلمات مفتاحية من المنتج
   * Extract keywords from product
   */
  private extractKeywords(product: any): string[] {
    const text = `${product.name || ''} ${product.description || ''}`.toLowerCase();

    // كلمات مفتاحية شائعة في مجال الأسماك
    const keywords = [
      'حوض', 'سمك', 'فلتر', 'مضخة', 'سخان', 'إضاءة', 'led', 'زينة', 'ديكور',
      'طعام', 'غذاء', 'نباتات', 'حصى', 'رمل', 'أكسجين', 'هواء', 'تنظيف',
      'صيانة', 'كيماويات', 'معالجة', 'مياه', 'ماء', 'أدوات', 'اكسسوارات',
      'ذهبي', 'استوائي', 'بحري', 'عذب', 'مالح', 'كبير', 'صغير', 'متوسط',
      'aquarium', 'fish', 'tank', 'filter', 'pump', 'heater', 'light',
      'decoration', 'food', 'plants', 'gravel', 'oxygen', 'air'
    ];

    return keywords.filter(kw => text.includes(kw));
  }

  /**
   * توليد embedding لمنتج واحد
   * Generate embedding for a single product
   */
  async generateProductEmbedding(productId: string): Promise<number[] | null> {
    try {
      console.log(`[Embeddings] 🔄 Generating embedding for product: ${productId}`);

      // جلب معلومات المنتج
      const productResult = await this.db
        .select()
        .from(schema.products)
        .where(eq(schema.products.id, productId))
        .limit(1);

      if (productResult.length === 0) {
        console.error(`[Embeddings] ❌ Product not found: ${productId}`);
        return null;
      }

      const product = productResult[0];
      const productText = this.createProductText(product);

      // توليد embedding باستخدام Gemini مع دعم لعدة نماذج تجنباً لأخطاء 404
      const result = await geminiClient.executeWithFallback(async (client) => {
        const modelsToTry = ["text-embedding-004", "embedding-001", "gemini-embedding-exp", "text-embedding-005"];
        let lastError = null;
        for (const modelName of modelsToTry) {
          try {
            const model = client.getGenerativeModel({ model: modelName });
            return await model.embedContent(productText);
          } catch (err: any) {
            if (err.message && (err.message.includes("404") || err.message.includes("not found"))) {
              console.warn(`[Embeddings] Model ${modelName} not available, trying next...`);
              lastError = err;
              continue;
            }
            throw err;
          }
        }
        throw lastError || new Error("All embedding models failed or were not found.");
      });
      const embedding = result.embedding.values;

      if (!embedding || embedding.length === 0) {
        console.error(`[Embeddings] ❌ Failed to generate embedding for: ${productId}`);
        return null;
      }

      // Check if embedding already exists for this product
      const existingEmbedding = await this.db
        .select()
        .from(schema.productEmbeddings)
        .where(eq(schema.productEmbeddings.productId, productId))
        .limit(1);

      if (existingEmbedding.length > 0) {
        // Update existing embedding
        await this.db
          .update(schema.productEmbeddings)
          .set({
            embedding: JSON.stringify(embedding),
            model: 'text-embedding-004',
            updatedAt: new Date(),
          })
          .where(eq(schema.productEmbeddings.productId, productId));
      } else {
        // Insert new embedding
        await this.db
          .insert(schema.productEmbeddings)
          .values({
            productId,
            embedding: JSON.stringify(embedding),
            model: 'text-embedding-004',
            createdAt: new Date(),
          });
      }

      console.log(`[Embeddings] ✅ Generated embedding (${embedding.length} dimensions) for: ${productId}`);
      return embedding;
    } catch (error) {
      console.error(`[Embeddings] ❌ Error generating embedding for ${productId}:`, error);
      return null;
    }
  }

  /**
   * توليد embeddings لجميع المنتجات
   * Generate embeddings for all products
   */
  async generateAllEmbeddings(batchSize: number = 5): Promise<{ success: number; failed: number }> {
    try {
      console.log('[Embeddings] 🚀 Starting batch embedding generation...');

      // جلب جميع المنتجات
      const products = await this.db.select().from(schema.products);

      console.log(`[Embeddings] Found ${products.length} products`);

      let success = 0;
      let failed = 0;

      // معالجة على دفعات لتجنب rate limits
      for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);

        console.log(`[Embeddings] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(products.length / batchSize)}`);

        // معالجة الدفعة بشكل متزامن
        const promises = batch.map(product => this.generateProductEmbedding(product.id));
        const results = await Promise.all(promises);

        // حساب النجاح والفشل
        results.forEach(result => {
          if (result !== null) success++;
          else failed++;
        });

        // انتظار قصير بين الدفعات لتجنب rate limiting
        if (i + batchSize < products.length) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 ثانية
        }
      }

      console.log(`[Embeddings] ✅ Batch generation complete: ${success} success, ${failed} failed`);
      return { success, failed };
    } catch (error) {
      console.error('[Embeddings] ❌ Error in batch generation:', error);
      throw error;
    }
  }

  /**
   * توليد embedding لاستعلام بحث
   * Generate embedding for search query
   */
  async generateQueryEmbedding(query: string): Promise<number[] | null> {
    try {
      console.log(`[Embeddings] 🔍 Generating embedding for query: "${query}"`);

      // توليد embedding للاستعلام
      const result = await geminiClient.executeWithFallback(async (client) => {
        const modelsToTry = ["text-embedding-004", "embedding-001", "gemini-embedding-exp", "text-embedding-005"];
        let lastError = null;
        for (const modelName of modelsToTry) {
          try {
            const model = client.getGenerativeModel({ model: modelName });
            return await model.embedContent(query);
          } catch (err: any) {
            if (err.message && (err.message.includes("404") || err.message.includes("not found"))) {
              console.warn(`[Embeddings] Model ${modelName} not available for query, trying next...`);
              lastError = err;
              continue;
            }
            throw err;
          }
        }
        throw lastError || new Error("All embedding models failed or were not found.");
      });
      const embedding = result.embedding.values;

      if (!embedding || embedding.length === 0) {
        console.error('[Embeddings] ❌ Failed to generate query embedding');
        return null;
      }

      console.log(`[Embeddings] ✅ Generated query embedding (${embedding.length} dimensions)`);
      return embedding;
    } catch (error) {
      console.error('[Embeddings] ❌ Error generating query embedding:', error);
      return null;
    }
  }

  /**
   * حساب التشابه بين متجهين (Cosine Similarity)
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error('Vectors must have same dimensions');
    }

    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      magnitude1 += vec1[i] * vec1[i];
      magnitude2 += vec2[i] * vec2[i];
    }

    if (magnitude1 === 0 || magnitude2 === 0) return 0;

    return dotProduct / (Math.sqrt(magnitude1) * Math.sqrt(magnitude2));
  }

  /**
   * البحث عن منتجات مشابهة باستخدام embeddings
   * Find similar products using embeddings
   */
  async findSimilarByEmbedding(
    productId: string,
    limit: number = 10
  ): Promise<{ productId: string; similarity: number }[]> {
    try {
      console.log(`[Embeddings] 🔗 Finding similar products for: ${productId}`);

      // جلب embedding للمنتج المستهدف
      const targetEmbedding = await this.db
        .select()
        .from(schema.productEmbeddings)
        .where(
          and(
            eq(schema.productEmbeddings.productId, productId),
            eq(schema.productEmbeddings.model, 'text-embedding-004')
          )
        )
        .limit(1);

      if (targetEmbedding.length === 0) {
        console.log(`[Embeddings] ⚠️ No embedding found for ${productId}, generating...`);
        const generated = await this.generateProductEmbedding(productId);
        
        if (!generated) {
           console.log(`[Embeddings] ⚠️ Failed to generate embedding for ${productId}, returning empty results to prevent infinite loop.`);
           return [];
        }
        
        return this.findSimilarByEmbedding(productId, limit);
      }

      const targetVec = JSON.parse(targetEmbedding[0].embedding as string);

      // جلب جميع embeddings الأخرى
      const allEmbeddings = await this.db
        .select()
        .from(schema.productEmbeddings)
        .where(
          and(
            schema.productEmbeddings.productId.ne(productId),
            eq(schema.productEmbeddings.model, 'text-embedding-004')
          )
        );

      // حساب التشابه
      const similarities: { productId: string; similarity: number }[] = [];

      for (const embedding of allEmbeddings) {
        const vec = JSON.parse(embedding.embedding as string);
        const similarity = this.cosineSimilarity(targetVec, vec);
        similarities.push({
          productId: embedding.productId,
          similarity
        });
      }

      // ترتيب حسب التشابه
      similarities.sort((a, b) => b.similarity - a.similarity);

      console.log(`[Embeddings] ✅ Found ${similarities.length} similar products`);
      return similarities.slice(0, limit);
    } catch (error) {
      console.error('[Embeddings] ❌ Error finding similar products:', error);
      return [];
    }
  }

  /**
   * البحث الدلالي
   * Semantic search
   */
  async semanticSearch(
    query: string,
    limit: number = 20
  ): Promise<{ productId: string; similarity: number }[]> {
    try {
      console.log(`[Embeddings] 🔍 Semantic search for: "${query}"`);

      // توليد embedding للاستعلام
      const queryEmbedding = await this.generateQueryEmbedding(query);
      if (!queryEmbedding) {
        return [];
      }

      // جلب جميع embeddings المنتجات
      const allEmbeddings = await this.db
        .select()
        .from(schema.productEmbeddings)
        .where(eq(schema.productEmbeddings.model, 'text-embedding-004'));

      if (allEmbeddings.length === 0) {
        console.log('[Embeddings] ⚠️ No product embeddings found. Run generateAllEmbeddings() first.');
        return [];
      }

      // حساب التشابه
      const results: { productId: string; similarity: number }[] = [];

      for (const embedding of allEmbeddings) {
        const productVec = JSON.parse(embedding.embedding as string);
        const similarity = this.cosineSimilarity(queryEmbedding, productVec);
        results.push({
          productId: embedding.productId,
          similarity
        });
      }

      // ترتيب حسب التشابه
      results.sort((a, b) => b.similarity - a.similarity);

      console.log(`[Embeddings] ✅ Found ${results.length} results, returning top ${limit}`);
      return results.slice(0, limit);
    } catch (error) {
      console.error('[Embeddings] ❌ Error in semantic search:', error);
      return [];
    }
  }

  /**
   * التحقق من وجود embeddings للمنتجات
   * Check if embeddings exist for products
   */
  async getEmbeddingStats(): Promise<{
    totalProducts: number;
    withEmbeddings: number;
    missingEmbeddings: number;
    coverage: number;
  }> {
    try {
      const totalProducts = await this.db.select().from(schema.products);
      const withEmbeddings = await this.db.select().from(schema.productEmbeddings)
        .where(eq(schema.productEmbeddings.model, 'text-embedding-004'));

      const coverage = totalProducts.length > 0
        ? (withEmbeddings.length / totalProducts.length) * 100
        : 0;

      return {
        totalProducts: totalProducts.length,
        withEmbeddings: withEmbeddings.length,
        missingEmbeddings: totalProducts.length - withEmbeddings.length,
        coverage: Math.round(coverage * 10) / 10
      };
    } catch (error) {
      console.error('[Embeddings] Error getting stats:', error);
      return {
        totalProducts: 0,
        withEmbeddings: 0,
        missingEmbeddings: 0,
        coverage: 0
      };
    }
  }

  /**
   * توليد embeddings للمنتجات الناقصة فقط
   * Generate embeddings for missing products only
   */
  async generateMissingEmbeddings(): Promise<{ success: number; failed: number }> {
    try {
      console.log('[Embeddings] 🔍 Finding products without embeddings...');

      // جلب المنتجات بدون embeddings
      const allProducts = await this.db.select().from(schema.products);
      const existingEmbeddings = await this.db.select().from(schema.productEmbeddings)
        .where(eq(schema.productEmbeddings.model, 'text-embedding-004'));

      const existingIds = new Set(existingEmbeddings.map(e => e.productId));
      const missingProducts = allProducts.filter(p => !existingIds.has(p.id));

      console.log(`[Embeddings] Found ${missingProducts.length} products without embeddings`);

      if (missingProducts.length === 0) {
        return { success: 0, failed: 0 };
      }

      let success = 0;
      let failed = 0;

      // معالجة على دفعات
      const batchSize = 5;
      for (let i = 0; i < missingProducts.length; i += batchSize) {
        const batch = missingProducts.slice(i, i + batchSize);

        const promises = batch.map(product => this.generateProductEmbedding(product.id));
        const results = await Promise.all(promises);

        results.forEach(result => {
          if (result !== null) success++;
          else failed++;
        });

        if (i + batchSize < missingProducts.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log(`[Embeddings] ✅ Missing embeddings generated: ${success} success, ${failed} failed`);
      return { success, failed };
    } catch (error) {
      console.error('[Embeddings] Error generating missing embeddings:', error);
      throw error;
    }
  }
}

// مثيل واحد مشترك
export const embeddingGenerator = new EmbeddingGenerator();
