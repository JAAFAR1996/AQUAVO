/**
 * ErrorBoundary Component Tests
 * Tests for the error boundary component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from '../error-boundary';
import React from 'react';

// Component that throws an error
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
    if (shouldThrow) {
        throw new Error('Test error');
    }
    return <div>No error</div>;
}

describe('ErrorBoundary', () => {
    beforeEach(() => {
        // Suppress console.error for expected errors
        vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Normal Rendering', () => {
        it('should render children when no error', () => {
            render(
                <ErrorBoundary>
                    <div>Child content</div>
                </ErrorBoundary>
            );

            expect(screen.getByText('Child content')).toBeInTheDocument();
        });

        it('should render multiple children', () => {
            render(
                <ErrorBoundary>
                    <div>First child</div>
                    <div>Second child</div>
                </ErrorBoundary>
            );

            expect(screen.getByText('First child')).toBeInTheDocument();
            expect(screen.getByText('Second child')).toBeInTheDocument();
        });
    });

    describe('Error Handling', () => {
        it('should catch errors and show fallback UI', () => {
            render(
                <ErrorBoundary>
                    <ThrowError shouldThrow={true} />
                </ErrorBoundary>
            );

            // Should show error UI in Arabic
            expect(screen.getByText('حدث خطأ غير متوقع')).toBeInTheDocument();
        });

        it('should show retry button', () => {
            render(
                <ErrorBoundary>
                    <ThrowError shouldThrow={true} />
                </ErrorBoundary>
            );

            expect(screen.getByText('إعادة المحاولة')).toBeInTheDocument();
        });

        it('should call onError callback when error occurs', () => {
            const onError = vi.fn();

            render(
                <ErrorBoundary onError={onError}>
                    <ThrowError shouldThrow={true} />
                </ErrorBoundary>
            );

            expect(onError).toHaveBeenCalled();
            expect(onError).toHaveBeenCalledWith(
                expect.any(Error),
                expect.objectContaining({
                    componentStack: expect.any(String),
                })
            );
        });
    });

    describe('Custom Fallback', () => {
        it('should render custom fallback when provided', () => {
            render(
                <ErrorBoundary fallback={<div>Custom error message</div>}>
                    <ThrowError shouldThrow={true} />
                </ErrorBoundary>
            );

            expect(screen.getByText('Custom error message')).toBeInTheDocument();
        });

        it('should not show default UI when custom fallback provided', () => {
            render(
                <ErrorBoundary fallback={<div>Custom fallback</div>}>
                    <ThrowError shouldThrow={true} />
                </ErrorBoundary>
            );

            expect(screen.queryByText('حدث خطأ غير متوقع')).not.toBeInTheDocument();
        });
    });

    describe('Retry Functionality', () => {
        it('should have clickable retry button', async () => {
            const user = userEvent.setup();

            render(
                <ErrorBoundary>
                    <ThrowError shouldThrow={true} />
                </ErrorBoundary>
            );

            // Should show error UI
            expect(screen.getByText('حدث خطأ غير متوقع')).toBeInTheDocument();

            // Retry button should be present
            const retryButton = screen.getByText('إعادة المحاولة');
            expect(retryButton).toBeInTheDocument();

            // Click retry - this will try to re-render and throw again
            await user.click(retryButton);

            // After clicking retry with a component that still throws, error UI should still show
            expect(screen.getByText('حدث خطأ غير متوقع')).toBeInTheDocument();
        });
    });

    describe('Error Message Display', () => {
        it('should show descriptive error message', () => {
            render(
                <ErrorBoundary>
                    <ThrowError shouldThrow={true} />
                </ErrorBoundary>
            );

            expect(
                screen.getByText('عذراً، حدث خطأ أثناء تحميل هذا القسم. يرجى المحاولة مرة أخرى.')
            ).toBeInTheDocument();
        });
    });

    describe('Nested Boundaries', () => {
        it('should catch error at nearest boundary', () => {
            render(
                <ErrorBoundary fallback={<div>Outer boundary</div>}>
                    <div>Outer content</div>
                    <ErrorBoundary fallback={<div>Inner boundary</div>}>
                        <ThrowError shouldThrow={true} />
                    </ErrorBoundary>
                </ErrorBoundary>
            );

            // Inner boundary should catch
            expect(screen.getByText('Inner boundary')).toBeInTheDocument();
            // Outer content should still render
            expect(screen.getByText('Outer content')).toBeInTheDocument();
            // Outer fallback should NOT render
            expect(screen.queryByText('Outer boundary')).not.toBeInTheDocument();
        });
    });

    describe('Accessibility', () => {
        it('should have accessible retry button', () => {
            render(
                <ErrorBoundary>
                    <ThrowError shouldThrow={true} />
                </ErrorBoundary>
            );

            const retryButton = screen.getByRole('button', { name: /إعادة المحاولة/i });
            expect(retryButton).toBeInTheDocument();
        });

        it('should have descriptive error text', () => {
            render(
                <ErrorBoundary>
                    <ThrowError shouldThrow={true} />
                </ErrorBoundary>
            );

            // Error heading should be present
            expect(screen.getByText('حدث خطأ غير متوقع')).toBeInTheDocument();
        });
    });
});
