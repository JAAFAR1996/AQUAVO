/**
 * QueryClient Tests
 * Tests for React Query client configuration and API request utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { queryClient, apiRequest, getQueryFn } from '../queryClient';

describe('QueryClient', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('queryClient configuration', () => {
        it('should be defined', () => {
            expect(queryClient).toBeDefined();
        });

        it('should have default options configured', () => {
            const defaultOptions = queryClient.getDefaultOptions();

            expect(defaultOptions.queries).toBeDefined();
            expect(defaultOptions.queries?.refetchOnWindowFocus).toBe(false);
            expect(defaultOptions.queries?.refetchInterval).toBe(false);
        });

        it('should have staleTime of 5 minutes', () => {
            const defaultOptions = queryClient.getDefaultOptions();
            expect(defaultOptions.queries?.staleTime).toBe(5 * 60 * 1000);
        });

        it('should retry queries twice', () => {
            const defaultOptions = queryClient.getDefaultOptions();
            expect(defaultOptions.queries?.retry).toBe(2);
        });
    });

    describe('apiRequest', () => {
        it('should make GET request', async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                text: () => Promise.resolve(''),
            });

            await apiRequest('GET', '/api/test');

            expect(global.fetch).toHaveBeenCalledWith(
                '/api/test',
                expect.objectContaining({
                    method: 'GET',
                    credentials: 'include',
                })
            );
        });

        it('should make POST request with data', async () => {
            const testData = { name: 'Test', value: 123 };

            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                text: () => Promise.resolve(''),
            });

            await apiRequest('POST', '/api/test', testData);

            expect(global.fetch).toHaveBeenCalledWith(
                '/api/test',
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(testData),
                    credentials: 'include',
                })
            );
        });

        it('should throw error on failed request', async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: false,
                text: () => Promise.resolve('Bad Request'),
                status: 400,
                statusText: 'Bad Request',
            });

            await expect(apiRequest('GET', '/api/test')).rejects.toThrow();
        });

        it('should handle timeout (AbortError)', async () => {
            const abortError = new Error('Aborted');
            abortError.name = 'AbortError';

            (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(abortError);

            await expect(apiRequest('GET', '/api/test')).rejects.toThrow(
                'انتهت مهلة الطلب - يرجى المحاولة مرة أخرى'
            );
        });

        it('should include credentials in request', async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                text: () => Promise.resolve(''),
            });

            await apiRequest('GET', '/api/test');

            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({ credentials: 'include' })
            );
        });
    });

    describe('getQueryFn', () => {
        it('should return null on 401 when configured to returnNull', async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: false,
                status: 401,
                json: () => Promise.resolve(null),
            });

            const queryFn = getQueryFn({ on401: 'returnNull' });
            const result = await queryFn({ queryKey: ['/api/user'] } as any);

            expect(result).toBeNull();
        });

        it('should throw on 401 when configured to throw', async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: false,
                status: 401,
                text: () => Promise.resolve('Unauthorized'),
                statusText: 'Unauthorized',
            });

            const queryFn = getQueryFn({ on401: 'throw' });

            await expect(
                queryFn({ queryKey: ['/api/user'] } as any)
            ).rejects.toThrow();
        });

        it('should return JSON data on success', async () => {
            const mockData = { id: 1, name: 'Test' };

            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockData),
            });

            const queryFn = getQueryFn({ on401: 'throw' });
            const result = await queryFn({ queryKey: ['/api/test'] } as any);

            expect(result).toEqual(mockData);
        });

        it('should join queryKey for URL', async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({}),
            });

            const queryFn = getQueryFn({ on401: 'throw' });
            await queryFn({ queryKey: ['/api', 'products', '123'] } as any);

            expect(global.fetch).toHaveBeenCalledWith(
                '/api/products/123',
                expect.any(Object)
            );
        });

        it('should include credentials', async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({}),
            });

            const queryFn = getQueryFn({ on401: 'throw' });
            await queryFn({ queryKey: ['/api/test'] } as any);

            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({ credentials: 'include' })
            );
        });

        it('should handle AbortError as timeout', async () => {
            const abortError = new Error('Aborted');
            abortError.name = 'AbortError';

            (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(abortError);

            const queryFn = getQueryFn({ on401: 'throw' });

            await expect(
                queryFn({ queryKey: ['/api/test'] } as any)
            ).rejects.toThrow('انتهت مهلة الطلب - يرجى المحاولة مرة أخرى');
        });
    });
});
