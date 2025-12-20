/**
 * Auth Context Tests
 * Tests for authentication context - login, logout, register, session management
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../auth-context';
import React from 'react';

// Mock wouter
vi.mock('wouter', () => ({
    useLocation: () => ['/test', vi.fn()],
}));

// Test component to access auth context
function TestAuthConsumer() {
    const { user, isLoading, login, logout, register, isAdmin } = useAuth();
    return (
        <div>
            <div data-testid="loading">{isLoading ? 'loading' : 'ready'}</div>
            <div data-testid="user">{user ? user.email : 'null'}</div>
            <div data-testid="isAdmin">{isAdmin ? 'admin' : 'not-admin'}</div>
            <button onClick={() => login('test@test.com', 'password123').catch(() => { })}>Login</button>
            <button onClick={() => logout()}>Logout</button>
            <button onClick={() => register('Test User', 'test@test.com', 'password123', '07701234567').catch(() => { })}>
                Register
            </button>
        </div>
    );
}

describe('AuthContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Initial State', () => {
        it('should start with loading state and check auth on mount', async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: false,
                json: () => Promise.resolve(null),
            });

            render(
                <AuthProvider>
                    <TestAuthConsumer />
                </AuthProvider>
            );

            // Initially loading
            expect(screen.getByTestId('loading')).toHaveTextContent('loading');

            // After auth check completes
            await waitFor(() => {
                expect(screen.getByTestId('loading')).toHaveTextContent('ready');
            });

            expect(screen.getByTestId('user')).toHaveTextContent('null');
        });

        it('should set user if auth check succeeds', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                fullName: 'Test User',
                role: 'user',
            };

            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockUser),
            });

            render(
                <AuthProvider>
                    <TestAuthConsumer />
                </AuthProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
            });
        });
    });

    describe('Login', () => {
        it('should login successfully and set user', async () => {
            const user = userEvent.setup();
            const mockUser = {
                id: 'user-123',
                email: 'test@test.com',
                fullName: 'Test User',
                role: 'user',
            };

            // Initial auth check
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: false,
                json: () => Promise.resolve(null),
            });

            render(
                <AuthProvider>
                    <TestAuthConsumer />
                </AuthProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('loading')).toHaveTextContent('ready');
            });

            // Login request
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockUser),
                headers: new Headers({ 'content-type': 'application/json' }),
            });

            await user.click(screen.getByText('Login'));

            await waitFor(() => {
                expect(screen.getByTestId('user')).toHaveTextContent('test@test.com');
            });
        });

        it('should handle login failure', async () => {
            const user = userEvent.setup();

            // Initial auth check
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: false,
                json: () => Promise.resolve(null),
            });

            render(
                <AuthProvider>
                    <TestAuthConsumer />
                </AuthProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('loading')).toHaveTextContent('ready');
            });

            // Failed login request
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: false,
                json: () => Promise.resolve({ message: 'Invalid credentials' }),
                headers: new Headers({ 'content-type': 'application/json' }),
            });

            // Click should throw, but we handle it gracefully
            await expect(user.click(screen.getByText('Login'))).resolves.not.toThrow();
        });
    });

    describe('Logout', () => {
        it('should logout and clear user', async () => {
            const user = userEvent.setup();
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                role: 'user',
            };

            // Initial auth check returns logged in user
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockUser),
            });

            render(
                <AuthProvider>
                    <TestAuthConsumer />
                </AuthProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
            });

            // Logout request
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({}),
            });

            await user.click(screen.getByText('Logout'));

            await waitFor(() => {
                expect(screen.getByTestId('user')).toHaveTextContent('null');
            });
        });
    });

    describe('Admin Role', () => {
        it('should set isAdmin true for admin users', async () => {
            const mockAdmin = {
                id: 'admin-123',
                email: 'admin@example.com',
                role: 'admin',
            };

            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockAdmin),
            });

            render(
                <AuthProvider>
                    <TestAuthConsumer />
                </AuthProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('isAdmin')).toHaveTextContent('admin');
            });
        });

        it('should set isAdmin false for regular users', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'user@example.com',
                role: 'user',
            };

            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockUser),
            });

            render(
                <AuthProvider>
                    <TestAuthConsumer />
                </AuthProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('isAdmin')).toHaveTextContent('not-admin');
            });
        });
    });

    describe('useAuth Hook', () => {
        it('should throw error when used outside AuthProvider', () => {
            // Suppress console.error for this test
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            expect(() => {
                render(<TestAuthConsumer />);
            }).toThrow('useAuth must be used within an AuthProvider');

            consoleSpy.mockRestore();
        });
    });
});
