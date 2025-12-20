/**
 * Test Utilities and Mocks for FIST-LIVE Client Tests
 * Provides common test helpers, mocks, and wrapper components
 */

import React, { ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

// Create a fresh QueryClient for each test
export function createTestQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                gcTime: 0,
                staleTime: 0,
            },
            mutations: {
                retry: false,
            },
        },
    });
}

// Mock cart context value
export const mockCartContextValue = {
    items: [],
    addItem: vi.fn(),
    removeItem: vi.fn(),
    updateQuantity: vi.fn(),
    clearCart: vi.fn(),
    totalItems: 0,
    totalPrice: 0,
};

// Mock auth context value
export const mockAuthContextValue = {
    user: null,
    isLoading: false,
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    isAdmin: false,
};

// Mock wishlist context value
export const mockWishlistContextValue = {
    items: [],
    addItem: vi.fn(),
    removeItem: vi.fn(),
    isInWishlist: vi.fn().mockReturnValue(false),
    clearWishlist: vi.fn(),
    totalItems: 0,
};

// Mock shrimp context value
export const mockShrimpContextValue = {
    stage: 'larva' as const,
    isGoldenActive: false,
    goldenCaught: false,
    catchGoldenShrimp: vi.fn(),
};

// Mock product data
export const mockProduct = {
    id: 'prod-123',
    slug: 'test-product',
    name: 'Test Product',
    brand: 'Test Brand',
    price: 25000,
    originalPrice: 30000,
    description: 'Test description',
    rating: 4.5,
    reviewCount: 10,
    thumbnail: '/images/test.jpg',
    images: ['/images/test.jpg', '/images/test2.jpg'],
    category: 'أطعمة',
    stock: 50,
    lowStockThreshold: 10,
    isNew: true,
    isBestSeller: false,
};

// Mock cart item
export const mockCartItem = {
    id: 'prod-123',
    name: 'Test Product',
    price: 25000,
    quantity: 2,
    image: '/images/test.jpg',
    slug: 'test-product',
};

// Mock user data
export const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    fullName: 'Test User',
    role: 'user',
    phone: '07701234567',
    loyaltyPoints: 100,
    loyaltyTier: 'bronze',
};

// Mock fetch responses
export const mockFetchResponse = (data: unknown, ok = true) => {
    return vi.fn().mockResolvedValue({
        ok,
        json: () => Promise.resolve(data),
        text: () => Promise.resolve(JSON.stringify(data)),
        headers: new Headers({ 'content-type': 'application/json' }),
    });
};

// Mock localStorage
export const mockLocalStorage = () => {
    const store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
        removeItem: vi.fn((key: string) => { delete store[key]; }),
        clear: vi.fn(() => Object.keys(store).forEach(key => delete store[key])),
        get length() { return Object.keys(store).length; },
        key: vi.fn((index: number) => Object.keys(store)[index] || null),
    };
};

// All-in-one wrapper with providers
interface AllProvidersProps {
    children: ReactNode;
}

export function AllProviders({ children }: AllProvidersProps) {
    const queryClient = createTestQueryClient();
    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}

// Custom render function with all providers
export function renderWithProviders(
    ui: React.ReactElement,
    options?: Omit<RenderOptions, 'wrapper'>
) {
    return render(ui, { wrapper: AllProviders, ...options });
}

// Wait for async operations
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));

// Mock window.matchMedia
export const mockMatchMedia = (matches = false) => {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
            matches,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });
};

// Mock IntersectionObserver
export const mockIntersectionObserver = () => {
    const mockIntersectionObserver = vi.fn();
    mockIntersectionObserver.mockReturnValue({
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
    });
    window.IntersectionObserver = mockIntersectionObserver as unknown as typeof IntersectionObserver;
};

// Mock ResizeObserver
export const mockResizeObserver = () => {
    const mockResizeObserver = vi.fn();
    mockResizeObserver.mockReturnValue({
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
    });
    window.ResizeObserver = mockResizeObserver as unknown as typeof ResizeObserver;
};

// Re-export testing library utilities
export * from '@testing-library/react';
export { vi } from 'vitest';
