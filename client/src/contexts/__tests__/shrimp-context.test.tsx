/**
 * Shrimp Context Tests
 * Tests for gamification shrimp mascot functionality
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShrimpProvider, useShrimp } from '../shrimp-context';
import React from 'react';

// Mock cart context with controllable values
let mockCartItems: { price: number; quantity: number }[] = [];
vi.mock('../cart-context', () => ({
    useCart: () => ({
        items: mockCartItems,
    }),
}));

// Mock wouter
vi.mock('wouter', () => ({
    useLocation: () => ['/test'],
}));

// Test component to access shrimp context
function TestShrimpConsumer() {
    const { stage, isGoldenActive, goldenCaught, catchGoldenShrimp } = useShrimp();

    return (
        <div>
            <div data-testid="stage">{stage}</div>
            <div data-testid="isGoldenActive">{isGoldenActive ? 'active' : 'inactive'}</div>
            <div data-testid="goldenCaught">{goldenCaught ? 'caught' : 'not-caught'}</div>
            <button onClick={catchGoldenShrimp}>Catch Golden Shrimp</button>
        </div>
    );
}

describe('ShrimpContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockCartItems = [];
        localStorage.clear();
        // Mock Math.random to control golden shrimp spawn
        vi.spyOn(Math, 'random').mockReturnValue(0.5); // 50% - won't spawn (need < 0.01)
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Stage Evolution', () => {
        it('should start with larva stage when cart is empty', () => {
            mockCartItems = [];

            render(
                <ShrimpProvider>
                    <TestShrimpConsumer />
                </ShrimpProvider>
            );

            expect(screen.getByTestId('stage')).toHaveTextContent('larva');
        });

        it('should evolve to teen stage with 1-2 items', async () => {
            mockCartItems = [{ price: 10000, quantity: 1 }];

            render(
                <ShrimpProvider>
                    <TestShrimpConsumer />
                </ShrimpProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('stage')).toHaveTextContent('teen');
            });
        });

        it('should evolve to boss stage with 3+ items', async () => {
            mockCartItems = [
                { price: 10000, quantity: 1 },
                { price: 15000, quantity: 2 },
            ];

            render(
                <ShrimpProvider>
                    <TestShrimpConsumer />
                </ShrimpProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('stage')).toHaveTextContent('boss');
            });
        });

        it('should evolve to whale stage with high cart value', async () => {
            mockCartItems = [{ price: 50000, quantity: 3 }]; // 150000 total

            render(
                <ShrimpProvider>
                    <TestShrimpConsumer />
                </ShrimpProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('stage')).toHaveTextContent('whale');
            });
        });
    });

    describe('Golden Shrimp', () => {
        it('should not show golden shrimp by default (probability check)', () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.5); // 50% - won't spawn

            render(
                <ShrimpProvider>
                    <TestShrimpConsumer />
                </ShrimpProvider>
            );

            expect(screen.getByTestId('isGoldenActive')).toHaveTextContent('inactive');
        });

        it('should spawn golden shrimp when random < 0.01', () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.005); // 0.5% - will spawn

            render(
                <ShrimpProvider>
                    <TestShrimpConsumer />
                </ShrimpProvider>
            );

            expect(screen.getByTestId('isGoldenActive')).toHaveTextContent('active');
        });

        it('should not spawn if already caught today', () => {
            // Set that golden was caught today
            localStorage.setItem('aquavo-golden-date', new Date().toDateString());
            vi.spyOn(Math, 'random').mockReturnValue(0.005); // Would spawn

            render(
                <ShrimpProvider>
                    <TestShrimpConsumer />
                </ShrimpProvider>
            );

            expect(screen.getByTestId('isGoldenActive')).toHaveTextContent('inactive');
            expect(screen.getByTestId('goldenCaught')).toHaveTextContent('caught');
        });

        it('should catch golden shrimp and save to localStorage', async () => {
            const user = userEvent.setup();
            vi.spyOn(Math, 'random').mockReturnValue(0.005); // Spawn golden

            render(
                <ShrimpProvider>
                    <TestShrimpConsumer />
                </ShrimpProvider>
            );

            expect(screen.getByTestId('isGoldenActive')).toHaveTextContent('active');

            await user.click(screen.getByText('Catch Golden Shrimp'));

            await waitFor(() => {
                expect(screen.getByTestId('isGoldenActive')).toHaveTextContent('inactive');
                expect(screen.getByTestId('goldenCaught')).toHaveTextContent('caught');
            });

            // Check localStorage was updated
            expect(localStorage.getItem('aquavo-golden-date')).toBe(new Date().toDateString());
            expect(localStorage.getItem('aquavo-golden-caught')).toBe('true');
        });
    });

    describe('useShrimp Hook', () => {
        it('should throw error when used outside ShrimpProvider', () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            expect(() => {
                render(<TestShrimpConsumer />);
            }).toThrow('useShrimp must be used within a ShrimpProvider');

            consoleSpy.mockRestore();
        });
    });
});
