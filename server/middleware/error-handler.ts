/**
 * Error handling middleware
 * Prevents leaking sensitive information in error messages
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

interface AppError extends Error {
  statusCode?: number;
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
  // Log error for debugging (in production, use proper logging service)
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (isDevelopment) {
    console.error('[ERROR]', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method
    });
  } else {
    // In production, only log minimal info
    console.error('[ERROR]', {
      message: err.message,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  }

  // Handle Neon cold-start errors (DB waking up)
  if (isNeonColdStart(err)) {
    res.setHeader('Retry-After', '5');
    return res.status(503).json({
      error: 'الخادم يستيقظ، يرجى إعادة المحاولة خلال ثوانٍ.',
      retryAfter: 5,
    });
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'خطأ في البيانات المدخلة',
      details: isDevelopment ? err.errors : undefined
    });
  }

  // Determine status code
  const statusCode = err.statusCode || 500;

  // Prepare error response
  const errorResponse: any = {
    error: getClientErrorMessage(err, statusCode),
    timestamp: new Date().toISOString()
  };

  // Add stack trace only in development
  if (isDevelopment) {
    errorResponse.stack = err.stack;
    errorResponse.details = err.message;
  }

  res.status(statusCode).json(errorResponse);
}

/**
 * Get client-safe error message
 */
function getClientErrorMessage(err: AppError, statusCode: number): string {
  // Return generic messages in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (isDevelopment && err.isOperational) {
    return err.message;
  }

  switch (statusCode) {
    case 400:
      return 'طلب غير صالح';
    case 401:
      return 'غير مصرح';
    case 403:
      return 'ممنوع';
    case 404:
      return 'غير موجود';
    case 429:
      return 'تم تجاوز الحد المسموح من الطلبات';
    case 500:
    default:
      return 'حدث خطأ في الخادم. يرجى المحاولة لاحقاً.';
  }
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
export function asyncHandler(fn: Function) {
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
export function handleDatabaseError(err: any): OperationalError {
  // Don't expose internal database errors
  console.error('[DB ERROR]', err);

  if (err.code === 'P2002') {
    return new OperationalError('البيانات موجودة مسبقاً', 409);
  }

  if (err.code === 'P2025') {
    return new OperationalError('السجل غير موجود', 404);
  }

  return new OperationalError('خطأ في قاعدة البيانات', 500);
}
