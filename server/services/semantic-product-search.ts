import { storage } from "../storage/index.js";
import { embeddingGenerator } from "./embedding-generator.js";

export async function findSemanticProducts(query: string) {
  if (query.trim().length < 2) return [];
  const matches = await embeddingGenerator.semanticSearch(query, 20);
  const ids = matches.filter(match => match.similarity > 0.5).slice(0, 12).map(match => match.productId);
  return ids.length ? storage.getProductsByIds(ids) : [];
}
