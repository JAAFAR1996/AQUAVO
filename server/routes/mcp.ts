/**
 * AQUAVO MCP Route — /api/mcp
 *
 * Auth (dual mode):
 *   1. OAuth 2.1 JWT (Claude.ai Web) — issued by /oauth/token, verified via AQUAVO_MCP_SECRET
 *   2. Static Bearer token (Claude Code CLI) — AQUAVO_MCP_TOKEN env var
 *
 * Returns proper WWW-Authenticate header on 401 so Claude.ai can discover OAuth.
 */

import type { Request, Response, NextFunction, Router as RouterType } from "express";
import type { Table } from "drizzle-orm/table";
import { Router } from "express";
import { timingSafeEqual } from "crypto";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { isTable, getTableName } from "drizzle-orm/table";
import { getTableColumns } from "drizzle-orm/utils";
import { z } from "zod";
import {
  sql, eq, ilike, or, and, desc, asc, gte, lte, isNull, gt,
} from "drizzle-orm";
import { getDb } from "../db.js";
import * as schema from "../../shared/schema.js";
import { verifyMcpToken } from "./oauth.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_URL = (process.env.AQUAVO_BASE_URL ?? "https://www.aquavoiq.com").replace(/\/$/, "");
const MCP_RESOURCE = `${BASE_URL}/api/mcp`;
const STATIC_TOKEN = process.env.AQUAVO_MCP_TOKEN?.trim();
const STATIC_SCOPES = process.env.AQUAVO_MCP_STATIC_SCOPES ?? "mcp:read mcp:write";
const MCP_AUDIT_USER_ID = process.env.AQUAVO_MCP_AUDIT_USER_ID?.trim();
const DEFAULT_ALLOWED_ORIGINS = [
  "https://claude.ai",
  "https://chatgpt.com",
  "https://chat.openai.com",
  BASE_URL,
];
const DEFAULT_ALLOWED_HOSTS = [
  new URL(BASE_URL).host,
  "aquavoiq.com",
  "www.aquavoiq.com",
  "localhost:5000",
  "localhost:3000",
  "127.0.0.1:5000",
  "127.0.0.1:3000",
];

type McpAuthInfo = {
  clientId: string;
  mode: "oauth" | "static";
  scopes: Set<string>;
};

type McpRequest = Request & {
  mcpAuth?: McpAuthInfo;
};

type SchemaTable = {
  exportName: string;
  tableName: string;
  table: Table;
  columns: string[];
};

const blockedTables = new Set([
  "sessions",
  "password_reset_tokens",
]);

const sensitiveFieldPatterns = [
  /password/i,
  /token/i,
  /secret/i,
  /api[_-]?key/i,
  /access[_-]?token/i,
  /refresh[_-]?token/i,
  /^sid$/i,
  /^sess$/i,
  /cookie/i,
  /authorization/i,
];

const writeTools = new Set([
  "update_order_status",
  "update_product",
  "update_stock",
  "create_coupon",
  "toggle_coupon",
  "add_expense",
  "soft_delete_product",
  "restore_product",
  "update_review_status",
]);

const dbOptionalTools = new Set([
  "list_site_data_sources",
  "get_table_schema",
  "get_site_overview",
]);

function splitEnvList(value: string | undefined, defaults: string[]): string[] {
  const items = value?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];
  return [...new Set([...defaults, ...items])];
}

function expandScopes(scope: string): Set<string> {
  const scopes = new Set(scope.split(/\s+/).map((item) => item.trim()).filter(Boolean));
  if (scopes.has("mcp")) {
    scopes.add("mcp:read");
    scopes.add("mcp:write");
  }
  return scopes;
}

function hasScope(auth: McpAuthInfo, scope: "mcp:read" | "mcp:write"): boolean {
  return auth.scopes.has("mcp:admin") || auth.scopes.has("mcp") || auth.scopes.has(scope);
}

function requireMcpScope(auth: McpAuthInfo, scope: "mcp:read" | "mcp:write"): void {
  if (!hasScope(auth, scope)) {
    throw new Error(`Missing required MCP scope: ${scope}`);
  }
}

function getAllowedOrigins(): string[] {
  return splitEnvList(process.env.AQUAVO_MCP_ALLOWED_ORIGINS, DEFAULT_ALLOWED_ORIGINS);
}

function getAllowedHosts(): string[] {
  return splitEnvList(process.env.AQUAVO_MCP_ALLOWED_HOSTS, DEFAULT_ALLOWED_HOSTS);
}

function isAllowedOrigin(req: Request): boolean {
  const origin = req.headers.origin;
  if (!origin) return true;
  return getAllowedOrigins().includes(origin);
}

function isAllowedHost(req: Request): boolean {
  const host = req.headers.host;
  if (!host) return true;
  return getAllowedHosts().includes(host);
}

function setMcpCors(req: Request, res: Response): void {
  const origin = req.headers.origin;
  if (origin && getAllowedOrigins().includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, MCP-Session-Id, Mcp-Session-Id");
  res.setHeader("Access-Control-Expose-Headers", "MCP-Session-Id, Mcp-Session-Id, WWW-Authenticate");
  res.setHeader("Access-Control-Max-Age", "86400");
}

function enforceMcpRequestBoundary(req: Request, res: Response, next: NextFunction): void {
  setMcpCors(req, res);
  if (!isAllowedHost(req) || !isAllowedOrigin(req)) {
    res.status(403).json({ error: "Forbidden MCP origin or host" });
    return;
  }
  next();
}

// ─── Auth middleware ───────────────────────────────────────────────────────────
// Accepts: OAuth JWT (Claude.ai web) OR static bearer token (Claude Code CLI)

function mcpAuth(req: McpRequest, res: Response, next: NextFunction): void {
  const auth = req.headers["authorization"] ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

  // 1. Try JWT (Claude.ai web OAuth flow)
  const verified = token ? verifyMcpToken(token) : null;
  if (verified) {
    req.mcpAuth = {
      clientId: verified.clientId,
      mode: "oauth",
      scopes: expandScopes(verified.scope),
    };
    return next();
  }

  // 2. Try static token (Claude Code local)
  if (STATIC_TOKEN && token) {
    const tBuf = Buffer.from(token);
    const eBuf = Buffer.from(STATIC_TOKEN);
    if (tBuf.length === eBuf.length) {
      try {
        if (timingSafeEqual(tBuf, eBuf)) {
          req.mcpAuth = {
            clientId: "static-token",
            mode: "static",
            scopes: expandScopes(STATIC_SCOPES),
          };
          return next();
        }
      } catch { /* */ }
    }
  }

  // 401 with discovery header so Claude.ai can start OAuth flow
  res.setHeader(
    "WWW-Authenticate",
    `Bearer resource_metadata="${BASE_URL}/.well-known/oauth-protected-resource", scope="mcp"`,
  );
  res.status(401).json({ error: "Unauthorized", hint: "Provide a valid Bearer token or complete OAuth flow" });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safe(obj: unknown): unknown {
  return JSON.parse(
    JSON.stringify(obj, (_k, v) => (typeof v === "bigint" ? Number(v) : v)),
  );
}

function text(data: unknown) {
  return { content: [{ type: "text", text: JSON.stringify(safe(data), null, 2) }] };
}

function err(msg: string) {
  return { content: [{ type: "text", text: msg }], isError: true };
}

function normalizeLimit(value: unknown, fallback = 50, max = 200): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(Math.floor(parsed), max);
}

function normalizeOffset(value: unknown): number {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
}

function isSensitiveField(key: string): boolean {
  return sensitiveFieldPatterns.some((pattern) => pattern.test(key));
}

function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => redactValue(item));
  if (!value || typeof value !== "object") return value;
  const output: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    output[key] = isSensitiveField(key) ? "[REDACTED]" : redactValue(nestedValue);
  }
  return output;
}

