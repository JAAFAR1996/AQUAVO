import type { Router as RouterType, Request, Response } from "express";
import { Router } from "express";
import { type IStorage } from "../storage/index.js";
import { insertNewsletterSubscriptionSchema } from "../../shared/schema.js";
import { z } from "zod";
import { sendWelcomeEmail, sendProductDiscountEmail } from "../utils/email.js";

// Helper function to broadcast discount
export async function broadcastDiscountForProduct(storage: IStorage, productId: string): Promise<number> {
    const product = await storage.getProduct(productId);
    if (!product) {
        throw new Error("Product not found");
    }

    // Get all active subscribers
    const subscribers = await storage.getNewsletterSubscriptions();

    console.log(`[Broadcast] Starting broadcast for product ${product.name} to ${subscribers.length} subscribers`);

    // Send emails
    const emailPromises = subscribers.map(sub => sendProductDiscountEmail(sub.email, {
        name: product.name,
        price: product.price,
        originalPrice: product.originalPrice ?? undefined,
        slug: product.slug,
        image: product.thumbnail // assuming thumbnail is the main image
    }));

    // In production, don't await this if it takes too long.
    Promise.allSettled(emailPromises).then(results => {
        const successCount = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
        console.log(`[Broadcast] Completed. Successfully sent: ${successCount}/${subscribers.length}`);
    });

    return subscribers.length;
}

export function createNewsletterRouter(storage: IStorage): RouterType {
    const router = Router();

    router.post("/subscribe", async (req: Request, res: Response): Promise<void> => {
        try {
            const data = insertNewsletterSubscriptionSchema.parse(req.body);

            // Check if already subscribed
            const existing = await storage.getNewsletterSubscriptionByEmail(data.email);
            if (existing) {
                res.status(400).json({ message: "هذا البريد الإلكتروني مشترك بالفعل" });
                return;
            }

            await storage.createNewsletterSubscription(data);

            // Send welcome email
            try {
                await sendWelcomeEmail(data.email);
            } catch (emailError) {
                console.error("Failed to send welcome email:", emailError);
            }

            res.json({ message: "تم الاشتراك بنجاح! تفقد بريدك الإلكتروني" });
        } catch (error) {
            if (error instanceof z.ZodError) {
                res.status(400).json({ message: "البريد الإلكتروني غير صالح" });
            } else {
                console.error("Subscribe error:", error);
                res.status(500).json({ message: "خطأ في السيرفر" });
            }
        }
    });

    // Admin only: Broadcast product discount to all subscribers
    router.post("/broadcast-discount", async (req: Request, res: Response): Promise<void> => {
        try {
            const { productId } = req.body;
            if (!productId) {
                res.status(400).json({ message: "Product ID is required" });
                return;
            }

            const count = await broadcastDiscountForProduct(storage, productId);

            res.json({
                message: "تم بدء إرسال التخفيضات للمشتركين",
                recipientCount: count
            });

        } catch (error) {
            console.error("[Broadcast] Error:", error);
            res.status(500).json({ message: "Failed to broadcast" });
        }
    });

    return router;
}
