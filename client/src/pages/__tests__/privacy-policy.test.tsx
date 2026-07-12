/**
 * Privacy Policy Page Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('wouter', () => ({
    useLocation: () => ['/privacy-policy', vi.fn()],
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

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
    },
}));

import PrivacyPolicy from '../privacy-policy';

describe('Privacy Policy Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Rendering', () => {
        it('should render the privacy policy page', () => {
            render(<PrivacyPolicy />);
            expect(screen.getByTestId('navbar')).toBeInTheDocument();
            expect(screen.getByTestId('footer')).toBeInTheDocument();
        });

        it('should have main content area', () => {
            render(<PrivacyPolicy />);
            expect(screen.getByRole('main')).toBeInTheDocument();
        });

        it('should display privacy policy title', () => {
            render(<PrivacyPolicy />);
            const heading = screen.getByRole('heading', { level: 1 });
            expect(heading).toBeInTheDocument();
        });
    });

    describe('Content Sections', () => {
        it('describes the implemented data flows without inventing payment storage', () => {
            render(<PrivacyPolicy />);
            expect(screen.getByText(/الدفع نقداً عند الاستلام فقط/)).toBeInTheDocument();
            expect(screen.getByText(/Google Analytics وMeta Pixel وTikTok Pixel/)).toBeInTheDocument();
            expect(screen.getByText(/كوكيز جلسة وتخزين المتصفح/)).toBeInTheDocument();
            expect(screen.queryByText(/طرق الدفع المحفوظة|معالجات الدفع لإتمام المعاملات/)).not.toBeInTheDocument();
        });
    });

    describe('Accessibility', () => {
        it('should have proper heading structure', () => {
            render(<PrivacyPolicy />);
            const headings = screen.getAllByRole('heading');
            expect(headings.length).toBeGreaterThan(0);
        });
    });
});
