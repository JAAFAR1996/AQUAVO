/**
 * Return Policy Page Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('wouter', () => ({
    useLocation: () => ['/return-policy', vi.fn()],
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

import ReturnPolicy from '../return-policy';

describe('Return Policy Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Rendering', () => {
        it('should render the return policy page', () => {
            render(<ReturnPolicy />);
            expect(document.body).toBeTruthy();
        });

        it('should have main content area', () => {
            render(<ReturnPolicy />);
            expect(screen.getByRole('main')).toBeInTheDocument();
        });

        it('should display return policy title', () => {
            render(<ReturnPolicy />);
            const heading = screen.getByRole('heading', { level: 1 });
            expect(heading).toBeInTheDocument();
        });
    });

    describe('Content', () => {
        it('should contain return policy content', () => {
            render(<ReturnPolicy />);
            const content = document.body.textContent;
            expect(content).toBeTruthy();
        });
    });

    describe('Accessibility', () => {
        it('should have proper heading structure', () => {
            render(<ReturnPolicy />);
            const headings = screen.getAllByRole('heading');
            expect(headings.length).toBeGreaterThan(0);
        });
    });
});
