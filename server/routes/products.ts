import type { Router as RouterType, Request, Response, NextFunction } from "express";
import { Router } from "express";
import { storage } from "../storage/index.js";
import { requireAuth, getSession } from "../middleware/auth.js";
import { recommendationEngine } from "../services/recommendation-engine.js";
import { predictiveAnalytics } from "../services/predictive-analytics.js";
import { embeddingGenerator } from "../services/embedding-generator.js";
import { analyticsTracker } from "../services/analytics-tracker.js";

export function createProductRouter(): RouterType {
    const router = Router();

    // Get all products
    router.get("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const query = req.query as Record<string, string | string[] | undefined>;
            const filters = {
                category: query.category as string | string[],
                subcategory: query.subcategory as string,
                brand: query.brand as string | string[],
                minPrice: query.minPrice ? Number(query.minPrice) : undefined,
                maxPrice: query.maxPrice ? Number(query.maxPrice) : undefined,
                isNew: query.isNew !== undefined ? query.isNew === 'true' : undefined,
                isBestSeller: query.isBestSeller !== undefined ? query.isBestSeller === 'true' : undefined,
                search: query.search as string,
                // Default pagination: limit to 500 products
                // Increased from 50 to show all products (currently ~180)
                limit: query.limit ? Number(query.limit) : 500,
                offset: query.offset ? Number(query.offset) : undefined,
                sortBy: query.sortBy as any,
                sortOrder: query.sortOrder as 'asc' | 'desc',
            };

            const products = await storage.getProducts(filters);
            // Cache product listings for 60s, allow stale for 5 minutes while revalidating
            res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
            res.json({ products });
        } catch (err) {
            next(err);
        }
    });

    // Categories list (distinct values from products table)
    router.get("/categories", async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const attrs = await storage.getProductAttributes();
            res.json({ categories: attrs.categories });
        } catch (err) {
            next(err);
        }
    });

    // Top selling (Specific route BEFORE :idOrSlug)
    router.get("/top-selling", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = await storage.getTopSellingProducts();
            res.json(result);
        } catch (err) {
            next(err);
        }
    });

    // Trending (Specific route BEFORE :idOrSlug)
    router.get("/info/trending", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const products = await storage.getTrendingProducts();
            res.json(products);
        } catch (err) {
            next(err);
        }
    });

    // Personalized recommendations (works for both logged-in users and guests)
    router.get("/personalized", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const session = getSession(req);
            const userId = session?.userId;

            // Helper: get fallback products (trending → newest)
            const getFallbackProducts = async () => {
                const trending = await storage.getTrendingProducts();
                if (trending.length > 0) return trending.slice(0, 8);
                // Ultimate fallback: newest products (ignores stock for stores still setting up)
                const newest = await storage.getProducts({ limit: 8, sortBy: "createdAt", sortOrder: "desc" });
                return newest;
            };

            if (userId) {
                // Logged-in user: hybrid collaborative filtering
                const { productIds, method } = await recommendationEngine.getPersonalizedRecommendations(userId, 8);

                if (productIds.length > 0) {
                    const validProducts = await storage.getProductsByIds(productIds);
                    if (validProducts.length > 0) {
                        res.json({ products: validProducts, personalized: true, method });
                        return;
                    }
                }

                // Fallback to trending/newest
                const fallback = await getFallbackProducts();
                res.json({ products: fallback, personalized: false, method: "trending_fallback" });
            } else {
                // Guest: trending/newest products
                const fallback = await getFallbackProducts();
                res.json({ products: fallback, personalized: false, method: "trending" });
            }
        } catch (err) {
            next(err);
        }
    });

    // Predicted repurchase needs (requires auth)
    router.get("/predicted-needs", requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const session = getSession(req);
            const userId = session!.userId!;

            // Try saved predictions first, fall back to live calculation
            let predictions: Awaited<ReturnType<typeof predictiveAnalytics.getPredictionsForUser>> = [];
            try {
                predictions = await predictiveAnalytics.getPredictionsForUser(userId);
            } catch {
                res.json({ predictions: [] });
                return;
            }

            if (predictions.length === 0) {
                // Generate live predictions
                const livePredictions = await predictiveAnalytics.predictNeeds(userId);
                // Map live predictions to the same shape
                const mapped = livePredictions.slice(0, 5).map(p => ({
                    productId: p.productId,
                    probability: p.probability,
                    reason: p.reason,
                    predictedDate: p.predictedDate,
                }));

                // Fetch product details in batch
                const productIds = mapped.map(p => p.productId);
                const fetchedProducts = await storage.getProductsByIds(productIds);
                const productMap = new Map(fetchedProducts.map(p => [p.id, p]));
                const results = mapped
                    .map(pred => {
                        const product = productMap.get(pred.productId);
                        if (!product) return null;
                        return {
                            product,
                            probability: pred.probability,
                            reason: pred.reason,
                            predictedDate: pred.predictedDate?.toISOString() ?? null,
                        };
                    })
                    .filter(Boolean);

                res.json({ predictions: results });
                return;
            }

            // Saved predictions: fetch product details in batch
            const topPredictions = predictions.slice(0, 5);
            const predProductIds = topPredictions.map(p => p.productId);
            const fetchedProducts = await storage.getProductsByIds(predProductIds);
            const productMap = new Map(fetchedProducts.map(p => [p.id, p]));
            const results = topPredictions
                .map(pred => {
                    const product = productMap.get(pred.productId);
                    if (!product) return null;
                    return {
                        product,
                        probability: Number(pred.probability),
                        reason: pred.reason ?? "بناءً على نمط الشراء",
                        predictedDate: pred.predictedDate?.toISOString() ?? null,
                    };
                })
                .filter(Boolean);

            res.json({ predictions: results });
        } catch (err) {
            next(err);
        }
    });

    // Cart-based suggestions (works for guests too)
    router.get("/cart-suggestions", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const productIdsParam = req.query.productIds as string;
            if (!productIdsParam) {
                res.json({ suggestions: [], reason: "" });
                return;
            }

            const cartProductIds = productIdsParam.split(",").filter(Boolean);
            if (cartProductIds.length === 0) {
                res.json({ suggestions: [], reason: "" });
                return;
            }

            // Fetch frequently bought together — all in parallel (was N sequential queries)
            const allSuggestions = new Map<string, number>();
            const cartIdSet = new Set(cartProductIds);

            const relatedArrays = await Promise.all(
                cartProductIds.map(pid => storage.getFrequentlyBoughtTogether(pid))
            );

            for (const related of relatedArrays) {
                for (const product of related) {
                    if (cartIdSet.has(product.id)) continue; // skip items already in cart
                    allSuggestions.set(product.id, (allSuggestions.get(product.id) || 0) + 1);
                }
            }

            // Sort by frequency (how many cart items suggest this product)
            const sorted = Array.from(allSuggestions.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 4);

            const suggestionIds = sorted.map(([id]) => id);
            const suggestions = await storage.getProductsByIds(suggestionIds);

            res.json({
                suggestions,
                reason: "أكمل حوضك - منتجات تُشترى عادةً معاً",
            });
        } catch (err) {
            next(err);
        }
    });

    // Semantic search using embeddings (AI-powered)
    router.get("/smart-search", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const query = req.query.q as string;
            if (!query || query.trim().length < 2) {
                res.json({ products: [], semantic: false });
                return;
            }

            // Try semantic search via embeddings
            const semanticResults = await embeddingGenerator.semanticSearch(query, 20);

            // Track search query (fire-and-forget)
            const searchSession = getSession(req);
            const trackSearchPromise = (resultsCount: number) =>
                analyticsTracker.trackSearch({
                    userId: searchSession?.userId,
                    sessionId: (req as any).sessionID || "unknown",
                    query,
                    resultsCount,
                }).catch(() => {});

            if (semanticResults.length > 0) {
                // Filter to decent similarity threshold
                const relevant = semanticResults.filter(r => r.similarity > 0.3);
                const relevantIds = relevant.slice(0, 12).map(r => r.productId);
                const validProducts = await storage.getProductsByIds(relevantIds);

                if (validProducts.length > 0) {
                    trackSearchPromise(validProducts.length);
                    res.json({ products: validProducts, semantic: true });
                    return;
                }
            }

            // Fallback: regular text search
            const textResults = await storage.getProducts({ search: query, limit: 20 });
            trackSearchPromise(Array.isArray(textResults) ? textResults.length : 0);
            res.json({ products: textResults, semantic: false });
        } catch (err) {
            // On any embedding error, fallback to text search
            try {
                const query = req.query.q as string;
                const textResults = await storage.getProducts({ search: query, limit: 20 });
                res.json({ products: textResults, semantic: false });
            } catch {
                next(err);
            }
        }
    });

    // Personalized product sort order (boosts recommended products to top)
    router.get("/personalized-order", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const session = getSession(req);
            const userId = session?.userId;

            if (!userId) {
                res.json({ boostIds: [] });
                return;
            }

            // Get personalized product IDs to boost to top
            const { productIds } = await recommendationEngine.getPersonalizedRecommendations(userId, 12);
            res.json({ boostIds: productIds });
        } catch (err) {
            next(err);
        }
    });

    // Attributes (Categories & Brands)
    router.get("/attributes", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const attributes = await storage.getProductAttributes();
            res.json(attributes);
        } catch (err) {
            next(err);
        }
    });

    // Get single product (by ID or Slug)
    router.get("/:idOrSlug", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { idOrSlug } = req.params as { idOrSlug: string };
            let product;

            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

            if (uuidRegex.test(idOrSlug)) {
                product = await storage.getProduct(idOrSlug);
            }

            if (!product) {
                product = await storage.getProductBySlug(idOrSlug);
            }

            if (!product) {
                res.status(404).json({ message: "Product not found" });
                return;
            }

            // Track product view (fire-and-forget)
            const session = getSession(req);
            analyticsTracker.trackProductView({
                userId: session?.userId,
                sessionId: (req as any).sessionID || "unknown",
                productId: product.id,
                from: (req.query.from as string) || "direct",
            }).catch(() => {});

            res.json(product);
        } catch (err) {
            next(err);
        }
    });

    // ============ VARIANTS ============
    // Get product variants (related sizes/power options)
    router.get("/:idOrSlug/variants", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { idOrSlug } = req.params as { idOrSlug: string };

            // First get the product to find its base model
            let product;
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

            if (uuidRegex.test(idOrSlug)) {
                product = await storage.getProduct(idOrSlug);
            }
            if (!product) {
                product = await storage.getProductBySlug(idOrSlug);
            }

            if (!product) {
                res.status(404).json({ message: "Product not found" });
                return;
            }

            // Extract base model name (remove wattage/size suffix)
            // Supports both English (18W) and Arabic (18 واط) patterns
            const removeVariantSuffix = (name: string): string => {
                return name
                    // English patterns
                    .replace(/-?\d+\s*W$/i, '')           // "-18W" or "18W"
                    .replace(/-?\d+\s*cm$/i, '')          // "-60cm"
                    // Arabic patterns
                    .replace(/\s*\d+\s*واط$/i, '')        // "18 واط"
                    .replace(/-?\s*\d+\s*لتر\/ساعة$/i, '') // "- 1200 لتر/ساعة"
                    // Size variants (Arabic)
                    .replace(/-?\s*(صغير|متوسط|كبير|كبير جداً|S|M|L|XL)$/i, '')
                    .trim();
            };

            const nameWithoutSize = removeVariantSuffix(product.name);

            // Get products in same category+brand only (avoids loading full catalog)
            const allProducts = await storage.getProducts({
                category: product.category,
                brand: product.brand,
            });
            const variants = allProducts.filter((p: typeof product) => {
                const pNameBase = removeVariantSuffix(p.name);
                return pNameBase === nameWithoutSize &&
                    p.brand === product.brand &&
                    p.category === product.category;
            });

            res.json({ variants });
        } catch (err) {
            next(err);
        }
    });

    // ============ DISCOUNTS ============
    // Get Discounts
    router.get("/:productId/discounts", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { productId } = req.params as { productId: string };
            const discounts = await storage.getDiscounts(productId);
            res.json(discounts);
        } catch (err) {
            next(err);
        }
    });

    // ============ RECOMMENDATIONS ============
    router.get("/:id/similar", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params as { id: string };
            const products = await storage.getSimilarProducts(id);
            res.json(products);
        } catch (err) {
            next(err);
        }
    });

    router.get("/:id/frequently-bought-together", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params as { id: string };
            const products = await storage.getFrequentlyBoughtTogether(id);
            res.json(products);
        } catch (err) {
            next(err);
        }
    });

    // Update product variants
    router.put("/:productId/variants", requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { productId } = req.params as { productId: string };
            const { hasVariants, variants } = req.body as { hasVariants: boolean; variants: any[] | null };

            await storage.updateProductVariants(productId, hasVariants, variants);

            res.json({
                success: true,
                message: "تم تحديث خيارات المنتج بنجاح"
            });
        } catch (err) {
            next(err);
        }
    });

    return router;
}
