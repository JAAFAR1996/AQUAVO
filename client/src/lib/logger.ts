/**
 * Logger Utility for FIST-LIVE
 * 
 * Provides consistent logging across the application with automatic
 * environment-based filtering. Logs only appear in development mode.
 * 
 * @example
 * ```typescript
 * import { logger } from '@/lib/logger';
 * 
 * logger.info('User logged in', { userId: '123' });
 * logger.success('Payment completed');
 * logger.warn('Rate limit approaching');
 * logger.error('API call failed', error);
 * ```
 */

type LogLevel = 'info' | 'success' | 'warn' | 'error' | 'debug';

interface LogOptions {
    /** Additional context data to log */
    context?: Record<string, unknown>;
    /** Force log even in production (use sparingly) */
    force?: boolean;
}

/**
 * Check if we're in development mode
 */
const isDev = (): boolean => {
    try {
        return import.meta.env.DEV === true;
    } catch {
        return process.env.NODE_ENV === 'development';
    }
};

/**
 * Get emoji prefix for log level
 */
const getEmoji = (level: LogLevel): string => {
    const emojis: Record<LogLevel, string> = {
        info: 'ℹ️',
        success: '✅',
        warn: '⚠️',
        error: '❌',
        debug: '🔍',
    };
    return emojis[level];
};

/**
 * Get console method for log level
 */
const getConsoleMethod = (level: LogLevel): 'log' | 'warn' | 'error' => {
    switch (level) {
        case 'error':
            return 'error';
        case 'warn':
            return 'warn';
        default:
            return 'log';
    }
};

/**
 * Core logging function
 */
const log = (level: LogLevel, message: string, data?: unknown, options?: LogOptions): void => {
    // Skip logging in production unless forced
    if (!isDev() && !options?.force) {
        return;
    }

    const emoji = getEmoji(level);
    const method = getConsoleMethod(level);
    const timestamp = new Date().toLocaleTimeString('ar-IQ');

    if (data !== undefined) {
        console[method](`${emoji} [${timestamp}] ${message}`, data);
    } else {
        console[method](`${emoji} [${timestamp}] ${message}`);
    }

    // Log additional context if provided
    if (options?.context && Object.keys(options.context).length > 0) {
        console[method]('   Context:', options.context);
    }
};

/**
 * Logger utility with different log levels
 */
export const logger = {
    /**
     * Log informational message
     */
    info: (message: string, data?: unknown, options?: LogOptions): void => {
        log('info', message, data, options);
    },

    /**
     * Log success message
     */
    success: (message: string, data?: unknown, options?: LogOptions): void => {
        log('success', message, data, options);
    },

    /**
     * Log warning message
     */
    warn: (message: string, data?: unknown, options?: LogOptions): void => {
        log('warn', message, data, options);
    },

    /**
     * Log error message
     */
    error: (message: string, data?: unknown, options?: LogOptions): void => {
        log('error', message, data, options);
    },

    /**
     * Log debug message (for detailed debugging)
     */
    debug: (message: string, data?: unknown, options?: LogOptions): void => {
        log('debug', message, data, options);
    },

    /**
     * Create a grouped log section
     */
    group: (label: string, fn: () => void): void => {
        if (!isDev()) return;
        console.group(label);
        fn();
        console.groupEnd();
    },

    /**
     * Log a table (useful for arrays/objects)
     */
    table: (data: unknown[], columns?: string[]): void => {
        if (!isDev()) return;
        console.table(data, columns);
    },
};

export default logger;
