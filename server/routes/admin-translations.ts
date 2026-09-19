/**
 * Admin translation workflow.
 *
 *   GET  /api/admin/translations/coverage            per entity type × locale: complete / machine / outdated / missing
 *   GET  /api/admin/translations/:type               list entities with per-locale status (paginated by ?q= filter)
 *   GET  /api/admin/translations/:type/:id           Arabic source fields + every locale's record and status
 *   PUT  /api/admin/translations/:type/:id/:locale   save an edited translation (status becomes "reviewed")
 *   DELETE /api/admin/translations/:type/:id/:locale remove a translation (page falls back to Arabic + noindex)
 *
 * "Outdated" is never stored: it is derived by comparing the record's
 * source_hash with the hash of the Arabic row as it is now, so editing the
 * Arabic source automatically flags every translation of that entity.
 */
import { Router, type Request, type Response, type NextFunction } from "express";
import { and, eq } from "drizzle-orm";
import { getDb } from "../db.js";
import { requireAdmin, getSession } from "../middleware/auth.js";
import { blogCategories, blogPosts, categories, contentTranslations, products } from "../../shared/schema.js";
import { TRANSLATION_TARGET_LOCALES, isLocale, type Locale } from "../../shared/i18n/locales.js";
import {
  blogCategorySourceFields,
  blogPostSourceFields,
  categorySourceFields,
  coverageOf,
  productSourceFields,
  sourceHash,
  type TranslatableEntityType,
  type TranslationCoverage,
} from "../../shared/i18n/content.js";

const ENTITY_TYPES: TranslatableEntityType[] = ["product", "blog_post", "category", "blog_category"];

interface SourceRow {
  id: string;
  label: string;
  slug?: string | null;
  published: boolean;
  fields: Record<string, unknown>;
}

async function loadSources(type: TranslatableEntityType): Promise<SourceRow[]> {
  const db = getDb();
  if (!db) throw new Error("Database not connected");
  switch (type) {
    case "product": {
      const rows = await db
        .select({ id: products.id, name: products.name, slug: products.slug, description: products.description, subcategory: products.subcategory, specifications: products.specifications, variants: products.variants, deletedAt: products.deletedAt })
        .from(products);
      return rows.map((r) => ({ id: r.id, label: r.name, slug: r.slug, published: !r.deletedAt, fields: productSourceFields(r) }));
    }
    case "blog_post": {
      const rows = await db
        .select({ id: blogPosts.id, title: blogPosts.title, slug: blogPosts.slug, excerpt: blogPosts.excerpt, content: blogPosts.content, category: blogPosts.category, isPublished: blogPosts.isPublished })
        .from(blogPosts);
      return rows.map((r) => ({ id: r.id, label: r.title, slug: r.slug, published: !!r.isPublished, fields: blogPostSourceFields(r) }));
    }
    case "category": {
      const rows = await db.select({ id: categories.id, name: categories.name, displayName: categories.displayName, description: categories.description }).from(categories);
      return rows.map((r) => ({ id: r.id, label: r.displayName, slug: r.name, published: true, fields: categorySourceFields(r) }));
    }
    case "blog_category": {
      const rows = await db.select({ id: blogCategories.id, name: blogCategories.name, slug: blogCategories.slug, description: blogCategories.description }).from(blogCategories);
      return rows.map((r) => ({ id: r.id, label: r.name, slug: r.slug, published: true, fields: blogCategorySourceFields(r) }));
    }
    default:
      throw new Error(`Unsupported entity type ${type as string}`);
  }
}

async function loadRecords(type: TranslatableEntityType, ids?: string[]) {
  const db = getDb();
  if (!db) throw new Error("Database not connected");
  const rows = await db.select().from(contentTranslations).where(eq(contentTranslations.entityType, type));
  const wanted = ids ? new Set(ids) : null;
  return rows.filter((r) => !wanted || wanted.has(r.entityId));
}

function statusFor(records: Array<typeof contentTranslations.$inferSelect>, entityId: string, locale: Locale, hash: string): TranslationCoverage {
  const rec = records.find((r) => r.entityId === entityId && r.locale === locale);
  return coverageOf(rec ? { entityType: rec.entityType as TranslatableEntityType, entityId: rec.entityId, locale: rec.locale as Locale, data: rec.data, status: rec.status as "machine" | "reviewed", sourceHash: rec.sourceHash } : null, hash);
}

