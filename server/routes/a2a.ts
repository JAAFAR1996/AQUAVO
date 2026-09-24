import { randomUUID } from "crypto";
import type { Request, Response, Router as RouterType } from "express";
import { Router } from "express";
import { storage } from "../storage/index.js";
import { toPublicProducts } from "../../shared/public-product.js";

const SITE = (process.env.AQUAVO_BASE_URL ?? "https://www.aquavoiq.com").replace(/\/$/, "");
const A2A_BASE = `${SITE}/api/a2a`;

const agentCard = {
  name: "AQUAVO Catalog Agent",
  description:
    "Read-only AQUAVO agent for discovering public freshwater aquarium products sold in Iraq.",
  version: "1.0.0",

  // A2A 1.0 interface declaration.
  supportedInterfaces: [
    {
      url: A2A_BASE,
      protocolBinding: "HTTP+JSON",
      protocolVersion: "1.0",
    },
  ],

  // Compatibility fields used by earlier A2A clients and discovery scanners.
  url: A2A_BASE,
  protocolVersion: "1.0",
  preferredTransport: "HTTP+JSON",

  provider: {
    organization: "AQUAVO",
    url: SITE,
  },
  documentationUrl: `${SITE}/.well-known/agent-skills/aquavo-public-catalog/SKILL.md`,
  capabilities: {
    streaming: false,
    pushNotifications: false,
    extendedAgentCard: false,
  },
  defaultInputModes: ["text/plain"],
  defaultOutputModes: ["text/plain"],
  skills: [
    {
      id: "search-products",
      name: "Search AQUAVO products",
      description:
        "Search the public AQUAVO catalog and return sanitized product names, prices, stock availability, and product URLs.",
      tags: ["aquarium", "products", "catalog", "iraq", "freshwater"],
      examples: [
        "Search for aquarium filters",
        "Find EHEIM products",
        "Search for a 100W heater",
      ],
      inputModes: ["text/plain"],
      outputModes: ["text/plain"],
    },
  ],
};

function setPublicHeaders(res: Response, contentType = "application/json; charset=utf-8"): void {
  res.setHeader("Content-Type", contentType);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
  res.setHeader("A2A-Version", "1.0");
}

function setMessageHeaders(res: Response): void {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("A2A-Version", "1.0");
}

function textFromMessage(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const message = (body as Record<string, unknown>).message;
  if (!message || typeof message !== "object") return "";
  const parts = (message as Record<string, unknown>).parts;
  if (!Array.isArray(parts)) return "";

  return parts
    .map((part) => {
      if (!part || typeof part !== "object") return "";
      const text = (part as Record<string, unknown>).text;
      return typeof text === "string" ? text : "";
    })
    .filter(Boolean)
    .join(" ")
    .trim();
}

function normalizeSearch(text: string): string {
  return text
    .replace(/^(?:search(?:\s+for)?|find|look\s+for|ابحث\s+عن|دور\s+على|أريد|اريد)\s+/iu, "")
    .trim()
    .slice(0, 160);
}

function safeString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  return fallback;
}

function buildCatalogReply(products: Record<string, unknown>[], query: string): string {
  if (products.length === 0) {
    return [
      `No direct AQUAVO catalog match was found for "${query}".`,
      `Browse the public catalog at ${SITE}/products or refine the product name, brand, or category.`,
      "Only published AQUAVO catalog data is used; no product specification is invented.",
    ].join("\n");
  }

  const lines = products.slice(0, 5).map((product) => {
    const name = safeString(product.name, "Unnamed product");
    const price = safeString(product.price, "price unavailable");
    const currency = safeString(product.currency, "IQD");
    const stock = safeString(product.stock, "unknown");
    const slug = safeString(product.slug);
    const url = slug ? `${SITE}/products/${encodeURIComponent(slug)}` : `${SITE}/products`;
    return `- ${name} — ${price} ${currency} — stock: ${stock} — ${url}`;
  });

  return [
    `AQUAVO public catalog matches for "${query}":`,
    ...lines,
    "Data above comes from AQUAVO's sanitized public product boundary.",
  ].join("\n");
}

function problem(res: Response, status: number, title: string, detail: string): void {
  res.status(status);
  res.setHeader("Content-Type", "application/problem+json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");
  res.json({ type: "about:blank", title, status, detail });
}

export function createA2ARouter(): RouterType {
  const router = Router();

  router.get(["/.well-known/agent-card.json", "/api/a2a/card"], (_req, res) => {
    setPublicHeaders(res);
    res.json(agentCard);
  });

  // A2A 1.0 HTTP+JSON Send Message. This service deliberately returns a direct
  // Message and creates no asynchronous task because public catalog search is immediate.
  router.post("/api/a2a/message:send", async (req: Request, res: Response): Promise<void> => {
    const rawText = textFromMessage(req.body);
    const query = normalizeSearch(rawText);

    if (!query) {
      problem(
        res,
        400,
        "Invalid A2A message",
        "message.parts must contain at least one non-empty text part.",
      );
      return;
    }

    try {
      const rawProducts = await storage.getProducts({ search: query, limit: 5 });
      const products = toPublicProducts(rawProducts);
      const incomingMessage =
        req.body && typeof req.body === "object"
          ? (req.body as Record<string, any>).message
          : undefined;
      const contextId =
        incomingMessage && typeof incomingMessage.contextId === "string"
          ? incomingMessage.contextId
          : randomUUID();

      setMessageHeaders(res);
      res.json({
        message: {
          messageId: randomUUID(),
          contextId,
          role: "ROLE_AGENT",
          parts: [
            {
              text: buildCatalogReply(products, query),
              mediaType: "text/plain",
            },
          ],
        },
      });
    } catch (error) {
      console.error("A2A catalog search failed:", error);
      problem(res, 500, "A2A catalog search failed", "The public catalog could not be queried.");
    }
  });

  // This read-only agent never creates tasks. Expose honest task semantics rather
  // than advertising storage, cancellation, streaming, or push capabilities it does not implement.
  router.get("/api/a2a/tasks", (_req, res) => {
    setMessageHeaders(res);
    res.json({ tasks: [], nextPageToken: "", pageSize: 0, totalSize: 0 });
  });

  router.get("/api/a2a/tasks/:id", (req, res) => {
    problem(res, 404, "A2A task not found", `No task exists with id "${req.params.id}".`);
  });

  router.post("/api/a2a/tasks/:id:cancel", (req, res) => {
    problem(res, 404, "A2A task not found", `No task exists with id "${req.params.id}".`);
  });

  return router;
}
