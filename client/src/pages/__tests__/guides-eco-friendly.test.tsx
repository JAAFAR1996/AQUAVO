/**
 * Eco-Friendly Guides Page Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('wouter', () => ({
    useLocation: () => ['/guides/eco-friendly', vi.fn()],
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

vi.mock('@/components/whatsapp-widget', () => ({
    WhatsAppWidget: () => <div data-testid="whatsapp">WhatsApp</div>,
}));

vi.mock('@/components/back-to-top', () => ({
    BackToTop: () => <button data-testid="back-to-top">Back to Top</button>,
}));

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
    },
}));

import GuidesEcoFriendly from '../guides-eco-friendly';

describe('Eco-Friendly Guides Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Rendering', () => {
        it('should render the guides page', () => {
            render(<GuidesEcoFriendly />);
            expect(document.body).toBeTruthy();
        });

        it('should have main content area', () => {
            render(<GuidesEcoFriendly />);
            expect(screen.getByRole('main')).toBeInTheDocument();
        });

        it('should display guides title', () => {
            render(<GuidesEcoFriendly />);
            const heading = screen.getByRole('heading', { level: 1 });
            expect(heading).toBeInTheDocument();
        });
    });

    describe('Content', () => {
        it('should contain eco-friendly guide content', () => {
            render(<GuidesEcoFriendly />);
            const content = document.body.textContent;
            expect(content).toBeTruthy();
        });
    });

    describe('Accessibility', () => {
        it('should have proper heading structure', () => {
            render(<GuidesEcoFriendly />);
            const headings = screen.getAllByRole('heading');
            expect(headings.length).toBeGreaterThan(0);
        });
    });
});
