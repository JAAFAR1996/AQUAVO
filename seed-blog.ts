import { db } from "./server/db.js";
import { blogPosts, blogCategories } from "./shared/schema.js";
import { blogPosts as mockPosts } from "./client/src/lib/blog-data.js";

async function seedBlogData() {
    console.log("🌱 Starting Blog Data Seed...");

    // Helper to parse dates like "28 ديسمبر 2025"
    const parseArabicDate = (dateStr: string) => {
        const months: Record<string, number> = {
            "يناير": 0, "فبراير": 1, "مارس": 2, "أبريل": 3, "مايو": 4, "يونيو": 5,
            "يوليو": 6, "أغسطس": 7, "سبتمبر": 8, "أكتوبر": 9, "نوفمبر": 10, "ديسمبر": 11
        };
        const parts = dateStr.split(" ");
        if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const monthIndex = months[parts[1]] !== undefined ? months[parts[1]] : 0;
            const year = parseInt(parts[2], 10);
            return new Date(year, monthIndex, day);
        }
        return new Date();
    };

    try {
        // 1. Extract unique categories from mock data
        const uniqueCategories = [...new Set(mockPosts.map((post) => post.category))];

        console.log(`Found ${uniqueCategories.length} unique categories.`);

        // 2. Insert Categories
        for (const catName of uniqueCategories) {
            const slug = catName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\u0600-\u06FF-]/g, '');

            await db.insert(blogCategories).values({
                name: catName,
                slug: slug,
                description: `Articles about ${catName}`,
                iconName: "Fish", // Default icon
            }).onConflictDoNothing();
            console.log(`✅ Category inserted: ${catName}`);
        }

        // 3. Insert Blog Posts
        for (const post of mockPosts) {
            await db.insert(blogPosts).values({
                title: post.title,
                slug: post.id, // Using their existing string ID as the slug
                excerpt: post.excerpt,
                content: post.content,
                category: post.category,
                readTime: post.readTime,
                author: post.author,
                imageUrl: post.image,
                iconName: post.iconName,
                isPublished: true,
                isFeatured: post.featured || false,
                viewCount: Math.floor(Math.random() * 500) + 50, // Some random fake views for realism
                publishedAt: parseArabicDate(post.date), // Requires a valid date string parse
            }).onConflictDoUpdate({
                target: blogPosts.slug,
                set: {
                    title: post.title,
                    excerpt: post.excerpt,
                    content: post.content,
                    category: post.category,
                    updatedAt: new Date()
                }
            });
            console.log(`✅ Post inserted: ${post.title}`);
        }

        console.log("🎉 Blog Seeding Complete!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error seeding blog data:", error);
        process.exit(1);
    }
}

seedBlogData();
