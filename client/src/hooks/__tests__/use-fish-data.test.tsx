/**
 * useFishData Hook Tests
 * Tests for fish data fetching hooks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Create wrapper with QueryClientProvider
const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                gcTime: 0,
            },
        },
    });
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
};

// Mock fish data
const mockFishData = [
    {
        id: 'fish-1',
        name: 'Goldfish',
        scientificName: 'Carassius auratus',
        category: 'freshwater',
        difficulty: 'easy',
    },
    {
        id: 'fish-2',
        name: 'Betta',
        scientificName: 'Betta splendens',
        category: 'freshwater',
        difficulty: 'easy',
    },
];

const mockSingleFish = {
    id: 'fish-1',
    name: 'Goldfish',
    scientificName: 'Carassius auratus',
    category: 'freshwater',
    difficulty: 'easy',
};

describe('useFishData', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should fetch fish data successfully', async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockFishData),
        });

        // Dynamic import to avoid hoisting issues
        const { useFishData } = await import('../use-fish-data');

        const { result } = renderHook(() => useFishData(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.data).toEqual(mockFishData);
        expect(result.current.error).toBeNull();
    });

    it('should handle fetch error', async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            ok: false,
            statusText: 'Not Found',
        });

        const { useFishData } = await import('../use-fish-data');

        const { result } = renderHook(() => useFishData(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => {
            expect(result.current.isError).toBe(true);
        });

        expect(result.current.error).toBeDefined();
    });

    it('should show loading state initially', async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
            () => new Promise((resolve) => setTimeout(() =>
                resolve({ ok: true, json: () => Promise.resolve(mockFishData) }),
                100
            ))
        );

        const { useFishData } = await import('../use-fish-data');

        const { result } = renderHook(() => useFishData(), {
            wrapper: createWrapper(),
        });

        expect(result.current.isLoading).toBe(true);
        expect(result.current.data).toBeUndefined();
    });
});

describe('useFishSpecies', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should fetch single fish species successfully', async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockSingleFish),
        });

        const { useFishSpecies } = await import('../use-fish-data');

        const { result } = renderHook(() => useFishSpecies('fish-1'), {
            wrapper: createWrapper(),
        });

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.data).toEqual(mockSingleFish);
    });

    it('should not fetch when id is empty', async () => {
        const { useFishSpecies } = await import('../use-fish-data');

        const { result } = renderHook(() => useFishSpecies(''), {
            wrapper: createWrapper(),
        });

        // Should not make a fetch call
        expect(global.fetch).not.toHaveBeenCalled();
        expect(result.current.data).toBeUndefined();
    });

    it('should handle 404 error for non-existent fish', async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            ok: false,
            statusText: 'Not Found',
        });

        const { useFishSpecies } = await import('../use-fish-data');

        const { result } = renderHook(() => useFishSpecies('non-existent'), {
            wrapper: createWrapper(),
        });

        await waitFor(() => {
            expect(result.current.isError).toBe(true);
        });
    });
});
