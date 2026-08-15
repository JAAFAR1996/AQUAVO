import type { Router as RouterType, Request, Response, NextFunction } from "express";
import { Router } from "express";
import { storage } from "../storage/index.js";
import { requireAuth, requireAdmin, getSession } from "../middleware/auth.js";
import { recommendationEngine } from "../services/recommendation-engine.js";
import { predictiveAnalytics } from "../services/predictive-analytics.js";
import { embeddingGenerator } from "../services/embedding-generator.js";
import { analyticsTracker } from "../services/analytics-tracker.js";
import * as Sentry from "@sentry/node";
import { toPublicProduct, toPublicProducts } from "../../shared/public-product.js";

// ─── Server-side in-memory cache ──────────────────────────────
// Prevents repeated DB round-trips for the same product query.
// Cache TTL = 60s. Cleared on any product mutation (create/update/delete).
const productsCache = new Map<string, { data: { products: any[] }; expires: number }>();
const CACHE_TTL = 60 * 1000; // 60 seconds

export function clearProductsCache() {
    productsCache.clear();
}

// Periodically clean up expired entries to prevent memory accumulation
setInterval(() => {
    const now = Date.now();
    for (const [key, val] of productsCache) {
        if (now > val.expires) productsCache.delete(key);
    }
}, 5 * 60 * 1000); // sweep every 5 minutes

/**
 * The session key search analytics is recorded under.
 *
 * Express's own `req.sessionID` cannot do this job for a guest. Operating production on 2026-08-14
 * showed four consecutive requests from a single browser tab arriving with four different session
 * ids — a guest never writes to the session, so no session cookie is ever issued and every request
 * mints a fresh id. Anything keyed on it can only ever join to itself, which is why the first
 * search-click that reached production could not find the search it belonged to and wrote a second,
 * fabricated search row instead.
 *
 * The client's per-tab view-session id (`cs_…`, from lib/client-session.ts) is the same id that
 * page_views already carries, so recording it here makes a search joinable both to its own click and
 * to the pages that session visited.
 *
 * Validated rather than trusted: the shape is fixed, the length is bounded, and anything else falls
 * back to the express id. A client that sends nothing is no worse off than before this existed.
 */
const CLIENT_SESSION_ID = /^cs_[A-Za-z0-9_]{1,64}$/;

