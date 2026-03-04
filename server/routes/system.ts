import type { Router as RouterType, Request, Response } from "express";
import { Router } from "express";
import { storage } from "../storage/index.js";
import { requireAdmin } from "../middleware/auth.js";
import { db } from "../db.js";
import { blogPosts } from "../../shared/schema.js";
import { eq, desc } from "drizzle-orm";

export function createSystemRouter(): RouterType {
    const router = Router();

    // Sitemap
    router.get("/sitemap.xml", async (req: Request, res: Response): Promise<void> => {
        try {
            const products = await storage.getProducts();
            const baseUrl = "https://www.aquavoiq.com";
            const today = new Date().toISOString().split('T')[0];

            const staticPages = [
                "/", "/products", "/deals", "/fish-encyclopedia", "/journey", "/calculators",
                "/fish-finder", "/fish-health", "/fish-compatibility", "/beginner-guide",
                "/tank-builder", "/community-gallery", "/blog", "/faq",
                "/sustainability", "/shipping", "/terms", "/privacy-policy", "/return-policy"
            ];

            let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

            // Static
            staticPages.forEach(loc => {
                xml += `\n  <url>\n    <loc>${baseUrl}${loc}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`;
            });

            // Products
            products.forEach(p => {
                const updated = p.updatedAt ? new Date(p.updatedAt).toISOString().split('T')[0] : today;
                xml += `\n  <url>\n    <loc>${baseUrl}/products/${p.slug}</loc>\n    <lastmod>${updated}</lastmod>\n  </url>`;
            });

            // Blog posts
            if (db) {
                try {
                    const posts = await db.select({ slug: blogPosts.slug, publishedAt: blogPosts.publishedAt })
                        .from(blogPosts)
                        .where(eq(blogPosts.status, "published"))
                        .orderBy(desc(blogPosts.publishedAt));
                    posts.forEach(p => {
                        const date = p.publishedAt ? new Date(p.publishedAt).toISOString().split('T')[0] : today;
                        xml += `\n  <url>\n    <loc>${baseUrl}/blog/${p.slug}</loc>\n    <lastmod>${date}</lastmod>\n  </url>`;
                    });
                } catch { /* blog table might not exist yet */ }
            }

            xml += `\n</urlset>`;
            res.header("Content-Type", "application/xml");
            res.send(xml);
        } catch (err) {
            console.error(err);
            res.status(500).send("Error generating sitemap");
        }
    });

    // Robots.txt
    router.get("/robots.txt", (req: Request, res: Response): void => {
        const robots = `User-agent: *\nDisallow: /admin\nDisallow: /api/\nSitemap: https://www.aquavoiq.com/sitemap.xml`;
        res.header("Content-Type", "text/plain");
        res.send(robots);
    });

    // Health check (public)
    router.get("/health", (_req: Request, res: Response): void => {
        res.json({ status: "ok", timestamp: new Date().toISOString() });
    });

    // Seeding (Admin only)
    router.get("/seed", requireAdmin as any, async (req: Request, res: Response): Promise<void> => {
        try {
            await storage.seedProductsIfNeeded();
            await storage.seedFishSpeciesIfNeeded();
            await storage.seedGalleryIfNeeded();
            res.json({ message: "Seeded" });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
}
