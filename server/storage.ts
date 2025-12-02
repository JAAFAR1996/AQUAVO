import { type User, type InsertUser, type Product, type Order, type Review, users, products, orders, reviews } from "../shared/schema.js";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { getDb } from "./db.js";
import { mockProducts } from "../shared/mock-products.js";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getProducts(filters?: ProductFilters): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  getProductBySlug(slug: string): Promise<Product | undefined>;
  createProduct(product: Partial<Product>): Promise<Product>;
  updateProduct(id: string, updates: Partial<Product>): Promise<Product | undefined>;
  getOrders(userId?: string): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  createOrder(order: Partial<Order>): Promise<Order>;
  updateOrder(id: string, updates: Partial<Order>): Promise<Order | undefined>;
  getReviews(productId: string): Promise<Review[]>;
  createReview(review: Partial<Review>): Promise<Review>;
}

export interface ProductFilters {
  category?: string;
  subcategory?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  isNew?: boolean;
  isBestSeller?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

type DbClient = NonNullable<ReturnType<typeof getDb>>;

export class DbStorage implements IStorage {
  constructor(private db: DbClient) {}

  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await this.db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async getProducts(filters?: ProductFilters): Promise<Product[]> {
    let query = this.db.select().from(products);
    
    const conditions = [];
    if (filters?.category) conditions.push(eq(products.category, filters.category));
    if (filters?.subcategory) conditions.push(eq(products.subcategory, filters.subcategory));
    if (filters?.brand) conditions.push(eq(products.brand, filters.brand));
    if (filters?.isNew !== undefined) conditions.push(eq(products.isNew, filters.isNew));
    if (filters?.isBestSeller !== undefined) conditions.push(eq(products.isBestSeller, filters.isBestSeller));
    if (filters?.minPrice) conditions.push(gte(products.price, filters.minPrice.toString()));
    if (filters?.maxPrice) conditions.push(lte(products.price, filters.maxPrice.toString()));
    if (filters?.search) {
      conditions.push(
        sql`(${products.name} ILIKE ${`%${filters.search}%`} OR ${products.description} ILIKE ${`%${filters.search}%`})`
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    query = query.orderBy(desc(products.createdAt)) as any;

    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }
    if (filters?.offset) {
      query = query.offset(filters.offset) as any;
    }

    return await query;
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const result = await this.db.select().from(products).where(eq(products.id, id)).limit(1);
    return result[0];
  }

  async getProductBySlug(slug: string): Promise<Product | undefined> {
    const result = await this.db.select().from(products).where(eq(products.slug, slug)).limit(1);
    return result[0];
  }

  async createProduct(product: Partial<Product>): Promise<Product> {
    const result = await this.db.insert(products).values(product as any).returning();
    return result[0];
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product | undefined> {
    const result = await this.db.update(products).set(updates).where(eq(products.id, id)).returning();
    return result[0];
  }

  async getOrders(userId?: string): Promise<Order[]> {
    if (userId) {
      return await this.db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
    }
    return await this.db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const result = await this.db.select().from(orders).where(eq(orders.id, id)).limit(1);
    return result[0];
  }

  async createOrder(order: Partial<Order>): Promise<Order> {
    const result = await this.db.insert(orders).values(order as any).returning();
    return result[0];
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order | undefined> {
    const result = await this.db.update(orders).set(updates).where(eq(orders.id, id)).returning();
    return result[0];
  }

  async getReviews(productId: string): Promise<Review[]> {
    return await this.db.select().from(reviews).where(eq(reviews.productId, productId)).orderBy(desc(reviews.createdAt));
  }

  async createReview(review: Partial<Review>): Promise<Review> {
    const result = await this.db.insert(reviews).values(review as any).returning();
    return result[0];
  }
}

class MockStorage implements IStorage {
  private users: User[] = [];
  private products: Product[] = [...mockProducts];
  private orders: Order[] = [];
  private reviews: Review[] = [];

  async getUser(id: string): Promise<User | undefined> {
    return this.users.find((u) => u.id === id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.users.find((u) => u.username === username);
  }

  async createUser(user: InsertUser): Promise<User> {
    const newUser: User = {
      id: randomUUID(),
      username: user.username,
      password: user.password,
      email: user.email ?? null,
      createdAt: new Date(),
    };
    this.users.push(newUser);
    return newUser;
  }

  async getProducts(filters?: ProductFilters): Promise<Product[]> {
    let results = [...this.products];

    if (filters?.category) results = results.filter((p) => p.category === filters.category);
    if (filters?.subcategory) results = results.filter((p) => p.subcategory === filters.subcategory);
    if (filters?.brand) results = results.filter((p) => p.brand === filters.brand);
    if (filters?.isNew !== undefined) results = results.filter((p) => p.isNew === filters.isNew);
    if (filters?.isBestSeller !== undefined) results = results.filter((p) => p.isBestSeller === filters.isBestSeller);
    if (filters?.minPrice !== undefined) results = results.filter((p) => Number(p.price) >= filters.minPrice!);
    if (filters?.maxPrice !== undefined) results = results.filter((p) => Number(p.price) <= filters.maxPrice!);
    if (filters?.search) {
      const term = filters.search.toLowerCase();
      results = results.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.description.toLowerCase().includes(term) ||
          p.brand.toLowerCase().includes(term),
      );
    }

    results = results.sort((a, b) => (b.createdAt?.valueOf() || 0) - (a.createdAt?.valueOf() || 0));

    if (filters?.offset !== undefined) {
      results = results.slice(filters.offset);
    }
    if (filters?.limit !== undefined) {
      results = results.slice(0, filters.limit);
    }

    return results;
  }

  async getProduct(id: string): Promise<Product | undefined> {
    return this.products.find((p) => p.id === id);
  }

  async getProductBySlug(slug: string): Promise<Product | undefined> {
    return this.products.find((p) => p.slug === slug);
  }

  async createProduct(product: Partial<Product>): Promise<Product> {
    const newProduct: Product = {
      id: product.id || randomUUID(),
      slug: product.slug || (product.name ? product.name.replace(/\s+/g, "-").toLowerCase() : randomUUID()),
      name: product.name || "منتج",
      brand: product.brand || "غير معروف",
      category: product.category || "general",
      subcategory: product.subcategory || "general",
      description: product.description || "",
      price: product.price || "0",
      originalPrice: product.originalPrice ?? null,
      currency: product.currency || "IQD",
      images: product.images || [],
      thumbnail: product.thumbnail || product.images?.[0] || "",
      rating: product.rating ?? "0",
      reviewCount: product.reviewCount ?? 0,
      stock: product.stock ?? 0,
      lowStockThreshold: product.lowStockThreshold ?? 0,
      isNew: product.isNew ?? false,
      isBestSeller: product.isBestSeller ?? false,
      specifications: product.specifications ?? {},
      createdAt: product.createdAt || new Date(),
      updatedAt: product.updatedAt || new Date(),
    };
    this.products.push(newProduct);
    return newProduct;
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product | undefined> {
    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) return undefined;
    this.products[index] = { ...this.products[index], ...updates, updatedAt: new Date() };
    return this.products[index];
  }

  async getOrders(userId?: string): Promise<Order[]> {
    if (!userId) return this.orders;
    return this.orders.filter((o) => o.userId === userId);
  }

  async getOrder(id: string): Promise<Order | undefined> {
    return this.orders.find((o) => o.id === id);
  }

  async createOrder(order: Partial<Order>): Promise<Order> {
    const newOrder: Order = {
      id: order.id || randomUUID(),
      userId: order.userId ?? null,
      status: order.status || "pending",
      total: order.total || "0",
      items: order.items || [],
      shippingAddress: order.shippingAddress ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.orders.push(newOrder);
    return newOrder;
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order | undefined> {
    const index = this.orders.findIndex((o) => o.id === id);
    if (index === -1) return undefined;
    this.orders[index] = { ...this.orders[index], ...updates, updatedAt: new Date() };
    return this.orders[index];
  }

  async getReviews(productId: string): Promise<Review[]> {
    return this.reviews.filter((r) => r.productId === productId);
  }

  async createReview(review: Partial<Review>): Promise<Review> {
    const newReview: Review = {
      id: review.id || randomUUID(),
      productId: review.productId as string,
      userId: review.userId ?? null,
      rating: review.rating ?? 0,
      comment: review.comment ?? null,
      images: review.images ?? null,
      createdAt: new Date(),
    };
    this.reviews.push(newReview);
    return newReview;
  }
}

function buildStorage(): IStorage {
  const db = getDb();
  if (db) {
    return new DbStorage(db);
  }
  console.warn("Using in-memory mock storage; set DATABASE_URL to enable PostgreSQL.");
  return new MockStorage();
}

export const storage = buildStorage();
