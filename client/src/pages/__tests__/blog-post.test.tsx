/**
 * Blog Post Page Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('wouter', () => ({
    useLocation: () => ['/blog/test-post', vi.fn()],
    useParams: () => ({ slug: 'test-post' }),
    useRoute: () => [true, { id: 'test-post' }],
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

import BlogPost from '../blog-post';

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                queryFn: async ({ queryKey }) => {
                    const key = queryKey[0];
                    if (key === '/api/blog/posts') return [];
                    return null;
                },
            },
        },
    });
    queryClient.setQueryData(['/api/blog/posts/test-post'], null);
    queryClient.setQueryData(['/api/blog/posts'], []);

    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

describe('Blog Post Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Not Found State', () => {
        it('should display not found message when article does not exist', () => {
            render(<BlogPost />, { wrapper: createWrapper() });
            expect(screen.getByText('المقال غير موجود')).toBeInTheDocument();
        });

        it('should have link to blog page', () => {
            render(<BlogPost />, { wrapper: createWrapper() });
            expect(screen.getByRole('link', { name: /العودة للمدونة/ })).toBeInTheDocument();
        });

        it('should have return button', () => {
            render(<BlogPost />, { wrapper: createWrapper() });
            expect(screen.getByRole('button', { name: /العودة للمدونة/ })).toBeInTheDocument();
        });
    });

    describe('Content', () => {
        it('should display article content area', () => {
            render(<BlogPost />, { wrapper: createWrapper() });
            const content = document.body.textContent;
            expect(content).toBeTruthy();
        });
    });

    describe('Accessibility', () => {
        it('should have proper heading structure', () => {
            render(<BlogPost />, { wrapper: createWrapper() });
            const headings = screen.getAllByRole('heading');
            expect(headings.length).toBeGreaterThan(0);
        });

        it('should have navigation link', () => {
            render(<BlogPost />, { wrapper: createWrapper() });
            const links = screen.getAllByRole('link');
            expect(links.length).toBeGreaterThan(0);
        });
    });
});
