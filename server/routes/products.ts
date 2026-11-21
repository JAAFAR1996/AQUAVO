import type { Router as RouterType, Request, Response, NextFunction } from "express";
import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage/index.js";
import { requireAuth, requireAdmin, getSession } from "../middleware/auth.js";
import { recommendationEngine } from "../services/recommendation-engine.js";
import { predictiveAnalytics } from "../services/predictive-analytics.js";
import { embeddingGenerator } from "../services/embedding-generator.js";
import { analyticsTracker } from "../services/analytics-tracker.js";
import * as Sentry from "@sentry/node";
import { toPublicProduct, toPublicProducts, isPublicStorefrontProduct } from "../../shared/public-product.js";
import { localizeJsonResponses } from "../middleware/localize-response.js";
import { DEFAULT_LOCALE } from "../../shared/i18n/locales.js";
import { fitCatalogue } from "../../shared/tank-compatibility.js";
import { getDb } from "../db.js";
import { setCanonicalVariantConfiguration } from "../services/inventory-adjustment-service.js";
import { FOOD_FILTERS, foodFilterSchema, matchesFoodFilter } from "../../shared/food-choice.js";
import type { ProductFilters } from "../storage/product-storage.js";
import { HOME_PICK_CANDIDATE_LIMIT, HOME_PICK_INITIAL_CANDIDATE_LIMIT, HOME_PICK_COUNT, isHomePickProduct } from "../../shared/home-product-selection.js";

