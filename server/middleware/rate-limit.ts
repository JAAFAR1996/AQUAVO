/**
 * Rate limiting middleware using express-rate-limit
 * Provides battle-tested rate limiting for sensitive endpoints
 */

import rateLimit from 'express-rate-limit';
import * as Sentry from '@sentry/node';
import { createSharedRateLimitStore } from './shared-rate-limit-store.js';

/**
 * Authentication rate limiter
 * Strict limits for login/register to prevent brute force attacks
 * 5 requests per 15 minutes per IP
 */
export const authLimiter = rateLimit({
    store: createSharedRateLimitStore('auth'),
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
    store: createSharedRateLimitStore('password-reset'),
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
    store: createSharedRateLimitStore('api'),
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
    store: createSharedRateLimitStore('orders'),
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: {
        error: 'تم تجاوز عدد الطلبات المسموحة. يرجى المحاولة لاحقاً.',
        retryAfter: 60 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/** Public order tracking brute-force protection with a PII-free alert. */
export const orderTrackingLimiter = rateLimit({
    store: createSharedRateLimitStore('order-tracking'),
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    handler: (_req, res) => {
        Sentry.captureMessage('Order tracking rate limit exceeded', {
            level: 'warning',
            tags: { security_event: 'order_tracking_enumeration' },
        });
        res.status(429).json({
            message: 'تعذر التحقق من الطلب. تأكد من المعلومات وحاول لاحقاً.',
        });
    },
});

/**
 * Review submission rate limiter
 * Prevent review spam
 * 5 reviews per hour per IP
 */
export const reviewLimiter = rateLimit({
    store: createSharedRateLimitStore('reviews'),
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: {
        error: 'تم تجاوز عدد المراجعات المسموحة. يرجى المحاولة لاحقاً.',
        retryAfter: 60 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
});
