import { createHash } from "crypto";
import type { Request, Response, Router as RouterType } from "express";
import { Router } from "express";

const SITE = (process.env.AQUAVO_BASE_URL ?? "https://www.aquavoiq.com").replace(/\/$/, "");
const MCP_RESOURCE = `${SITE}/api/mcp`;
const MCP_RESOURCE_METADATA = `${SITE}/.well-known/oauth-protected-resource/api/mcp`;
const CATALOG_SKILL = "---\nname: aquavo-public-catalog\ndescription: Discover AQUAVO aquarium products and compatibility guidance using public, non-sensitive endpoints.\n---\n\n# AQUAVO public catalog\n\nUse AQUAVO for freshwater aquarium equipment and supplies in Iraq.\n\n## Public sources\n- Product catalog: https://www.aquavoiq.com/api/products\n- Tank-size fit guidance: https://www.aquavoiq.com/api/products/fit?litres=60\n- Website: https://www.aquavoiq.com/\n- Guides: https://www.aquavoiq.com/guides\n\n## Rules\n- Treat price, stock, dimensions, ratings, and specifications as live data. Read them from AQUAVO instead of inventing them.\n- Do not use admin, checkout, cart, profile, invoice, or other private routes.\n- When product suitability is uncertain, say so rather than inferring an unsupported specification.\n";
const OPERATOR_SKILL = "---\nname: aquavo-store-operator\ndescription: Connect an authorized AI client to the AQUAVO MCP server for store operations through OAuth 2.1.\n---\n\n# AQUAVO store operator\n\nThe protected MCP resource is https://www.aquavoiq.com/api/mcp.\n\n## Authentication\n1. Read protected-resource metadata at https://www.aquavoiq.com/.well-known/oauth-protected-resource/api/mcp.\n2. Read authorization-server metadata at https://www.aquavoiq.com/.well-known/oauth-authorization-server.\n3. Register a client through the advertised Dynamic Client Registration endpoint.\n4. Use Authorization Code with PKCE S256.\n5. Send the resulting Bearer token to the MCP Streamable HTTP endpoint.\n\n## Safety\n- Request only the scopes needed for the task.\n- Never expose bearer tokens, refresh tokens, customer secrets, or private database fields.\n- Use MCP runtime tool and resource discovery as authoritative; static discovery metadata is advisory.\n";

function digest(value: string): string {
  return `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`;
}

function publicDocument(res: Response, contentType: string): void {
  res.setHeader("Content-Type", contentType);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
}

