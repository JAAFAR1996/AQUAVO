/**
 * 404 Not Found Page Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

const mockSetLocation = vi.fn();
vi.mock('wouter', () => ({
    useLocation: () => ['/', mockSetLocation],
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

vi.mock('@/components/seo/meta-tags', () => ({
    MetaTags: () => null,
}));

vi.mock('@/components/gamification/shrimp-mascot', () => ({
    ShrimpMascot: ({ mood }: { mood: string }) => (
        <div data-testid="shrimp-mascot" data-mood={mood}>Shrimp</div>
    ),
}));

vi.mock('@/components/ui/error-state', () => ({
    ErrorState: ({ children, title }: { children: React.ReactNode; title: string }) => (
        <div data-testid="error-state" data-title={title}>{children}</div>
    ),
    errorMessages: {
        notFound: {
            title: 'الصفحة غير موجودة',
            description: 'عذراً، الصفحة التي تبحث عنها غير موجودة.'
        }
    }
}));

import NotFound from '../404';

describe('404 Not Found Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Rendering', () => {
        it('should render the 404 page', () => {
            render(<NotFound />);
            expect(screen.getByTestId('navbar')).toBeInTheDocument();
            expect(screen.getByTestId('footer')).toBeInTheDocument();
        });

        it('should display error state component', () => {
            render(<NotFound />);
            expect(screen.getByTestId('error-state')).toBeInTheDocument();
        });

        it('should display current not-found guidance copy', () => {
            render(<NotFound />);
            const guidance = document.querySelector('.text-lg.font-medium');
            expect(guidance?.textContent?.length).toBeGreaterThan(0);
        });

        it('should display 404 text', () => {
            render(<NotFound />);
            expect(screen.getByText('404')).toBeInTheDocument();
        });

        it('should not render the old shrimp mascot', () => {
            render(<NotFound />);
            expect(screen.queryByTestId('shrimp-mascot')).not.toBeInTheDocument();
        });
    });

    describe('Navigation Links', () => {
        it('should display navigation suggestions', () => {
            render(<NotFound />);
            expect(screen.getByText('ربما تبحث عن:')).toBeInTheDocument();
        });

        it('should have home button', () => {
            render(<NotFound />);
            expect(screen.getByText('الرئيسية')).toBeInTheDocument();
        });

        it('should have products button', () => {
            render(<NotFound />);
            expect(screen.getByText('المنتجات')).toBeInTheDocument();
        });

        it('should have fish encyclopedia button', () => {
            render(<NotFound />);
            expect(screen.getByText('موسوعة الأسماك')).toBeInTheDocument();
        });

        it('should have journey button', () => {
            render(<NotFound />);
            expect(screen.getByText('بدء رحلتك')).toBeInTheDocument();
        });

        it('should navigate to home when clicking home button', async () => {
            const user = userEvent.setup();
            render(<NotFound />);

            await user.click(screen.getByText('الرئيسية'));
            expect(mockSetLocation).toHaveBeenCalledWith('/');
        });

        it('should navigate to products when clicking products button', async () => {
            const user = userEvent.setup();
            render(<NotFound />);

            await user.click(screen.getByText('المنتجات'));
            expect(mockSetLocation).toHaveBeenCalledWith('/products');
        });

        it('should navigate to fish encyclopedia when clicking encyclopedia button', async () => {
            const user = userEvent.setup();
            render(<NotFound />);

            await user.click(screen.getByText('موسوعة الأسماك'));
            expect(mockSetLocation).toHaveBeenCalledWith('/fish-encyclopedia');
        });
    });

    describe('Accessibility', () => {
        it('should have main content area', () => {
            render(<NotFound />);
            expect(screen.getByRole('main')).toBeInTheDocument();
        });

        it('should have RTL direction for suggestions', () => {
            render(<NotFound />);
            const rtlElement = document.querySelector('[dir="rtl"]');
            expect(rtlElement).toBeInTheDocument();
        });
    });
});
