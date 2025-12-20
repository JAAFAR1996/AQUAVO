// Sentry Error Tracking Integration
// To use: Add VITE_SENTRY_DSN to your .env file

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const ENV = import.meta.env.MODE;

// Simple Sentry-like error tracking
// Note: For full Sentry features, install @sentry/react package

interface ErrorContext {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  user?: {
    id?: string;
    email?: string;
    username?: string;
  };
}

interface Breadcrumb {
  message: string;
  category?: string;
  level?: 'info' | 'warning' | 'error';
  data?: Record<string, unknown>;
  timestamp?: string;
}

interface ErrorReport {
  message: string;
  stack?: string;
  context?: ErrorContext;
  breadcrumbs?: Breadcrumb[];
  user?: ErrorContext['user'] | null;
  environment?: string;
  timestamp?: string;
  url?: string;
  userAgent?: string;
  level?: 'info' | 'warning' | 'error';
}

class ErrorTracker {
  private isInitialized = false;
  private breadcrumbs: Breadcrumb[] = [];
  private user: ErrorContext['user'] | null = null;

  init() {
    if (this.isInitialized || !SENTRY_DSN) return;

    this.isInitialized = true;

    // Setup global error handlers
    window.addEventListener('error', this.handleError.bind(this));
    window.addEventListener('unhandledrejection', this.handleRejection.bind(this));

    if (import.meta.env.DEV) {
      console.log('🔍 Error tracking initialized');
    }
  }

  private handleError(event: ErrorEvent) {
    this.captureException(event.error, {
      tags: { type: 'error_event' },
      extra: {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  }

  private handleRejection(event: PromiseRejectionEvent) {
    this.captureException(event.reason, {
      tags: { type: 'unhandled_rejection' },
      extra: {
        promise: event.promise,
      },
    });
  }

  captureException(error: Error | string, context?: ErrorContext) {
    if (!this.isInitialized) return;

    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorStack = typeof error === 'string' ? undefined : error.stack;

    // Log to console in development
    if (ENV === 'development') {
      console.error('🚨 Error captured:', {
        message: errorMessage,
        stack: errorStack,
        context,
        breadcrumbs: this.breadcrumbs,
        user: this.user,
      });
    }

    // Send to backend or external service
    this.sendErrorReport({
      message: errorMessage,
      stack: errorStack,
      context,
      breadcrumbs: this.breadcrumbs.slice(-10), // Last 10 breadcrumbs
      user: this.user,
      environment: ENV,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    });
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
    if (!this.isInitialized) return;

    if (import.meta.env.DEV) {
      console.log(`📝 [${level}] ${message}`);
    }

    this.sendErrorReport({
      message,
      level,
      environment: ENV,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    });
  }

  addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'>) {
    this.breadcrumbs.push({
      ...breadcrumb,
      timestamp: new Date().toISOString(),
    });

    // Keep only last 50 breadcrumbs
    if (this.breadcrumbs.length > 50) {
      this.breadcrumbs.shift();
    }
  }

  setUser(user: ErrorContext['user']) {
    this.user = user;
  }

  clearUser() {
    this.user = null;
  }

  private async sendErrorReport(report: ErrorReport) {
    // Filter out non-critical errors
    if (this.shouldIgnoreError(report.message)) {
      return;
    }

    try {
      // Send to your backend
      await fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      }).catch(() => {
        // Fail silently - don't want error reporting to break the app
      });

      // Or send directly to Sentry if you have DSN
      if (SENTRY_DSN) {
        // Implement Sentry DSN sending here
        // This is a simplified version - use @sentry/react for full features
      }
    } catch (err) {
      // Fail silently
    }
  }

  private shouldIgnoreError(message: string): boolean {
    const ignoredPatterns = [
      'ResizeObserver loop',
      'Non-Error promise rejection',
      'cancelled',
      'Network request failed',
    ];

    return ignoredPatterns.some((pattern) =>
      message.toLowerCase().includes(pattern.toLowerCase())
    );
  }
}

// Export singleton instance
export const errorTracker = new ErrorTracker();

// Convenience functions
export function captureException(error: Error | string, context?: ErrorContext) {
  errorTracker.captureException(error, context);
}

export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info'
) {
  errorTracker.captureMessage(message, level);
}

export function addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'>) {
  errorTracker.addBreadcrumb(breadcrumb);
}

export function setUser(user: ErrorContext['user']) {
  errorTracker.setUser(user);
}

export function clearUser() {
  errorTracker.clearUser();
}

// Initialize on import
errorTracker.init();
