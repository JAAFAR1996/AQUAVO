import { accountingDocumentLimiter, accountingDocumentUpload, accountingDocumentData } from "../middleware/accounting-document-upload.js";
import { createHash } from "node:crypto";
import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import rateLimit from "express-rate-limit";
import { createSharedRateLimitStore } from "../middleware/shared-rate-limit-store.js";
import { detectAnalysisImageType } from "../utils/trusted-image-fetch.js";
import { OperationalError } from "../middleware/error-handler.js";

function invalidImage(): Error {
    return new OperationalError("اختر صورة PNG أو JPEG أو GIF أو WebP صحيحة.", 400);
}

function imageDataUri(file: Express.Multer.File): string {
    const mime = detectAnalysisImageType(file.buffer);
    if (!mime) throw invalidImage();
    return `data:${mime};base64,${file.buffer.toString("base64")}`;
}

const imageUploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    store: createSharedRateLimitStore("image_upload"),
    // Authentication runs first. Account budgets survive worker restarts.
    keyGenerator: req => req.session.userId!,
    message: { message: "وصلت لحد رفع الصور. حاول بوقت لاحق." },
});

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 10, fields: 10, parts: 20 },
    fileFilter: (_req, file, cb) => {
        if (["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.mimetype)) cb(null, true);
        else cb(invalidImage());
    },
});



export function createUploadRouter() {
    const router = Router();

    router.post("/image", requireAuth, imageUploadLimiter, upload.single("image"), async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.file) {
                res.status(400).json({ message: "No file uploaded" });
                return;
            }
            const base64 = imageDataUri(req.file);
            const { uploadImage } = await import("../utils/cloudinary.js");
            const imageUrl = await uploadImage(base64);
            res.json({ success: true, url: imageUrl, originalName: req.file.originalname, size: req.file.size });
        } catch (error) {
            console.error("Image upload error:", error);
            next(error);
        }
    });

    router.post("/images", requireAuth, imageUploadLimiter, upload.array("images", 10), async (req: Request, res: Response, next: NextFunction) => {
        try {
            const files = req.files as Express.Multer.File[];
            if (!files || files.length === 0) {
                res.status(400).json({ message: "No file uploaded" });
                return;
            }
            // Validate every file before sending any of the batch externally.
            const payloads = files.map(imageDataUri);
            const { uploadImage } = await import("../utils/cloudinary.js");
            const uploadedUrls: string[] = [];
            const errors: string[] = [];
            for (const [index, file] of files.entries()) {
                try {
                    const base64 = payloads[index];
                    uploadedUrls.push(await uploadImage(base64));
                } catch {
                    errors.push(file.originalname);
                }
            }
            if (uploadedUrls.length === 0) {
                res.status(500).json({ success: false, message: `All ${files.length} upload(s) failed`, failedFiles: errors, urls: [], totalUploaded: 0 });
                return;
            }
            if (errors.length > 0) {
                res.status(207).json({ success: false, message: `${errors.length} of ${files.length} upload(s) failed`, urls: uploadedUrls, failedFiles: errors, totalUploaded: uploadedUrls.length });
                return;
            }
            res.json({ success: true, urls: uploadedUrls, failedFiles: [], totalUploaded: uploadedUrls.length });
        } catch (error) {
            console.error("Multiple image upload error:", error);
            next(error);
        }
    });

    router.post(
        "/accounting-evidence",
        requireAdmin,
        accountingDocumentLimiter,
        accountingDocumentUpload,
        async (req: Request, res: Response, next: NextFunction) => {
            try {
                if (!req.file) {
                    res.status(400).json({ message: "اختر صورة المستند أو ملف PDF" });
                    return;
                }
                const sha256 = createHash("sha256").update(req.file.buffer).digest("hex");
                const { dataUri, mimeType } = accountingDocumentData(req.file);
                const { uploadAccountingDocument } = await import("../utils/cloudinary.js");
                const uploaded = await uploadAccountingDocument(dataUri, req.file.originalname);
                res.status(201).json({
                    success: true,
                    url: uploaded.secureUrl,
                    objectKey: uploaded.publicId,
                    storageProvider: "cloudinary",
                    resourceType: uploaded.resourceType,
                    format: uploaded.format,
                    sha256,
                    originalName: req.file.originalname,
                    mimeType,
                    size: uploaded.bytes,
                });
            } catch (error) {
                next(error);
            }
        },
    );

    return router;
}
