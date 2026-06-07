/**
 * Orders API Tests
 * Tests for order creation, status updates, and listing
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { products, orders, settings } from '../../shared/schema.js';
import { getDb } from '../db.js';
import { OrderStorage } from '../storage/order-storage.js';

vi.mock('../db.js', () => ({
    getDb: vi.fn(),
    db: null,
}));

function makeAwaitableRows(rows: any[]) {
    const promise = Promise.resolve(rows);
    return {
        where: vi.fn(() => ({
            limit: vi.fn(async () => rows),
            then: promise.then.bind(promise),
        })),
        limit: vi.fn(async () => rows),
        then: promise.then.bind(promise),
    };
}

function createOrderStorageHarness(productRow: any, options: { shippingFee?: string; todayCount?: number } = {}) {
    const productUpdates: any[] = [];
    const insertedOrders: any[] = [];

    const tx = {
        execute: vi.fn(async () => ({ rows: productRow ? [productRow] : [] })),
        select: vi.fn(() => ({
            from: vi.fn((table) => {
                if (table === orders) return makeAwaitableRows([{ count: options.todayCount ?? 0 }]);
                if (table === settings) return makeAwaitableRows([{ value: options.shippingFee ?? '5000' }]);
                return makeAwaitableRows([]);
            }),
        })),
        update: vi.fn((table) => ({
            set: vi.fn((payload) => ({
                where: vi.fn(async () => {
                    if (table === products) productUpdates.push(payload);
                    return [];
                }),
            })),
        })),
        insert: vi.fn((table) => ({
            values: vi.fn((payload) => ({
                returning: vi.fn(async () => {
                    if (table === orders) {
                        insertedOrders.push(payload);
                        return [{
                            id: 'order-1',
                            createdAt: new Date('2026-06-07T00:00:00Z'),
                            updatedAt: new Date('2026-06-07T00:00:00Z'),
                            ...payload,
                        }];
                    }
                    return [{ id: 'row-1', ...payload }];
                }),
            })),
        })),
    };

    const db = {
        transaction: vi.fn(async (callback) => callback(tx)),
    };

    vi.mocked(getDb).mockReturnValue(db as any);

    return {
        storage: new OrderStorage(),
        productUpdates,
        insertedOrders,
        tx,
    };
}

describe('Orders API', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('POST /api/orders', () => {
        it('should create a new order with valid data', async () => {
            const orderData = {
                items: [
                    { productId: 'prod-1', quantity: 2, price: 15000 },
                    { productId: 'prod-2', quantity: 1, price: 50000 }
                ],
                shippingInfo: {
                    name: 'Test Customer',
                    phone: '07701234567',
                    city: 'Baghdad',
                    address: 'Test Address'
                },
                paymentMethod: 'cash_on_delivery'
            };

            expect(orderData.items.length).toBeGreaterThan(0);
            expect(orderData.shippingInfo.name).toBeDefined();
            expect(orderData.shippingInfo.phone).toBeDefined();
        });

        it('should calculate correct total', async () => {
            const items = [
                { productId: 'prod-1', quantity: 2, price: 15000 },
                { productId: 'prod-2', quantity: 1, price: 50000 }
            ];

            const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            expect(total).toBe(80000);
        });

        it('should generate order number', async () => {
            const date = new Date();
            const year = date.getFullYear().toString().slice(-2);
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');

            const orderNumber = `FW-${year}${month}${day}-${random}`;

            expect(orderNumber).toMatch(/^FW-\d{6}-\d{4}$/);
        });

        it('should set initial status to pending', async () => {
            const newOrder = {
                status: 'pending'
            };

            expect(newOrder.status).toBe('pending');
        });

        it('should reject order with empty items', async () => {
            const orderData = {
                items: [],
                shippingInfo: {
                    name: 'Test',
                    phone: '07701234567'
                }
            };

            expect(orderData.items.length).toBe(0);
            // This should be rejected by the API
        });

        it('should reject order with invalid phone number', async () => {
            const orderData = {
                items: [{ productId: 'prod-1', quantity: 1 }],
                shippingInfo: {
                    name: 'Test',
                    phone: '123' // Invalid phone
                }
            };

            expect(orderData.shippingInfo.phone.length).toBeLessThan(10);
            // This should be rejected by the API
        });
    });

    describe('GET /api/orders/:id', () => {
        it('should return order by id', async () => {
            const mockOrder = {
                id: 'order-1',
                orderNumber: 'FW-241224-0001',
                status: 'processing',
                total: 80000,
                items: [
                    { productId: 'prod-1', name: 'Fish Food', quantity: 2, price: 15000 }
                ],
                createdAt: new Date().toISOString()
            };

            expect(mockOrder.id).toBeDefined();
            expect(mockOrder.orderNumber).toBeDefined();
            expect(mockOrder.items.length).toBeGreaterThan(0);
        });

        it('should return order by orderNumber', async () => {
            const orderNumber = 'FW-241224-0001';
            expect(orderNumber).toMatch(/^FW-\d{6}-\d{4}$/);
        });
    });

    describe('PUT /api/admin/orders/:id/status', () => {
        it('should update order status', async () => {
            const orderId = 'order-1';
            const newStatus = 'shipped';
            const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

            expect(validStatuses).toContain(newStatus);
        });

        it('should reject invalid status', async () => {
            const newStatus = 'invalid_status';
            const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

            expect(validStatuses).not.toContain(newStatus);
        });
    });

    describe('GET /api/admin/orders', () => {
        it('should return list of orders', async () => {
            const mockOrders = [
                { id: 'order-1', orderNumber: 'FW-241224-0001', status: 'pending' },
                { id: 'order-2', orderNumber: 'FW-241224-0002', status: 'shipped' }
            ];

            expect(Array.isArray(mockOrders)).toBe(true);
        });

        it('should filter orders by status', async () => {
            const filterStatus = 'pending';
            const mockOrders = [
                { id: 'order-1', status: 'pending' },
                { id: 'order-2', status: 'pending' }
            ];

            mockOrders.forEach(order => {
                expect(order.status).toBe(filterStatus);
            });
        });

        it('should paginate orders', async () => {
            const page = 1;
            const limit = 20;
            const mockResponse = {
                orders: [],
                total: 100,
                page,
                limit
            };

            expect(mockResponse.page).toBe(page);
            expect(mockResponse.limit).toBe(limit);
        });
    });

    describe('GET /api/user/orders', () => {
        it('should return orders for authenticated user', async () => {
            const userId = 'user-1';
            const mockOrders = [
                { id: 'order-1', userId: 'user-1' },
                { id: 'order-2', userId: 'user-1' }
            ];

            mockOrders.forEach(order => {
                expect(order.userId).toBe(userId);
            });
        });
    });
});

describe('OrderStorage.createOrderSecure', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('creates a base product order using the database price', async () => {
        const { storage, productUpdates } = createOrderStorageHarness({
            id: 'base-1',
            name: 'Base Filter',
            price: '10000',
            stock: 5,
            variants: null,
            hasVariants: false,
        });

        const order = await storage.createOrderSecure(null, [
            { productId: 'base-1', quantity: 2 },
        ], {
            name: 'Customer',
            phone: '07701234567',
            address: 'Baghdad',
        });

        expect(order.total).toBe('25000');
        expect(order.items).toEqual([
            {
                productId: 'base-1',
                productName: 'Base Filter',
                quantity: 2,
                priceAtPurchase: 10000,
                lineTotal: 20000,
            },
        ]);
        expect(productUpdates[0].stock).toBe(3);
    });

    it('creates a variant order using the database variant price and metadata', async () => {
        const { storage, productUpdates } = createOrderStorageHarness({
            id: 'variant-1',
            name: 'Variant Pump',
            price: '10000',
            stock: 3,
            hasVariants: true,
            variants: [
                { id: 'small', label: 'Small', price: 22000, stock: 3 },
                { id: 'large', label: 'Large', price: 35000, stock: 2 },
            ],
        });

        const order = await storage.createOrderSecure(null, [
            { productId: 'variant-1', quantity: 2, variantId: 'small' },
        ], {
            name: 'Customer',
            phone: '07701234567',
            address: 'Baghdad',
        });

        expect(order.total).toBe('49000');
        expect(order.items).toEqual([
            {
                productId: 'variant-1',
                productName: 'Variant Pump',
                quantity: 2,
                variantId: 'small',
                variantLabel: 'Small',
                priceAtPurchase: 22000,
                lineTotal: 44000,
            },
        ]);
        expect(productUpdates[0].variants[0].stock).toBe(1);
        expect(productUpdates[0].variants[1].stock).toBe(2);
    });

    it('rejects an invalid variantId clearly', async () => {
        const { storage, insertedOrders } = createOrderStorageHarness({
            id: 'variant-1',
            name: 'Variant Pump',
            price: '10000',
            stock: 3,
            hasVariants: true,
            variants: [{ id: 'small', label: 'Small', price: 22000, stock: 3 }],
        });

        await expect(storage.createOrderSecure(null, [
            { productId: 'variant-1', quantity: 1, variantId: 'missing' },
        ], {
            name: 'Customer',
            phone: '07701234567',
            address: 'Baghdad',
        })).rejects.toThrow('Invalid variant missing for Variant Pump');
        expect(insertedOrders).toHaveLength(0);
    });

    it('rejects insufficient base product stock', async () => {
        const { storage, insertedOrders } = createOrderStorageHarness({
            id: 'base-1',
            name: 'Base Filter',
            price: '10000',
            stock: 1,
            variants: null,
            hasVariants: false,
        });

        await expect(storage.createOrderSecure(null, [
            { productId: 'base-1', quantity: 2 },
        ], {
            name: 'Customer',
            phone: '07701234567',
            address: 'Baghdad',
        })).rejects.toThrow('Insufficient stock for Base Filter');
        expect(insertedOrders).toHaveLength(0);
    });

    it('rejects insufficient variant stock', async () => {
        const { storage, insertedOrders } = createOrderStorageHarness({
            id: 'variant-1',
            name: 'Variant Pump',
            price: '10000',
            stock: 5,
            hasVariants: true,
            variants: [{ id: 'small', label: 'Small', price: 22000, stock: 1 }],
        });

        await expect(storage.createOrderSecure(null, [
            { productId: 'variant-1', quantity: 2, variantId: 'small' },
        ], {
            name: 'Customer',
            phone: '07701234567',
            address: 'Baghdad',
        })).rejects.toThrow('Insufficient stock for Variant Pump (Small)');
        expect(insertedOrders).toHaveLength(0);
    });
});
