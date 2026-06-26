/**
 * Security middleware for Express
 */

import { Request, Response, NextFunction } from 'express';
import { checkRateLimit, getClientIP } from '../utils/validation.js';

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
  // Skip for /oauth paths — the OAuth consent page sets its own CSP
  // with a dynamic form-action that allows redirect to the callback URI
  if (req.path.startsWith("/oauth")) {
    return next();
  }
  const isDevelopment = process.env.NODE_ENV !== 'production';

  if (isDevelopment) {
    // Development: Allow Vite's inline scripts, eval, and HMR websockets
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com https://connect.facebook.net https://us-assets.i.posthog.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "img-src 'self' data: https: blob:; " +
      "font-src 'self' data: https://fonts.gstatic.com; " +
      "connect-src 'self' blob: ws://localhost:* wss://localhost:* https://api.unsplash.com https://www.facebook.com https://connect.facebook.net https://graph.facebook.com https://us.i.posthog.com https://us-assets.i.posthog.com https://o4509516012191744.ingest.de.sentry.io; " +
      "worker-src 'self' blob:; " +
      "frame-src https://www.facebook.com; " +
      "frame-ancestors 'none'; " +
      "object-src 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self' https://www.facebook.com https://claude.ai https://chatgpt.com;"
    );
  } else {
    // Production: Strict CSP following OWASP best practices
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'wasm-unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com https://static.cloudflareinsights.com https://connect.facebook.net https://analytics.tiktok.com https://us-assets.i.posthog.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "img-src 'self' data: https: blob:; " +
      "font-src 'self' data: https://fonts.gstatic.com; " +
      "connect-src 'self' blob: https://api.unsplash.com https://cloudflareinsights.com https://www.facebook.com https://connect.facebook.net https://graph.facebook.com https://us.i.posthog.com https://us-assets.i.posthog.com https://o4509516012191744.ingest.de.sentry.io https://analytics.tiktok.com; " +
      "worker-src 'self' blob:; " +
      "frame-src https://www.facebook.com; " +
      "frame-ancestors 'none'; " +
      "object-src 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self' https://www.facebook.com https://claude.ai; " +
      "upgrade-insecure-requests; " +
      "block-all-mixed-content;"
    );
  }

  next();
}

/**
 * CORS configuration
 */
export function corsConfig(req: Request, res: Response, next: NextFunction) {
  const isProduction = process.env.NODE_ENV === 'production';

  // OAuth & MCP endpoints use Bearer tokens (not cookies) — wildcard CORS is safe
  // Required for ChatGPT, Claude.ai, and other AI MCP clients
  if (req.path.startsWith('/oauth') || req.path.startsWith('/api/mcp')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, MCP-Session-Id');
    res.setHeader('Access-Control-Max-Age', '86400');
    if (req.method === 'OPTIONS') {
      return res.status(204).send();
    }
    return next();
  }

  const allowedOrigins = [
    // Only allow localhost in development
    ...(!isProduction ? ['http://localhost:5000', 'http://localhost:3000'] : []),
    'https://fist-live.vercel.app', // Production Vercel domain
    'https://www.aquavoiq.com', // Custom domain
    'https://aquavoiq.com', // Without www
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

  // Log suspicious activity (exclude legitimate /api/admin routes)
  const suspiciousPatterns = [
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
