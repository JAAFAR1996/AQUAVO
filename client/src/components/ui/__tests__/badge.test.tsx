/**
 * Badge Component Tests
 * Tests for the Badge UI component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '../badge';

describe('Badge', () => {
    describe('Rendering', () => {
        it('should render with children', () => {
            render(<Badge>New</Badge>);
            expect(screen.getByText('New')).toBeInTheDocument();
        });

        it('should apply custom className', () => {
            render(<Badge className="custom-badge">Custom</Badge>);
            const badge = screen.getByText('Custom');
            expect(badge).toHaveClass('custom-badge');
        });
    });

    describe('Variants', () => {
        it('should render default variant', () => {
            render(<Badge variant="default">Default</Badge>);
            expect(screen.getByText('Default')).toBeInTheDocument();
        });

        it('should render secondary variant', () => {
            render(<Badge variant="secondary">Secondary</Badge>);
            expect(screen.getByText('Secondary')).toBeInTheDocument();
        });

        it('should render destructive variant', () => {
            render(<Badge variant="destructive">Error</Badge>);
            expect(screen.getByText('Error')).toBeInTheDocument();
        });

        it('should render outline variant', () => {
            render(<Badge variant="outline">Outline</Badge>);
            expect(screen.getByText('Outline')).toBeInTheDocument();
        });
    });

    describe('Use Cases', () => {
        it('should work for new product badge', () => {
            render(<Badge>جديد</Badge>);
            expect(screen.getByText('جديد')).toBeInTheDocument();
        });

        it('should work for sale badge', () => {
            render(<Badge variant="destructive">خصم 20%</Badge>);
            expect(screen.getByText('خصم 20%')).toBeInTheDocument();
        });

        it('should work for stock status', () => {
            render(<Badge variant="secondary">متوفر</Badge>);
            expect(screen.getByText('متوفر')).toBeInTheDocument();
        });
    });
});
