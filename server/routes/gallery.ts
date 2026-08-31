import type { Router as RouterType, Request, Response, NextFunction } from "express";
import { Router } from "express";
import { storage } from "../storage/index.js";
import { requireAdmin } from "../middleware/auth.js";
import rateLimit from "express-rate-limit";
import multer from "multer";
import { randomUUID } from "crypto";
import { v2 as cloudinary } from "cloudinary";

// Multer — memory storage, image/* only, 5 MB max
const galleryUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter(_req, file, cb) {
        if (!file.mimetype.startsWith("image/")) {
            return cb(new Error("Only image files are allowed"));
        }
        // Block SVG to prevent XSS via uploaded SVG
        if (file.mimetype === "image/svg+xml") {
            return cb(new Error("SVG files are not allowed"));
        }
        cb(null, true);
    },
});

/** Upload a buffer directly to Cloudinary via upload_stream */
function uploadBufferToCloudinary(buffer: Buffer, mimetype: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: "aquavo/gallery",
                public_id: randomUUID(),
                resource_type: "image",
                // Restrict allowed formats for extra safety
                allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
            },
            (error, result) => {
                if (error) return reject(error);
                if (!result) return reject(new Error("No result from Cloudinary"));
                resolve(result.secure_url);
            }
        );
        stream.end(buffer);
    });
}

const gallerySubmitLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: { error: "تم تجاوز عدد الصور المسموحة. يرجى المحاولة بعد ساعة." },
    standardHeaders: true,
    legacyHeaders: false,
});

const getSessionHelper = (req: Request) => (req as any).session;

export function createGalleryRouter(): RouterType {
    const router = Router();

    const getSubmissions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

    // Submit New — multipart/form-data
    router.post(
        "/",
        gallerySubmitLimiter,
        galleryUpload.single("image"),
        async (req: Request, res: Response, next: NextFunction): Promise<void> => {
            try {
                if (!req.file) {
                    res.status(400).json({ message: "Image file is required" });
                    return;
                }

                const customerName = (req.body.customerName as string | undefined)?.trim();
                if (!customerName) {
                    res.status(400).json({ message: "Name and Image are required" });
                    return;
                }

                const customerPhone = (req.body.customerPhone as string | undefined)?.trim() ?? "";
                const tankSize = (req.body.tankSize as string | undefined)?.trim() ?? "";
                const description = (req.body.description as string | undefined)?.trim() ?? "";

                // Get userId from session if user is logged in
                const sess = getSessionHelper(req);
                const userId = sess?.userId ?? null;

                const imageUrl = await uploadBufferToCloudinary(req.file.buffer, req.file.mimetype);

                const submission = await storage.createGallerySubmission({
                    customerName,
                    customerPhone,
                    imageUrl,
                    tankSize,
                    description,
                    isApproved: false,
                    likes: 0,
                    userId, // Save the user ID so we can show celebration later
                });
                res.status(201).json(submission);
            } catch (err) {
                next(err);
            }
        }
    );

    // Vote/Like
    router.post("/:id/like", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params as { id: string };
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
    router.get("/prize", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const prize = await storage.getCurrentGalleryPrize();
            res.json(prize);
        } catch (err) {
            next(err);
        }
    });

    // Get Current Prize (Legacy path)
    router.get("/current-prize", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const prize = await storage.getCurrentGalleryPrize();
            res.json(prize);
        } catch (err) {
            next(err);
        }
    });

    // Check for winning submission for celebration
    router.get("/my-winning-submission", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const sess = getSessionHelper(req);
            if (!sess?.userId) {
                res.json(null); // No user, no celebration
                return;
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
    router.post("/ack-celebration/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params as { id: string };
            const sess = getSessionHelper(req);

            const submissions = await storage.getGallerySubmissions(false);
            const sub = submissions.find(s => s.id === id);

            if (!sub) {
                res.status(404).json({ message: "Not found" });
                return;
            }

            // Security check
            if (sub.userId && sub.userId !== sess?.userId) {
                res.status(403).json({ message: "Forbidden" });
                return;
            }

            await storage.markCelebrationSeen(id);
            res.json({ success: true });
        } catch (err) { next(err); }
    });

    return router;
}
