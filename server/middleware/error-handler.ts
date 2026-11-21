/**
 * Error handling middleware
 * Prevents leaking sensitive information in error messages
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { randomUUID } from 'node:crypto';

interface AppError extends Error {
  statusCode?: number;
  status?: number;
  code?: string;
  isOperational?: boolean;
}

// Neon cold-start fingerprints
const NEON_COLD_START_PHRASES = ['high traffic', 'try again in a minute', 'starting up'];
function isNeonColdStart(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : '';
  return NEON_COLD_START_PHRASES.some(p => msg.includes(p));
}

/**
 * Global error handler
 */
export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (res.headersSent) { next(err); return; }
  const requestId = randomUUID();
  const isDevelopment = process.env.NODE_ENV === 'development';
  console.error('[API ERROR]', {
    requestId, name: err?.name, code: err?.code,
    method: req.method, path: req.path,
    ...(isDevelopment ? { message: err?.message, stack: err?.stack } : {}),
  });
  res.setHeader('X-Request-Id', requestId);
  if (isNeonColdStart(err)) {
    res.setHeader('Retry-After', '5');
    return res.status(503).json({ message: 'الخادم يستيقظ، يرجى إعادة المحاولة خلال ثوانٍ.', retryAfter: 5, requestId });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({ message: 'خطأ في البيانات المدخلة', requestId,
      errors: err.issues.map(issue => ({ path: issue.path, code: issue.code, message: issue.message })) });
  }
  if (err?.name === 'MulterError' && typeof err.code === 'string' && err.code.startsWith('LIMIT_')) {
    const tooLarge = ['LIMIT_FILE_SIZE', 'LIMIT_FIELD_VALUE'].includes(err.code);
    return res.status(tooLarge ? 413 : 400).json({
      message: tooLarge ? 'حجم الملف أو الحقل أكبر من المسموح' : 'عدد الملفات أو حقول الرفع غير صالح', requestId,
    });
  }
  const suppliedStatus = err?.statusCode ?? err?.status;
  const status = typeof suppliedStatus === 'number' && Number.isInteger(suppliedStatus)
    && suppliedStatus >= 400 && suppliedStatus <= 599 ? suppliedStatus : 500;
  const messages: Record<number, string> = {
    400: 'طلب غير صالح', 401: 'يجب تسجيل الدخول', 403: 'غير مصرح', 404: 'غير موجود',
    408: 'انتهى وقت الطلب، حاول مرة ثانية', 409: 'تغيرت البيانات، راجعها وحاول مرة ثانية',
    413: 'حجم الطلب أكبر من المسموح', 429: 'تم تجاوز الحد المسموح من الطلبات',
  };
  const message = err instanceof OperationalError && status < 500
    ? err.message : messages[status] ?? 'صار خطأ بالخادم. حاول مرة ثانية.';
  return res.status(status).json({ message, requestId });
}

/**
 * 404 handler
 */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: 'المسار غير موجود',
    path: req.path
  });
}

/**
 * Async error wrapper
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => unknown) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Create operational error
 */
export class OperationalError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Database error handler
 */
export function handleDatabaseError(err: unknown): OperationalError {
  const code = err && typeof err === "object" && "code" in err ? err.code : undefined;
  // Don't expose internal database errors
  console.error('[DB ERROR]', { code });

  if (code === 'P2002') {
    return new OperationalError('البيانات موجودة مسبقاً', 409);
  }

  if (code === 'P2025') {
    return new OperationalError('السجل غير موجود', 404);
  }

  return new OperationalError('خطأ في قاعدة البيانات', 500);
}
