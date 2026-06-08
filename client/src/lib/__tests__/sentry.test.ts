/**
 * Sentry Error Tracking Tests
 * Tests for error tracking functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const sentryMocks = vi.hoisted(() => {
    const scope = {
        setExtras: vi.fn(),
    };

    return {
        scope,
        init: vi.fn(),
        setUser: vi.fn(),
        setTag: vi.fn(),
        withScope: vi.fn((callback: (scopeArg: typeof scope) => void) => callback(scope)),
        captureException: vi.fn(),
        captureMessage: vi.fn(),
        addBreadcrumb: vi.fn(),
        browserTracingIntegration: vi.fn(() => ({ name: 'browserTracingIntegration' })),
    };
});

vi.mock('@sentry/react', () => ({
    init: sentryMocks.init,
    setUser: sentryMocks.setUser,
    setTag: sentryMocks.setTag,
    withScope: sentryMocks.withScope,
    captureException: sentryMocks.captureException,
    captureMessage: sentryMocks.captureMessage,
    addBreadcrumb: sentryMocks.addBreadcrumb,
    browserTracingIntegration: sentryMocks.browserTracingIntegration,
}));

describe('ErrorTracker', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('captureException', () => {
        it('should capture Error objects', async () => {
            const { captureException } = await import('../sentry');
            const error = new Error('Test error');
            captureException(error);

            expect(sentryMocks.captureException).toHaveBeenCalledWith(error);
        });

        it('should capture string errors', async () => {
            const { captureException } = await import('../sentry');
            captureException('String error message');

            expect(sentryMocks.captureException).toHaveBeenCalledWith('String error message');
        });

        it('should include context in capture', async () => {
            const { captureException } = await import('../sentry');
            const error = new Error('Error with context');
            const context = {
                tags: { component: 'test-component' },
                extra: { userId: '123' },
            };

            captureException(error, context);

            expect(sentryMocks.withScope).toHaveBeenCalledTimes(1);
            expect(sentryMocks.scope.setExtras).toHaveBeenCalledWith(context);
            expect(sentryMocks.captureException).toHaveBeenCalledWith(error);
        });
    });

    describe('captureMessage', () => {
        it('should capture info messages', async () => {
            const { captureMessage } = await import('../sentry');
            captureMessage('Info message', 'info');

            expect(sentryMocks.captureMessage).toHaveBeenCalledWith('Info message', 'info');
        });

        it('should capture warning messages', async () => {
            const { captureMessage } = await import('../sentry');
            captureMessage('Warning message', 'warning');

            expect(sentryMocks.captureMessage).toHaveBeenCalledWith('Warning message', 'warning');
        });

        it('should capture error messages', async () => {
            const { captureMessage } = await import('../sentry');
            captureMessage('Error message', 'error');

            expect(sentryMocks.captureMessage).toHaveBeenCalledWith('Error message', 'error');
        });

        it('should default to info level', async () => {
            const { captureMessage } = await import('../sentry');
            captureMessage('Default level message');

            expect(sentryMocks.captureMessage).toHaveBeenCalledWith('Default level message', 'info');
        });
    });

    describe('Breadcrumbs', () => {
        it('should add breadcrumbs without error', async () => {
            const { addBreadcrumb } = await import('../sentry');
            const breadcrumb = {
                message: 'User clicked button',
                category: 'ui',
                level: 'info',
            } as const;

            addBreadcrumb(breadcrumb);

            expect(sentryMocks.addBreadcrumb).toHaveBeenCalledWith(breadcrumb);
        });

        it('should handle multiple breadcrumbs', async () => {
            const { addBreadcrumb } = await import('../sentry');

            for (let i = 0; i < 10; i++) {
                addBreadcrumb({
                    message: `Breadcrumb ${i}`,
                    category: 'test',
                });
            }

            expect(sentryMocks.addBreadcrumb).toHaveBeenCalledTimes(10);
            expect(sentryMocks.addBreadcrumb).toHaveBeenLastCalledWith({
                message: 'Breadcrumb 9',
                category: 'test',
            });
        });
    });

    describe('User Context', () => {
        it('should set user context', async () => {
            const { setUser } = await import('../sentry');
            setUser({
                id: 'user-123',
                email: 'test@example.com',
                username: 'testuser',
            });

            expect(sentryMocks.setUser).toHaveBeenCalledWith({
                id: 'user-123',
                email: 'test@example.com',
                username: 'testuser',
            });
        });

        it('should clear user context', async () => {
            const { setUser, clearUser } = await import('../sentry');
            setUser({ id: 'user-123' });
            clearUser();

            expect(sentryMocks.setUser).toHaveBeenNthCalledWith(1, { id: 'user-123' });
            expect(sentryMocks.setUser).toHaveBeenNthCalledWith(2, null);
        });
    });

    describe('Error Filtering', () => {
        it('should handle ResizeObserver errors', async () => {
            const { captureException } = await import('../sentry');
            const error = new Error('ResizeObserver loop limit exceeded');
            captureException(error);

            expect(sentryMocks.captureException).toHaveBeenCalledWith(error);
        });

        it('should handle cancelled requests', async () => {
            const { captureException } = await import('../sentry');
            const error = new Error('Request cancelled');
            captureException(error);

            expect(sentryMocks.captureException).toHaveBeenCalledWith(error);
        });
    });
});
