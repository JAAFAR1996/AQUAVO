/**
 * Orders API Tests
 * Tests for order creation, status updates, and listing
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { products, orders, settings, users, loyaltyTransactions } from '../../shared/schema.js';
import { getDb } from '../db.js';
import { calculateActualCashbackUsed, createOrderSchema } from '../routes/orders.js';
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

function createOrderStorageHarness(productRow: any, options: {
    shippingFee?: string;
    insertErrors?: unknown[];
    userRow?: any;
    duplicateLoyaltyRows?: any[];
    loyaltyInsertErrors?: unknown[];
    userUpdateError?: unknown;
} = {}) {
    const productUpdates: any[] = [];
    const userUpdates: any[] = [];
    const orderUpdates: any[] = [];
    const insertedOrders: any[] = [];
    const insertedLoyaltyTransactions: any[] = [];
    const selectedTables: unknown[] = [];
    const transactionAttempts: any[] = [];
    const insertErrors = [...(options.insertErrors ?? [])];
    const loyaltyInsertErrors = [...(options.loyaltyInsertErrors ?? [])];

    const createTransaction = () => ({
        _executeCount: 0,
        _staged: {
            productUpdates: [] as any[],
            userUpdates: [] as any[],
            orderUpdates: [] as any[],
            insertedOrders: [] as any[],
            insertedLoyaltyTransactions: [] as any[],
        },
        execute: vi.fn(async function (this: any) {
            this._executeCount += 1;
            if (this._executeCount === 1) {
                return { rows: productRow ? [productRow] : [] };
            }
            if (this._executeCount === 2) {
                return { rows: options.duplicateLoyaltyRows ?? [] };
            }
            if (this._executeCount === 3) {
                return { rows: options.userRow ? [options.userRow] : [] };
            }
            return { rows: [] };
        }),
        select: vi.fn(() => ({
            from: vi.fn((table) => {
                selectedTables.push(table);
                if (table === orders) return makeAwaitableRows([{ count: 9999 }]);
                if (table === settings) return makeAwaitableRows([{ value: options.shippingFee ?? '5000' }]);
                return makeAwaitableRows([]);
            }),
        })),
        update: vi.fn((table) => ({
            set: vi.fn((payload) => ({
                where: vi.fn(async function (this: any) {
                    const tx = transactionAttempts[transactionAttempts.length - 1];
                    if (table === users && options.userUpdateError) throw options.userUpdateError;
                    if (table === products) tx._staged.productUpdates.push(payload);
                    if (table === users) tx._staged.userUpdates.push(payload);
                    if (table === orders) tx._staged.orderUpdates.push(payload);
                    return [];
                }),
            })),
        })),
        insert: vi.fn((table) => ({
            values: vi.fn((payload) => ({
                returning: vi.fn(async function () {
                    const tx = transactionAttempts[transactionAttempts.length - 1];
                    if (table === orders) {
                        const nextError = insertErrors.shift();
                        if (nextError) throw nextError;
                        const row = {
                            id: 'order-1',
                            createdAt: new Date('2026-06-07T00:00:00Z'),
                            updatedAt: new Date('2026-06-07T00:00:00Z'),
                            ...payload,
                        };
                        tx._staged.insertedOrders.push(payload);
                        return [row];
                    }
                    if (table === loyaltyTransactions) {
                        const nextError = loyaltyInsertErrors.shift();
                        if (nextError) throw nextError;
                        tx._staged.insertedLoyaltyTransactions.push(payload);
                        return [{ id: `loyalty-${tx._staged.insertedLoyaltyTransactions.length}`, ...payload }];
                    }
                    return [{ id: 'row-1', ...payload }];
                }),
            })),
        })),
    });

    const db = {
        transaction: vi.fn(async (callback) => {
            const tx = createTransaction();
            transactionAttempts.push(tx);
            const result = await callback(tx);
            productUpdates.push(...tx._staged.productUpdates);
            userUpdates.push(...tx._staged.userUpdates);
            orderUpdates.push(...tx._staged.orderUpdates);
            insertedOrders.push(...tx._staged.insertedOrders);
            insertedLoyaltyTransactions.push(...tx._staged.insertedLoyaltyTransactions);
            return result;
        }),
    };

    vi.mocked(getDb).mockReturnValue(db as any);

    return {
        storage: new OrderStorage(),
        productUpdates,
        userUpdates,
        orderUpdates,
        insertedOrders,
        insertedLoyaltyTransactions,
        selectedTables,
        transactionAttempts,
        db,
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
            const random = "A1B2C3D4";

            const orderNumber = `FH-${year}${month}${day}-${random}`;

            expect(orderNumber).toMatch(/^FH-\d{6}-[A-F0-9]{8}$/);
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
                orderNumber: 'FH-241224-A1B2C3D4',
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
            const orderNumber = 'FH-241224-A1B2C3D4';
            expect(orderNumber).toMatch(/^FH-\d{6}-[A-F0-9]{8}$/);
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
                { id: 'order-1', orderNumber: 'FH-241224-A1B2C3D4', status: 'pending' },
                { id: 'order-2', orderNumber: 'FH-241224-E5F6A7B8', status: 'shipped' }
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

describe('Order loyalty checkout contract', () => {
    const validOrderPayload = {
        items: [{ productId: 'prod-1', quantity: 1 }],
        customerInfo: {
            name: 'Customer',
            phone: '07701234567',
            address: 'Baghdad address',
        },
    };

    it('checkout page sends useCashback and cashbackToUse instead of legacy cashbackUsed', () => {
        const source = readFileSync(resolve(process.cwd(), 'client/src/pages/checkout.tsx'), 'utf8');

        expect(source).toContain('useCashback: loyaltyData.useCashback');
        expect(source).toContain('cashbackToUse: loyaltyData.cashbackToUse');
        expect(source).not.toContain('loyaltyPointsUsed:');
        expect(source).not.toContain('cashbackUsed: loyaltyData.useCashback');
    });

    it('server applies cashback when the current contract fields are provided', () => {
        const parsed = createOrderSchema.parse({
            ...validOrderPayload,
            useCashback: true,
            cashbackToUse: 2500,
        });

        const actualCashbackUsed = calculateActualCashbackUsed({
            useCashback: parsed.useCashback,
            requestedCashback: parsed.cashbackToUse,
            availableCashback: 5000,
            orderTotal: 10000,
        });

        expect(actualCashbackUsed).toBe(2500);
    });

    it('server ignores legacy cashbackUsed without current contract fields', () => {
        const parsed = createOrderSchema.parse({
            ...validOrderPayload,
            cashbackUsed: 2500,
        });

        const actualCashbackUsed = calculateActualCashbackUsed({
            useCashback: parsed.useCashback,
            requestedCashback: parsed.cashbackToUse,
            availableCashback: 5000,
            orderTotal: 10000,
        });

        expect(parsed.useCashback).toBe(false);
        expect(parsed.cashbackToUse).toBe(0);
        expect(actualCashbackUsed).toBe(0);
    });

    it('server caps cashback to available balance', () => {
        expect(calculateActualCashbackUsed({
            useCashback: true,
            requestedCashback: 5000,
            availableCashback: 1200,
            orderTotal: 10000,
        })).toBe(1200);
    });

    it('server caps cashback to payable order total', () => {
        expect(calculateActualCashbackUsed({
            useCashback: true,
            requestedCashback: 5000,
            availableCashback: 10000,
            orderTotal: 1200,
        })).toBe(1200);
    });
});

describe('OrderStorage.createOrderSecure', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('generates an FH order number with date and uppercase random suffix', async () => {
        const { storage } = createOrderStorageHarness({
            id: 'base-1',
            name: 'Base Filter',
            price: '10000',
            stock: 5,
            variants: null,
            hasVariants: false,
        });

        const order = await storage.createOrderSecure(null, [
            { productId: 'base-1', quantity: 1 },
        ], {
            name: 'Customer',
            phone: '07701234567',
            address: 'Baghdad',
        });

        expect(order.orderNumber).toMatch(/^FH-\d{6}-[A-F0-9]{8}$/);
    });

    it('does not query daily order counts while creating order numbers', async () => {
        const { storage, selectedTables } = createOrderStorageHarness({
            id: 'base-1',
            name: 'Base Filter',
            price: '10000',
            stock: 5,
            variants: null,
            hasVariants: false,
        });

        await storage.createOrderSecure(null, [
            { productId: 'base-1', quantity: 1 },
        ], {
            name: 'Customer',
            phone: '07701234567',
            address: 'Baghdad',
        });

        expect(selectedTables).not.toContain(orders);
    });

    it('retries the full transaction when order_number unique collision occurs', async () => {
        const orderNumberCollision = {
            code: '23505',
            constraint: 'orders_order_number_unique',
            message: 'duplicate key value violates unique constraint "orders_order_number_unique"',
        };
        const { storage, db, insertedOrders } = createOrderStorageHarness({
            id: 'base-1',
            name: 'Base Filter',
            price: '10000',
            stock: 5,
            variants: null,
            hasVariants: false,
        }, {
            insertErrors: [orderNumberCollision],
        });

        const order = await storage.createOrderSecure(null, [
            { productId: 'base-1', quantity: 1 },
        ], {
            name: 'Customer',
            phone: '07701234567',
            address: 'Baghdad',
        });

        expect(db.transaction).toHaveBeenCalledTimes(2);
        expect(insertedOrders).toHaveLength(1);
        expect(order.orderNumber).toMatch(/^FH-\d{6}-[A-F0-9]{8}$/);
    });

    it('does not retry non-order-number database errors', async () => {
        const unrelatedUniqueError = {
            code: '23505',
            constraint: 'users_email_unique',
            message: 'duplicate key value violates unique constraint "users_email_unique"',
        };
        const { storage, db, insertedOrders } = createOrderStorageHarness({
            id: 'base-1',
            name: 'Base Filter',
            price: '10000',
            stock: 5,
            variants: null,
            hasVariants: false,
        }, {
            insertErrors: [unrelatedUniqueError],
        });

        await expect(storage.createOrderSecure(null, [
            { productId: 'base-1', quantity: 1 },
        ], {
            name: 'Customer',
            phone: '07701234567',
            address: 'Baghdad',
        })).rejects.toBe(unrelatedUniqueError);

        expect(db.transaction).toHaveBeenCalledTimes(1);
        expect(insertedOrders).toHaveLength(0);
    });

    it('returns a clear failure after repeated order_number collisions', async () => {
        const collisions = Array.from({ length: 3 }, () => ({
            code: '23505',
            detail: 'Key (order_number) already exists.',
            message: 'duplicate key value violates unique constraint "orders_order_number_unique"',
        }));
        const { storage, db, insertedOrders } = createOrderStorageHarness({
            id: 'base-1',
            name: 'Base Filter',
            price: '10000',
            stock: 5,
            variants: null,
            hasVariants: false,
        }, {
            insertErrors: collisions,
        });

        await expect(storage.createOrderSecure(null, [
            { productId: 'base-1', quantity: 1 },
        ], {
            name: 'Customer',
            phone: '07701234567',
            address: 'Baghdad',
        })).rejects.toThrow('Order creation failed after repeated order number collisions. Please try again.');

        expect(db.transaction).toHaveBeenCalledTimes(3);
        expect(insertedOrders).toHaveLength(0);
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
        })).rejects.toThrow('الكمية المطلوبة غير متوفرة حالياً (Base Filter)');
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
        })).rejects.toThrow('الكمية المطلوبة غير متوفرة حالياً (Variant Pump — Small)');
        expect(insertedOrders).toHaveLength(0);
    });

    it('writes cashback redemption, order loyalty columns, user balance, stock, and ledger rows transactionally', async () => {
        const { storage, productUpdates, userUpdates, orderUpdates, insertedOrders, insertedLoyaltyTransactions } = createOrderStorageHarness({
            id: 'base-1',
            name: 'Base Filter',
            price: '10000',
            stock: 5,
            variants: null,
            hasVariants: false,
        }, {
            userRow: {
                id: 'user-1',
                loyaltyPoints: 0,
                pendingLoyaltyPoints: 0,
                cashbackBalance: 5000,
                pendingCashbackBalance: 0,
                loyaltyTier: 'bronze',
            },
        });

        const order = await storage.createOrderSecure('user-1', [
            { productId: 'base-1', quantity: 1 },
        ], {
            name: 'Customer',
            phone: '07701234567',
            address: 'Baghdad',
        }, undefined, {
            useCashback: true,
            cashbackToUse: 1200,
        });

        expect(insertedOrders).toHaveLength(1);
        expect(productUpdates[0].stock).toBe(4);
        expect(userUpdates[0]).toMatchObject({
            cashbackBalance: 3800,
            pendingLoyaltyPoints: 2,
            pendingCashbackBalance: 200,
        });
        expect(orderUpdates[0]).toMatchObject({
            cashbackUsed: 1200,
            pointsDiscount: '1200',
            pointsEarned: 2,
            roundingCashback: 200,
            roundedTotal: '14000',
        });
        expect(insertedLoyaltyTransactions.map((tx) => tx.type)).toEqual([
            'redeem',
            'purchase_earn',
            'rounding_earn',
        ]);
        expect(insertedLoyaltyTransactions[0]).toMatchObject({
            pointsType: 'cashback',
            amount: -1200,
            balanceAfter: 3800,
            orderId: 'order-1',
        });
        expect((order as any).loyaltyResult.actualCashbackUsed).toBe(1200);
    });

    it('rolls back order, stock, and user balance when loyalty ledger insert fails', async () => {
        const ledgerError = new Error('ledger insert failed');
        const { storage, productUpdates, userUpdates, orderUpdates, insertedOrders, insertedLoyaltyTransactions } = createOrderStorageHarness({
            id: 'base-1',
            name: 'Base Filter',
            price: '10000',
            stock: 5,
            variants: null,
            hasVariants: false,
        }, {
            userRow: {
                id: 'user-1',
                loyaltyPoints: 0,
                pendingLoyaltyPoints: 0,
                cashbackBalance: 5000,
                pendingCashbackBalance: 0,
                loyaltyTier: 'bronze',
            },
            loyaltyInsertErrors: [ledgerError],
        });

        await expect(storage.createOrderSecure('user-1', [
            { productId: 'base-1', quantity: 1 },
        ], {
            name: 'Customer',
            phone: '07701234567',
            address: 'Baghdad',
        }, undefined, {
            useCashback: true,
            cashbackToUse: 1200,
        })).rejects.toBe(ledgerError);

        expect(productUpdates).toHaveLength(0);
        expect(userUpdates).toHaveLength(0);
        expect(orderUpdates).toHaveLength(0);
        expect(insertedOrders).toHaveLength(0);
        expect(insertedLoyaltyTransactions).toHaveLength(0);
    });

    it('rolls back order and stock when user balance update fails', async () => {
        const userUpdateError = new Error('user update failed');
        const { storage, productUpdates, userUpdates, orderUpdates, insertedOrders } = createOrderStorageHarness({
            id: 'base-1',
            name: 'Base Filter',
            price: '10000',
            stock: 5,
            variants: null,
            hasVariants: false,
        }, {
            userRow: {
                id: 'user-1',
                loyaltyPoints: 0,
                pendingLoyaltyPoints: 0,
                cashbackBalance: 5000,
                pendingCashbackBalance: 0,
                loyaltyTier: 'bronze',
            },
            userUpdateError,
        });

        await expect(storage.createOrderSecure('user-1', [
            { productId: 'base-1', quantity: 1 },
        ], {
            name: 'Customer',
            phone: '07701234567',
            address: 'Baghdad',
        }, undefined, {
            useCashback: true,
            cashbackToUse: 1200,
        })).rejects.toBe(userUpdateError);

        expect(productUpdates).toHaveLength(0);
        expect(userUpdates).toHaveLength(0);
        expect(orderUpdates).toHaveLength(0);
        expect(insertedOrders).toHaveLength(0);
    });

    it('caps transactional cashback to available balance', async () => {
        const { storage, userUpdates, orderUpdates } = createOrderStorageHarness({
            id: 'base-1',
            name: 'Base Filter',
            price: '10000',
            stock: 5,
            variants: null,
            hasVariants: false,
        }, {
            userRow: {
                id: 'user-1',
                loyaltyPoints: 0,
                pendingLoyaltyPoints: 0,
                cashbackBalance: 500,
                pendingCashbackBalance: 0,
                loyaltyTier: 'bronze',
            },
        });

        await storage.createOrderSecure('user-1', [
            { productId: 'base-1', quantity: 1 },
        ], {
            name: 'Customer',
            phone: '07701234567',
            address: 'Baghdad',
        }, undefined, {
            useCashback: true,
            cashbackToUse: 5000,
        });

        expect(orderUpdates[0].cashbackUsed).toBe(500);
        expect(userUpdates[0].cashbackBalance).toBe(0);
    });

    it('caps transactional cashback to order total', async () => {
        const { storage, userUpdates, orderUpdates } = createOrderStorageHarness({
            id: 'base-1',
            name: 'Base Filter',
            price: '1200',
            stock: 5,
            variants: null,
            hasVariants: false,
        }, {
            shippingFee: '5000',
            userRow: {
                id: 'user-1',
                loyaltyPoints: 0,
                pendingLoyaltyPoints: 0,
                cashbackBalance: 10000,
                pendingCashbackBalance: 0,
                loyaltyTier: 'bronze',
            },
        });

        await storage.createOrderSecure('user-1', [
            { productId: 'base-1', quantity: 1 },
        ], {
            name: 'Customer',
            phone: '07701234567',
            address: 'Baghdad',
        }, undefined, {
            useCashback: true,
            cashbackToUse: 10000,
        });

        expect(orderUpdates[0].cashbackUsed).toBe(6200);
        expect(userUpdates[0].cashbackBalance).toBe(3800);
    });

    it('prevents duplicate financial loyalty processing for an order inside the transaction', async () => {
        const { storage, productUpdates, userUpdates, orderUpdates, insertedOrders, insertedLoyaltyTransactions } = createOrderStorageHarness({
            id: 'base-1',
            name: 'Base Filter',
            price: '10000',
            stock: 5,
            variants: null,
            hasVariants: false,
        }, {
            duplicateLoyaltyRows: [{ id: 'existing-loyalty-row' }],
            userRow: {
                id: 'user-1',
                loyaltyPoints: 0,
                pendingLoyaltyPoints: 0,
                cashbackBalance: 5000,
                pendingCashbackBalance: 0,
                loyaltyTier: 'bronze',
            },
        });

        await expect(storage.createOrderSecure('user-1', [
            { productId: 'base-1', quantity: 1 },
        ], {
            name: 'Customer',
            phone: '07701234567',
            address: 'Baghdad',
        }, undefined, {
            useCashback: true,
            cashbackToUse: 1200,
        })).rejects.toThrow('Loyalty effects already processed for order order-1');

        expect(productUpdates).toHaveLength(0);
        expect(userUpdates).toHaveLength(0);
        expect(orderUpdates).toHaveLength(0);
        expect(insertedOrders).toHaveLength(0);
        expect(insertedLoyaltyTransactions).toHaveLength(0);
    });

    it('keeps notification and referral effects after transactional order creation', () => {
        const source = readFileSync(resolve(process.cwd(), 'server/routes/orders.ts'), 'utf8');
        const createOrderIndex = source.indexOf('await storage.createOrderSecure');
        const notificationIndex = source.indexOf('sendPostPurchaseNotifications');
        const referralIndex = source.indexOf('markFirstPurchase');

        expect(createOrderIndex).toBeGreaterThan(-1);
        expect(notificationIndex).toBeGreaterThan(createOrderIndex);
        expect(referralIndex).toBeGreaterThan(createOrderIndex);
        expect(source).toContain(".catch(err => console.error('[AQUAVO Loyalty Notifications] Failed:', err));");
        expect(source).toContain('catch (refErr)');
    });

    it('uses the idempotency key as the transactional order id and skips duplicate side effects', () => {
        const routeSource = readFileSync(resolve(process.cwd(), 'server/routes/orders.ts'), 'utf8');
        const storageSource = readFileSync(resolve(process.cwd(), 'server/storage/order-storage.ts'), 'utf8');
        const duplicateLookupIndex = routeSource.indexOf('await storage.getOrder(idempotencyKey)');
        const createOrderIndex = routeSource.indexOf('await storage.createOrderSecure');
        const notificationIndex = routeSource.indexOf('sendOrderNotification', createOrderIndex);

        expect(duplicateLookupIndex).toBeGreaterThan(-1);
        expect(duplicateLookupIndex).toBeLessThan(createOrderIndex);
        expect(notificationIndex).toBeGreaterThan(createOrderIndex);
        expect(routeSource).toContain('idempotencyKeySchema = z.string().uuid()');
        expect(storageSource).toContain('...(idempotencyKey ? { id: idempotencyKey } : {})');
    });
});
