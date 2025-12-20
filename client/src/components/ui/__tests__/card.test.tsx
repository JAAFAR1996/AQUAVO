/**
 * Card Component Tests
 * Tests for the Card UI component family
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../card';

describe('Card', () => {
    describe('Card Container', () => {
        it('should render with children', () => {
            render(<Card>Card content</Card>);
            expect(screen.getByText('Card content')).toBeInTheDocument();
        });

        it('should apply custom className', () => {
            render(<Card className="custom-card" data-testid="card">Content</Card>);
            expect(screen.getByTestId('card')).toHaveClass('custom-card');
        });

        it('should render as div by default', () => {
            render(<Card data-testid="card">Content</Card>);
            expect(screen.getByTestId('card').tagName).toBe('DIV');
        });
    });

    describe('CardHeader', () => {
        it('should render header content', () => {
            render(
                <Card>
                    <CardHeader>Header</CardHeader>
                </Card>
            );
            expect(screen.getByText('Header')).toBeInTheDocument();
        });

        it('should apply custom className', () => {
            render(
                <Card>
                    <CardHeader className="custom-header" data-testid="header">
                        Header
                    </CardHeader>
                </Card>
            );
            expect(screen.getByTestId('header')).toHaveClass('custom-header');
        });
    });

    describe('CardTitle', () => {
        it('should render title', () => {
            render(
                <Card>
                    <CardHeader>
                        <CardTitle>Test Title</CardTitle>
                    </CardHeader>
                </Card>
            );
            expect(screen.getByText('Test Title')).toBeInTheDocument();
        });

        it('should render title text', () => {
            render(
                <Card>
                    <CardHeader>
                        <CardTitle>Title</CardTitle>
                    </CardHeader>
                </Card>
            );
            expect(screen.getByText('Title')).toBeInTheDocument();
        });

        it('should apply custom className', () => {
            render(
                <Card>
                    <CardHeader>
                        <CardTitle className="custom-title" data-testid="title">Title</CardTitle>
                    </CardHeader>
                </Card>
            );
            expect(screen.getByTestId('title')).toHaveClass('custom-title');
        });
    });

    describe('CardDescription', () => {
        it('should render description', () => {
            render(
                <Card>
                    <CardHeader>
                        <CardDescription>Test Description</CardDescription>
                    </CardHeader>
                </Card>
            );
            expect(screen.getByText('Test Description')).toBeInTheDocument();
        });

        it('should apply custom className', () => {
            render(
                <Card>
                    <CardHeader>
                        <CardDescription className="custom-desc" data-testid="desc">
                            Description
                        </CardDescription>
                    </CardHeader>
                </Card>
            );
            expect(screen.getByTestId('desc')).toHaveClass('custom-desc');
        });
    });

    describe('CardContent', () => {
        it('should render content', () => {
            render(
                <Card>
                    <CardContent>Main content here</CardContent>
                </Card>
            );
            expect(screen.getByText('Main content here')).toBeInTheDocument();
        });

        it('should apply custom className', () => {
            render(
                <Card>
                    <CardContent className="custom-content" data-testid="content">
                        Content
                    </CardContent>
                </Card>
            );
            expect(screen.getByTestId('content')).toHaveClass('custom-content');
        });
    });

    describe('CardFooter', () => {
        it('should render footer', () => {
            render(
                <Card>
                    <CardFooter>Footer content</CardFooter>
                </Card>
            );
            expect(screen.getByText('Footer content')).toBeInTheDocument();
        });

        it('should apply custom className', () => {
            render(
                <Card>
                    <CardFooter className="custom-footer" data-testid="footer">
                        Footer
                    </CardFooter>
                </Card>
            );
            expect(screen.getByTestId('footer')).toHaveClass('custom-footer');
        });
    });

    describe('Complete Card', () => {
        it('should render complete card with all parts', () => {
            render(
                <Card data-testid="complete-card">
                    <CardHeader>
                        <CardTitle>Product Name</CardTitle>
                        <CardDescription>Product description here</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p>Price: 25,000 IQD</p>
                    </CardContent>
                    <CardFooter>
                        <button>Add to Cart</button>
                    </CardFooter>
                </Card>
            );

            expect(screen.getByText('Product Name')).toBeInTheDocument();
            expect(screen.getByText('Product description here')).toBeInTheDocument();
            expect(screen.getByText('Price: 25,000 IQD')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Add to Cart' })).toBeInTheDocument();
        });

        it('should maintain proper DOM structure', () => {
            render(
                <Card data-testid="card">
                    <CardHeader data-testid="header">
                        <CardTitle>Title</CardTitle>
                    </CardHeader>
                    <CardContent data-testid="content">Content</CardContent>
                </Card>
            );

            const card = screen.getByTestId('card');
            const header = screen.getByTestId('header');
            const content = screen.getByTestId('content');

            expect(card).toContainElement(header);
            expect(card).toContainElement(content);
        });
    });

    describe('Accessibility', () => {
        it('should support aria attributes on card', () => {
            render(
                <Card role="article" aria-label="Product card">
                    <CardContent>Product info</CardContent>
                </Card>
            );
            expect(screen.getByRole('article')).toHaveAttribute('aria-label', 'Product card');
        });

        it('should render title with proper styling', () => {
            render(
                <Card>
                    <CardHeader>
                        <CardTitle data-testid="title">Accessible Title</CardTitle>
                    </CardHeader>
                </Card>
            );
            expect(screen.getByTestId('title')).toBeInTheDocument();
        });
    });
});
