import { createHash } from "node:crypto";
import { Router, type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import { requireAccountingAdmin } from "../middleware/accounting-auth-v2.js";
import { uploadAccountingDocument } from "../utils/cloudinary.js";

const accountingEvidenceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const allowed = file.mimetype.startsWith("image/") || file.mimetype === "application/pdf";
    if (allowed) callback(null, true);
    else callback(new Error("يسمح فقط بصور المستندات أو PDF"));
  },
});

/**
 * Money-critical evidence upload isolated from the legacy upload/auth router.
 * SHA-256 is calculated from the original bytes before Cloudinary upload.
 */
export function createAccountingEvidenceUploadV2Router() {
  const router = Router();
  router.use(requireAccountingAdmin);

  router.post(
    "/accounting-evidence",
    accountingEvidenceUpload.single("document"),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.file) {
          res.status(400).json({ message: "اختر صورة المستند أو ملف PDF" });
          return;
        }

        const sha256 = createHash("sha256").update(req.file.buffer).digest("hex");
        const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
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
