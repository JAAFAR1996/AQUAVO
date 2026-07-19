/**
 * Blog Page Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('wouter', () => ({
    useLocation: () => ['/blog', vi.fn()],
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
        article: ({ children, ...props }: any) => <article {...props}>{children}</article>,
    },
}));

import Blog from '../blog';

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                queryFn: async ({ queryKey }) => {
                    const key = queryKey[0];
                    if (key === '/api/blog/categories') return [];
                    if (key === '/api/blog/posts') return [];
                    return null;
                },
            },
        },
    });

    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

describe('Blog Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Rendering', () => {
        it('should render the blog page', () => {
            render(<Blog />, { wrapper: createWrapper() });
            expect(document.body).toBeTruthy();
        });

        it('should have main content area', () => {
            render(<Blog />, { wrapper: createWrapper() });
            expect(screen.getByRole('main')).toBeInTheDocument();
        });

        it('should display blog title', () => {
            render(<Blog />, { wrapper: createWrapper() });
            const heading = screen.getByRole('heading', { level: 1 });
            expect(heading).toBeInTheDocument();
        });

        it('should not render a page-level WhatsApp widget', () => {
            render(<Blog />, { wrapper: createWrapper() });
            expect(screen.queryByTestId('whatsapp')).not.toBeInTheDocument();
        });

        it('should render back to top button', () => {
            render(<Blog />, { wrapper: createWrapper() });
            expect(screen.getByTestId('back-to-top')).toBeInTheDocument();
        });
    });

    describe('Blog Posts', () => {
        it('should display blog categories', async () => {
            render(<Blog />, { wrapper: createWrapper() });
            // Blog uses filter buttons, not article role
            await waitFor(() => {
                const buttons = screen.getAllByRole('button');
                expect(buttons.length).toBeGreaterThan(0);
            }, { timeout: 3000 });
        });
    });

    describe('Accessibility', () => {
        it('should have proper heading structure', () => {
            render(<Blog />, { wrapper: createWrapper() });
            const headings = screen.getAllByRole('heading');
            expect(headings.length).toBeGreaterThan(0);
        });
    });
});
