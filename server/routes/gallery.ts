import { Router, Request, Response, NextFunction } from "express";
import { storage } from "../storage/index.js";
import { requireAdmin } from "../middleware/auth.js";
import { saveBase64Image } from "../middleware/upload.js";

const getSessionHelper = (req: Request) => (req as any).session;

export function createGalleryRouter() {
    const router = Router();

    const getSubmissions = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const submissions = await storage.getGallerySubmissions(true);
            res.json(submissions);
        } catch (err) {
            next(err);
        }
    };

    // Get Approved Submissions
    router.get("/", getSubmissions);
    router.get("/submissions", getSubmissions);

    // Submit New
    router.post("/", async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { customerName, customerPhone, tankSize, description, imageBase64 } = req.body;
            if (!customerName || !imageBase64) {
                res.status(400).json({ message: "Name and Image are required" });
                return;
            }

            // Get userId from session if user is logged in
            const sess = getSessionHelper(req);
            const userId = sess?.userId || null;

            const imageUrl = await saveBase64Image(imageBase64);
            const submission = await storage.createGallerySubmission({
                customerName,
                customerPhone,
                imageUrl,
                tankSize,
                description,
                isApproved: false,
                likes: 0,
                userId: userId // Save the user ID so we can show celebration later
            });
            res.status(201).json(submission);
        } catch (err) {
            next(err);
        }
    });

    // Vote/Like
    router.post("/:id/like", async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const ip = req.ip || req.socket.remoteAddress || 'unknown';
            const sess = getSessionHelper(req);

            const success = await storage.voteGallerySubmission(id, ip, sess?.userId);

            if (success) {
                res.json({ success: true });
            } else {
                res.status(400).json({ success: false, message: "Already voted" });
            }
        } catch (err) {
            next(err);
        }
    });

    // Get Current Prize
    router.get("/prize", async (req: Request, res: Response, next: NextFunction) => {
        try {
            const prize = await storage.getCurrentGalleryPrize();
            res.json(prize);
        } catch (err) {
            next(err);
        }
    });

    // Get Current Prize (Legacy path)
    router.get("/current-prize", async (req: Request, res: Response, next: NextFunction) => {
        try {
            const prize = await storage.getCurrentGalleryPrize();
            res.json(prize);
        } catch (err) {
            next(err);
        }
    });

    // Check for winning submission for celebration
    router.get("/my-winning-submission", async (req: Request, res: Response, next: NextFunction) => {
        try {
            const sess = getSessionHelper(req);
            if (!sess?.userId) {
                return res.json(null); // No user, no celebration
            }

            const submissions = await storage.getGallerySubmissions(false);
            const winning = submissions.find(s =>
                s.userId === sess.userId &&
                s.isWinner &&
                !s.hasSeenCelebration
            );

            res.json(winning || null);
        } catch (err) { next(err); }
    });

    // Acknowledge celebration
    router.post("/ack-celebration/:id", async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const sess = getSessionHelper(req);

            const submissions = await storage.getGallerySubmissions(false);
            const sub = submissions.find(s => s.id === id);

            if (!sub) return res.status(404).json({ message: "Not found" });

            // Security check
            if (sub.userId && sub.userId !== sess?.userId) {
                return res.status(403).json({ message: "Forbidden" });
            }

            await storage.markCelebrationSeen(id);
            res.json({ success: true });
        } catch (err) { next(err); }
    });

    return router;
}
