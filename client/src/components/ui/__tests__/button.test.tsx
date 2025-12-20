/**
 * Button Component Tests
 * Tests for the Button UI component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../button';

describe('Button', () => {
    describe('Rendering', () => {
        it('should render with children', () => {
            render(<Button>Click me</Button>);
            expect(screen.getByRole('button')).toHaveTextContent('Click me');
        });

        it('should render as button by default', () => {
            render(<Button>Test</Button>);
            expect(screen.getByRole('button')).toBeInTheDocument();
        });

        it('should apply custom className', () => {
            render(<Button className="custom-class">Test</Button>);
            expect(screen.getByRole('button')).toHaveClass('custom-class');
        });
    });

    describe('Variants', () => {
        it('should render default variant', () => {
            render(<Button variant="default">Default</Button>);
            expect(screen.getByRole('button')).toBeInTheDocument();
        });

        it('should render destructive variant', () => {
            render(<Button variant="destructive">Delete</Button>);
            expect(screen.getByRole('button')).toBeInTheDocument();
        });

        it('should render outline variant', () => {
            render(<Button variant="outline">Outline</Button>);
            expect(screen.getByRole('button')).toBeInTheDocument();
        });

        it('should render secondary variant', () => {
            render(<Button variant="secondary">Secondary</Button>);
            expect(screen.getByRole('button')).toBeInTheDocument();
        });

        it('should render ghost variant', () => {
            render(<Button variant="ghost">Ghost</Button>);
            expect(screen.getByRole('button')).toBeInTheDocument();
        });

        it('should render link variant', () => {
            render(<Button variant="link">Link</Button>);
            expect(screen.getByRole('button')).toBeInTheDocument();
        });
    });

    describe('Sizes', () => {
        it('should render default size', () => {
            render(<Button size="default">Default</Button>);
            expect(screen.getByRole('button')).toBeInTheDocument();
        });

        it('should render small size', () => {
            render(<Button size="sm">Small</Button>);
            expect(screen.getByRole('button')).toBeInTheDocument();
        });

        it('should render large size', () => {
            render(<Button size="lg">Large</Button>);
            expect(screen.getByRole('button')).toBeInTheDocument();
        });

        it('should render icon size', () => {
            render(<Button size="icon">🔍</Button>);
            expect(screen.getByRole('button')).toBeInTheDocument();
        });
    });

    describe('Interactions', () => {
        it('should call onClick when clicked', async () => {
            const user = userEvent.setup();
            const handleClick = vi.fn();

            render(<Button onClick={handleClick}>Click me</Button>);
            await user.click(screen.getByRole('button'));

            expect(handleClick).toHaveBeenCalledTimes(1);
        });

        it('should not call onClick when disabled', async () => {
            const user = userEvent.setup();
            const handleClick = vi.fn();

            render(<Button onClick={handleClick} disabled>Disabled</Button>);
            await user.click(screen.getByRole('button'));

            expect(handleClick).not.toHaveBeenCalled();
        });
    });

    describe('Disabled State', () => {
        it('should be disabled when disabled prop is true', () => {
            render(<Button disabled>Disabled</Button>);
            expect(screen.getByRole('button')).toBeDisabled();
        });

        it('should not be disabled by default', () => {
            render(<Button>Enabled</Button>);
            expect(screen.getByRole('button')).not.toBeDisabled();
        });
    });

    describe('As Child (Polymorphism)', () => {
        it('should render as child element when asChild is true', () => {
            render(
                <Button asChild>
                    <a href="/test">Link Button</a>
                </Button>
            );
            expect(screen.getByRole('link')).toHaveTextContent('Link Button');
        });
    });

    describe('Accessibility', () => {
        it('should have accessible role', () => {
            render(<Button>Accessible</Button>);
            expect(screen.getByRole('button')).toBeInTheDocument();
        });

        it('should support aria-label', () => {
            render(<Button aria-label="Close dialog">X</Button>);
            expect(screen.getByLabelText('Close dialog')).toBeInTheDocument();
        });

        it('should support type attribute', () => {
            render(<Button type="submit">Submit</Button>);
            expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
        });
    });
});
