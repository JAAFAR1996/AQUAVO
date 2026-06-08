/**
 * Forgot Password Page Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

vi.mock('wouter', () => ({
    useLocation: () => ['/forgot-password', vi.fn()],
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

vi.mock('@/hooks/use-toast', () => ({
    useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
}));

// Mock fetch for password reset request
global.fetch = vi.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
    })
) as unknown as typeof fetch;

import ForgotPassword from '../forgot-password';

describe('Forgot Password Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Rendering', () => {
        it('should render forgot password page', () => {
            render(<ForgotPassword />);
            expect(screen.getByTestId('navbar')).toBeInTheDocument();
            expect(screen.getByTestId('footer')).toBeInTheDocument();
        });

        it('should display email input', () => {
            render(<ForgotPassword />);
            expect(screen.getByLabelText('البريد الإلكتروني')).toBeInTheDocument();
        });

        it('should display submit button', () => {
            render(<ForgotPassword />);
            const buttons = screen.getAllByRole('button');
            expect(buttons.length).toBeGreaterThan(0);
        });

        it('should have link to login page', () => {
            render(<ForgotPassword />);
            expect(screen.getByText(/تسجيل الدخول/)).toBeInTheDocument();
        });
    });

    describe('Form Interaction', () => {
        it('should update email input value', async () => {
            const user = userEvent.setup();
            render(<ForgotPassword />);

            const emailInput = screen.getByLabelText('البريد الإلكتروني');
            await user.type(emailInput, 'test@example.com');

            expect(emailInput).toHaveValue('test@example.com');
        });
    });

    describe('Accessibility', () => {
        it('should have main content area', () => {
            render(<ForgotPassword />);
            expect(screen.getByRole('main')).toBeInTheDocument();
        });

        it('should have proper heading structure', () => {
            render(<ForgotPassword />);
            expect(screen.getByText('نسيت كلمة المرور؟')).toBeInTheDocument();
        });
    });
});
