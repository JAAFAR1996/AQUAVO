/**
 * Login Page Tests
 * Tests for the login page component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from '../../pages/login';
import React from 'react';

// Mock wouter
const mockSetLocation = vi.fn();
vi.mock('wouter', () => ({
    useLocation: () => ['/', mockSetLocation],
    Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
        <a href={href}>{children}</a>
    ),
}));

// Mock auth context
const mockLogin = vi.fn();
vi.mock('@/contexts/auth-context', () => ({
    useAuth: () => ({
        login: mockLogin,
        isLoading: false,
    }),
}));

// Mock toast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
    useToast: () => ({ toast: mockToast }),
}));

// Mock components
vi.mock('@/components/navbar', () => ({
    default: () => <nav data-testid="navbar">Navbar</nav>,
}));

vi.mock('@/components/footer', () => ({
    default: () => <footer data-testid="footer">Footer</footer>,
}));

vi.mock('@/components/whatsapp-widget', () => ({
    WhatsAppWidget: () => <div data-testid="whatsapp">WhatsApp</div>,
}));

describe('Login Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Rendering', () => {
        it('should render login form', () => {
            render(<Login />);

            // Use getAllByText since there are multiple elements with same text
            const loginElements = screen.getAllByText('تسجيل الدخول');
            expect(loginElements.length).toBeGreaterThan(0);
            expect(screen.getByLabelText('البريد الإلكتروني')).toBeInTheDocument();
            expect(screen.getByLabelText('كلمة المرور')).toBeInTheDocument();
        });

        it('should render navbar and footer', () => {
            render(<Login />);

            expect(screen.getByTestId('navbar')).toBeInTheDocument();
            expect(screen.getByTestId('footer')).toBeInTheDocument();
        });

        it('should render remember me checkbox', () => {
            render(<Login />);

            expect(screen.getByLabelText('تذكرني')).toBeInTheDocument();
        });

        it('should render forgot password link', () => {
            render(<Login />);

            expect(screen.getByText('نسيت كلمة المرور؟')).toBeInTheDocument();
        });

        it('should render register link', () => {
            render(<Login />);

            expect(screen.getByText('إنشاء حساب جديد')).toBeInTheDocument();
        });
    });

    describe('Form Interaction', () => {
        it('should update email input value', async () => {
            const user = userEvent.setup();
            render(<Login />);

            const emailInput = screen.getByLabelText('البريد الإلكتروني');
            await user.type(emailInput, 'test@example.com');

            expect(emailInput).toHaveValue('test@example.com');
        });

        it('should update password input value', async () => {
            const user = userEvent.setup();
            render(<Login />);

            const passwordInput = screen.getByLabelText('كلمة المرور');
            await user.type(passwordInput, 'password123');

            expect(passwordInput).toHaveValue('password123');
        });

        it('should toggle password visibility', async () => {
            const user = userEvent.setup();
            render(<Login />);

            const passwordInput = screen.getByLabelText('كلمة المرور');
            expect(passwordInput).toHaveAttribute('type', 'password');

            // Find and click the toggle button (eye icon)
            const toggleButtons = screen.getAllByRole('button');
            const eyeButton = toggleButtons.find(btn => btn.querySelector('svg'));

            if (eyeButton) {
                await user.click(eyeButton);
                expect(passwordInput).toHaveAttribute('type', 'text');
            }
        });

        it('should toggle remember me checkbox', async () => {
            const user = userEvent.setup();
            render(<Login />);

            const checkbox = screen.getByLabelText('تذكرني');
            expect(checkbox).not.toBeChecked();

            await user.click(checkbox);
            expect(checkbox).toBeChecked();
        });
    });

    describe('Form Submission', () => {
        it('should call login on form submit', async () => {
            const user = userEvent.setup();
            mockLogin.mockResolvedValueOnce({});

            render(<Login />);

            await user.type(screen.getByLabelText('البريد الإلكتروني'), 'test@example.com');
            await user.type(screen.getByLabelText('كلمة المرور'), 'password123');
            await user.click(screen.getByRole('button', { name: /تسجيل الدخول/i }));

            await waitFor(() => {
                expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123', false);
            });
        });

        it('should show toast on successful login', async () => {
            const user = userEvent.setup();
            mockLogin.mockResolvedValueOnce({});

            render(<Login />);

            await user.type(screen.getByLabelText('البريد الإلكتروني'), 'test@example.com');
            await user.type(screen.getByLabelText('كلمة المرور'), 'password123');
            await user.click(screen.getByRole('button', { name: /تسجيل الدخول/i }));

            await waitFor(() => {
                expect(mockToast).toHaveBeenCalledWith({
                    title: 'تم تسجيل الدخول بنجاح!',
                    description: 'مرحباً بك في AQUAVO',
                });
            });
        });

        it('should redirect on successful login', async () => {
            const user = userEvent.setup();
            mockLogin.mockResolvedValueOnce({});

            render(<Login />);

            await user.type(screen.getByLabelText('البريد الإلكتروني'), 'test@example.com');
            await user.type(screen.getByLabelText('كلمة المرور'), 'password123');
            await user.click(screen.getByRole('button', { name: /تسجيل الدخول/i }));

            await waitFor(() => {
                expect(mockSetLocation).toHaveBeenCalledWith('/');
            });
        });

        it('should show error on failed login', async () => {
            const user = userEvent.setup();
            mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'));

            render(<Login />);

            await user.type(screen.getByLabelText('البريد الإلكتروني'), 'test@example.com');
            await user.type(screen.getByLabelText('كلمة المرور'), 'wrongpassword');
            await user.click(screen.getByRole('button', { name: /تسجيل الدخول/i }));

            await waitFor(() => {
                expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
            });
        });
    });

    describe('Loading State', () => {
        it('should show loading text while submitting', async () => {
            const user = userEvent.setup();
            // Delay the login resolution
            mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

            render(<Login />);

            await user.type(screen.getByLabelText('البريد الإلكتروني'), 'test@example.com');
            await user.type(screen.getByLabelText('كلمة المرور'), 'password123');
            await user.click(screen.getByRole('button', { name: /تسجيل الدخول/i }));

            // Should show loading state
            expect(screen.getByText('جاري تسجيل الدخول...')).toBeInTheDocument();
        });
    });

    describe('Accessibility', () => {
        it('should have proper labels for inputs', () => {
            render(<Login />);

            expect(screen.getByLabelText('البريد الإلكتروني')).toBeInTheDocument();
            expect(screen.getByLabelText('كلمة المرور')).toBeInTheDocument();
            expect(screen.getByLabelText('تذكرني')).toBeInTheDocument();
        });

        it('should have RTL direction', () => {
            render(<Login />);

            const container = document.querySelector('[dir="rtl"]');
            expect(container).toBeInTheDocument();
        });
    });
});