function resolveClientSessionId(req: Request, candidate: unknown): string {
    // `cs_unavailable` is what the client sends when storage is blocked. It is well-formed and
    // absolutely must not be honoured: every such visitor would share one key and their searches and
    // clicks would be matched to each other's.
    if (typeof candidate === "string" && candidate !== "cs_unavailable" && CLIENT_SESSION_ID.test(candidate)) {
        return candidate;
    }
    return (req as any).sessionID || "unknown";
}

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
                // Default: fetch all products — client does filtering/sorting
                limit: query.limit ? Number(query.limit) : 500,
                offset: query.offset ? Number(query.offset) : undefined,
                sortBy: query.sortBy as any,
                sortOrder: query.sortOrder as 'asc' | 'desc',
            };

            // Admin panel sends ?fresh=1 to bypass all caching and read straight
            // from the DB — guarantees edits (price/stock/...) show immediately,
            // without relying on in-memory cache invalidation across serverless instances.
            const bypassCache = query.fresh !== undefined;

            // Serve from cache if available
            const cacheKey = JSON.stringify(filters);
            if (!bypassCache) {
                const cached = productsCache.get(cacheKey);
                if (cached && Date.now() < cached.expires) {
                    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
                    return res.json(cached.data);
                }
            }

            const products = await storage.getProducts(filters);
            // Sanitize BEFORE caching. If the cache held raw rows, a single un-sanitized write would be
            // re-served for 60s (and by any CDN edge honouring the max-age below) long after the code
            // path that produced it was fixed.
            const responseData = { products: toPublicProducts(products) };

            if (bypassCache) {
                res.set('Cache-Control', 'no-store');
            } else {
                // Store in cache
                productsCache.set(cacheKey, { data: responseData, expires: Date.now() + CACHE_TTL });
                res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
            }
            res.json(responseData);
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
            res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=1800');
            res.json(toPublicProducts(result));
        } catch (err) {
            next(err);
        }
    });

    // Trending (Specific route BEFORE :idOrSlug)
    router.get("/info/trending", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const products = await storage.getTrendingProducts();
            res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=1800');
            res.json(toPublicProducts(products));
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
                        res.json({ products: toPublicProducts(validProducts), personalized: true, method });
                        return;
                    }
                }

                // Fallback to trending/newest
                const fallback = await getFallbackProducts();
                res.json({ products: toPublicProducts(fallback), personalized: false, method: "trending_fallback" });
            } else {
                // Guest: trending/newest products
                const fallback = await getFallbackProducts();
                res.json({ products: toPublicProducts(fallback), personalized: false, method: "trending" });
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
                            product: toPublicProduct(product),
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
                        product: toPublicProduct(product),
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

            if (sorted.length > 0) {
                const suggestionIds = sorted.map(([id]) => id);
                const suggestions = await storage.getProductsByIds(suggestionIds);
                const validSuggestions = suggestions.filter(p =>
                    parseFloat(String(p.price ?? "0")) > 0 && (p.stock ?? 0) > 0
                );
                if (validSuggestions.length > 0) {
                    res.json({ suggestions: toPublicProducts(validSuggestions), reason: "أكمل حوضك - منتجات تُشترى عادةً معاً" });
                    return;
                }
            }

            // Fallback: trending in-stock products not already in cart
            const trending = await storage.getTrendingProducts();
            const fallback = trending
                .filter(p => !cartIdSet.has(p.id) && parseFloat(String(p.price ?? "0")) > 0 && (p.stock ?? 0) > 0)
                .slice(0, 4);

            res.json({
                suggestions: toPublicProducts(fallback),
                reason: fallback.length > 0 ? "منتجات قد تعجبك" : "",
            });
        } catch (err) {
            next(err);
        }
    });

    // Semantic search using embeddings (AI-powered)
    router.get("/smart-search", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        Sentry.setTag("flow", "search");
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
                    sessionId: resolveClientSessionId(req, req.query.sid),
                    query,
                    resultsCount,
                }).catch(() => {});

            if (semanticResults.length > 0) {
                // Filter to decent similarity threshold
                const relevant = semanticResults.filter(r => r.similarity > 0.5);
                const relevantIds = relevant.slice(0, 12).map(r => r.productId);
                const validProducts = await storage.getProductsByIds(relevantIds);

                if (validProducts.length > 0) {
                    trackSearchPromise(validProducts.length);
                    res.json({ products: toPublicProducts(validProducts), semantic: true });
                    return;
                }
            }

            // Fallback: regular text search
            const textResults = await storage.getProducts({ search: query, limit: 20 });
            trackSearchPromise(Array.isArray(textResults) ? textResults.length : 0);
            res.json({ products: toPublicProducts(textResults), semantic: false });
        } catch (err) {
            // On any embedding error, fallback to text search
            try {
                const query = req.query.q as string;
                const textResults = await storage.getProducts({ search: query, limit: 20 });
                res.json({ products: toPublicProducts(textResults), semantic: false });
            } catch {
                next(err);
            }
        }
    });

    /**
     * Record which search result a shopper actually clicked.
     *
     * analyticsTracker.trackSearchClick() has existed since the search feature shipped and had NO caller
     * anywhere in the repository — no route exposed it and no client invoked it. The consequence was that
     * all 560 rows in search_queries carried a NULL clicked_product_id, so search relevance and
     * search-to-product conversion were unmeasurable by construction rather than by chance. Site search
     * touches roughly a third of sessions, and searchers convert well above the site-wide rate, so this
     * was the largest unmeasured behaviour on the site.
     *
     * Fire-and-forget by design: telemetry must never delay or fail a shopper's navigation, so this
     * always answers 202 and never surfaces a tracking error to the client.
     */
    router.post("/search-click", async (req: Request, res: Response): Promise<void> => {
        // Do the work, THEN answer.
        //
        // This route used to answer 202 first and record afterwards, on the reasoning that telemetry
        // must never delay a shopper who is already navigating. The reasoning was right and the place
        // was wrong: on Vercel the function can be frozen the moment the response is sent, so work
        // scheduled after it is not guaranteed to run. Observed on production 2026-08-15 — a click on
        // a COLD container returned 202 and never reached the database, while the identical click on a
        // warm container recorded correctly a minute later. Silent, intermittent, and invisible in the
        // response.
        //
        // Nothing is lost by moving the response: the shopper never waits on it either way, because the
        // client sends this with keepalive and ignores the result. The work is one indexed select and
        // one update.
        try {
            const { query, productId, position } = (req.body ?? {}) as {
                query?: unknown; productId?: unknown; position?: unknown;
            };
            const q = typeof query === "string" ? query.trim() : "";
            const pos = Number(position);
            const valid =
                q.length >= 2 && q.length <= 200 &&
                typeof productId === "string" && productId.length >= 1 && productId.length <= 128 &&
                Number.isInteger(pos) && pos >= 0 && pos <= 200;

            // A rejected payload is not an error the shopper should see, and it must not skip the
            // response either — every path below falls through to the same 202.
            if (valid) {
                const clickSession = getSession(req);
                await analyticsTracker.trackSearchClick({
                    userId: clickSession?.userId,
                    sessionId: resolveClientSessionId(req, (req.body ?? {}).clientSessionId),
                    query: q,
                    productId: productId as string,
                    position: pos,
                });
            }
        } catch {
            // Swallowed on purpose — a tracking failure is never the shopper's problem.
        }
        res.status(202).json({ accepted: true });
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
            // Cache for 10 minutes — attributes (categories, brands, prices) rarely change
            res.set('Cache-Control', 'public, max-age=600, stale-while-revalidate=1800');
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

            res.json(toPublicProduct(product));
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

            res.json({ variants: toPublicProducts(variants) });
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
            res.json(toPublicProducts(products));
        } catch (err) {
            next(err);
        }
    });

    router.get("/:id/frequently-bought-together", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params as { id: string };
            const products = await storage.getFrequentlyBoughtTogether(id);
            res.json(toPublicProducts(products));
        } catch (err) {
            next(err);
        }
    });

    // Update product variants
    router.put("/:productId/variants", requireAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