function getSchemaTables(): SchemaTable[] {
  return Object.entries(schema)
    .filter((entry): entry is [string, Table] => isTable(entry[1]))
    .map(([exportName, table]) => {
      const tableName = getTableName(table);
      const columns = Object.keys(getTableColumns(table));
      return { exportName, tableName, table, columns };
    })
    .filter((entry) => !blockedTables.has(entry.tableName))
    .sort((left, right) => left.tableName.localeCompare(right.tableName));
}

function findSchemaTable(name: string): SchemaTable | undefined {
  const normalized = name.trim();
  return getSchemaTables().find(
    (entry) => entry.tableName === normalized || entry.exportName === normalized,
  );
}

function siteDataSources() {
  return getSchemaTables().map((entry) => ({
    name: entry.tableName,
    exportName: entry.exportName,
    uri: `aquavo://table/${entry.tableName}`,
    columns: entry.columns.map((column) => ({
      name: column,
      redacted: isSensitiveField(column),
    })),
  }));
}

function resourcePayload(uri: string, data: unknown) {
  return {
    contents: [{
      uri,
      mimeType: "application/json",
      text: JSON.stringify(safe(redactValue(data)), null, 2),
    }],
  };
}

async function readTableRows(db: ReturnType<typeof getDb>, tableName: string, limitInput?: unknown, offsetInput?: unknown) {
  if (!db) throw new Error("Database is not connected");
  const entry = findSchemaTable(tableName);
  if (!entry) throw new Error(`Unknown or blocked table: ${tableName}`);
  const limit = normalizeLimit(limitInput, 50, 100);
  const offset = normalizeOffset(offsetInput);
  const rows = await db.select().from(entry.table).limit(limit).offset(offset);
  return {
    table: entry.tableName,
    limit,
    offset,
    rows: redactValue(rows),
  };
}

async function buildSiteOverview(db: ReturnType<typeof getDb>) {
  if (!db) {
    return {
      name: "AQUAVO",
      resource: MCP_RESOURCE,
      database: "not_connected",
      allowedTables: siteDataSources().length,
    };
  }

  const [
    productCount,
    activeProductCount,
    orderCount,
    customerCount,
    pendingOrderCount,
    lowStockCount,
  ] = await Promise.all([
    db.select({ count: sql<number>`COUNT(*)` }).from(schema.products),
    db.select({ count: sql<number>`COUNT(*)` }).from(schema.products).where(isNull(schema.products.deletedAt)),
    db.select({ count: sql<number>`COUNT(*)` }).from(schema.orders),
    db.select({ count: sql<number>`COUNT(*)` }).from(schema.users).where(eq(schema.users.role, "user")),
    db.select({ count: sql<number>`COUNT(*)` }).from(schema.orders).where(eq(schema.orders.status, "pending")),
    db.select({ count: sql<number>`COUNT(*)` }).from(schema.products)
      .where(and(isNull(schema.products.deletedAt), sql`${schema.products.stock} <= ${schema.products.lowStockThreshold}`)),
  ]);

  return {
    name: "AQUAVO",
    resource: MCP_RESOURCE,
    transport: "streamable_http_stateless",
    database: "connected",
    counts: {
      products_total: productCount[0]?.count ?? 0,
      products_active: activeProductCount[0]?.count ?? 0,
      orders_total: orderCount[0]?.count ?? 0,
      customers_total: customerCount[0]?.count ?? 0,
      pending_orders: pendingOrderCount[0]?.count ?? 0,
      low_stock_products: lowStockCount[0]?.count ?? 0,
    },
    rules: {
      sells_live_fish: false,
      payment: "cash_on_delivery",
      shipping_fee_iqd: 5000,
    },
  };
}

async function recordMcpAudit(
  db: ReturnType<typeof getDb>,
  auth: McpAuthInfo,
  action: string,
  entityType: string,
  entityId: string,
  changes: Record<string, unknown>,
): Promise<void> {
  const payload = {
    actor: auth.clientId,
    mode: auth.mode,
    action,
    entityType,
    entityId,
    changes: redactValue(changes),
    ts: new Date().toISOString(),
  };
  console.log(`[MCP WRITE] ${JSON.stringify(payload)}`);

  if (!db || !MCP_AUDIT_USER_ID) return;

  try {
    await db.insert(schema.auditLogs).values({
      userId: MCP_AUDIT_USER_ID,
      action,
      entityType,
      entityId,
      changes: payload,
      createdAt: new Date(),
    });
  } catch (auditError) {
    console.warn("[MCP audit persistence failed]", auditError);
  }
}

// ─── MCP Server Factory ───────────────────────────────────────────────────────

