import { Router, Request, Response, NextFunction } from "express";
import { getDb } from "../db.js";
import { blogPosts, blogCategories } from "../../shared/schema.js";
import { eq, desc, and } from "drizzle-orm";

const router = Router();

// GET all categories
router.get("/categories", async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const db = getDb();
        if (!db) {
            res.status(500).json({ message: "Database not connected" });
            return;
        }

        const categories = await db
            .select()
            .from(blogCategories)
            .orderBy(blogCategories.name);

        res.json(categories);
    } catch (error) {
        next(error);
    }
});

// GET all published blog posts (can filter by category)
router.get("/posts", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const db = getDb();
        if (!db) {
            res.status(500).json({ message: "Database not connected" });
            return;
        }

        const postSelection = {
            id: blogPosts.id,
            title: blogPosts.title,
            slug: blogPosts.slug,
            excerpt: blogPosts.excerpt,
            category: blogPosts.category,
            readTime: blogPosts.readTime,
            author: blogPosts.author,
            imageUrl: blogPosts.imageUrl,
            iconName: blogPosts.iconName,
            isPublished: blogPosts.isPublished,
            isFeatured: blogPosts.isFeatured,
            viewCount: blogPosts.viewCount,
            publishedAt: blogPosts.publishedAt,
            createdAt: blogPosts.createdAt,
            updatedAt: blogPosts.updatedAt,
        };

        const category = req.query.category as string;
        let query = db.select(postSelection).from(blogPosts).where(eq(blogPosts.isPublished, true));

        if (category) {
            query = db.select(postSelection).from(blogPosts).where(and(eq(blogPosts.isPublished, true), eq(blogPosts.category, category)));
        }

        const posts = await query.orderBy(desc(blogPosts.publishedAt));

        res.json(posts);
    } catch (error) {
        next(error);
    }
});

// GET a specific blog post by slug
router.get("/posts/:slug", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const db = getDb();
        if (!db) {
            res.status(500).json({ message: "Database not connected" });
            return;
        }

        const { slug } = req.params;
        const [post] = await db
            .select()
            .from(blogPosts)
            .where(and(eq(blogPosts.slug, slug), eq(blogPosts.isPublished, true)))
            .limit(1);

        if (!post) {
            res.status(404).json({ message: "Post not found" });
            return;
        }

        // Increment view count since it's being read
        await db.update(blogPosts)
            .set({ viewCount: (post.viewCount || 0) + 1 })
            .where(eq(blogPosts.id, post.id));

        res.json(post);
    } catch (error) {
        next(error);
    }
});

export default router;
