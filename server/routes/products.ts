import { Router } from "express";
import { storage } from "../storage/index.js";
import { insertProductSchema, insertReviewSchema, insertDiscountSchema } from "../../shared/schema.js";
import { requireAuth, getSession } from "../middleware/auth.js";
import express from "express";

export function createProductRouter() {
    const router = Router();

    // Get all products
    router.get("/", async (req, res, next) => {
        try {
            const filters = {
                category: req.query.category as string | string[],
                subcategory: req.query.subcategory as string,
                brand: req.query.brand as string | string[],
                minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
                maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
                isNew: req.query.isNew !== undefined ? req.query.isNew === 'true' : undefined,
                isBestSeller: req.query.isBestSeller !== undefined ? req.query.isBestSeller === 'true' : undefined,
                search: req.query.search as string,
                limit: req.query.limit ? Number(req.query.limit) : undefined,
                offset: req.query.offset ? Number(req.query.offset) : undefined,
                sortBy: req.query.sortBy as any,
                sortOrder: req.query.sortOrder as 'asc' | 'desc',
            };

            const products = await storage.getProducts(filters);
            res.json({ products });
        } catch (err) {
            next(err);
        }
    });

    // Top selling (Specific route BEFORE :idOrSlug)
    router.get("/top-selling", async (req, res, next) => {
        try {
            const result = await storage.getTopSellingProducts();
            res.json(result);
        } catch (err) {
            next(err);
        }
    });

    // Trending (Specific route BEFORE :idOrSlug)
    router.get("/info/trending", async (req, res, next) => {
        try {
            const products = await storage.getTrendingProducts();
            res.json(products);
        } catch (err) {
            next(err);
        }
    });

    // Attributes (Categories & Brands)
    router.get("/attributes", async (req, res, next) => {
        try {
            const attributes = await storage.getProductAttributes();
            res.json(attributes);
        } catch (err) {
            next(err);
        }
    });

    // Get single product (by ID or Slug)
    router.get("/:idOrSlug", async (req, res, next) => {
        try {
            const { idOrSlug } = req.params;
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
            res.json(product);
        } catch (err) {
            next(err);
        }
    });

    // ============ DISCOUNTS ============
    // Get Discounts
    router.get("/:productId/discounts", async (req, res, next) => {
        try {
            const discounts = await storage.getDiscounts(req.params.productId);
            res.json(discounts);
        } catch (err) {
            next(err);
        }
    });

    // ============ RECOMMENDATIONS ============
    router.get("/:id/similar", async (req, res, next) => {
        try {
            const products = await storage.getSimilarProducts(req.params.id);
            res.json(products);
        } catch (err) {
            next(err);
        }
    });

    router.get("/:id/frequently-bought-together", async (req, res, next) => {
        try {
            const products = await storage.getFrequentlyBoughtTogether(req.params.id);
            res.json(products);
        } catch (err) {
            next(err);
        }
    });

    return router;
}
