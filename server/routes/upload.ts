import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth.js";

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
    },
    fileFilter: (req, file, cb) => {
        // Accept only images
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    },
});

export function createUploadRouter() {
    const router = Router();

    // Upload single image (requires authentication)
    router.post("/image", requireAuth as any, upload.single("image"), async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.file) {
                res.status(400).json({ message: "No file uploaded" });
                return;
            }

            // Convert to base64 for Cloudinary upload
            const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

            // Upload to Cloudinary
            const { uploadImage } = await import("../utils/cloudinary.js");
            const imageUrl = await uploadImage(base64);

            res.json({
                success: true,
                url: imageUrl,
                originalName: req.file.originalname,
                size: req.file.size
            });
        } catch (error) {
            console.error("Image upload error:", error);
            next(error);
        }
    });

    // Upload multiple images (requires authentication)
    router.post("/images", requireAuth as any, upload.array("images", 10), async (req: Request, res: Response, next: NextFunction) => {
        try {
            const files = req.files as Express.Multer.File[];

            if (!files || files.length === 0) {
                res.status(400).json({ message: "No files uploaded" });
                return;
            }

            const { uploadImage } = await import("../utils/cloudinary.js");
            const uploadedUrls: string[] = [];
            const errors: string[] = [];

            for (const file of files) {
                try {
                    const base64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
                    const imageUrl = await uploadImage(base64);
                    uploadedUrls.push(imageUrl);
                } catch (error) {
                    console.error(`Failed to upload ${file.originalname}:`, error);
                    errors.push(file.originalname);
                }
            }

            res.json({
                success: true,
                urls: uploadedUrls,
                failedFiles: errors,
                totalUploaded: uploadedUrls.length
            });
        } catch (error) {
            console.error("Multiple image upload error:", error);
            next(error);
        }
    });

    return router;
}
