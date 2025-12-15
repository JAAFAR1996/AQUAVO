import { Router, Request, Response, NextFunction } from "express";
import { storage } from "../storage/index.js";

export function createFavoritesRouter() {
    const router = Router();

    const getSessionUserId = (req: Request): string | undefined => {
        return (req as any).session?.userId;
    };

    // Middleware to ensure user is logged in
    const requireAuth = (req: Request, res: Response, next: NextFunction) => {
        const userId = getSessionUserId(req);
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        next();
    };

    router.use(requireAuth);

    router.get("/", async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = getSessionUserId(req)!;
            const items = await storage.getFavorites(userId);
            res.json(items);
        } catch (err) {
            next(err);
        }
    });

    router.post("/:productId", async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = getSessionUserId(req)!;
            const { productId } = req.params;

            // Check if product exists
            const product = await storage.getProduct(productId);
            if (!product) {
                res.status(404).json({ message: "Product not found" });
                return;
            }

            const favorite = await storage.addFavorite(userId, productId);
            res.status(201).json(favorite);
        } catch (err) {
            // Handle unique constraint violation gracefully if needed, 
            // though addFavorite might handle duplicate inserts via "ON CONFLICT DO NOTHING" or similar logic in storage.
            // If not, we could check for generic error.
            if (err instanceof Error && err.message.includes("unique")) {
                // Already favorited, return 200 OK
                res.status(200).json({ message: "Already in favorites" });
                return;
            }
            next(err);
        }
    });

    router.delete("/:productId", async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = getSessionUserId(req)!;
            const { productId } = req.params;
            await storage.removeFavorite(userId, productId);
            res.status(204).end();
        } catch (err) {
            next(err);
        }
    });

    return router;
}
