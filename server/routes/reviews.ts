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

            // Only show approved reviews to the public
            const approvedReviews = reviews.filter(r => r.status === "approved");

            // Transform reviews to include author info + tier
            const reviewsWithAuthor = await Promise.all(approvedReviews.map(async (review) => {
                let authorName = "زائر";
                let authorTier = "guest";
                if (review.userId) {
                    const user = await storage.getUser(review.userId);
                    authorName = user?.fullName || user?.email?.split('@')[0] || "عميل";
                    authorTier = (user as any)?.loyaltyTier || "bronze";
                } else if ((review as any).guestName) {
                    // Guest reviewer — use the name they provided
                    authorName = (review as any).guestName;
                }
                return {
                    ...review,
                    author: authorName,
                    authorTier,
                };
            }));

            res.json(reviewsWithAuthor);
        } catch (err) {
            next(err);
        }
    });

    // Create a review — open to guests AND logged-in users
    router.post("/reviews", reviewLimiter, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const sess = getSession(req);
            const userId = sess?.userId || null;          // null for guests

            const { productId, rating, title, comment, images, guestName } = req.body;

            if (!productId) {
                res.status(400).json({ message: "معرف المنتج مطلوب" });
                return;
            }

            if (!rating || rating < 1 || rating > 5) {
                res.status(400).json({ message: "التقييم يجب أن يكون بين 1 و 5" });
                return;
            }

            // Guests must provide a name (1–60 chars, trimmed)
            if (!userId) {
                const name = (guestName || "").trim();
                if (!name || name.length < 2 || name.length > 60) {
                    res.status(400).json({ message: "يرجى كتابة اسمك (بين 2 و 60 حرفاً)" });
                    return;
                }
            }

            const ipAddress = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '');

            const existingReviews = await storage.getReviews(productId);

            // Prevent duplicate: logged-in by userId, guests by IP
            if (userId) {
                const alreadyReviewed = existingReviews.some(r => r.userId === userId);
                if (alreadyReviewed) {
                    res.status(400).json({ message: "لقد قمت بمراجعة هذا المنتج مسبقاً" });
                    return;
                }
            } else {
                const guestAlreadyReviewed = existingReviews.some(
                    r => !r.userId && r.ipAddress === ipAddress
                );
                if (guestAlreadyReviewed) {
                    res.status(400).json({ message: "لقد أضفت تقييماً لهذا المنتج من هذا الجهاز مسبقاً" });
                    return;
                }
            }

            // Verified purchase — only possible for logged-in users
            let verifiedPurchase = false;
            if (userId) {
                const userOrders = await storage.getOrders(userId);
                verifiedPurchase = userOrders.some(order =>
                    order.items.some((item: any) => item.id === productId)
                );
            }

            const review = await storage.createReview({
                productId,
                userId,                              // null for guests
                rating,
                title,
                comment,
                images: images || [],
                ipAddress,
                verifiedPurchase,
                status: "pending",                  // must be approved by admin first
                // Store guest name in the review's author-like field if available
                ...((!userId && guestName) ? { guestName: (guestName as string).trim() } : {}),
            });

            res.status(201).json({
                ...review,
                pending: true, // hint to frontend: review is awaiting moderation
            });
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
