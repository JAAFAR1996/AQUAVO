import { Router, Request, Response, NextFunction } from "express";
import { getDb } from "../db.js";
import { blogPosts, blogCategories } from "../../shared/schema.js";
import { eq, desc, and } from "drizzle-orm";
import { articleReadingTimeLabel } from "../../shared/article-reading.js";

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
            publishedAt: blogPosts.publishedAt,
            createdAt: blogPosts.createdAt,
            // Read to derive the reading-time estimate below, then dropped: the
            // index needs the number, not 81 article bodies. `readTime` is the
            // stored string and is not sent either — it overstates every post.
            content: blogPosts.content,
        };

        // `view_count` is deliberately absent. It counts requests to this
        // router, not readers, so it cannot be published as a readership
        // figure. See the note on the post handler below.

        const category = req.query.category as string;
        let query = db.select(postSelection).from(blogPosts).where(eq(blogPosts.isPublished, true));

        if (category) {
            query = db.select(postSelection).from(blogPosts).where(and(eq(blogPosts.isPublished, true), eq(blogPosts.category, category)));
        }

        const posts = await query.orderBy(desc(blogPosts.publishedAt));

        res.json(posts.map(({ content, ...post }) => ({
            ...post,
            readingTime: articleReadingTimeLabel(content),
        })));
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

        // No view-count increment, and no view count in the response.
        //
        // This line ran on every GET of this endpoint. It counted refreshes,
        // the crawler prerender, the SPA's own fetch on each navigation back to
        // a post, uptime checks, scrapers and end-to-end tests — one increment
        // each, with no session, no dedup and no bot filter. The blog page then
        // printed the total as "المشاهدات: N", presenting a request counter as
        // a number of human readers. Across 81 posts it had reached 41,212.
        //
        // A defensible readership metric is a separate piece of work and needs
        // PostHog, which the storefront already loads: unique identified
        // sessions, bots excluded, internal and test traffic excluded, and a
        // written definition of what counts as having read a post. Until that
        // exists there is no honest number to show, so none is shown. The
        // column is left in place; it is simply no longer read or written here.
        const { viewCount: _viewCount, readTime: _readTime, ...publicPost } = post;
        res.json({
            ...publicPost,
            readingTime: articleReadingTimeLabel(post.content),
        });
    } catch (error) {
        next(error);
    }
});

export default router;
