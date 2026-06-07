import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { db } from "../db";
import { products, users, orders, orderItems } from "../../shared/schema";
import { sql, desc, eq } from "drizzle-orm";

// Create the MCP Server
export const server = new Server(
  { name: "aquavo-store-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// Define Tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_store_analytics",
        description: "Get basic analytics for the store (total users, products, orders).",
        inputSchema: { type: "object", properties: {} }
      },
      {
        name: "get_all_products",
        description: "Get a list of products with optional limit.",
        inputSchema: {
          type: "object",
          properties: {
            limit: { type: "number", description: "Maximum number of products to return" }
          }
        }
      },
      {
        name: "update_product_price",
        description: "Update the price of a specific product by its ID.",
        inputSchema: {
          type: "object",
          properties: {
            productId: { type: "string" },
            newPrice: { type: "string" }
          },
          required: ["productId", "newPrice"]
        }
      },
      {
        name: "update_product_stock",
        description: "Update the stock count of a specific product.",
        inputSchema: {
          type: "object",
          properties: {
            productId: { type: "string" },
            newStock: { type: "number" }
          },
          required: ["productId", "newStock"]
        }
      },
      {
        name: "get_social_insights_from_analyzer",
        description: "Connects to the local Social Analyzer to fetch Instagram/Facebook data.",
        inputSchema: { type: "object", properties: {} }
      }
    ],
  };
});

// Handle Tool Executions
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    if (request.params.name === "get_store_analytics") {
      const usersCount = await db.select({ count: sql<number>`count(*)` }).from(users);
      const productsCount = await db.select({ count: sql<number>`count(*)` }).from(products);
      const ordersCount = await db.select({ count: sql<number>`count(*)` }).from(orders);
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            total_users: usersCount[0].count,
            total_products: productsCount[0].count,
            total_orders: ordersCount[0].count,
            timestamp: new Date().toISOString()
          }, null, 2)
        }]
      };
    }

    if (request.params.name === "get_all_products") {
      const args = request.params.arguments || {};
      const limit = Number(args.limit) || 50;
      
      const allProducts = await db.query.products.findMany({
        limit,
        orderBy: [desc(products.createdAt)],
        columns: {
          id: true,
          name: true,
          brand: true,
          price: true,
          stock: true,
          category: true,
          isBestSeller: true
        }
      });
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify(allProducts, null, 2)
        }]
      };
    }

    if (request.params.name === "update_product_price") {
      const { productId, newPrice } = request.params.arguments as any;
      
      const updated = await db.update(products)
        .set({ price: newPrice, updatedAt: new Date() })
        .where(eq(products.id, productId))
        .returning();
        
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, updated: updated[0] }, null, 2) }]
      };
    }

    if (request.params.name === "update_product_stock") {
      const { productId, newStock } = request.params.arguments as any;
      
      const updated = await db.update(products)
        .set({ stock: newStock, updatedAt: new Date() })
        .where(eq(products.id, productId))
        .returning();
        
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, updated: updated[0] }, null, 2) }]
      };
    }

    if (request.params.name === "get_social_insights_from_analyzer") {
      try {
        // الاتصال بمحلل السوشيال ميديا الموجود على الديسكتوب
        const res = await fetch("http://localhost:3001/api/instagram/videos");
        const data = await res.json();
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
        };
      } catch (err: any) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: "Social Analyzer server might be offline. Please run 'npm run dev' inside AQUAVO_Social_Analyzer.", details: err.message }, null, 2) }]
        };
      }
    }

    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
  } catch (error: any) {
    return {
      content: [{ type: "text", text: JSON.stringify({ error: error.message }, null, 2) }]
    };
  }
});

// Run server
export async function runMcpServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("AQUAVO Store MCP Server is running!");
}

// Automatically start if run directly
if (require.main === module || process.argv.includes('--mcp')) {
  runMcpServer().catch(console.error);
}
