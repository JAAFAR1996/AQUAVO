/**
 * Security middleware for Express
 */

import { Request, Response, NextFunction } from 'express';
import { checkRateLimit, getClientIP } from '../utils/validation';

/**
 * Rate limiting middleware
 */
export function rateLimiter(
  maxRequests: number = 100,
  windowMs: number = 60000
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIP(req);

    if (checkRateLimit(ip, maxRequests, windowMs)) {
      return res.status(429).json({
        error: 'تم تجاوز الحد المسموح من الطلبات. يرجى المحاولة لاحقاً.',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    next();
  };
}

/**
 * Security headers middleware
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Content Security Policy - Different for development vs production
  const isDevelopment = process.env.NODE_ENV !== 'production';

  if (isDevelopment) {
    // Development: Allow Vite's inline scripts, eval, and HMR websockets
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "img-src 'self' data: https: blob:; " +
      "font-src 'self' data: https://fonts.gstatic.com; " +
      "connect-src 'self' ws://localhost:* wss://localhost:* https://api.unsplash.com; " +
      "frame-ancestors 'none';"
    );
  } else {
    // Production: Strict CSP without unsafe directives
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' https://cdn.jsdelivr.net https://unpkg.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "img-src 'self' data: https: blob:; " +
      "font-src 'self' data: https://fonts.gstatic.com; " +
      "connect-src 'self' https://api.unsplash.com; " +
      "frame-ancestors 'none';"
    );
  }

  next();
}

/**
 * CORS configuration
 */
export function corsConfig(req: Request, res: Response, next: NextFunction) {
  const allowedOrigins = [
    'http://localhost:5000',
    'http://localhost:3000',
    'https://fist-live.vercel.app', // Production Vercel domain
    'https://aquavo.iq', // Custom domain if any
    process.env.CLIENT_URL
  ].filter(Boolean);

  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

  if (req.method === 'OPTIONS') {
    return res.status(204).send();
  }

  next();
}

/**
 * Request size limiter
 */
export function requestSizeLimit(maxSize: number = 1024 * 1024) { // 1MB default
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');

    if (contentLength > maxSize) {
      return res.status(413).json({
        error: 'حجم الطلب كبير جداً'
      });
    }

    next();
  };
}

/**
 * Sanitize request body middleware
 */
export function sanitizeBody(req: Request, res: Response, next: NextFunction) {
  if (req.body && typeof req.body === 'object') {
    // Remove dangerous properties
    const dangerousProps = ['__proto__', 'constructor', 'prototype'];

    const cleanObject = (obj: any): any => {
      if (!obj || typeof obj !== 'object') return obj;

      for (const key of dangerousProps) {
        delete obj[key];
      }

      for (const key in obj) {
        if (typeof obj[key] === 'object') {
          obj[key] = cleanObject(obj[key]);
        }
      }

      return obj;
    };

    req.body = cleanObject(req.body);
  }

  next();
}

/**
 * Log security events
 */
export function securityLogger(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIP(req);
  const timestamp = new Date().toISOString();

  // Log suspicious activity
  const suspiciousPatterns = [
    /admin/i,
    /wp-admin/i,
    /phpmyadmin/i,
    /\.php$/i,
    /\.env$/i,
    /\.git/i
  ];

  if (suspiciousPatterns.some(pattern => pattern.test(req.path))) {
    console.warn(`[SECURITY] Suspicious request from ${ip} at ${timestamp}: ${req.method} ${req.path}`);
  }

  next();
}
