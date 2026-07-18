import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';

// Mock UI components
vi.mock('@/components/ui/button', () => ({
    Button: ({ children, onClick, className, 'aria-label': ariaLabel, ...props }: any) => (
        <button onClick={onClick} className={className} aria-label={ariaLabel} data-testid="button">
            {children}
        </button>
    ),
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
    ArrowUp: () => <span data-testid="arrow-up-icon">↑</span>,
    MessageCircle: () => <span data-testid="message-icon">💬</span>,
}));

// Mock cn utility
vi.mock('@/lib/utils', () => ({
    cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

import { ScrollProgress } from '../scroll-progress';
import { FloatingActionButton } from '../floating-action-button';

describe('ScrollProgress', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Mock window scroll values
        Object.defineProperty(window, 'scrollY', { value: 0, writable: true });
        Object.defineProperty(document.documentElement, 'scrollHeight', { value: 2000, writable: true });
        Object.defineProperty(window, 'innerHeight', { value: 1000, writable: true });
    });

    it('should render the progress bar', () => {
        const { container } = render(<ScrollProgress />);
        expect(container.firstChild).toBeInTheDocument();
    });

    it('should have fixed positioning', () => {
        const { container } = render(<ScrollProgress />);
        expect(container.firstChild).toHaveClass('fixed');
    });

    it('should start with 0% width', () => {
        const { container } = render(<ScrollProgress />);
        const progressBar = container.querySelector('[style*="width"]');
        expect(progressBar).toHaveStyle({ width: '0%' });
    });

    it('should update progress on scroll', async () => {
        const { container } = render(<ScrollProgress />);

        // Simulate scroll
        await act(async () => {
            Object.defineProperty(window, 'scrollY', { value: 500 });
            fireEvent.scroll(window);
        });

        const progressBar = container.querySelector('[style*="width"]');
        expect(progressBar).toBeInTheDocument();
    });

    it('should have correct z-index for visibility', () => {
        const { container } = render(<ScrollProgress />);
        expect(container.firstChild).toHaveClass('z-50');
    });

    it('should be pointer-events-none', () => {
        const { container } = render(<ScrollProgress />);
        expect(container.firstChild).toHaveClass('pointer-events-none');
    });
});

describe('FloatingActionButton', () => {
    const originalScrollTo = window.scrollTo;

    beforeEach(() => {
        vi.clearAllMocks();
        Object.defineProperty(window, 'scrollY', { value: 0, writable: true });
        window.scrollTo = vi.fn();
    });

    afterEach(() => {
        window.scrollTo = originalScrollTo;
    });

    // Motion removed: the button is not rendered until scrolled past the
    // threshold (no opacity fade/translate), then appears instantly.
    async function scrollPastThreshold() {
        await act(async () => {
            Object.defineProperty(window, 'scrollY', { value: 400 });
            fireEvent.scroll(window);
        });
    }

    it('renders nothing until scrolled past the threshold', () => {
        const { container } = render(<FloatingActionButton />);
        expect(container.firstChild).toBeNull();
        expect(screen.queryByTestId('button')).toBeNull();
    });

    it('appears after scrolling, with fixed LTR positioning', async () => {
        const { container } = render(<FloatingActionButton />);
        await scrollPastThreshold();
        expect(container.firstChild).toBeInTheDocument();
        expect(container.firstChild).toHaveClass('fixed');
        expect(container.firstChild).toHaveAttribute('dir', 'ltr');
    });

    it('calls scrollTo with instant (auto) behavior when clicked', async () => {
        render(<FloatingActionButton />);
        await scrollPastThreshold();
        fireEvent.click(screen.getByTestId('button'));
        expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });
    });

    it('has an accessible label and a rounded button', async () => {
        render(<FloatingActionButton />);
        await scrollPastThreshold();
        expect(screen.getByLabelText('Scroll to top')).toBeInTheDocument();
        expect(screen.getByTestId('button')).toHaveClass('rounded-full');
    });
});

describe('Effects components integration', () => {
    it('ScrollProgress renders without crashing', () => {
        expect(() => render(<ScrollProgress />)).not.toThrow();
    });

    it('FloatingActionButton renders without crashing', () => {
        expect(() => render(<FloatingActionButton />)).not.toThrow();
    });
});
