/**
 * Register Page Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

const mockRegister = vi.fn();
const mockSetLocation = vi.fn();

vi.mock('wouter', () => ({
    useLocation: () => ['/register', mockSetLocation],
    useSearch: () => '',
    Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
        <a href={href}>{children}</a>
    ),
}));

vi.mock('@/components/navbar', () => ({
    default: () => <nav data-testid="navbar">Navbar</nav>,
}));

vi.mock('@/components/footer', () => ({
    default: () => <footer data-testid="footer">Footer</footer>,
}));

vi.mock('@/contexts/auth-context', () => ({
    useAuth: () => ({
        register: mockRegister,
        isLoading: false,
    }),
}));

vi.mock('@/hooks/use-toast', () => ({
    useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/components/auth/password-strength', () => ({
    PasswordStrength: () => <div data-testid="password-strength">Strength</div>,
    isPasswordStrong: vi.fn(() => true),
}));

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
}));

import Register from '../register';

describe('Register Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Rendering', () => {
        it('should render register form', () => {
            render(<Register />);
            expect(document.body).toBeTruthy();
        });

        it('should display name input', () => {
            render(<Register />);
            expect(screen.getByLabelText('الاسم الكامل')).toBeInTheDocument();
        });

        it('should display email input', () => {
            render(<Register />);
            expect(screen.getByLabelText('البريد الإلكتروني')).toBeInTheDocument();
        });

        it('should display phone input', () => {
            render(<Register />);
            expect(screen.getByLabelText('رقم الهاتف')).toBeInTheDocument();
        });

        it('should display password input', () => {
            render(<Register />);
            expect(screen.getByLabelText('كلمة المرور')).toBeInTheDocument();
        });

        it('should display confirm password input', () => {
            render(<Register />);
            expect(screen.getByLabelText('تأكيد كلمة المرور')).toBeInTheDocument();
        });

        it('should display submit button', () => {
            render(<Register />);
            expect(screen.getByRole('button', { name: /إنشاء الحساب/i })).toBeInTheDocument();
        });

        it('should display password strength indicator', () => {
            render(<Register />);
            expect(screen.getByTestId('password-strength')).toBeInTheDocument();
        });

        it('should have link to login page', () => {
            render(<Register />);
            expect(screen.getByText('تسجيل الدخول')).toBeInTheDocument();
        });
    });

    describe('Form Interaction', () => {
        it('should update name input value', async () => {
            const user = userEvent.setup();
            render(<Register />);

            const nameInput = screen.getByLabelText('الاسم الكامل');
            await user.type(nameInput, 'Test User');

            expect(nameInput).toHaveValue('Test User');
        });

        it('should update email input value', async () => {
            const user = userEvent.setup();
            render(<Register />);

            const emailInput = screen.getByLabelText('البريد الإلكتروني');
            await user.type(emailInput, 'test@example.com');

            expect(emailInput).toHaveValue('test@example.com');
        });
    });

    describe('Accessibility', () => {
        it('should have main content area', () => {
            render(<Register />);
            expect(screen.getByRole('main')).toBeInTheDocument();
        });

        it('should have proper labels for inputs', () => {
            render(<Register />);
            expect(screen.getByLabelText('الاسم الكامل')).toBeInTheDocument();
            expect(screen.getByLabelText('البريد الإلكتروني')).toBeInTheDocument();
            expect(screen.getByLabelText('كلمة المرور')).toBeInTheDocument();
        });
    });
});