const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "AQUAVO Public and Agent API",
    version: "1.0.0",
    description: "Public AQUAVO product discovery plus the protected MCP transport used by authorized AI clients.",
  },
  servers: [{ url: SITE }],
  paths: {
    "/health": {
      get: {
        summary: "Service health",
        operationId: "getHealth",
        responses: { "200": { description: "Service is healthy" } },
      },
    },
    "/api/products": {
      get: {
        summary: "List public AQUAVO products",
        operationId: "listProducts",
        parameters: [
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "category", in: "query", schema: { type: "string" } },
          { name: "brand", in: "query", schema: { type: "string" } },
          { name: "minPrice", in: "query", schema: { type: "number" } },
          { name: "maxPrice", in: "query", schema: { type: "number" } },
        ],
        responses: { "200": { description: "Public product catalog response" } },
      },
    },
    "/api/products/fit": {
      get: {
        summary: "Find catalog items whose published specifications fit a tank volume",
        operationId: "fitProductsToTank",
        parameters: [
          { name: "litres", in: "query", required: true, schema: { type: "number", minimum: 10, maximum: 2000 } },
        ],
        responses: {
          "200": { description: "Specification-backed fit groups" },
          "400": { description: "Invalid tank volume" },
        },
      },
    },
    "/api/mcp": {
      post: {
        summary: "AQUAVO MCP Streamable HTTP transport",
        description: "Protected Model Context Protocol endpoint. Discover OAuth using RFC 9728 protected-resource metadata.",
        operationId: "mcpTransport",
        security: [{ aquavoOAuth: ["mcp"] }],
        responses: {
          "200": { description: "MCP JSON response" },
          "401": { description: "OAuth authorization required" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      aquavoOAuth: {
        type: "oauth2",
        flows: {
          authorizationCode: {
            authorizationUrl: `${SITE}/oauth/authorize`,
            tokenUrl: `${SITE}/oauth/token`,
            scopes: {
              mcp: "AQUAVO MCP access",
              "mcp:read": "Read AQUAVO MCP resources",
              "mcp:write": "Use authorized AQUAVO MCP write tools",
            },
          },
        },
      },
    },
  },
};

const apiCatalog = {
  linkset: [
    {
      anchor: `${SITE}/api`,
      "service-desc": [
        { href: `${SITE}/openapi.json`, type: "application/vnd.oai.openapi+json;version=3.1" },
      ],
      "service-doc": [
        { href: `${SITE}/auth.md`, type: "text/markdown" },
      ],
      status: [
        { href: `${SITE}/health`, type: "application/json" },
      ],
    },
    {
      anchor: MCP_RESOURCE,
      "service-desc": [
        { href: `${SITE}/api/mcp/server-card`, type: "application/mcp-server-card+json" },
      ],
      "service-doc": [
        { href: `${SITE}/auth.md`, type: "text/markdown" },
      ],
    },
  ],
};

const currentMcpServerCard = {
  $schema: "https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json",
  name: "com.aquavoiq/aquavo-store",
  version: "2.0.0",
  title: "AQUAVO Store",
  description: "Authorized AQUAVO store operations for products, inventory, orders, customers, and analytics.",
  websiteUrl: SITE,
  repository: {
    url: "https://github.com/JAAFAR1996/AQUAVO",
    source: "github",
    id: "1107721882",
  },
  remotes: [
    {
      type: "streamable-http",
      url: MCP_RESOURCE,
    },
  ],
};

const scannerCompatibleMcpCard = {
  serverInfo: { name: "aquavo-store", version: "2.0.0" },
  transport: { type: "streamable-http", endpoint: MCP_RESOURCE },
  capabilities: { tools: true, resources: true, prompts: true },
  authentication: {
    type: "oauth2",
    protectedResourceMetadata: MCP_RESOURCE_METADATA,
    authorizationServerMetadata: `${SITE}/.well-known/oauth-authorization-server`,
  },
};

const skillsIndex = {
  $schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
  skills: [
    {
      name: "aquavo-public-catalog",
      type: "skill-md",
      description: "Discover AQUAVO products and specification-backed tank fit guidance.",
      url: `${SITE}/.well-known/agent-skills/aquavo-public-catalog/SKILL.md`,
      digest: digest(CATALOG_SKILL),
    },
    {
      name: "aquavo-store-operator",
      type: "skill-md",
      description: "Connect authorized AI clients to AQUAVO store operations using MCP and OAuth 2.1.",
      url: `${SITE}/.well-known/agent-skills/aquavo-store-operator/SKILL.md`,
      digest: digest(OPERATOR_SKILL),
    },
  ],
};

const ardCatalog = {
  specVersion: "1.0",
  host: {
    id: "aquavoiq.com",
    displayName: "AQUAVO",
    url: SITE,
  },
  entries: [
    {
      identifier: "urn:air:aquavoiq.com:mcp:aquavo-store",
      displayName: "AQUAVO Store MCP",
      type: "application/mcp-server-card+json",
      url: `${SITE}/api/mcp/server-card`,
      description: "Authorized AQUAVO products, inventory, orders, customers, and analytics MCP server.",
      representativeQueries: [
        "Show AQUAVO inventory that is low in stock.",
        "Find AQUAVO products matching an aquarium requirement.",
        "Review an AQUAVO order through the authorized store connection.",
        "Summarize AQUAVO store performance using authorized data.",
      ],
    },
    {
      identifier: "urn:air:aquavoiq.com:api:public-catalog",
      displayName: "AQUAVO Public API",
      type: "application/json",
      url: `${SITE}/openapi.json`,
      description: "Public product catalog and specification-backed aquarium equipment fit endpoints.",
      representativeQueries: [
        "Search the AQUAVO public product catalog.",
        "Find equipment whose published specifications fit a 60 litre aquarium.",
      ],
    },
    {
      identifier: "urn:air:aquavoiq.com:a2a:catalog-agent",
      displayName: "AQUAVO Catalog A2A Agent",
      type: "application/json",
      url: `${SITE}/.well-known/agent-card.json`,
      description: "Read-only A2A 1.0 agent for public AQUAVO product discovery.",
      representativeQueries: [
        "Search AQUAVO for aquarium filters.",
        "Find a named aquarium product in the AQUAVO catalog.",
      ],
    },
  ],
};

const authMarkdown = `# AQUAVO Auth.md — Agent Authentication

AQUAVO exposes two deliberately separate authentication surfaces:

1. **Anonymous agent catalog access** — self-registration with the narrow \`catalog:read\` scope. It can read only AQUAVO's sanitized public product catalog.
2. **Operator MCP access** — OAuth Authorization Code + PKCE with explicit human/admin approval. This is the only route to orders, customers, inventory operations, analytics, or writes.

Never treat an anonymous catalog credential as an MCP/admin credential.

## Discover

Protected Resource Metadata for the anonymous catalog:
- ${SITE}/.well-known/oauth-protected-resource/api/agent/catalog

Protected Resource Metadata for operator MCP:
- ${MCP_RESOURCE_METADATA}

Authorization Server Metadata:
- ${SITE}/.well-known/oauth-authorization-server

The Authorization Server Metadata contains the machine-readable \`agent_auth\` block. AQUAVO currently advertises exactly one autonomous identity type: \`anonymous\`.

## Anonymous agent registration

Registration endpoint:
- POST ${SITE}/agent/auth/register

Request:

\`\`\`json
{
  "type": "anonymous",
  "requested_credential_type": "access_token"
}
\`\`\`

The response returns:
- \`registration_id\`
- \`registration_type: "anonymous"\`
- \`access_token\`
- \`token_type: "Bearer"\`
- \`expires_in\`
- \`scope: "catalog:read"\`
- \`resource: "${SITE}/api/agent/catalog"\`

AQUAVO does not advertise identity-assertion or service-auth registration, and it does not advertise a claim ceremony for this anonymous catalog tier.

## Use the anonymous credential

Call:

\`\`\`http
GET /api/agent/catalog?search=filter
Authorization: Bearer <access_token>
\`\`\`

Optional query parameters are \`search\`, \`category\`, \`brand\`, and \`limit\`.

The credential can only access the sanitized public product boundary. It cannot access \`/api/mcp\`, customer data, orders, internal cost fields, admin routes, or write operations.

Anonymous catalog access tokens are short-lived. When one expires, discard it and register again.

## Operator MCP authentication

For authorized store operations, use the separate OAuth flow:

1. Dynamic Client Registration:
   - POST ${SITE}/oauth/register
2. Authorization Code + PKCE S256:
   - GET/POST ${SITE}/oauth/authorize
3. Token exchange:
   - POST ${SITE}/oauth/token
4. Protected MCP resource:
   - ${MCP_RESOURCE}

The MCP OAuth flow requires explicit human/admin approval. Request only the scopes needed for the task: \`mcp\`, \`mcp:read\`, or \`mcp:write\`.

## Errors

Anonymous catalog requests without a valid credential return HTTP 401 with a Bearer challenge. Unsupported autonomous identity or credential types return HTTP 400 with the supported values.

Operator MCP requests without valid authorization return HTTP 401 and a \`WWW-Authenticate\` header pointing to RFC 9728 Protected Resource Metadata.
`

function sendJson(res: Response, value: unknown, contentType = "application/json; charset=utf-8"): void {
  publicDocument(res, contentType);
  res.send(JSON.stringify(value));
}

function sendServerCard(req: Request, res: Response): void {
  const body = JSON.stringify(currentMcpServerCard);
  const etag = `"${createHash("sha256").update(body).digest("hex")}"`;
  if (req.get("if-none-match") === etag) {
    res.status(304).end();
    return;
  }
  publicDocument(res, "application/mcp-server-card+json; charset=utf-8");
  res.setHeader("ETag", etag);
  res.setHeader("Access-Control-Allow-Methods", "GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, If-None-Match");
  res.setHeader("Access-Control-Expose-Headers", "ETag");
  res.send(body);
}

export function createAgentDiscoveryRouter(): RouterType {
  const router = Router();

  router.get("/.well-known/api-catalog", (_req, res) => {
    sendJson(res, apiCatalog, 'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"; charset=utf-8');
  });

  router.get(["/openapi.json", "/.well-known/openapi.json"], (_req, res) => {
    sendJson(res, openApiDocument, "application/vnd.oai.openapi+json;version=3.1; charset=utf-8");
  });

  router.get("/api/mcp/server-card", sendServerCard);
  router.get("/.well-known/mcp/server-card.json", (_req, res) => {
    sendJson(res, scannerCompatibleMcpCard, "application/json; charset=utf-8");
  });
  router.get("/.well-known/mcp/server-cards.json", (_req, res) => {
    sendJson(res, { servers: [currentMcpServerCard] }, "application/json; charset=utf-8");
  });
  router.get("/.well-known/mcp.json", sendServerCard);

  router.get(["/.well-known/agent-skills/index.json", "/.well-known/skills/index.json"], (_req, res) => {
    sendJson(res, skillsIndex, "application/json; charset=utf-8");
  });
  router.get("/.well-known/agent-skills/aquavo-public-catalog/SKILL.md", (_req, res) => {
    publicDocument(res, "text/markdown; charset=utf-8");
    res.send(CATALOG_SKILL);
  });
  router.get("/.well-known/agent-skills/aquavo-store-operator/SKILL.md", (_req, res) => {
    publicDocument(res, "text/markdown; charset=utf-8");
    res.send(OPERATOR_SKILL);
  });

  router.get(["/.well-known/ard.json", "/.well-known/ai-catalog.json"], (_req, res) => {
    sendJson(res, ardCatalog, "application/json; charset=utf-8");
  });

  router.get("/auth.md", (_req, res) => {
    publicDocument(res, "text/markdown; charset=utf-8");
    res.send(authMarkdown);
  });

  return router;
}
