import multer from "multer";
import rateLimit from "express-rate-limit";
import { createSharedRateLimitStore } from "./shared-rate-limit-store.js";
import { OperationalError } from "./error-handler.js";
import { detectAnalysisImageType } from "../utils/trusted-image-fetch.js";

export const MAX_ACCOUNTING_DOCUMENT_BYTES = 15 * 1024 * 1024;
const DOCUMENT_MIMES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"]);
const invalidDocument = () => new OperationalError("اختر مستند PDF أو صورة PNG أو JPEG أو GIF أو WebP صحيحة", 400);

// One budget for both legacy and isolated accounting routes. The admin guard
// must run before this middleware and before parsing any file into memory.
export const accountingDocumentLimiter = rateLimit({
  store: createSharedRateLimitStore("accounting-document-upload"),
  windowMs: 60 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false,
  keyGenerator: req => req.session?.userId || "unauthenticated",
  message: { message: "وصلت لحد رفع المستندات. حاول بعد ساعة." },
});

export const accountingDocumentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_ACCOUNTING_DOCUMENT_BYTES, files: 1, fields: 0, parts: 1 },
  fileFilter: (_req, file, callback) => {
    if (DOCUMENT_MIMES.has(file.mimetype)) callback(null, true);
    else callback(invalidDocument());
  },
}).single("document");

export function accountingDocumentData(file: Express.Multer.File): { mimeType: string; dataUri: string } {
  if (file.buffer.length > MAX_ACCOUNTING_DOCUMENT_BYTES) throw new OperationalError("حجم المستند أكبر من 15 ميغابايت", 413);
  const imageMime = detectAnalysisImageType(file.buffer);
  const pdfHeader = /^%PDF-(?:1\.[0-7]|2\.0)(?:\r|\n|\s)/.test(file.buffer.subarray(0, 12).toString("ascii"));
  const mimeType = imageMime || (pdfHeader ? "application/pdf" : null);
  if (!mimeType || mimeType !== file.mimetype) throw invalidDocument();
  return { mimeType, dataUri: `data:${mimeType};base64,${file.buffer.toString("base64")}` };
}
