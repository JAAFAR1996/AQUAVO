/**
 * QueryClient Tests
 * Tests for React Query client configuration and API request utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { queryClient, apiRequest, getQueryFn, fetchWithRetryOn503 } from '../queryClient';

describe('QueryClient', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.useRealTimers();
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

        it('does not multiply the bounded fetch retry budget or replay mutations', () => {
            const defaultOptions = queryClient.getDefaultOptions();
            expect(defaultOptions.queries?.retry).toBe(false);
            expect(defaultOptions.mutations?.retry).toBe(false);
        });
    });

    describe('apiRequest', () => {
        it('never retries an unkeyed POST after a 503', async () => {
            vi.mocked(fetch).mockResolvedValue(new Response('unavailable', { status: 503 }));
            await expect(apiRequest('POST', '/api/expenses', { amount: 100 })).rejects.toThrow('503');
            expect(fetch).toHaveBeenCalledTimes(1);
        });

        it('honors the caller timeout instead of always waiting 30 seconds', async () => {
            vi.useFakeTimers();
            vi.mocked(fetch).mockImplementation((_url, init) => new Promise((_resolve, reject) => {
                init?.signal?.addEventListener('abort', () => reject(new DOMException('timeout', 'AbortError')));
            }));
            const result = apiRequest('GET', '/api/test', undefined, 125).catch(error => error);
            await vi.advanceTimersByTimeAsync(125);
            expect(await result).toBeInstanceOf(Error);
            expect(fetch).toHaveBeenCalledTimes(1);
        });

        it('keeps 503 retries inside one total wait budget', async () => {
            vi.useFakeTimers();
            vi.mocked(fetch).mockImplementation(async () => new Response('busy', {status:503, headers:{'Retry-After':'3'}}));
            const pending = fetchWithRetryOn503('/api/test', {}, 4000);
            await vi.advanceTimersByTimeAsync(3000);
            expect((await pending).status).toBe(503);
            expect(fetch).toHaveBeenCalledTimes(2);
        });

        it('does not start a fetch for an already cancelled query', async () => {
            const controller = new AbortController();
            controller.abort();
            await expect(fetchWithRetryOn503('/api/test', {signal:controller.signal})).rejects.toMatchObject({name:'AbortError'});
            expect(fetch).not.toHaveBeenCalled();
        });
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
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': expect.any(String),
                    }),
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

        it('should normalize object shippingAddress on authenticated order details', async () => {
            const mockOrder = {
                id: '669a245f-59b0-4e96-85d8-cc61e080a90f',
                orderNumber: 'FH-TEST',
                shippingAddress: {
                    addressLine1: 'شارع الاختبار',
                    city: 'بغداد',
                    country: 'IQ',
                },
            };

            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockOrder),
            });

            const queryFn = getQueryFn({ on401: 'throw' });
            const result = await queryFn({ queryKey: [`/api/orders/${mockOrder.id}`] } as any) as {
                id: string;
                shippingAddress: string;
            };

            expect(result.shippingAddress).toBe('بغداد - شارع الاختبار');
            expect(result.id).toBe(mockOrder.id);
        });

        it('should normalize order-list addresses used by the profile page', async () => {
            const mockOrders = [
                {
                    id: 'order-1',
                    shippingAddress: { addressLine1: 'الكرادة', city: 'بغداد', country: 'IQ' },
                },
                {
                    id: 'order-2',
                    shippingAddress: 'البصرة - العشار',
                },
            ];

            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockOrders),
            });

            const queryFn = getQueryFn({ on401: 'throw' });
            const result = await queryFn({ queryKey: ['/api/orders'] } as any) as Array<{
                id: string;
                shippingAddress: string;
            }>;

            expect(result.map((order) => order.shippingAddress)).toEqual([
                'بغداد - الكرادة',
                'البصرة - العشار',
            ]);
        });

        it('should leave public tracking response shapes untouched', async () => {
            const mockData = {
                orderNumber: 'FH-TEST',
                shippingAddress: { city: 'بغداد', addressLine1: 'خاص' },
            };

            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockData),
            });

            const queryFn = getQueryFn({ on401: 'throw' });
            const result = await queryFn({ queryKey: ['/api/orders/track/FH-TEST'] } as any);

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
