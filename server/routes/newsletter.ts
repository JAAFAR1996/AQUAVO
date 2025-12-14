
import { Router } from "express";
import { type IStorage } from "../storage/index.js";
import { insertNewsletterSubscriptionSchema } from "../../shared/schema.js";
import { z } from "zod";
import { sendWelcomeEmail, sendProductDiscountEmail } from "../utils/email.js";

export function createNewsletterRouter(storage: IStorage) {
    const router = Router();

    router.post("/subscribe", async (req, res) => {
        try {
            const data = insertNewsletterSubscriptionSchema.parse(req.body);

            // Check if already subscribed
            const existing = await storage.getNewsletterSubscriptionByEmail(data.email);
            if (existing) {
                return res.status(400).json({ message: "هذا البريد الإلكتروني مشترك بالفعل" });
            }

            await storage.createNewsletterSubscription(data);

            // Send welcome email
            try {
                // Determine base URL dynamically or fallback to config
                await sendWelcomeEmail(data.email);
            } catch (emailError) {
                console.error("Failed to send welcome email:", emailError);
                // Don't fail the request if email fails, just log it
            }

            res.json({ message: "تم الاشتراك بنجاح! تفقد بريدك الإلكتروني" });
        } catch (error) {
            if (error instanceof z.ZodError) {
                res.status(400).json({ message: "البريد الإلكتروني غير صالح" });
            } else {
                res.status(500).json({ message: "خطأ في السيرفر" });
            }
        }
    });

    // Admin only: Broadcast product discount to all subscribers
    router.post("/broadcast-discount", async (req, res) => {
        try {
            // In a real app, add admin authentication check here
            const { productId } = req.body;
            if (!productId) {
                return res.status(400).json({ message: "Product ID is required" });
            }

            const product = await storage.getProduct(productId);
            if (!product) {
                return res.status(404).json({ message: "Product not found" });
            }

            // Get all active subscribers
            const subscribers = await storage.getNewsletterSubscriptions();

            // In a real production app with many subscribers, you would use a queue system (Redis/Bull)
            // to send these emails in background jobs to avoid timeout.
            // For now, we'll send them concurrently but without a queue since the list is likely small.

            console.log(`[Broadcast] Starting broadcast for product ${product.name} to ${subscribers.length} subscribers`);

            // Send emails (don't await all valid promises to avoid blocking too long, but for small scale await is fine)
            // We'll use map to trigger all.
            const emailPromises = subscribers.map(sub => sendProductDiscountEmail(sub.email, {
                name: product.name,
                price: product.price,
                originalPrice: product.originalPrice ?? undefined,
                slug: product.slug,
                image: product.thumbnail // assuming thumbnail is the main image or use images[0]
            }));

            // In production, don't await this if it takes too long.
            Promise.allSettled(emailPromises).then(results => {
                const successCount = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
                console.log(`[Broadcast] Completed. Successfully sent: ${successCount}/${subscribers.length}`);
            });

            res.json({
                message: "تم بدء إرسال التخفيضات للمشتركين",
                recipientCount: subscribers.length
            });

        } catch (error) {
            console.error("[Broadcast] Error:", error);
            res.status(500).json({ message: "Failed to broadcast" });
        }
    });

    return router;
}
