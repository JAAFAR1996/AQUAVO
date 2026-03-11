/**
 * Veterinary RAG (Retrieval-Augmented Generation) Service
 * 
 * يبحث في المعرفة البيطرية ويحقن السياق الأكثر صلة في prompt التشخيص
 * In-memory embeddings cache — knowledge is static, no DB needed
 */
import { geminiClient } from "./gemini-client.js";
import { VET_KNOWLEDGE_CHUNKS, type KnowledgeChunk } from "./vet-knowledge.js";

interface CachedEmbedding {
  chunkId: string;
  embedding: number[];
}

export class VetRAG {
  private embeddingsCache: CachedEmbedding[] = [];
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize embeddings for all knowledge chunks (lazy, runs once)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._doInitialize();
    return this.initPromise;
  }

  private async _doInitialize(): Promise<void> {
    try {
      console.log(`[VetRAG] 🚀 Initializing ${VET_KNOWLEDGE_CHUNKS.length} knowledge chunks...`);

      // Process in batches of 3 to avoid rate limits
      const batchSize = 3;
      for (let i = 0; i < VET_KNOWLEDGE_CHUNKS.length; i += batchSize) {
        const batch = VET_KNOWLEDGE_CHUNKS.slice(i, i + batchSize);

        const promises = batch.map(async (chunk) => {
          try {
            const embedding = await this.embedText(chunk.content);
            if (embedding) {
              this.embeddingsCache.push({ chunkId: chunk.id, embedding });
            }
          } catch (error) {
            console.error(`[VetRAG] ⚠️ Failed to embed chunk: ${chunk.id}`);
          }
        });

        await Promise.all(promises);

        // Rate limit delay between batches
        if (i + batchSize < VET_KNOWLEDGE_CHUNKS.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      this.isInitialized = true;
      console.log(`[VetRAG] ✅ Initialized ${this.embeddingsCache.length}/${VET_KNOWLEDGE_CHUNKS.length} chunks`);
    } catch (error) {
      console.error("[VetRAG] ❌ Initialization error:", error);
      this.initPromise = null; // Allow retry
    }
  }

  /**
   * Generate embedding for text using Gemini text-embedding-004
   */
  private async embedText(text: string): Promise<number[] | null> {
    try {
      const result = await geminiClient.executeWithFallback(async (client) => {
        const model = client.getGenerativeModel({ model: "text-embedding-004" });
        return await model.embedContent(text.slice(0, 2000)); // Truncate to max input
      });
      return result.embedding.values;
    } catch {
      return null;
    }
  }

  /**
   * Compute cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    if (magA === 0 || magB === 0) return 0;
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
  }

  /**
   * Search knowledge base — returns top-N most relevant chunks
   * Falls back to keyword matching if embeddings not ready
   */
  async searchKnowledge(querySymptoms: string[], topN: number = 3): Promise<KnowledgeChunk[]> {
    const query = querySymptoms.join(" ");

    // Try semantic search first
    if (this.isInitialized && this.embeddingsCache.length > 0) {
      try {
        const queryEmbedding = await this.embedText(query);
        if (queryEmbedding) {
          const scored = this.embeddingsCache.map(cached => ({
            chunkId: cached.chunkId,
            similarity: this.cosineSimilarity(queryEmbedding, cached.embedding),
          }));

          scored.sort((a, b) => b.similarity - a.similarity);
          const topChunkIds = scored.slice(0, topN).map(s => s.chunkId);

          const results = topChunkIds
            .map(id => VET_KNOWLEDGE_CHUNKS.find(c => c.id === id))
            .filter((c): c is KnowledgeChunk => c !== undefined);

          if (results.length > 0) {
            console.log(`[VetRAG] 🔍 Semantic search: "${query.slice(0, 50)}..." → ${results.map(r => r.id).join(", ")}`);
            return results;
          }
        }
      } catch (error) {
        console.error("[VetRAG] Semantic search failed, falling back to keywords:", error);
      }
    }

    // Fallback: keyword matching
    return this.keywordSearch(query, topN);
  }

  /**
   * Keyword-based fallback search
   */
  private keywordSearch(query: string, topN: number): KnowledgeChunk[] {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/);

    const scored = VET_KNOWLEDGE_CHUNKS.map(chunk => {
      let score = 0;
      const contentLower = chunk.content.toLowerCase();

      // Check keywords
      for (const kw of chunk.keywords) {
        if (queryLower.includes(kw.toLowerCase())) {
          score += 3; // Direct keyword match
        }
      }

      // Check query words in content
      for (const word of queryWords) {
        if (word.length > 2 && contentLower.includes(word)) {
          score += 1;
        }
      }

      return { chunk, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const results = scored.slice(0, topN).filter(s => s.score > 0).map(s => s.chunk);

    if (results.length > 0) {
      console.log(`[VetRAG] 🔑 Keyword search: "${query.slice(0, 50)}..." → ${results.map(r => r.id).join(", ")}`);
    }

    return results;
  }

  /**
   * Format retrieved knowledge for injection into AI prompt
   */
  formatForPrompt(chunks: KnowledgeChunk[]): string {
    if (chunks.length === 0) return "";

    const sections = chunks.map((chunk, i) => {
      return `📖 مرجع ${i + 1} — ${chunk.title}:\n${chunk.content}`;
    });

    return `\n═══════════════════════════════════════════════════════
📖 معلومات إضافية من المراجع البيطرية (RAG):
═══════════════════════════════════════════════════════
${sections.join("\n\n")}
═══════════════════════════════════════════════════════
استخدم هذه المعلومات التفصيلية لتعزيز دقة تشخيصك وخطة علاجك.
═══════════════════════════════════════════════════════\n`;
  }
}

// Singleton instance
export const vetRAG = new VetRAG();

// Start initialization in background (non-blocking)
vetRAG.initialize().catch(err => {
  console.error("[VetRAG] Background init failed:", err);
});
