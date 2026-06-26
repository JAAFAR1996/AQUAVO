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

    // Robots.txt — serve the comprehensive static file instead of inline text
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
    router.get("/.well-known/api-catalog", (_req: Request, res: Response): void => {
        res.header("Content-Type", "application/linkset+json");
        res.json({
            linkset: [{
                anchor: "https://www.aquavoiq.com/api",
                "service-desc": [{ href: "https://www.aquavoiq.com/.well-known/openapi.json", type: "application/json" }],
                "service-doc": [{ href: "https://www.aquavoiq.com/", type: "text/html" }],
                status: [{ href: "https://www.aquavoiq.com/health", type: "application/json" }]
            }]
        });
    });

    // MCP Server Card (SEP-2127)
    router.get("/.well-known/mcp/server-card.json", (_req: Request, res: Response): void => {
        res.header("Content-Type", "application/json");
        res.json({
            serverInfo: {
                name: "AQUAVO",
                version: "2.0.0",
                description: "AQUAVO — Iraq's premium aquarium supplies e-commerce platform. Browse products, track orders, and get AI-powered fish care advice."
            },
            transport: { type: "https", endpoint: "https://www.aquavoiq.com/api" },
            capabilities: {
                products: { description: "Browse aquarium products and supplies", endpoint: "/api/products" },
                "fish-encyclopedia": { description: "Comprehensive fish species database with care guides", endpoint: "/api/fish" },
                "health-check": { description: "Service health status", endpoint: "/health" }
            }
        });
    });

    // Also support the plural and flat paths that scanners check
    router.get("/.well-known/mcp/server-cards.json", (_req: Request, res: Response): void => {
        res.redirect(301, "/.well-known/mcp/server-card.json");
    });
    router.get("/.well-known/mcp.json", (_req: Request, res: Response): void => {
        res.redirect(301, "/.well-known/mcp/server-card.json");
    });

    // Agent Skills Discovery Index (v0.2.0)
    router.get("/.well-known/agent-skills/index.json", (_req: Request, res: Response): void => {
        res.header("Content-Type", "application/json");
        res.json({
            "$schema": "https://agentskills.io/schemas/v0.2.0/index.json",
            skills: [
                { name: "browse-products", description: "Browse and search AQUAVO aquarium products catalog including filters, heaters, air pumps, decorations, fish food, and more. Returns product listings with prices in Iraqi Dinar (IQD).", type: "skill-md", url: "https://www.aquavoiq.com/.well-known/agent-skills/browse-products/SKILL.md", digest: "sha256:" },
                { name: "fish-encyclopedia", description: "Access comprehensive fish species database with care guides, compatibility info, tank requirements, and breeding tips.", type: "skill-md", url: "https://www.aquavoiq.com/.well-known/agent-skills/fish-encyclopedia/SKILL.md", digest: "sha256:" },
                { name: "track-order", description: "Track an AQUAVO order by order number. Returns order status, estimated delivery, and item details.", type: "skill-md", url: "https://www.aquavoiq.com/.well-known/agent-skills/track-order/SKILL.md", digest: "sha256:" }
            ]
        });
    });

    // Legacy agent-skills path
    router.get("/.well-known/skills/index.json", (_req: Request, res: Response): void => {
        res.redirect(301, "/.well-known/agent-skills/index.json");
    });

    // ACP - Agentic Commerce Protocol (spec: https://agenticcommerce.dev)
    router.get("/.well-known/acp.json", (_req: Request, res: Response): void => {
        res.header("Content-Type", "application/json");
        res.json({
            protocol: {
                name: "acp",
                version: "1.0"
            },
            api_base_url: "https://www.aquavoiq.com/api",
            transports: ["https"],
            capabilities: {
                services: [
                    {
                        name: "product-catalog",
                        description: "Browse and search aquarium products",
                        endpoint: "/api/products"
                    },
                    {
                        name: "order-tracking",
                        description: "Track order status by order number",
                        endpoint: "/api/orders/track/{orderNumber}"
                    },
                    {
                        name: "fish-encyclopedia",
                        description: "Fish species database with care guides",
                        endpoint: "/api/fish"
                    }
                ]
            },
            merchant: {
                name: "AQUAVO",
                description: "Iraq's premier aquarium supplies and fish care e-commerce platform",
                url: "https://www.aquavoiq.com",
                logo: "https://www.aquavoiq.com/logo_aquavo_icon.png",
                country: "IQ",
                currency: "IQD",
                language: "ar"
            },
            payment: { methods: ["cash_on_delivery"], currency: "IQD" },
            shipping: {
                zones: [
                    { name: "Baghdad", delivery_time: "within 24 hours", cost: 5000 },
                    { name: "All Iraqi governorates", delivery_time: "within 24 hours", cost: 5000 }
                ]
            },
            contact: { phone: "+964 774 788 0673", website: "https://www.aquavoiq.com" }
        });
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
            scopes_supported: ["mcp", "openid", "profile"],
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
