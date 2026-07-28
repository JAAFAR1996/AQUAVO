import type { Router as RouterType, Request, Response } from "express";
import { Router } from "express";
import { storage } from "../storage/index.js";
import { requireAdmin } from "../middleware/auth.js";
import { db } from "../db.js";
import { blogPosts, products as productTable } from "../../shared/schema.js";
import { eq, desc, isNull } from "drizzle-orm";

export function createSystemRouter(): RouterType {
    const router = Router();

    // ─── Sitemap (GEO/AEO 2026 Enhanced) ───────────────────────────────────────
    // Includes: priority, changefreq, image:image sitemap extension for AI crawlers
    router.get("/sitemap-legacy.xml", async (req: Request, res: Response): Promise<void> => {
        try {
            const products = await storage.getProducts();
            const baseUrl = "https://www.aquavoiq.com";
            // Static content last changed with the verified AQUAVO V2 release.
            // Do not manufacture a fresh lastmod date on every sitemap request.
            const staticContentLastmod = "2026-07-12";

            // Static pages with priority and changefreq for crawl budget optimisation
            const staticPages: { loc: string; priority: string; changefreq: string }[] = [
                { loc: "/",                    priority: "1.0", changefreq: "daily" },
                { loc: "/products",            priority: "0.9", changefreq: "daily" },
                { loc: "/guides",              priority: "0.9", changefreq: "weekly" },
                { loc: "/deals",               priority: "0.8", changefreq: "daily" },
                { loc: "/blog",                priority: "0.8", changefreq: "weekly" },
                { loc: "/faq",                 priority: "0.8", changefreq: "weekly" },
                { loc: "/beginner-guide",      priority: "0.8", changefreq: "monthly" },
                { loc: "/about",               priority: "0.7", changefreq: "monthly" },
                { loc: "/about-aquavo",        priority: "0.7", changefreq: "monthly" },
                { loc: "/fish-encyclopedia",   priority: "0.7", changefreq: "weekly" },
                { loc: "/fish-health",         priority: "0.7", changefreq: "weekly" },
                { loc: "/fish-finder",         priority: "0.7", changefreq: "monthly" },
                { loc: "/fish-compatibility",  priority: "0.7", changefreq: "monthly" },
                { loc: "/community-gallery",   priority: "0.7", changefreq: "weekly" },
                { loc: "/journey",             priority: "0.6", changefreq: "monthly" },
                { loc: "/calculators",         priority: "0.6", changefreq: "monthly" },
                { loc: "/aquarium-wizard",     priority: "0.6", changefreq: "monthly" },
                { loc: "/tank-builder",        priority: "0.6", changefreq: "monthly" },
                { loc: "/ai-tools",            priority: "0.6", changefreq: "monthly" },
                { loc: "/sustainability",      priority: "0.6", changefreq: "monthly" },
                { loc: "/why-aquavo",          priority: "0.6", changefreq: "monthly" },
                { loc: "/shipping",            priority: "0.6", changefreq: "monthly" },
                { loc: "/return-policy",       priority: "0.5", changefreq: "monthly" },
                { loc: "/terms",               priority: "0.4", changefreq: "yearly" },
                { loc: "/privacy-policy",      priority: "0.4", changefreq: "yearly" },
            ];

            // Guide pages (high AEO value — rich educational content)
            const guidePages = [
                "/guides/filter-choice", "/guides/heater-choice", "/guides/water-change-schedule",
                "/guides/feeding-table", "/guides/quarantine", "/guides/algae-control",
                "/guides/aquarium-salt", "/guides/white-scale", "/guides/5-mistakes",
                "/guides/essential-tools", "/guides/filter-media", "/guides/eco-friendly",
                "/guides/fish-hiding", "/guides/happy-fish-signs", "/guides/temperature-guide",
                "/guides/treatment-basics", "/guides/water-myths", "/guides/tank-rescue-plan",
                // New SEO/AEO pages — 2026 (target topics with low visibility score)
                "/guides/new-aquarium-setup-iraq",
                "/guides/aquarium-water-test-guide",
                "/guides/aquarium-decor-stones-guide",
            ];

            // Image sitemap namespace for Google visual search + AI image indexing
            let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`;

            // Static pages
            staticPages.forEach(({ loc, priority, changefreq }) => {
                xml += `\n  <url>\n    <loc>${baseUrl}${loc}</loc>\n    <lastmod>${staticContentLastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
            });

            // Guide pages (0.7 priority — rich AEO content)
            guidePages.forEach(loc => {
                xml += `\n  <url>\n    <loc>${baseUrl}${loc}</loc>\n    <lastmod>${staticContentLastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>`;
            });

            // Products — with image sitemap extension for visual AI search
            products.forEach(p => {
                const updated = p.updatedAt ? new Date(p.updatedAt).toISOString().split('T')[0] : staticContentLastmod;
                // Collect up to 3 images per product
                const images: string[] = [];
                try {
                    const rawImages = p.images as string[] | null;
                    if (Array.isArray(rawImages)) {
                        rawImages.slice(0, 3).forEach((img: string) => {
                            if (img && typeof img === 'string') {
                                const imgUrl = img.startsWith('http') ? img : `${baseUrl}${img}`;
                                images.push(imgUrl);
                            }
                        });
                    }
                } catch { /* skip image extraction if error */ }

                let imageXml = "";
                images.forEach(imgUrl => {
                    const escapedTitle = (p.name ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                    imageXml += `\n    <image:image>\n      <image:loc>${imgUrl}</image:loc>\n      <image:title>${escapedTitle}</image:title>\n    </image:image>`;
                });

                xml += `\n  <url>\n    <loc>${baseUrl}/products/${p.slug}</loc>\n    <lastmod>${updated}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.9</priority>${imageXml}\n  </url>`;
            });

            // Blog posts
            if (db) {
                try {
                    const posts = await db.select({ slug: blogPosts.slug, publishedAt: blogPosts.publishedAt })
                        .from(blogPosts)
                        .where(eq(blogPosts.status, "published"))
                        .orderBy(desc(blogPosts.publishedAt));
                    posts.forEach(p => {
                        const date = p.publishedAt ? new Date(p.publishedAt).toISOString().split('T')[0] : staticContentLastmod;
                        xml += `\n  <url>\n    <loc>${baseUrl}/blog/${p.slug}</loc>\n    <lastmod>${date}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>`;
                    });
                } catch { /* blog table might not exist yet */ }
            }

            xml += `\n</urlset>`;
            res.header("Content-Type", "application/xml");
            res.header("Cache-Control", "public, max-age=3600"); // cache 1 hour
            res.send(xml);
        } catch (err) {
            console.error(err);
            res.status(500).send("Error generating sitemap");
        }
    });

    // Robots.txt — serve the comprehensive static file instead of inline text
    const sitemapBaseUrl = "https://www.aquavoiq.com";
    const sitemapLastmod = "2026-07-13";
    const escapeXml = (value: string): string => value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&apos;");
    const publicSitemapPages = [
        "/", "/products", "/guides", "/deals", "/blog", "/faq",
        "/beginner-guide", "/about", "/why-aquavo", "/shipping",
        "/return-policy", "/terms", "/privacy-policy", "/contact",
    ];
    const publicGuidePages = [
        "/guides/filter-choice", "/guides/heater-choice", "/guides/water-change-schedule",
        "/guides/feeding-table", "/guides/quarantine", "/guides/algae-control",
        "/guides/aquarium-salt", "/guides/white-scale", "/guides/5-mistakes",
        "/guides/essential-tools", "/guides/filter-media", "/guides/eco-friendly",
        "/guides/fish-hiding", "/guides/happy-fish-signs", "/guides/temperature-guide",
        "/guides/treatment-basics", "/guides/water-myths", "/guides/tank-rescue-plan",
        "/guides/new-aquarium-setup-iraq", "/guides/aquarium-water-test-guide",
        "/guides/aquarium-decor-stones-guide",
    ];
    const sendUrlSet = (res: Response, entries: string, includeImages = false): void => {
        const imageNamespace = includeImages ? '\n xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"' : "";
        res.header("Content-Type", "application/xml; charset=utf-8");
        res.header("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
        res.send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${imageNamespace}>${entries}\n</urlset>`);
    };

    router.get("/sitemap.xml", (_req: Request, res: Response): void => {
        res.header("Content-Type", "application/xml; charset=utf-8");
        res.header("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
        res.send(`<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${sitemapBaseUrl}/sitemap-pages.xml</loc><lastmod>${sitemapLastmod}</lastmod></sitemap>
  <sitemap><loc>${sitemapBaseUrl}/sitemap-products.xml</loc><lastmod>${sitemapLastmod}</lastmod></sitemap>
  <sitemap><loc>${sitemapBaseUrl}/sitemap-guides.xml</loc><lastmod>${sitemapLastmod}</lastmod></sitemap>
</sitemapindex>`);
    });
    router.get("/sitemap-pages.xml", (_req: Request, res: Response): void => {
        sendUrlSet(res, publicSitemapPages.map((path) => `\n  <url><loc>${sitemapBaseUrl}${path}</loc><lastmod>${sitemapLastmod}</lastmod></url>`).join(""));
    });
    router.get("/sitemap-guides.xml", (_req: Request, res: Response): void => {
        sendUrlSet(res, publicGuidePages.map((path) => `\n  <url><loc>${sitemapBaseUrl}${path}</loc><lastmod>${sitemapLastmod}</lastmod></url>`).join(""));
    });
    router.get("/sitemap-products.xml", async (_req: Request, res: Response): Promise<void> => {
        try {
            if (!db) throw new Error("Database unavailable");
            const sitemapProducts = await db.select({
                slug: productTable.slug,
                name: productTable.name,
                images: productTable.images,
                updatedAt: productTable.updatedAt,
                deletedAt: productTable.deletedAt,
            }).from(productTable).where(isNull(productTable.deletedAt));
            const entries = sitemapProducts
                .filter((product) => !product.deletedAt && /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(product.slug))
                .map((product) => {
                    const updated = product.updatedAt ? new Date(product.updatedAt).toISOString().slice(0, 10) : sitemapLastmod;
                    const primaryImage = Array.isArray(product.images)
                        ? product.images.find((image) => typeof image === "string" && image.length > 0)
                        : undefined;
                    const imageUrl = primaryImage ? (primaryImage.startsWith("http") ? primaryImage : `${sitemapBaseUrl}${primaryImage}`) : undefined;
                    const image = imageUrl ? `\n    <image:image><image:loc>${escapeXml(imageUrl)}</image:loc><image:title>${escapeXml(product.name)}</image:title></image:image>` : "";
                    return `\n  <url><loc>${sitemapBaseUrl}/products/${escapeXml(product.slug)}</loc><lastmod>${updated}</lastmod>${image}\n  </url>`;
                }).join("");
            sendUrlSet(res, entries, true);
        } catch (error) {
            console.error("[Sitemap] Product sitemap generation failed", error instanceof Error ? error.name : "unknown");
            res.status(500).send("Error generating product sitemap");
        }
    });

    router.get("/robots.txt", async (req: Request, res: Response): Promise<void> => {
        try {
            const fs = await import("fs/promises");
            const path = await import("path");
            const robotsPath = path.default.resolve(
                process.cwd(),
                process.env.NODE_ENV === "production" ? "dist/public/robots.txt" : "client/public/robots.txt"
            );
            const content = await fs.readFile(robotsPath, "utf-8");
            res.header("Content-Type", "text/plain; charset=utf-8");
            res.send(content);
        } catch {
            // Fallback if file not found
            const robots = `User-agent: *\nDisallow: /admin\nDisallow: /api/\nSitemap: https://www.aquavoiq.com/sitemap.xml`;
            res.header("Content-Type", "text/plain");
            res.send(robots);
        }
    });

    // ─── .well-known Endpoints (Agent Readiness) ─────────────

    // API Catalog (RFC 9727)
    // These discovery documents previously advertised incomplete or broken public
    // integrations. Keep their legacy implementations below for rollback, but stop
    // publishing them until each protocol is production-ready and independently tested.
    router.get([
        "/.well-known/api-catalog",
        "/.well-known/openapi.json",
        "/.well-known/mcp/server-card.json",
        "/.well-known/mcp/server-cards.json",
        "/.well-known/mcp.json",
        "/.well-known/agent-skills/index.json",
        "/.well-known/skills/index.json",
        "/.well-known/acp.json",
    ], (_req: Request, res: Response): void => {
        res.status(410).json({ error: "Discovery document unavailable" });
    });

    // UCP - Universal Commerce Protocol (prevent soft-404)
    router.get("/.well-known/ucp", (_req: Request, res: Response): void => {
        res.status(404).json({ error: "UCP not implemented" });
    });

    // Prevent soft-404 for common .well-known paths
    router.get("/.well-known/http-message-signatures-directory", (_req: Request, res: Response): void => {
        res.status(404).json({ error: "Not implemented" });
    });
    // NOTE: /.well-known/oauth-authorization-server and /.well-known/oauth-protected-resource
    // are defined EXCLUSIVELY in oauth.ts (MCP OAuth 2.1 spec).
    // DO NOT add them here — previous duplicates pointed to /login and /register (user auth)
    // instead of /oauth/* (MCP DCR), which broke Claude.ai connector registration.

    // OpenID Connect Discovery — also used by ChatGPT for MCP OAuth discovery
    // ChatGPT reads this BEFORE /.well-known/oauth-authorization-server
    // Must point to the same /oauth/* endpoints for MCP to work
    router.get("/.well-known/openid-configuration", (_req: Request, res: Response): void => {
        res.header("Content-Type", "application/json");
        res.header("Access-Control-Allow-Origin", "*");
        res.json({
            issuer: "https://www.aquavoiq.com",
            authorization_endpoint: "https://www.aquavoiq.com/oauth/authorize",
            token_endpoint: "https://www.aquavoiq.com/oauth/token",
            registration_endpoint: "https://www.aquavoiq.com/oauth/register",
            userinfo_endpoint: "https://www.aquavoiq.com/api/auth/me",
            jwks_uri: "https://www.aquavoiq.com/.well-known/jwks.json",
            scopes_supported: ["mcp", "mcp:read", "mcp:write", "openid", "profile"],
            response_types_supported: ["code"],
            grant_types_supported: ["authorization_code", "refresh_token"],
            code_challenge_methods_supported: ["S256"],
            token_endpoint_auth_methods_supported: ["none"],
            subject_types_supported: ["public"],
            id_token_signing_alg_values_supported: ["RS256"],
            claims_supported: ["sub", "name", "email", "phone_number"]
        });
    });

    // Catch-all for any unknown .well-known paths — return proper 404 JSON, not HTML
    router.get("/.well-known/:path(*)", (_req: Request, res: Response): void => {
        res.status(404).json({ error: "Not found", path: `/.well-known/${_req.params.path}` });
    });

    // Health check (public) — liveness only.
    router.get("/health", (_req: Request, res: Response): void => {
        res.json({ status: "ok", timestamp: new Date().toISOString() });
    });

    // Readiness (public) — is the DATABASE SCHEMA new enough for THIS app version?
    // Returns 503 when the app writes columns the database lacks, so a
    // pre-migration deployment is refused traffic instead of failing individual
    // customer orders. See server/services/schema-readiness.ts.
    router.get("/ready", async (_req: Request, res: Response): Promise<void> => {
        try {
            const { getSchemaReadiness } = await import("../services/schema-readiness.js");
            const { db } = await import("../db.js");
            const readiness = await getSchemaReadiness(db as any);
            res.status(readiness.ready ? 200 : 503).json({
                status: readiness.ready ? "ready" : "not_ready",
                orderCreationEnabled: readiness.orderCreationEnabled,
                missingColumns: readiness.missingColumns,
                detail: readiness.detail,
                checkedAt: readiness.checkedAt,
            });
        } catch (err: any) {
            res.status(503).json({ status: "not_ready", detail: err?.message ?? "readiness probe failed" });
        }
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
