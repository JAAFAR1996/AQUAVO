import { Router } from "express";
import { storage } from "../storage/index.js";
import { requireAdmin, getSession } from "../middleware/auth.js";
import { insertProductSchema } from "../../shared/schema.js";
import express from "express";
import { broadcastDiscountForProduct } from "./newsletter.js";

export function createAdminRouter() {
    const router = Router();

    // Apply admin check to all routes in this router
    router.use(requireAdmin);

    // Dashboard Stats (Example) - logic might need to be added to storage
    // router.get("/stats", ...);

    // Orders
    router.get("/orders", async (req, res, next) => {
        try {
            const orders = await storage.getOrders(); // All orders
            // Transform logic if needed
            res.json(orders);
        } catch (err) {
            next(err);
        }
    });

    router.put("/orders/:id", async (req, res, next) => {
        try {
            const order = await storage.updateOrder(req.params.id, req.body);

            if (order) {
                await storage.createAuditLog({
                    userId: (req as any).session?.userId || "admin",
                    action: "update",
                    entityType: "order",
                    entityId: order.id,
                    changes: req.body
                });
            }

            res.json(order);
        } catch (err) { next(err); }
    });

    // Users
    router.get("/users", async (req, res, next) => {
        try {
            const users = await storage.getUsers();
            res.json(users);
        } catch (err) {
            next(err);
        }
    });

    // Discounts
    router.get("/discounts", async (req, res, next) => {
        try {
            const discounts = await storage.getDiscounts();
            res.json(discounts);
        } catch (err) { next(err); }
    });

    router.post("/discounts", async (req, res, next) => {
        try {
            const discount = await storage.createDiscount(req.body);
            res.status(201).json(discount);
        } catch (err) { next(err); }
    });

    router.delete("/discounts/:id", async (req, res, next) => {
        try {
            await storage.deleteDiscount(req.params.id);
            res.json({ message: "Deleted" });
        } catch (err) { next(err); }
    });

    // Coupons
    router.get("/coupons", async (req, res, next) => {
        try {
            const coupons = await storage.getCoupons();
            res.json(coupons);
        } catch (err) { next(err); }
    });

    router.post("/coupons", async (req, res, next) => {
        try {
            const coupon = await storage.createCoupon(req.body);
            res.status(201).json(coupon);
        } catch (err) { next(err); }
    });

    router.put("/coupons/:id", async (req, res, next) => {
        try {
            const coupon = await storage.updateCoupon(req.params.id, req.body);
            res.json(coupon);
        } catch (err) { next(err); }
    });

    router.delete("/coupons/:id", async (req, res, next) => {
        try {
            await storage.deleteCoupon(req.params.id);
            res.json({ message: "Deleted" });
        } catch (err) { next(err); }
    });

    // Audit Logs
    router.get("/audit-logs", async (req, res, next) => {
        try {
            const logs = await storage.getAuditLogs(req.query as any);
            res.json(logs);
        } catch (err) { next(err); }
    });

    // Gallery Management
    router.get("/gallery/submissions", async (req, res, next) => {
        try {
            // False = get all (pending + approved)
            const subs = await storage.getGallerySubmissions(false);
            res.json(subs);
        } catch (err) { next(err); }
    });

    router.post("/gallery/approve/:id", async (req, res, next) => {
        try {
            const sub = await storage.approveGallerySubmission(req.params.id);
            res.json(sub);
        } catch (err) { next(err); }
    });

    router.post("/gallery/reject/:id", async (req, res, next) => {
        try {
            await storage.deleteGallerySubmission(req.params.id);
            res.json({ message: "Rejected" });
        } catch (err) { next(err); }
    });

    router.post("/gallery/prize", async (req, res, next) => {
        try {
            const prize = await storage.createOrUpdateGalleryPrize(req.body);
            res.json(prize);
        } catch (err) { next(err); }
    });

    router.post("/gallery/set-winner/:id", async (req, res, next) => {
        try {
            const { nanoid } = await import("nanoid");
            // Logic for winner
            const currentPrize = await storage.getCurrentGalleryPrize();
            if (!currentPrize) {
                return res.status(400).json({
                    message: "لا توجد جائزة نشطة للشهر الحالي. يرجى إنشاء جائزة أولاً."
                });
            }

            // Find submission to get userId
            const submissions = await storage.getGallerySubmissions(false);
            const submission = submissions.find(s => s.id === req.params.id);

            if (!submission) {
                return res.status(404).json({ message: "Submission not found" });
            }

            // Generate Coupon
            const code = `WINNER-${currentPrize.month.replace('-', '')}-${nanoid(6).toUpperCase()}`;

            // Determine value/type from prize or default
            const couponValue = currentPrize.discountPercentage ? currentPrize.discountPercentage.toString() : "0";
            const couponType = currentPrize.discountPercentage ? 'percentage' : 'fixed';

            // Create Coupon
            await storage.createCoupon({
                code,
                type: couponType,
                value: couponValue,
                maxUses: 1,
                maxUsesPerUser: 1,
                isActive: true,
                description: `Prize for ${currentPrize.month}: ${currentPrize.prize}`,
                userId: submission.userId || undefined
            });

            await storage.setGalleryWinner(req.params.id, currentPrize.month, currentPrize.prize, code);
            res.json({ message: "Winner set", coupon: code });
        } catch (err) { next(err); }
    });

    // Delete a past winner (removes submission and image from Cloudinary)
    router.delete("/gallery/winner/:id", async (req, res, next) => {
        try {
            // Get the submission first to retrieve the image URL
            const submissions = await storage.getGallerySubmissions(false);
            const submission = submissions.find(s => s.id === req.params.id);

            if (!submission) {
                return res.status(404).json({ message: "Submission not found" });
            }

            // Only allow deletion of winners
            if (!submission.isWinner) {
                return res.status(400).json({ message: "This submission is not a winner" });
            }

            // Delete the image from Cloudinary if it exists and is a Cloudinary URL
            if (submission.imageUrl && submission.imageUrl.includes('cloudinary.com')) {
                try {
                    const { deleteImage } = await import("../utils/cloudinary.js");
                    await deleteImage(submission.imageUrl);
                } catch (imgError) {
                    console.error("Failed to delete image from Cloudinary:", imgError);
                    // Continue with submission deletion even if image deletion fails
                }
            }

            // Delete the submission from database
            await storage.deleteGallerySubmission(req.params.id);

            // Audit Log
            await storage.createAuditLog({
                userId: getSession(req)?.userId || "admin",
                action: "delete",
                entityType: "gallery_winner",
                entityId: req.params.id,
                changes: { customerName: submission.customerName, winnerMonth: submission.winnerMonth }
            });

            res.json({ message: "Winner deleted successfully" });
        } catch (err) { next(err); }
    });

    // ============ PRODUCTS MANAGEMENT ============

    router.post("/products", async (req, res, next) => {
        try {
            const data = req.body;

            // Handle image upload if provided
            if (data.imageBase64) {
                try {
                    const { uploadImage } = await import("../utils/cloudinary.js");
                    const imageUrl = await uploadImage(data.imageBase64);

                    data.images = [imageUrl];
                    data.thumbnail = imageUrl;
                } catch (error) {
                    console.error("Image upload failed:", error);
                    throw new Error("Image upload failed. Please check your internet connection or Cloudinary configuration.");
                }
            }

            // Ensure images is array if not set
            if (!data.images) data.images = [];
            if (!data.thumbnail && data.images.length > 0) data.thumbnail = data.images[0];

            // Clean up imageBase64 before validation
            delete data.imageBase64;

            const parsed = insertProductSchema.parse(data);
            const product = await storage.createProduct(parsed);

            // Audit Log
            await storage.createAuditLog({
                userId: getSession(req)?.userId || "admin",
                action: "create",
                entityType: "product",
                entityId: product.id,
                changes: parsed as any
            });

            res.status(201).json(product);
        } catch (err) { next(err); }
    });

    router.patch("/products/:id", async (req, res, next) => {
        try {
            const updates = req.body;

            // Handle image upload if provided
            if (updates.imageBase64) {
                try {
                    const { uploadImage } = await import("../utils/cloudinary.js");
                    const imageUrl = await uploadImage(updates.imageBase64);

                    // Append to existing images or replace? 
                    // For now, let's treat it as "add/replace main image" logic or simple replace
                    // Based on typical admin usage, likely replacing the main image
                    // But let's verify if we want to keep array.
                    // The simple approach: Replace
                    updates.images = [imageUrl];
                    updates.thumbnail = imageUrl;
                } catch (error) {
                    console.error("Image upload failed:", error);
                    throw new Error("Image upload failed. Please check your internet connection or Cloudinary configuration.");
                }

                delete updates.imageBase64;
            }

            const product = await storage.updateProduct(req.params.id, updates);

            if (!product) {
                res.status(404).json({ message: "Product not found" });
                return;
            }

            // Audit Log
            await storage.createAuditLog({
                userId: getSession(req)?.userId || "admin",
                action: "update",
                entityType: "product",
                entityId: product.id,
                changes: updates
            });

            // Check if price was provided in updates
            if (updates.price) {
                const currentPrice = parseFloat(product.price);
                const oldPrice = product.originalPrice ? parseFloat(product.originalPrice) : Infinity;

                // If currently discounted (price < originalPrice)
                if (oldPrice > currentPrice) {
                    // Trigger broadcast in background
                    broadcastDiscountForProduct(storage, product.id).catch(err => {
                        console.error("Failed to auto-broadcast discount:", err);
                    });
                }
            }

            res.json(product);
        } catch (err: any) { next(err); }
    });

    router.delete("/products/:id", async (req, res, next) => {
        try {
            const success = await storage.deleteProduct(req.params.id);
            if (!success) {
                res.status(404).json({ message: "Product not found" });
                return;
            }

            // Audit Log
            await storage.createAuditLog({
                userId: getSession(req)?.userId || "admin",
                action: "delete",
                entityType: "product",
                entityId: req.params.id,
                changes: {}
            });

            res.json({ message: "Product deleted" });
        } catch (err) { next(err); }
    });

    // ============ SETTINGS MANAGEMENT ============

    // Get all settings
    router.get("/settings", async (req, res, next) => {
        try {
            const allSettings = await storage.getAllSettings();
            res.json(allSettings);
        } catch (err) { next(err); }
    });

    // Update settings
    router.put("/settings", async (req, res, next) => {
        try {
            const updates = req.body;

            // Validate that body is an object with string values
            if (typeof updates !== 'object' || updates === null) {
                res.status(400).json({ message: "Invalid settings format" });
                return;
            }

            await storage.updateAllSettings(updates);

            // Audit Log
            await storage.createAuditLog({
                userId: getSession(req)?.userId || "admin",
                action: "update",
                entityType: "settings",
                entityId: "store_settings",
                changes: updates
            });

            res.json({ message: "Settings updated successfully" });
        } catch (err) { next(err); }
    });

    return router;
}
