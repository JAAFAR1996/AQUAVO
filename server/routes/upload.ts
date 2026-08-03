import { createHash } from "node:crypto";
import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { requireAdmin, requireAuth } from "../middleware/auth.js";

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only image files are allowed'));
    },
});

const accountingEvidenceUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowed = file.mimetype.startsWith("image/") || file.mimetype === "application/pdf";
        if (allowed) cb(null, true);
        else cb(new Error("يسمح فقط بصور المستندات أو PDF"));
    },
});

export function createUploadRouter() {
    const router = Router();

    router.post("/image", requireAuth as any, upload.single("image"), async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.file) {
                res.status(400).json({ message: "No file uploaded" });
                return;
            }
            const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
            const { uploadImage } = await import("../utils/cloudinary.js");
            const imageUrl = await uploadImage(base64);
            res.json({ success: true, url: imageUrl, originalName: req.file.originalname, size: req.file.size });
        } catch (error) {
            console.error("Image upload error:", error);
            next(error);
        }
    });

    router.post("/images", requireAuth as any, upload.array("images", 10), async (req: Request, res: Response, next: NextFunction) => {
        try {
            const files = req.files as Express.Multer.File[];
            if (!files || files.length === 0) {
                res.status(400).json({ message: "No file uploaded" });
                return;
            }
            const { uploadImage } = await import("../utils/cloudinary.js");
            const uploadedUrls: string[] = [];
            const errors: string[] = [];
            for (const file of files) {
                try {
                    const base64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
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
        requireAdmin as any,
        accountingEvidenceUpload.single("document"),
        async (req: Request, res: Response, next: NextFunction) => {
            try {
                if (!req.file) {
                    res.status(400).json({ message: "اختر صورة المستند أو ملف PDF" });
                    return;
                }
                const sha256 = createHash("sha256").update(req.file.buffer).digest("hex");
                const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
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
                    mimeType: req.file.mimetype,
                    size: uploaded.bytes,
                });
            } catch (error) {
                next(error);
            }
        },
    );

    return router;
}
