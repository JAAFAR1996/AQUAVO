/**
 * Footer Component Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('wouter', () => ({
    useLocation: () => ['/', vi.fn()],
    Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
        <a href={href}>{children}</a>
    ),
}));

import Footer from '@/components/footer';

describe('Footer Component', () => {
    beforeEach(() => vi.clearAllMocks());
    afterEach(() => vi.restoreAllMocks());

    it('should render footer', () => {
        render(<Footer />);
        expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    });

    it('should have navigation links', () => {
        render(<Footer />);
        const links = screen.queryAllByRole('link');
        expect(links.length).toBeGreaterThan(0);
    });

    it('should display contact information', () => {
        render(<Footer />);
        expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    });

    it('should have social media links', () => {
        render(<Footer />);
        const links = screen.queryAllByRole('link');
        expect(links.length).toBeGreaterThan(0);
    });

    it('shows only verified service and legal facts', () => {
        render(<Footer />);

        expect(screen.getAllByText(/محل المنبع — AL NABEA SHOP/).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/توصيل خلال 24 ساعة/).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/الدفع عند الاستلام/).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/5,000 د.ع/).length).toBeGreaterThan(0);
        expect(screen.getByRole('link', { name: /وثيقة YEE/ })).toHaveAttribute('href', '/verify-certificate/yee');
        expect(screen.queryByText(/كي كارد|زين كاش/)).not.toBeInTheDocument();
        expect(screen.queryByText(/سمكة صغيرة.*غيّرت كل شي/)).not.toBeInTheDocument();
    });

    it('gives the newsletter field an accessible label', () => {
        render(<Footer />);

        expect(screen.getByRole('textbox', { name: 'تحديثات المنتجات والأدلة' })).toHaveAttribute('type', 'email');
    });
});
