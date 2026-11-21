import { accountingDocumentLimiter, accountingDocumentUpload, accountingDocumentData } from "../middleware/accounting-document-upload.js";
import { createHash } from "node:crypto";
import { Router, type NextFunction, type Request, type Response } from "express";
import { requireAccountingAdmin } from "../middleware/accounting-auth-v2.js";
import { uploadAccountingDocument } from "../utils/cloudinary.js";



/**
 * Money-critical evidence upload isolated from the legacy upload/auth router.
 * SHA-256 is calculated from the original bytes before Cloudinary upload.
 */
export function createAccountingEvidenceUploadV2Router() {
  const router = Router();

  router.post(
    "/accounting-evidence",
    requireAccountingAdmin,
    accountingDocumentLimiter,
    accountingDocumentUpload,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.file) {
          res.status(400).json({ message: "اختر صورة المستند أو ملف PDF" });
          return;
        }

        const sha256 = createHash("sha256").update(req.file.buffer).digest("hex");
        const { dataUri, mimeType } = accountingDocumentData(req.file);
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
