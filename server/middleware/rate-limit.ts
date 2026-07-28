/**
 * Rate limiting middleware using express-rate-limit
 * Provides battle-tested rate limiting for sensitive endpoints
 */

import rateLimit from 'express-rate-limit';

/**
 * Authentication rate limiter
 * Strict limits for login/register to prevent brute force attacks
 * 5 requests per 15 minutes per IP
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: {
        error: 'تم تجاوز عدد محاولات تسجيل الدخول. يرجى المحاولة بعد 15 دقيقة.',
        retryAfter: 15 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful logins
});

/**
 * Password reset rate limiter
 * Very strict limits to prevent email enumeration
 * 3 requests per hour per IP
 */
export const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: {
        error: 'تم تجاوز عدد طلبات إعادة تعيين كلمة المرور. يرجى المحاولة بعد ساعة.',
        retryAfter: 60 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * General API rate limiter
 * More lenient for regular API endpoints
 * 100 requests per minute per IP
 */
export const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100,
    message: {
        error: 'تم تجاوز الحد المسموح من الطلبات. يرجى المحاولة لاحقاً.',
        retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Order creation rate limiter
 * Prevent order spam
 * 10 orders per hour per IP
 */
export const orderLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: {
        error: 'تم تجاوز عدد الطلبات المسموحة. يرجى المحاولة لاحقاً.',
        retryAfter: 60 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Review submission rate limiter
 * Prevent review spam
 * 5 reviews per hour per IP
 */
export const reviewLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: {
        error: 'تم تجاوز عدد المراجعات المسموحة. يرجى المحاولة لاحقاً.',
        retryAfter: 60 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
});
