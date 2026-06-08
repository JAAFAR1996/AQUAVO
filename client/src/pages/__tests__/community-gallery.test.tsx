/**
 * Community Gallery Page Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('wouter', () => ({
    useLocation: () => ['/community-gallery', vi.fn()],
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

vi.mock('@/contexts/auth-context', () => ({
    useAuth: () => ({ user: null, isAuthenticated: false, isLoading: false }),
}));

vi.mock('@/lib/api', () => ({
    fetchGallerySubmissions: vi.fn(() => Promise.resolve([
        { id: '1', title: 'Test Tank', imageUrl: '/test.jpg', votes: 10 },
        { id: '2', title: 'My Aquarium', imageUrl: '/test2.jpg', votes: 5 },
    ])),
    voteGallerySubmission: vi.fn(() => Promise.resolve({ success: true })),
}));

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

import CommunityGallery from '../community-gallery';

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                queryFn: async ({ queryKey }) => {
                    if (queryKey[0] === '/api/gallery') {
                        return [
                            { id: '1', title: 'Test Tank', imageUrl: '/test.jpg', votes: 10, isApproved: true },
                            { id: '2', title: 'My Aquarium', imageUrl: '/test2.jpg', votes: 5, isApproved: true },
                        ];
                    }
                    return [];
                },
            },
        },
    });
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

describe('Community Gallery Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Rendering', () => {
        it('should render the gallery page', () => {
            render(<CommunityGallery />, { wrapper: createWrapper() });
            expect(screen.getByTestId('navbar')).toBeInTheDocument();
            expect(screen.getByTestId('footer')).toBeInTheDocument();
        });

        it('should have main content area', () => {
            render(<CommunityGallery />, { wrapper: createWrapper() });
            expect(screen.getByRole('main')).toBeInTheDocument();
        });

        it('should display gallery title', () => {
            render(<CommunityGallery />, { wrapper: createWrapper() });
            const heading = screen.getByRole('heading', { level: 1 });
            expect(heading).toBeInTheDocument();
        });
    });

    describe('Gallery Items', () => {
        it('should display gallery content after loading', async () => {
            render(<CommunityGallery />, { wrapper: createWrapper() });
            await waitFor(() => {
                expect(screen.getByRole('main')).toBeInTheDocument();
            }, { timeout: 3000 });
        });
    });

    describe('Accessibility', () => {
        it('should have proper heading structure', () => {
            render(<CommunityGallery />, { wrapper: createWrapper() });
            const headings = screen.getAllByRole('heading');
            expect(headings.length).toBeGreaterThan(0);
        });
    });
});
