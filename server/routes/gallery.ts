import { Router, Request, Response, NextFunction } from "express";
import { storage } from "../storage/index.js";
import { requireAdmin } from "../middleware/auth.js";
import { saveBase64Image } from "../middleware/upload.js";
import express from "express";

const getSessionHelper = (req: express.Request) => (req as any).session;

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
    router.post("/", async (req, res, next) => {
        try {
            const { customerName, customerPhone, tankSize, description, imageBase64 } = req.body;
            if (!customerName || !imageBase64) {
                res.status(400).json({ message: "Name and Image are required" });
                return;
            }

            const imageUrl = await saveBase64Image(imageBase64);
            const submission = await storage.createGallerySubmission({
                customerName,
                customerPhone,
                imageUrl,
                tankSize,
                description,
                isApproved: false,
                likes: 0
            });
            res.status(201).json(submission);
        } catch (err) {
            next(err);
        }
    });

    // Vote/Like
    router.post("/:id/like", async (req, res, next) => {
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
    router.get("/prize", async (req, res, next) => {
        try {
            const prize = await storage.getCurrentGalleryPrize();
            res.json(prize);
        } catch (err) {
            next(err);
        }
    });

    // Get Current Prize (Legacy path)
    router.get("/current-prize", async (req, res, next) => {
        try {
            const prize = await storage.getCurrentGalleryPrize();
            res.json(prize);
        } catch (err) {
            next(err);
        }
    });

    return router;
}