export function createAdminTranslationsRouter(): Router {
  const router = Router();
  router.use(requireAdmin);

  router.get("/coverage", async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const out: Record<string, Record<string, Record<TranslationCoverage, number> & { total: number }>> = {};
      for (const type of ENTITY_TYPES) {
        const sources = (await loadSources(type)).filter((s) => s.published);
        const records = await loadRecords(type);
        out[type] = {};
        for (const locale of TRANSLATION_TARGET_LOCALES) {
          const counts = { complete: 0, machine: 0, outdated: 0, missing: 0, total: sources.length };
          for (const s of sources) counts[statusFor(records, s.id, locale, sourceHash(s.fields))]++;
          out[type][locale] = counts;
        }
      }
      res.json(out);
    } catch (err) {
      next(err);
    }
  });

  router.get("/:type", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const type = req.params.type as TranslatableEntityType;
      if (!ENTITY_TYPES.includes(type)) return void res.status(404).json({ message: "Unknown entity type" });
      const q = String(req.query.q ?? "").trim().toLowerCase();
      const sources = (await loadSources(type)).filter((s) => !q || s.label.toLowerCase().includes(q) || (s.slug ?? "").toLowerCase().includes(q));
      const records = await loadRecords(type);
      res.json(
        sources.map((s) => {
          const hash = sourceHash(s.fields);
          const status: Record<string, TranslationCoverage> = {};
          for (const locale of TRANSLATION_TARGET_LOCALES) status[locale] = statusFor(records, s.id, locale, hash);
          return { id: s.id, label: s.label, slug: s.slug, published: s.published, status };
        }),
      );
    } catch (err) {
      next(err);
    }
  });

  router.get("/:type/:id", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const type = req.params.type as TranslatableEntityType;
      if (!ENTITY_TYPES.includes(type)) return void res.status(404).json({ message: "Unknown entity type" });
      const source = (await loadSources(type)).find((s) => s.id === req.params.id);
      if (!source) return void res.status(404).json({ message: "Entity not found" });
      const hash = sourceHash(source.fields);
      const records = await loadRecords(type, [source.id]);
      const translations: Record<string, unknown> = {};
      for (const locale of TRANSLATION_TARGET_LOCALES) {
        const rec = records.find((r) => r.locale === locale);
        translations[locale] = { status: statusFor(records, source.id, locale, hash), record: rec ? { data: rec.data, status: rec.status, translatedBy: rec.translatedBy, updatedAt: rec.updatedAt } : null };
      }
      res.json({ id: source.id, label: source.label, slug: source.slug, sourceHash: hash, source: source.fields, translations });
    } catch (err) {
      next(err);
    }
  });

  router.put("/:type/:id/:locale", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = getDb();
      if (!db) return void res.status(500).json({ message: "Database not connected" });
      const type = req.params.type as TranslatableEntityType;
      const locale = req.params.locale;
      if (!ENTITY_TYPES.includes(type) || !isLocale(locale) || locale === "ar") return void res.status(400).json({ message: "Invalid type or locale" });
      const source = (await loadSources(type)).find((s) => s.id === req.params.id);
      if (!source) return void res.status(404).json({ message: "Entity not found" });
      const body = (req.body ?? {}) as { data?: Record<string, unknown>; status?: "machine" | "reviewed" };
      if (!body.data || typeof body.data !== "object") return void res.status(400).json({ message: "data object required" });
      const primary = type === "product" ? "name" : type === "blog_post" ? "title" : type === "category" ? "displayName" : "name";
      if (typeof body.data[primary] !== "string" || !(body.data[primary] as string).trim()) {
        return void res.status(400).json({ message: `Field "${primary}" is required so the locale is never published empty` });
      }
      const status = body.status === "machine" ? "machine" : "reviewed";
      const admin = getSession(req);
      const values = {
        entityType: type,
        entityId: source.id,
        locale,
        data: body.data,
        status,
        sourceHash: sourceHash(source.fields),
        translatedBy: admin?.userId ? `admin:${admin.userId}` : "admin",
        updatedAt: new Date(),
      };
      const [row] = await db
        .insert(contentTranslations)
        .values(values)
        .onConflictDoUpdate({ target: [contentTranslations.entityType, contentTranslations.entityId, contentTranslations.locale], set: values })
        .returning();
      res.json({ ok: true, record: row, status: "complete" });
    } catch (err) {
      next(err);
    }
  });

  router.delete("/:type/:id/:locale", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = getDb();
      if (!db) return void res.status(500).json({ message: "Database not connected" });
      const type = req.params.type as TranslatableEntityType;
      const locale = req.params.locale;
      if (!ENTITY_TYPES.includes(type) || !isLocale(locale)) return void res.status(400).json({ message: "Invalid type or locale" });
      await db.delete(contentTranslations).where(and(eq(contentTranslations.entityType, type), eq(contentTranslations.entityId, req.params.id), eq(contentTranslations.locale, locale)));
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