function buildMcpServer(auth: McpAuthInfo): Server {
  const db = getDb();
  const server = new Server(
    { name: "aquavo-store", version: "2.0.0" },
    { capabilities: { tools: {}, resources: {}, prompts: {} } },
  );

  // ── Tool List ──────────────────────────────────────────────────────────────
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      // ── READ ──────────────────────────────────────────────────────────────
      {
        name: "get_products",
        description: "قائمة منتجات AQUAVO مع السعر والمخزون والفئة. يدعم فلترة وبحث.",
        inputSchema: {
          type: "object", properties: {
            search: { type: "string" },
            category: { type: "string" },
            brand: { type: "string" },
            in_stock_only: { type: "boolean" },
            low_stock_only: { type: "boolean" },
            limit: { type: "number" },
            offset: { type: "number" },
            sort_by: { type: "string", enum: ["price_asc", "price_desc", "newest", "stock_asc", "name"] },
          },
        },
      },
      {
        name: "get_product",
        description: "تفاصيل منتج واحد بالكامل + مراجعاته.",
        inputSchema: { type: "object", properties: { id: { type: "string" }, slug: { type: "string" } } },
      },
      {
        name: "get_inventory_summary",
        description: "ملخص المخزون: إجمالي، منتهي، منخفض، قائمة الأصناف الحرجة.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "get_orders",
        description: "قائمة الطلبات مع فلتر بالحالة والتاريخ والمصدر.",
        inputSchema: {
          type: "object", properties: {
            status: { type: "string" },
            limit: { type: "number" },
            offset: { type: "number" },
            date_from: { type: "string" },
            date_to: { type: "string" },
            source: { type: "string" },
            search: { type: "string" },
          },
        },
      },
      {
        name: "get_order",
        description: "تفاصيل طلب واحد + بيانات الزبون.",
        inputSchema: { type: "object", properties: { id: { type: "string" }, order_number: { type: "string" } } },
      },
      {
        name: "get_orders_summary",
        description: "إحصائيات الطلبات مجمّعة بالحالة والمبالغ.",
        inputSchema: { type: "object", properties: { date_from: { type: "string" }, date_to: { type: "string" } } },
      },
      {
        name: "get_customers",
        description: "قائمة الزبائن مع معلومات التواصل والولاء والنقاط.",
        inputSchema: {
          type: "object", properties: {
            search: { type: "string" },
            loyalty_tier: { type: "string" },
            limit: { type: "number" },
            offset: { type: "number" },
          },
        },
      },
      {
        name: "get_customer",
        description: "تفاصيل زبون واحد + طلباته + سلة التسوق.",
        inputSchema: { type: "object", properties: { id: { type: "string" }, email: { type: "string" } } },
      },
      {
        name: "get_dashboard_stats",
        description: "إحصائيات لوحة التحكم: إيرادات، طلبات، زبائن، منتجات.",
        inputSchema: { type: "object", properties: { period: { type: "string", enum: ["7d", "30d", "90d"] } } },
      },
      {
        name: "get_revenue_breakdown",
        description: "تفصيل الإيرادات: مبيعات، شحن، خصومات، WhatsApp vs موقع.",
        inputSchema: { type: "object", properties: { period: { type: "string", enum: ["7d", "30d", "90d"] } } },
      },
      {
        name: "get_top_products",
        description: "أكثر المنتجات مبيعاً بالفترة.",
        inputSchema: {
          type: "object", properties: {
            period: { type: "string", enum: ["7d", "30d", "90d"] },
            limit: { type: "number" },
          },
        },
      },
      {
        name: "get_reviews",
        description: "مراجعات المنتجات مع فلتر بالتقييم والحالة.",
        inputSchema: {
          type: "object", properties: {
            product_id: { type: "string" },
            status: { type: "string" },
            min_rating: { type: "number" },
            limit: { type: "number" },
          },
        },
      },
      {
        name: "get_coupons",
        description: "قائمة الكوبونات: الكود، الخصم، الاستخدام، الصلاحية.",
        inputSchema: { type: "object", properties: { active_only: { type: "boolean" } } },
      },
      {
        name: "get_expenses",
        description: "مصاريف المتجر التشغيلية.",
        inputSchema: {
          type: "object", properties: {
            category: { type: "string" },
            date_from: { type: "string" },
            date_to: { type: "string" },
            limit: { type: "number" },
          },
        },
      },
      {
        name: "list_site_data_sources",
        description: "List all readable AQUAVO site data sources, table names, columns, and MCP resource URIs. Sensitive credential/session fields are marked and redacted.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "get_table_schema",
        description: "Return the readable schema for one AQUAVO table by database table name or schema export name.",
        inputSchema: {
          type: "object",
          required: ["table"],
          properties: {
            table: { type: "string", description: "Example: products, orders, users, blog_posts" },
          },
        },
      },
      {
        name: "read_site_table",
        description: "Read rows from any allowed AQUAVO table. Passwords, tokens, sessions, and secret-like fields are redacted.",
        inputSchema: {
          type: "object",
          required: ["table"],
          properties: {
            table: { type: "string" },
            limit: { type: "number", description: "Default 50, max 100" },
            offset: { type: "number", description: "Default 0" },
          },
        },
      },
      {
        name: "get_site_overview",
        description: "Return a compact operational overview of AQUAVO: counts, MCP endpoint, and core business rules.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "search",
        description: "بحث شامل في المنتجات والطلبات والزبائن دفعة واحدة.",
        inputSchema: { type: "object", required: ["query"], properties: { query: { type: "string" } } },
      },

      // ── WRITE ─────────────────────────────────────────────────────────────
      {
        name: "update_order_status",
        description: "تحديث حالة طلب. الحالات المتاحة: pending, confirmed, processing, shipped, delivered, cancelled, refunded.",
        inputSchema: {
          type: "object",
          required: ["id", "status"],
          properties: {
            id: { type: "string", description: "UUID الطلب" },
            status: { type: "string", enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"] },
            note: { type: "string", description: "ملاحظة اختيارية تُضاف لسجل الطلب" },
          },
        },
      },
      {
        name: "update_product",
        description: "تعديل بيانات منتج: السعر، المخزون، الاسم، الوصف، الفئة، العلامة التجارية، حالة البيع.",
        inputSchema: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            price: { type: "string", description: "السعر الجديد كـ string" },
            original_price: { type: "string", description: "السعر قبل الخصم" },
            stock: { type: "number" },
            description: { type: "string" },
            category: { type: "string" },
            brand: { type: "string" },
            is_best_seller: { type: "boolean" },
            is_new: { type: "boolean" },
            low_stock_threshold: { type: "number" },
          },
        },
      },
      {
        name: "update_stock",
        description: "تحديث كمية المخزون لمنتج واحد أو عدة منتجات.",
        inputSchema: {
          type: "object",
          required: ["updates"],
          properties: {
            updates: {
              type: "array",
              items: {
                type: "object",
                required: ["id", "stock"],
                properties: {
                  id: { type: "string" },
                  stock: { type: "number" },
                },
              },
              description: "قائمة تحديثات [{id, stock}]",
            },
          },
        },
      },
      {
        name: "create_coupon",
        description: "إنشاء كوبون خصم جديد.",
        inputSchema: {
          type: "object",
          required: ["code", "discount_type", "discount_value"],
          properties: {
            code: { type: "string", description: "كود الكوبون (حروف كبيرة)" },
            discount_type: { type: "string", enum: ["percentage", "fixed"] },
            discount_value: { type: "string", description: "قيمة الخصم (نسبة أو مبلغ)" },
            min_order_amount: { type: "string" },
            max_discount_amount: { type: "string" },
            max_uses: { type: "number" },
            expires_at: { type: "string", description: "تاريخ الانتهاء ISO 8601" },
            description: { type: "string" },
          },
        },
      },
      {
        name: "toggle_coupon",
        description: "تفعيل أو إيقاف كوبون.",
        inputSchema: {
          type: "object",
          required: ["code", "active"],
          properties: {
            code: { type: "string" },
            active: { type: "boolean" },
          },
        },
      },
      {
        name: "add_expense",
        description: "تسجيل مصروف جديد في سجل المصاريف.",
        inputSchema: {
          type: "object",
          required: ["amount", "category"],
          properties: {
            amount: { type: "string", description: "المبلغ بالدينار العراقي" },
            category: { type: "string", description: "القيم: rent, salary, marketing, shipping_cost, utilities, other" },
            description: { type: "string", description: "وصف المصروف" },
            expense_date: { type: "string", description: "ISO date — اختياري، الافتراضي اليوم" },
          },
        },
      },
      {
        name: "soft_delete_product",
        description: "حذف منتج بشكل ناعم (لا يُحذف من قاعدة البيانات، فقط يُخفى).",
        inputSchema: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string" },
            confirm: { type: "boolean", description: "يجب أن يكون true للتأكيد" },
          },
        },
      },
      {
        name: "restore_product",
        description: "استعادة منتج محذوف ناعماً.",
        inputSchema: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string" } },
        },
      },
      {
        name: "update_review_status",
        description: "الموافقة أو رفض مراجعة زبون.",
        inputSchema: {
          type: "object",
          required: ["id", "status"],
          properties: {
            id: { type: "string" },
            status: { type: "string", enum: ["approved", "rejected", "pending"] },
          },
        },
      },
    ],
  }));

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    requireMcpScope(auth, "mcp:read");
    const staticResources = [
      {
        uri: "aquavo://site/overview",
        name: "AQUAVO Site Overview",
        description: "Operational counts, endpoint metadata, and core business rules.",
        mimeType: "application/json",
      },
      {
        uri: "aquavo://site/data-sources",
        name: "AQUAVO Data Sources",
        description: "Readable database tables and redacted columns exposed to MCP.",
        mimeType: "application/json",
      },
      {
        uri: "aquavo://site/brand",
        name: "AQUAVO Brand Rules",
        description: "Internal brand and customer-facing content rules for AQUAVO.",
        mimeType: "application/json",
      },
    ];

    const tableResources = getSchemaTables().map((entry) => ({
      uri: `aquavo://table/${entry.tableName}`,
      name: `Table: ${entry.tableName}`,
      description: `Readable rows from ${entry.tableName}. Sensitive fields are redacted.`,
      mimeType: "application/json",
    }));

    return { resources: [...staticResources, ...tableResources] };
  });

  server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
    requireMcpScope(auth, "mcp:read");
    return {
      resourceTemplates: [
        {
          uriTemplate: "aquavo://table/{table}?limit={limit}&offset={offset}",
          name: "AQUAVO Table Rows",
          description: "Read rows from any allowed AQUAVO database table with pagination.",
          mimeType: "application/json",
        },
      ],
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    requireMcpScope(auth, "mcp:read");
    const uri = request.params.uri;

    if (uri === "aquavo://site/overview") {
      return resourcePayload(uri, await buildSiteOverview(db));
    }

    if (uri === "aquavo://site/data-sources") {
      return resourcePayload(uri, { dataSources: siteDataSources() });
    }

    if (uri === "aquavo://site/brand") {
      return resourcePayload(uri, {
        identity: "AQUAVO is an Iraqi premium aquarium equipment and supplies brand/store.",
        market: "Iraq first, regional expansion later.",
        sells: ["aquarium equipment", "aquarium supplies", "filters", "heaters", "food", "decor", "tanks", "lighting", "water treatment"],
        does_not_sell: ["live fish", "live animals", "water plants"],
        voice: "premium, trusted, practical, expert, direct, human, Iraqi/Baghdadi, calm",
        customer_text_rules: {
          arabic: "Natural Iraqi/Baghdadi Arabic",
          no_fake_claims: true,
          no_invented_specs: true,
          no_aggressive_selling: true,
          no_emojis: true,
        },
      });
    }

    if (uri.startsWith("aquavo://table/")) {
      const url = new URL(uri.replace("aquavo://", "https://aquavo.local/"));
      const table = url.pathname.replace(/^\/table\//, "");
      return resourcePayload(uri, await readTableRows(
        db,
        table,
        url.searchParams.get("limit") ?? undefined,
        url.searchParams.get("offset") ?? undefined,
      ));
    }

    throw new Error(`Unknown resource URI: ${uri}`);
  });

  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    requireMcpScope(auth, "mcp:read");
    return {
      prompts: [
        {
          name: "aquavo-inventory-audit",
          title: "AQUAVO Inventory Audit",
          description: "Inspect inventory, low stock, inactive products, and margin-sensitive product risks.",
        },
        {
          name: "aquavo-product-page-improver",
          title: "AQUAVO Product Page Improver",
          description: "Improve product page copy using AQUAVO rules without inventing specs or claims.",
        },
        {
          name: "aquavo-order-followup",
          title: "AQUAVO Order Follow-up",
          description: "Review orders and suggest practical follow-up actions without changing data.",
        },
        {
          name: "aquavo-growth-audit",
          title: "AQUAVO Growth Audit",
          description: "Audit store, product, and customer data for realistic growth opportunities.",
        },
      ],
    };
  });

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    requireMcpScope(auth, "mcp:read");
    const prompts: Record<string, string> = {
      "aquavo-inventory-audit": [
        "Use AQUAVO MCP tools/resources to review inventory.",
        "Check get_inventory_summary, get_products, get_top_products, and relevant table resources.",
        "Classify issues by risk. Do not invent costs, specs, stock, or demand.",
        "Recommend the smallest operational actions first.",
      ].join("\n"),
      "aquavo-product-page-improver": [
        "Improve AQUAVO product content in natural Iraqi/Baghdadi Arabic.",
        "Use product facts from get_product/read_site_table only.",
        "Do not invent specifications, brand claims, prices, warranty, or availability.",
        "Keep the copy premium, practical, and calm.",
      ].join("\n"),
      "aquavo-order-followup": [
        "Review order state and customer context through MCP read tools.",
        "Suggest follow-up messages or admin actions only; do not write unless explicitly asked and scoped.",
        "Keep customer-facing Arabic short, human, and Baghdadi.",
      ].join("\n"),
      "aquavo-growth-audit": [
        "Analyze AQUAVO as a real premium ecommerce business.",
        "Use data sources, dashboard stats, orders summary, top products, and customers.",
        "Report what is strong, weak, missing, risky, and what should be tested next.",
        "Reality over comfort. No fantasy numbers.",
      ].join("\n"),
    };

    const prompt = prompts[request.params.name];
    if (!prompt) throw new Error(`Unknown prompt: ${request.params.name}`);

    return {
      description: request.params.name,
      messages: [{
        role: "user" as const,
        content: { type: "text" as const, text: prompt },
      }],
    };
  });

  // ── Tool Handlers ──────────────────────────────────────────────────────────
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;
    const a = args as Record<string, any>;
    const requiredScope = writeTools.has(name) ? "mcp:write" : "mcp:read";
    requireMcpScope(auth, requiredScope);
    console.log(`[MCP AUDIT] client=${auth.clientId} scope=${requiredScope} tool=${name} ts=${new Date().toISOString()}`);

    if (!db && !dbOptionalTools.has(name)) return err("قاعدة البيانات غير متصلة");

    try {
      switch (name) {

        // ── READ TOOLS ───────────────────────────────────────────────────────

        case "get_products": {
          const { search, category, brand, in_stock_only, low_stock_only, limit = 50, offset = 0, sort_by = "newest" } = a;
          const conditions = [isNull(schema.products.deletedAt)];
          if (category) conditions.push(ilike(schema.products.category, `%${category}%`));
          if (brand) conditions.push(ilike(schema.products.brand, `%${brand}%`));
          if (in_stock_only) conditions.push(gt(schema.products.stock, 0));
          if (low_stock_only) conditions.push(sql`${schema.products.stock} <= ${schema.products.lowStockThreshold} AND ${schema.products.stock} > 0`);
          if (search) conditions.push(or(ilike(schema.products.name, `%${search}%`), ilike(schema.products.brand, `%${search}%`)));
          const orderBy =
            sort_by === "price_asc" ? asc(schema.products.price) :
            sort_by === "price_desc" ? desc(schema.products.price) :
            sort_by === "stock_asc" ? asc(schema.products.stock) :
            sort_by === "name" ? asc(schema.products.name) :
            desc(schema.products.createdAt);
          const rows = await db.select({
            id: schema.products.id, slug: schema.products.slug, name: schema.products.name,
            brand: schema.products.brand, category: schema.products.category,
            subcategory: schema.products.subcategory, price: schema.products.price,
            originalPrice: schema.products.originalPrice, stock: schema.products.stock,
            lowStockThreshold: schema.products.lowStockThreshold, rating: schema.products.rating,
            reviewCount: schema.products.reviewCount, isNew: schema.products.isNew,
            isBestSeller: schema.products.isBestSeller, costPrice: schema.products.costPrice,
            createdAt: schema.products.createdAt,
          }).from(schema.products).where(and(...conditions)).orderBy(orderBy)
            .limit(Math.min(Number(limit), 200)).offset(Number(offset));
          return text(rows);
        }

        case "get_product": {
          const { id, slug } = a;
          if (!id && !slug) throw new Error("يجب توفير id أو slug");
          const [product] = await db.select().from(schema.products)
            .where(id ? eq(schema.products.id, id) : eq(schema.products.slug, slug)).limit(1);
          if (!product) throw new Error("المنتج غير موجود");
          const reviews = await db.select({
            id: schema.reviews.id, rating: schema.reviews.rating, title: schema.reviews.title,
            comment: schema.reviews.comment, status: schema.reviews.status, createdAt: schema.reviews.createdAt,
          }).from(schema.reviews).where(eq(schema.reviews.productId, product.id))
            .orderBy(desc(schema.reviews.createdAt)).limit(10);
          return text({ product, reviews });
        }

        case "get_inventory_summary": {
          const [totals] = await db.select({
            total: sql<number>`COUNT(*)`,
            out_of_stock: sql<number>`SUM(CASE WHEN ${schema.products.stock} = 0 THEN 1 ELSE 0 END)`,
            low_stock: sql<number>`SUM(CASE WHEN ${schema.products.stock} > 0 AND ${schema.products.stock} <= ${schema.products.lowStockThreshold} THEN 1 ELSE 0 END)`,
            in_stock: sql<number>`SUM(CASE WHEN ${schema.products.stock} > ${schema.products.lowStockThreshold} THEN 1 ELSE 0 END)`,
          }).from(schema.products).where(isNull(schema.products.deletedAt));
          const critical = await db.select({
            id: schema.products.id, name: schema.products.name,
            stock: schema.products.stock, lowStockThreshold: schema.products.lowStockThreshold,
          }).from(schema.products)
            .where(and(isNull(schema.products.deletedAt), sql`${schema.products.stock} <= ${schema.products.lowStockThreshold}`))
            .orderBy(asc(schema.products.stock)).limit(20);
          return text({ summary: totals, critical_items: critical });
        }

        case "get_orders": {
          const { status, limit = 50, offset = 0, date_from, date_to, source, search } = a;
          const conditions = [];
          if (status) conditions.push(eq(schema.orders.status, status));
          if (source) conditions.push(eq(schema.orders.source, source));
          if (date_from) conditions.push(gte(schema.orders.createdAt, new Date(date_from)));
          if (date_to) conditions.push(lte(schema.orders.createdAt, new Date(date_to)));
          if (search) conditions.push(or(
            ilike(schema.orders.customerName, `%${search}%`),
            ilike(schema.orders.customerPhone, `%${search}%`),
            ilike(schema.orders.orderNumber, `%${search}%`),
          ));
          const rows = await db.select({
            id: schema.orders.id, orderNumber: schema.orders.orderNumber, status: schema.orders.status,
            paymentStatus: schema.orders.paymentStatus, total: schema.orders.total,
            roundedTotal: schema.orders.roundedTotal, shippingCost: schema.orders.shippingCost,
            customerName: schema.orders.customerName, customerPhone: schema.orders.customerPhone,
            source: schema.orders.source, carrier: schema.orders.carrier,
            shippingAddress: schema.orders.shippingAddress, items: schema.orders.items,
            createdAt: schema.orders.createdAt,
          }).from(schema.orders)
            .where(conditions.length ? and(...conditions) : undefined)
            .orderBy(desc(schema.orders.createdAt))
            .limit(Math.min(Number(limit), 200)).offset(Number(offset));
          return text(rows);
        }

        case "get_order": {
          const { id, order_number } = a;
          if (!id && !order_number) throw new Error("يجب توفير id أو order_number");
          const [order] = await db.select().from(schema.orders)
            .where(id ? eq(schema.orders.id, id) : eq(schema.orders.orderNumber, order_number)).limit(1);
          if (!order) throw new Error("الطلب غير موجود");
          let customer = null;
          if ((order as any).userId) {
            const [u] = await db.select({
              id: schema.users.id, email: schema.users.email, fullName: schema.users.fullName,
              phone: schema.users.phone, loyaltyTier: schema.users.loyaltyTier,
            }).from(schema.users).where(eq(schema.users.id, (order as any).userId)).limit(1);
            customer = u ?? null;
          }
          return text({ order, customer });
        }

        case "get_orders_summary": {
          const { date_from, date_to } = a;
          const conditions = [];
          if (date_from) conditions.push(gte(schema.orders.createdAt, new Date(date_from)));
          if (date_to) conditions.push(lte(schema.orders.createdAt, new Date(date_to)));
          const byStatus = await db.select({
            status: schema.orders.status,
            count: sql<number>`COUNT(*)`,
            total: sql<number>`SUM(${schema.orders.roundedTotal}::numeric)`,
          }).from(schema.orders).where(conditions.length ? and(...conditions) : undefined)
            .groupBy(schema.orders.status).orderBy(desc(sql`COUNT(*)`));
          const [overall] = await db.select({
            total_orders: sql<number>`COUNT(*)`,
            total_revenue: sql<number>`SUM(CASE WHEN ${schema.orders.status} IN ('delivered','confirmed') THEN ${schema.orders.roundedTotal}::numeric ELSE 0 END)`,
            avg_order_value: sql<number>`AVG(CASE WHEN ${schema.orders.status} IN ('delivered','confirmed') THEN ${schema.orders.roundedTotal}::numeric END)`,
          }).from(schema.orders).where(conditions.length ? and(...conditions) : undefined);
          return text({ by_status: byStatus, overall });
        }

        case "get_customers": {
          const { search, loyalty_tier, limit = 50, offset = 0 } = a;
          const conditions = [isNull(schema.users.deletedAt), eq(schema.users.role, "user")];
          if (loyalty_tier) conditions.push(eq(schema.users.loyaltyTier, loyalty_tier));
          if (search) conditions.push(or(
            ilike(schema.users.fullName, `%${search}%`),
            ilike(schema.users.email, `%${search}%`),
            ilike(schema.users.phone, `%${search}%`),
          ));
          const rows = await db.select({
            id: schema.users.id, email: schema.users.email, fullName: schema.users.fullName,
            phone: schema.users.phone, loyaltyPoints: schema.users.loyaltyPoints,
            loyaltyTier: schema.users.loyaltyTier, cashbackBalance: schema.users.cashbackBalance,
            totalSpent: schema.users.totalSpent, createdAt: schema.users.createdAt,
          }).from(schema.users).where(and(...conditions))
            .orderBy(desc(schema.users.createdAt))
            .limit(Math.min(Number(limit), 200)).offset(Number(offset));
          return text(rows);
        }

        case "get_customer": {
          const { id, email } = a;
          if (!id && !email) throw new Error("يجب توفير id أو email");
          const [user] = await db.select({
            id: schema.users.id, email: schema.users.email, fullName: schema.users.fullName,
            phone: schema.users.phone, loyaltyPoints: schema.users.loyaltyPoints,
            loyaltyTier: schema.users.loyaltyTier, cashbackBalance: schema.users.cashbackBalance,
            totalSpent: schema.users.totalSpent, aquariumProfile: schema.users.aquariumProfile,
            createdAt: schema.users.createdAt,
          }).from(schema.users)
            .where(id ? eq(schema.users.id, id) : eq(schema.users.email, email)).limit(1);
          if (!user) throw new Error("الزبون غير موجود");
          const orders = await db.select({
            id: schema.orders.id, orderNumber: schema.orders.orderNumber,
            status: schema.orders.status, total: schema.orders.roundedTotal, createdAt: schema.orders.createdAt,
          }).from(schema.orders).where(eq(schema.orders.userId, user.id))
            .orderBy(desc(schema.orders.createdAt)).limit(10);
          const cart = await db.select({
            productId: schema.cartItems.productId, quantity: schema.cartItems.quantity,
            variantLabel: schema.cartItems.variantLabel,
          }).from(schema.cartItems).where(eq(schema.cartItems.userId, user.id));
          return text({ customer: user, recent_orders: orders, cart });
        }

        case "get_dashboard_stats": {
          const period = a.period ?? "30d";
          const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
          const since = new Date(); since.setDate(since.getDate() - days);
          const [revenue] = await db.select({
            orders_count: sql<number>`COUNT(*)`,
            revenue: sql<number>`SUM(${schema.orders.roundedTotal}::numeric)`,
            avg_order: sql<number>`AVG(${schema.orders.roundedTotal}::numeric)`,
          }).from(schema.orders).where(and(gte(schema.orders.createdAt, since), sql`${schema.orders.status} IN ('delivered', 'confirmed')`));
          const [pendingOrders] = await db.select({ count: sql<number>`COUNT(*)` }).from(schema.orders).where(eq(schema.orders.status, "pending"));
          const [newCustomers] = await db.select({ count: sql<number>`COUNT(*)` }).from(schema.users).where(and(gte(schema.users.createdAt, since), isNull(schema.users.deletedAt), eq(schema.users.role, "user")));
          const [totalCustomers] = await db.select({ count: sql<number>`COUNT(*)` }).from(schema.users).where(and(isNull(schema.users.deletedAt), eq(schema.users.role, "user")));
          const [totalProducts] = await db.select({ count: sql<number>`COUNT(*)` }).from(schema.products).where(isNull(schema.products.deletedAt));
          const [outOfStock] = await db.select({ count: sql<number>`COUNT(*)` }).from(schema.products).where(and(isNull(schema.products.deletedAt), eq(schema.products.stock, 0)));
          return text({ period, revenue_and_orders: revenue, pending_orders: pendingOrders.count, new_customers_in_period: newCustomers.count, total_customers: totalCustomers.count, total_products: totalProducts.count, out_of_stock_products: outOfStock.count });
        }

        case "get_revenue_breakdown": {
          const period = a.period ?? "30d";
          const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
          const since = new Date(); since.setDate(since.getDate() - days);
          const [breakdown] = await db.select({
            total_orders: sql<number>`COUNT(*)`,
            confirmed_orders: sql<number>`SUM(CASE WHEN ${schema.orders.status} IN ('delivered','confirmed') THEN 1 ELSE 0 END)`,
            total_revenue: sql<number>`SUM(CASE WHEN ${schema.orders.status} IN ('delivered','confirmed') THEN ${schema.orders.roundedTotal}::numeric ELSE 0 END)`,
            total_shipping: sql<number>`SUM(CASE WHEN ${schema.orders.status} IN ('delivered','confirmed') THEN ${schema.orders.shippingCost}::numeric ELSE 0 END)`,
            total_discounts: sql<number>`SUM(CASE WHEN ${schema.orders.status} IN ('delivered','confirmed') THEN ${schema.orders.discountTotal}::numeric ELSE 0 END)`,
            whatsapp_orders: sql<number>`SUM(CASE WHEN ${schema.orders.source} = 'whatsapp' THEN 1 ELSE 0 END)`,
            website_orders: sql<number>`SUM(CASE WHEN ${schema.orders.source} = 'website' THEN 1 ELSE 0 END)`,
          }).from(schema.orders).where(gte(schema.orders.createdAt, since));
          return text({ period, ...breakdown });
        }

        case "get_top_products": {
          const period = a.period ?? "30d";
          const limit = Number(a.limit ?? 10);
          const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
          const since = new Date(); since.setDate(since.getDate() - days);
          const recentOrders = await db.select({ items: schema.orders.items }).from(schema.orders)
            .where(and(gte(schema.orders.createdAt, since), sql`${schema.orders.status} IN ('delivered', 'confirmed')`));
          const sales: Record<string, { qty: number; revenue: number }> = {};
          for (const order of recentOrders) {
            if (!Array.isArray(order.items)) continue;
            for (const item of order.items as any[]) {
              if (!item.productId) continue;
              if (!sales[item.productId]) sales[item.productId] = { qty: 0, revenue: 0 };
              sales[item.productId].qty += Number(item.quantity) || 1;
              sales[item.productId].revenue += (Number(item.priceAtPurchase) || 0) * (Number(item.quantity) || 1);
            }
          }
          const sorted = Object.entries(sales).sort((a, b) => b[1].qty - a[1].qty).slice(0, limit);
          const enriched = await Promise.all(sorted.map(async ([productId, stats]) => {
            const [p] = await db.select({ name: schema.products.name }).from(schema.products).where(eq(schema.products.id, productId)).limit(1);
            return { productId, name: p?.name ?? "غير معروف", ...stats };
          }));
          return text(enriched);
        }

        case "get_reviews": {
          const { product_id, status, min_rating, limit = 50 } = a;
          const conditions = [];
          if (product_id) conditions.push(eq(schema.reviews.productId, product_id));
          if (status) conditions.push(eq(schema.reviews.status, status));
          if (min_rating) conditions.push(gte(schema.reviews.rating, Number(min_rating)));
          const rows = await db.select({
            id: schema.reviews.id, productId: schema.reviews.productId, rating: schema.reviews.rating,
            title: schema.reviews.title, comment: schema.reviews.comment, status: schema.reviews.status,
            verifiedPurchase: schema.reviews.verifiedPurchase, createdAt: schema.reviews.createdAt,
          }).from(schema.reviews)
            .where(conditions.length ? and(...conditions) : undefined)
            .orderBy(desc(schema.reviews.createdAt))
            .limit(Math.min(Number(limit), 100));
          return text(rows);
        }

        case "get_coupons": {
          const rows = await db.select().from(schema.coupons)
            .where(a.active_only ? eq(schema.coupons.isActive, true) : undefined)
            .orderBy(desc(schema.coupons.createdAt));
          return text(rows);
        }

        case "get_expenses": {
          const { category, date_from, date_to, limit = 50 } = a;
          const conditions = [isNull(schema.expenses.deletedAt)];
          if (category) conditions.push(ilike(schema.expenses.category, `%${category}%`));
          if (date_from) conditions.push(gte(schema.expenses.expenseDate, new Date(date_from)));
          if (date_to) conditions.push(lte(schema.expenses.expenseDate, new Date(date_to)));
          const rows = await db.select().from(schema.expenses)
            .where(and(...conditions)).orderBy(desc(schema.expenses.expenseDate))
            .limit(Math.min(Number(limit), 200));
          const [totals] = await db.select({ total: sql<number>`SUM(${schema.expenses.amount}::numeric)` })
            .from(schema.expenses).where(and(...conditions));
          return text({ total: totals.total, expenses: rows });
        }

        case "list_site_data_sources": {
          return text({ dataSources: siteDataSources() });
        }

        case "get_table_schema": {
          const parsed = z.object({ table: z.string().min(1) }).parse(a);
          const entry = findSchemaTable(parsed.table);
          if (!entry) throw new Error(`Unknown or blocked table: ${parsed.table}`);
          return text({
            name: entry.tableName,
            exportName: entry.exportName,
            uri: `aquavo://table/${entry.tableName}`,
            columns: entry.columns.map((column) => ({
              name: column,
              redacted: isSensitiveField(column),
            })),
          });
        }

        case "read_site_table": {
          const parsed = z.object({
            table: z.string().min(1),
            limit: z.number().optional(),
            offset: z.number().optional(),
          }).parse(a);
          return text(await readTableRows(db, parsed.table, parsed.limit, parsed.offset));
        }

        case "get_site_overview": {
          return text(await buildSiteOverview(db));
        }

        case "search": {
          const { query } = a;
          if (!query?.trim()) throw new Error("يجب توفير نص للبحث");
          const q = `%${query}%`;
          const [products_res, orders_res, customers_res] = await Promise.all([
            db.select({ id: schema.products.id, name: schema.products.name, price: schema.products.price, stock: schema.products.stock, category: schema.products.category })
              .from(schema.products).where(and(isNull(schema.products.deletedAt), or(ilike(schema.products.name, q), ilike(schema.products.brand, q)))).limit(10),
            db.select({ id: schema.orders.id, orderNumber: schema.orders.orderNumber, status: schema.orders.status, total: schema.orders.roundedTotal, customerName: schema.orders.customerName, customerPhone: schema.orders.customerPhone, createdAt: schema.orders.createdAt })
              .from(schema.orders).where(or(ilike(schema.orders.customerName, q), ilike(schema.orders.customerPhone, q), ilike(schema.orders.orderNumber, q))).limit(10),
            db.select({ id: schema.users.id, email: schema.users.email, fullName: schema.users.fullName, phone: schema.users.phone })
              .from(schema.users).where(and(isNull(schema.users.deletedAt), or(ilike(schema.users.fullName, q), ilike(schema.users.email, q), ilike(schema.users.phone, q)))).limit(10),
          ]);
          return text({ products: products_res, orders: orders_res, customers: customers_res });
        }

        // ── WRITE TOOLS ──────────────────────────────────────────────────────

        case "update_order_status": {
          const { id, status, note } = a;
          if (!id || !status) throw new Error("id و status مطلوبان");
          const [existing] = await db.select({ id: schema.orders.id, orderNumber: schema.orders.orderNumber, status: schema.orders.status })
            .from(schema.orders).where(eq(schema.orders.id, id)).limit(1);
          if (!existing) throw new Error("الطلب غير موجود");
          await db.update(schema.orders).set({
            status,
            updatedAt: new Date(),
            ...(note ? { adminNotes: note } : {}),
          } as any).where(eq(schema.orders.id, id));
          await recordMcpAudit(db, auth, "update_order_status", "order", id, {
            previousStatus: existing.status,
            newStatus: status,
            note: note ?? null,
          });
          return text({ success: true, orderNumber: existing.orderNumber, previous_status: existing.status, new_status: status });
        }

        case "update_product": {
          const { id, name, price, original_price, stock, description, category, brand, is_best_seller, is_new, low_stock_threshold } = a;
          if (!id) throw new Error("id مطلوب");
          const [existing] = await db.select({ id: schema.products.id, name: schema.products.name }).from(schema.products).where(eq(schema.products.id, id)).limit(1);
          if (!existing) throw new Error("المنتج غير موجود");
          const updates: Record<string, unknown> = { updatedAt: new Date() };
          if (name !== undefined) updates.name = name;
          if (price !== undefined) updates.price = String(price);
          if (original_price !== undefined) updates.originalPrice = String(original_price);
          if (stock !== undefined) updates.stock = Number(stock);
          if (description !== undefined) updates.description = description;
          if (category !== undefined) updates.category = category;
          if (brand !== undefined) updates.brand = brand;
          if (is_best_seller !== undefined) updates.isBestSeller = Boolean(is_best_seller);
          if (is_new !== undefined) updates.isNew = Boolean(is_new);
          if (low_stock_threshold !== undefined) updates.lowStockThreshold = Number(low_stock_threshold);
          await db.update(schema.products).set(updates as any).where(eq(schema.products.id, id));
          await recordMcpAudit(db, auth, "update_product", "product", id, {
            fields: Object.keys(updates),
            updates,
          });
          return text({ success: true, product_id: id, product_name: existing.name, updated_fields: Object.keys(updates) });
        }

        case "update_stock": {
          const { updates } = a;
          if (!Array.isArray(updates) || !updates.length) throw new Error("updates array مطلوب");
          const results = [];
          for (const { id, stock } of updates) {
            if (!id || stock === undefined) continue;
            await db.update(schema.products).set({ stock: Number(stock), updatedAt: new Date() } as any).where(eq(schema.products.id, id));
            results.push({ id, new_stock: Number(stock) });
          }
          await recordMcpAudit(db, auth, "update_stock", "product", "bulk", { updates: results });
          return text({ success: true, updated: results });
        }

        case "create_coupon": {
          const { code, discount_type, discount_value, min_order_amount, max_uses, expires_at, description } = a;
          if (!code || !discount_type || !discount_value) throw new Error("code, discount_type, discount_value مطلوبة");
          const existing = await db.select({ id: schema.coupons.id }).from(schema.coupons).where(eq(schema.coupons.code, String(code).toUpperCase())).limit(1);
          if (existing.length) throw new Error(`الكوبون "${code}" موجود مسبقاً`);
          await db.insert(schema.coupons).values({
            code: String(code).toUpperCase(),
            type: discount_type,           // schema column: type
            value: String(discount_value), // schema column: value
            minOrderAmount: min_order_amount ? String(min_order_amount) : null,
            maxUses: max_uses ? Number(max_uses) : null,
            endDate: expires_at ? new Date(expires_at) : null,
            description: description ?? null,
            isActive: true,
            usedCount: 0,
            createdAt: new Date(),
          } as any);
          await recordMcpAudit(db, auth, "create_coupon", "coupon", String(code).toUpperCase(), {
            code: String(code).toUpperCase(),
            discount_type,
            discount_value,
          });
          return text({ success: true, code: String(code).toUpperCase(), discount_type, discount_value });
        }

        case "toggle_coupon": {
          const { code, active } = a;
          if (!code || active === undefined) throw new Error("code و active مطلوبان");
          const [existing] = await db.select({ id: schema.coupons.id }).from(schema.coupons).where(eq(schema.coupons.code, String(code).toUpperCase())).limit(1);
          if (!existing) throw new Error(`الكوبون "${code}" غير موجود`);
          await db.update(schema.coupons).set({ isActive: Boolean(active) } as any).where(eq(schema.coupons.code, String(code).toUpperCase()));
          await recordMcpAudit(db, auth, "toggle_coupon", "coupon", String(code).toUpperCase(), { active: Boolean(active) });
          return text({ success: true, code, active: Boolean(active) });
        }

        case "add_expense": {
          const { amount, category, description, expense_date } = a;
          if (!amount || !category) throw new Error("amount و category مطلوبان");
          await db.insert(schema.expenses).values({
            amount: String(amount),
            category,
            description: description ?? null,
            expenseDate: expense_date ? new Date(expense_date) : new Date(),
            isRecurring: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as any);
          await recordMcpAudit(db, auth, "add_expense", "expense", "new", {
            amount,
            category,
            description: description ?? null,
          });
          return text({ success: true, amount, category, description });
        }

        case "soft_delete_product": {
          const { id, confirm } = a;
          if (!id) throw new Error("id مطلوب");
          if (!confirm) throw new Error('يجب تعيين confirm: true للتأكيد على الحذف');
          const [existing] = await db.select({ id: schema.products.id, name: schema.products.name }).from(schema.products).where(eq(schema.products.id, id)).limit(1);
          if (!existing) throw new Error("المنتج غير موجود");
          await db.update(schema.products).set({ deletedAt: new Date(), updatedAt: new Date() } as any).where(eq(schema.products.id, id));
          await recordMcpAudit(db, auth, "soft_delete_product", "product", id, { name: existing.name });
          return text({ success: true, deleted_product: { id, name: existing.name } });
        }

        case "restore_product": {
          const { id } = a;
          if (!id) throw new Error("id مطلوب");
          await db.update(schema.products).set({ deletedAt: null, updatedAt: new Date() } as any).where(eq(schema.products.id, id));
          await recordMcpAudit(db, auth, "restore_product", "product", id, {});
          return text({ success: true, restored_product_id: id });
        }

        case "update_review_status": {
          const { id, status } = a;
          if (!id || !status) throw new Error("id و status مطلوبان");
          await db.update(schema.reviews).set({ status } as any).where(eq(schema.reviews.id, id));
          await recordMcpAudit(db, auth, "update_review_status", "review", id, { status });
          return text({ success: true, review_id: id, new_status: status });
        }

        default:
          throw new Error(`أداة غير معروفة: ${name}`);
      }
    } catch (e) {
      console.error(`[MCP ERROR] tool=${name}`, e);
      return err(`خطأ: ${e instanceof Error ? e.message : "خطأ داخلي"}`);
    }
  });

  return server;
}