const queryStrings = z.preprocess(value => value === undefined ? undefined : Array.isArray(value) ? value : [value], z.array(z.string().min(1).max(200)).max(50).optional());
const productListQuerySchema = z.object({
    category: queryStrings,
    brand: queryStrings,
    subcategory: z.string().max(200).optional(),
    minPrice: z.coerce.number().finite().nonnegative().optional(),
    maxPrice: z.coerce.number().finite().nonnegative().optional(),
    isNew: z.enum(['true', 'false']).optional(),
    isBestSeller: z.enum(['true', 'false']).optional(),
    search: z.string().trim().max(200).optional(),
    limit: z.coerce.number().int().min(1).max(500).default(500),
    offset: z.coerce.number().int().min(0).max(100000).default(0),
    sortBy: z.enum(['rating', 'price', 'createdAt', 'reviewCount', 'name', 'views']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    paginated: z.enum(['true', 'false']).optional(),
    food: foodFilterSchema.optional(),
    difficulty: queryStrings,
    eco: z.enum(['true', 'false']).optional(),
    inStock: z.enum(['true', 'false']).optional(),
    homePicks: z.enum(['true', 'false']).optional(),
    preferredIds: queryStrings,
});

// Product availability is commerce-critical and must not depend on process-local
// serverless memory. Keep the invalidation export for existing callers, but the
// public product endpoints now read canonical DB state on every request.
export function clearProductsCache() {
    // Intentionally empty: there is no process-local product cache to invalidate.
}

/**
 * Categories where tank volume actually changes which product is correct.
 *
 * Deliberately not every category: substrate, food and decor do not have a litre-dependent right answer,
 * and pretending they do would add noise to the one question this endpoint exists to answer.
 */
const SIZE_RELEVANT_CATEGORIES = ["التحكم بالحرارة", "الفلترة والتنقية", "التهوية والأكسجين"];

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

const productViewRequestSchema = z.object({
    productId: z.string().min(1).max(200),
    clientSessionId: z.string().regex(CLIENT_SESSION_ID)
        .refine((value) => value !== "cs_unavailable"),
});

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

    const isPurchasableProduct = (product: any): boolean => {
        if (!isPublicStorefrontProduct(product)) return false;
        if (product.hasVariants && Array.isArray(product.variants) && product.variants.length > 0) {
            return product.variants.some((variant: any) =>
                Number(variant?.stock ?? 0) > 0 && Number(variant?.price ?? 0) > 0
            );
        }
        return Number(product.stock ?? 0) > 0 && Number(product.price ?? 0) > 0;
    };

    // Get all products
    // Every JSON payload leaving this router is merged with the request
    // locale's translations (no-op for Arabic). See middleware/localize-response.ts.
    router.use(localizeJsonResponses);

    router.get("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const parsed = productListQuerySchema.safeParse(req.query);
            if (!parsed.success) {
                res.status(400).json({ message: "Invalid product filters" });
                return;
            }
            const query = parsed.data;
            const filters: ProductFilters = {
                storefrontOnly: true,
                category: query.category,
                subcategory: query.subcategory,
                brand: query.brand,
                minPrice: query.minPrice,
                maxPrice: query.maxPrice,
                isNew: query.isNew === undefined ? undefined : query.isNew === 'true',
                isBestSeller: query.isBestSeller === undefined ? undefined : query.isBestSeller === 'true',
                search: query.search,
                limit: query.paginated === 'true' ? Math.min(query.limit, 100) : query.limit,
                offset: query.offset,
                sortBy: query.sortBy,
                sortOrder: query.sortOrder,
                preferredIds: query.preferredIds,
                locale: req.locale ?? DEFAULT_LOCALE,
            };
            let responseData;
            const needsDerivedFilter = query.food !== undefined || query.difficulty?.length || query.eco === 'true' || query.inStock === 'true';
            if (query.homePicks === 'true') {
                // Preserve the homepage's first-12/legacy-500 candidate selection,
                // including stable view ranking and ties. Only its four cards
                // cross the network; the common case still reads just 12 rows.
                const isHomePick = (product: Parameters<typeof isHomePickProduct>[0]) =>
                    isPublicStorefrontProduct(product) && isHomePickProduct(product);
                const first = await storage.getProducts({ ...filters, limit: HOME_PICK_INITIAL_CANDIDATE_LIMIT, offset: undefined });
                let picks = first.filter(isHomePick);
                if (picks.length < HOME_PICK_COUNT) {
                    const fallback = await storage.getProducts({ ...filters, limit: HOME_PICK_CANDIDATE_LIMIT, offset: undefined });
                    picks = fallback.filter(isHomePick);
                }
                const selected = picks.slice(0, HOME_PICK_COUNT);
                const page = selected.slice(query.offset, query.offset + Math.min(query.limit, HOME_PICK_COUNT));
                responseData = { products: toPublicProducts(page), total: selected.length, hasMore: query.offset + page.length < selected.length };
            } else if (needsDerivedFilter) {
                // Derive food suitability before pagination; filtering one limited
                // page would hide valid matches and report a false total.
                const all = await storage.getProducts({ ...filters, limit: undefined, offset: undefined });
                const candidates = all.filter(product => {
                    const specs = product.specifications as Record<string, unknown> | null;
                    if (query.difficulty?.length && !query.difficulty.includes(String(specs?.difficulty ?? ''))) return false;
                    if (query.eco === 'true' && specs?.ecoFriendly !== true) return false;
                    return query.inStock !== 'true' || isPurchasableProduct(product);
                });
                const foodCounts = query.food === undefined ? undefined : Object.fromEntries(FOOD_FILTERS.map(filter => [filter, candidates.filter(product => matchesFoodFilter(product, filter)).length]));
                const matching = query.food ? candidates.filter(product => matchesFoodFilter(product, query.food!)) : candidates;
                const page = matching.slice(query.offset, query.offset + (filters.limit ?? 48));
                responseData = { products: toPublicProducts(page), total: matching.length, hasMore: query.offset + page.length < matching.length, ...(foodCounts ? { foodCounts } : {}) };
            } else if (query.paginated === 'true') {
                const page = await storage.getProductsPage(filters);
                responseData = { ...page, products: toPublicProducts(page.products) };
            } else {
                const rows = await storage.getProducts(filters);
                responseData = { products: toPublicProducts(rows) };
            }

            // Price and stock can change from admin, orders, returns and inventory
            // movements. Never let a CDN/serverless instance serve an older
            // availability snapshot.
            res.set("Cache-Control", "no-store");
            res.json(responseData);
        } catch (err) {
            next(err);
        }
    });

    // Comparison is independent of the active catalogue filters and page.
    router.get("/by-ids", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const parsed = z.string().max(4000).safeParse(req.query.ids);
            const ids = parsed.success ? [...new Set(parsed.data.split(",").filter(Boolean))] : [];
            if (!parsed.success || ids.length === 0 || ids.length > 20 || ids.some(id => id.length > 200 || !/^[a-zA-Z0-9_-]+$/.test(id))) {
                res.status(400).json({ message: "Invalid product IDs" });
                return;
            }
            const rows = await storage.getProductsByIds(ids);
            res.set("Cache-Control", "no-store");
            res.json({ products: toPublicProducts(rows) });
        } catch (err) { next(err); }
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

    /**
     * What AQUAVO can honestly recommend for a tank of N litres.
     *
     * "شنو الفلتر/الهيتر المناسب لحوضي؟" is the most common question customers ask — 19% of chat
     * messages, phrased in litres. The journey wizard already collects the litres and then answered with
     * a generic rule ("1 واط لكل لتر") that names no product AQUAVO sells and can contradict the
     * catalogue: that rule prescribes 80W for an 80 litre tank, while AQUAVO's own 100W heater is rated
     * 50–100 litres.
     *
     * Every result here traces to a specification string on the product or its variant. Nothing is
     * estimated. A SKU with no stated range is returned in its own bucket and is never presented as a
     * match, because "we don't know" and "it fits" are different answers.
     *
     * Only the FitCandidate shape is serialised, so no cost field can escape through the variant rows
     * this reads.
     */
    router.get("/fit", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const litres = Number(req.query.litres);
            if (!Number.isFinite(litres) || litres < 10 || litres > 2000) {
                res.status(400).json({ message: "litres must be between 10 and 2000" });
                return;
            }

            const all = await storage.getProducts({ storefrontOnly: true, limit: 500 });
            const relevant = (Array.isArray(all) ? all : []).filter(
                (p: any) => SIZE_RELEVANT_CATEGORIES.includes(String(p.category ?? "")),
            );
            const groups = fitCatalogue(relevant as any, litres);

            res.set("Cache-Control", "no-store");
            res.json({
                litres,
                groups,
                // Stated rather than implied: the caller should show this, not paper over it.
                limitation:
                    "التوصية مبنية على حجم الحوض المذكور في مواصفات المنتج فقط. المنتجات التي لا تذكر حجماً لا تظهر كتوصية.",
            });
        } catch (err) {
            next(err);
        }
    });

    // Top selling (Specific route BEFORE :idOrSlug)
    router.get("/top-selling", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = await storage.getTopSellingProducts();
            res.set("Cache-Control", "no-store");
            // getTopSellingProducts returns an OBJECT, not an array. toPublicProducts takes `unknown`
            // and returns [] for anything that is not an array — it fails closed, which is exactly
            // right for a security allowlist and exactly why this was silent: passing the object
            // through it emptied the homepage instead of throwing. Each part is mapped on its own.
            res.json({
                productOfWeek: result.productOfWeek ? toPublicProduct(result.productOfWeek) : null,
                bestSellers: toPublicProducts(result.bestSellers),
                hasRealSales: result.hasRealSales,
            });
        } catch (err) {
            next(err);
        }
    });

    // Trending (Specific route BEFORE :idOrSlug)
    router.get("/info/trending", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const products = await storage.getTrendingProducts();
            res.set("Cache-Control", "no-store");
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
                if (trending.length > 0) return trending.filter(isPurchasableProduct).slice(0, 8);
                // Ultimate fallback: newest products that can actually be purchased.
                const newest = await storage.getProducts({ storefrontOnly: true, limit: 50, sortBy: "createdAt", sortOrder: "desc" });
                return newest.filter(isPurchasableProduct).slice(0, 8);
            };

            if (userId) {
                // Logged-in user: hybrid collaborative filtering
                const { productIds, method } = await recommendationEngine.getPersonalizedRecommendations(userId, 8);

                if (productIds.length > 0) {
                    const validProducts = (await storage.getProductsByIds(productIds))
                        .filter(isPurchasableProduct);
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
                const fetchedProducts = (await storage.getProductsByIds(productIds))
                    .filter(isPurchasableProduct);
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
            const fetchedProducts = (await storage.getProductsByIds(predProductIds))
                .filter(isPurchasableProduct);
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
            const parsed = z.string().max(8000).default("").safeParse(req.query.productIds);
            if (!parsed.success) {
                res.status(400).json({ message: "Invalid cart product IDs" });
                return;
            }
            const cartProductIds = [...new Set(parsed.data.split(",").map(id => id.trim()).filter(Boolean))];
            if (cartProductIds.length > 20 || cartProductIds.some(id => id.length > 200 || !/^[a-zA-Z0-9_-]+$/.test(id))) {
                res.status(400).json({ message: "At most 20 distinct cart product IDs are supported" });
                return;
            }
            if (cartProductIds.length === 0) {
                res.json({ suggestions: [], reason: "" });
                return;
            }
            const cartIdSet = new Set(cartProductIds);
            // A single aggregated query replaces one recommendation query per cart item.
            const suggestionIds = await recommendationEngine.getFrequentlyBoughtTogetherForProducts(cartProductIds, 20);
            if (suggestionIds.length > 0) {
                const suggestions = await storage.getProductsByIds(suggestionIds);
                const validSuggestions = suggestions.filter(p =>
                    isPublicStorefrontProduct(p) && parseFloat(String(p.price ?? "0")) > 0 && (p.stock ?? 0) > 0
                ).slice(0, 4);
                if (validSuggestions.length > 0) {
                    res.json({ suggestions: toPublicProducts(validSuggestions), reason: "أكمل حوضك - منتجات تُشترى عادةً معاً" });
                    return;
                }
            }

            // Fallback: trending in-stock products not already in cart
            const trending = await storage.getTrendingProducts();
            const fallback = trending
                .filter(p => isPublicStorefrontProduct(p) && !cartIdSet.has(p.id) && parseFloat(String(p.price ?? "0")) > 0 && (p.stock ?? 0) > 0)
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
            const textResults = await storage.getProducts({ storefrontOnly: true, search: query, limit: 20 });
            trackSearchPromise(Array.isArray(textResults) ? textResults.length : 0);
            res.json({ products: toPublicProducts(textResults), semantic: false });
        } catch (err) {
            // On any embedding error, fallback to text search
            try {
                const query = req.query.q as string;
                const textResults = await storage.getProducts({ storefrontOnly: true, search: query, limit: 20 });
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
            // Categories/prices feed commerce filters; keep them aligned with current products.
            res.set("Cache-Control", "no-store");
            res.json(attributes);
        } catch (err) {
            next(err);
        }
    });

    // A view is emitted by a visible product page, never by hover prefetch or
    // a data refresh. Await the write before replying so serverless runtimes
    // cannot freeze the function while analytics is still being persisted.
    router.post("/:productId/view", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const body = (req.body ?? {}) as { clientSessionId?: unknown };
        const parsed = productViewRequestSchema.safeParse({
            productId: req.params.productId,
            clientSessionId: body.clientSessionId,
        });
        if (!parsed.success) {
            res.status(400).json({ accepted: false });
            return;
        }

        try {
            const product = await storage.getProduct(parsed.data.productId);
            if (!product || !isPublicStorefrontProduct(product)) {
                res.status(404).json({ accepted: false });
                return;
            }

            await analyticsTracker.trackProductView({
                userId: getSession(req)?.userId,
                sessionId: parsed.data.clientSessionId,
                productId: product.id,
                from: "product_page",
            });
            res.set("Cache-Control", "no-store");
            res.status(202).json({ accepted: true });
        } catch (err) {
            next(err);
        }
    });

    // Get single product (by ID or Slug). Fetching data must remain read-only:
    // the same route also serves hover prefetch and live availability refreshes.
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

            if (!product || !isPublicStorefrontProduct(product)) {
                res.status(404).json({ message: "Product not found" });
                return;
            }

            res.set("Cache-Control", "no-store");

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

            if (!product || !isPublicStorefrontProduct(product)) {
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
            const allProducts = await storage.getProducts({ storefrontOnly: true,
                category: product.category,
                brand: product.brand,
            });
            const variants = allProducts.filter((p: typeof product) => {
                const pNameBase = removeVariantSuffix(p.name);
                return pNameBase === nameWithoutSize &&
                    p.brand === product.brand &&
                    p.category === product.category;
            });

            res.set("Cache-Control", "no-store");
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
            res.set("Cache-Control", "no-store");
            const product = await storage.getProduct(productId);
            if (!product || !isPublicStorefrontProduct(product)) {
                res.status(404).json({ message: "Product not found" });
                return;
            }
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

    // Update product variants through the canonical inventory ledger.
    router.put("/:productId/variants", requireAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { productId } = req.params as { productId: string };
            const { hasVariants, variants } = req.body as { hasVariants: boolean; variants: any[] | null };
            const db = getDb();
            if (!db) {
                res.status(503).json({ message: "قاعدة البيانات غير مهيأة" });
                return;
            }

            const adminId = getSession(req)?.userId || "admin";
            const result = await db.transaction(async (tx: any) =>
                setCanonicalVariantConfiguration(
                    tx,
                    { clientId: adminId, mode: "admin" },
                    productId,
                    hasVariants,
                    variants,
                ),
            );
            clearProductsCache();

            res.set("Cache-Control", "no-store");
            res.json({
                success: true,
                message: "تم تحديث خيارات المنتج والمخزون بنجاح",
                inventory: result.stock_adjustments,
            });
        } catch (err) {
            next(err);
        }
    });

    return router;
}
