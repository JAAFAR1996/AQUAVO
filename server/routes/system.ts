import type { Router as RouterType, Request, Response } from "express";
import { Router } from "express";
import { storage } from "../storage/index.js";

export function createSystemRouter(): RouterType {
    const router = Router();

    // Sitemap
    router.get("/sitemap.xml", async (req: Request, res: Response): Promise<void> => {
        try {
            const products = await storage.getProducts();
            const baseUrl = "https://aquavo.iq";
            const today = new Date().toISOString().split('T')[0];

            const staticPages = [
                "/", "/products", "/fish-encyclopedia", "/journey", "/calculators",
                "/fish-finder", "/fish-health", "/tank-builder", "/community-gallery",
                "/blog", "/faq", "/sustainability", "/contact"
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
        const robots = `User-agent: *\nDisallow: /admin\nDisallow: /api/\nSitemap: https://aquavo.iq/sitemap.xml`;
        res.header("Content-Type", "text/plain");
        res.send(robots);
    });

    // Seeding (Admin/System only ideally, but public in routes.ts for Vercel)
    router.get("/seed", async (req: Request, res: Response): Promise<void> => {
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