// ─── Express Router ────────────────────────────────────────────────────────────

export function createMcpRouter(): RouterType {
  const router = Router();

  // Health check (no auth)
  router.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", server: "aquavo-store", version: "2.0.0", resource: MCP_RESOURCE });
  });

  // CORS preflight for all MCP requests
  router.options("/", enforceMcpRequestBoundary, (_req: Request, res: Response) => {
    res.sendStatus(204);
  });

  router.use(enforceMcpRequestBoundary);

  // Auth on all other requests
  router.use(mcpAuth);

  // Stateless Streamable HTTP. Vercel/serverless cannot rely on in-memory MCP sessions.
  router.post("/", async (req: McpRequest, res: Response) => {
    try {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });
      const mcpServer = buildMcpServer(req.mcpAuth ?? {
        clientId: "unknown",
        mode: "static",
        scopes: new Set(),
      });
      await mcpServer.connect(transport);
      res.on("close", () => {
        void transport.close();
        void mcpServer.close();
      });
      await transport.handleRequest(req, res, req.body);
    } catch (e) {
      console.error("[MCP route error]", e);
      if (!res.headersSent) res.status(500).json({ error: "Internal error" });
    }
  });

  router.all("/", (_req: Request, res: Response) => {
    res.status(405).json({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32000, message: "Method not allowed. Use POST for AQUAVO MCP Streamable HTTP." },
    });
  });

  return router;
}
