import type { Router as RouterType, Request, Response, NextFunction } from "express";
import { Router } from "express";
import { storage } from "../storage/index.js";
import { localRequireAuth, getSession } from "../utils/auth-helpers.js";
import { reviewLimiter } from "../middleware/rate-limit.js";

export function createReviewsRouter(): RouterType {
    const router = Router();

    // Get reviews for a product (Public)
    router.get("/reviews/:productId", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { productId } = req.params as { productId: string };
            const reviews = await storage.getReviews(productId);

            // Transform reviews to include author info
            const reviewsWithAuthor = await Promise.all(reviews.map(async (review) => {
                let authorName = "زائر";
                if (review.userId) {
                    const user = await storage.getUser(review.userId);
                    authorName = user?.fullName || user?.email?.split('@')[0] || "عميل";
                }
                return {
                    ...review,
                    author: authorName,
                };
            }));

            res.json(reviewsWithAuthor);
        } catch (err) {
            next(err);
        }
    });

    // Create a review
    router.post("/reviews", reviewLimiter, localRequireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const sess = getSession(req);
            const userId = sess?.userId;

            if (!userId) {
                res.status(401).json({ message: "يجب تسجيل الدخول لإضافة مراجعة" });
                return;
            }

            const { productId, rating, title, comment, images } = req.body;

            if (!productId) {
                res.status(400).json({ message: "معرف المنتج مطلوب" });
                return;
            }

            if (!rating || rating < 1 || rating > 5) {
                res.status(400).json({ message: "التقييم يجب أن يكون بين 1 و 5" });
                return;
            }

            const ipAddress = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '');

            const existingReviews = await storage.getReviews(productId);
            const alreadyReviewed = existingReviews.some(r => r.userId === userId);
            if (alreadyReviewed) {
                res.status(400).json({ message: "لقد قمت بمراجعة هذا المنتج مسبقاً" });
                return;
            }

            // Check verified purchase
            const userOrders = await storage.getOrders(userId);
            const verifiedPurchase = userOrders.some(order =>
                order.items.some((item: any) => item.id === productId)
            );

            const review = await storage.createReview({
                productId,
                userId,
                rating,
                title,
                comment,
                images: images || [],
                ipAddress,
                verifiedPurchase,
            });

            res.status(201).json(review);
        } catch (err) {
            next(err);
        }
    });

    // Update a review
    router.put("/reviews/:reviewId", localRequireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const sess = getSession(req);
            const userId = sess?.userId;
            const { reviewId } = req.params as { reviewId: string };

            const review = await storage.getReview(reviewId);

            if (!review) {
                res.status(404).json({ message: "المراجعة غير موجودة" });
                return;
            }

            if (review.userId !== userId) {
                res.status(403).json({ message: "لا يمكنك تعديل مراجعة غيرك" });
                return;
            }

            const { rating, title, comment, images } = req.body;

            const updatedReview = await storage.updateReview(reviewId, {
                rating,
                title,
                comment,
                images,
            });

            if (review.productId) {
                await storage.updateProductRating(review.productId);
            }

            res.json(updatedReview);
        } catch (err) {
            next(err);
        }
    });

    // Delete a review
    router.delete("/reviews/:reviewId", localRequireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const sess = getSession(req);
            const userId = sess?.userId;
            const { reviewId } = req.params as { reviewId: string };

            const review = await storage.getReview(reviewId);

            if (!review) {
                res.status(404).json({ message: "المراجعة غير موجودة" });
                return;
            }

            const user = userId ? await storage.getUser(userId) : null;
            const isOwner = review.userId === userId;
            const isAdmin = user?.role === "admin";

            if (!isOwner && !isAdmin) {
                res.status(403).json({ message: "لا يمكنك حذف هذه المراجعة" });
                return;
            }

            await storage.deleteReview(reviewId);
            res.json({ message: "تم حذف المراجعة بنجاح" });
        } catch (err) {
            next(err);
        }
    });

    // Mark helpful
    router.post("/reviews/:reviewId/helpful", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const sess = getSession(req);
            const userId = sess?.userId || null;
            const { reviewId } = req.params as { reviewId: string };

            const ipAddress = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '');

            const review = await storage.getReview(reviewId);
            if (!review) {
                res.status(404).json({ message: "المراجعة غير موجودة" });
                return;
            }

            const success = await storage.markReviewHelpful(reviewId, userId, ipAddress);

            if (success) {
                res.json({ message: "شكراً على تقييمك" });
            } else {
                res.status(400).json({ message: "لقد قيّمت هذه المراجعة مسبقاً" });
            }
        } catch (err) {
            next(err);
        }
    });

    return router;
}
