import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializeClientEnvSideEffects } from "./lib/config/env";

initializeClientEnvSideEffects();

function enableDeferredAppStyles() {
  document.querySelectorAll<HTMLLinkElement>("link[data-app-css]").forEach((link) => {
    link.media = "all";
  });
}

function enableDeferredFonts() {
  document.querySelectorAll<HTMLLinkElement>("link[data-deferred-font]").forEach((link) => {
    link.media = "all";
  });
}

enableDeferredAppStyles();

const deferFontTimer = window.setTimeout(() => {
  const requestIdleCallback = (window as any).requestIdleCallback as
    | ((callback: () => void, options?: { timeout: number }) => number)
    | undefined;

  if (requestIdleCallback) {
    requestIdleCallback(enableDeferredFonts, { timeout: 2500 });
  } else {
    enableDeferredFonts();
  }
}, 1500);

window.addEventListener("pagehide", () => window.clearTimeout(deferFontTimer), { once: true });

createRoot(document.getElementById("root")!).render(<App />);

// WebMCP: Register site tools for AI agents
if (typeof navigator !== "undefined" && "modelContext" in navigator) {
  try {
    const mc = (navigator as any).modelContext;
    if (mc && typeof mc.provideContext === "function") {
      mc.provideContext({
        tools: [
          {
            name: "search-products",
            description: "Search AQUAVO aquarium products by name, category, or brand. Returns product listings with prices in Iraqi Dinar (IQD).",
            inputSchema: {
              type: "object",
              properties: {
                query: { type: "string", description: "Search query for products" },
                category: { type: "string", description: "Product category filter" }
              }
            },
            execute: async (input: any) => {
              const params = new URLSearchParams();
              if (input.query) params.set("search", input.query);
              if (input.category) params.set("category", input.category);
              const res = await fetch(`/api/products?${params}`);
              return await res.json();
            }
          },
          {
            name: "get-fish-species",
            description: "Get information about fish species including care guides, compatibility, tank requirements, and breeding tips.",
            inputSchema: {
              type: "object",
              properties: {
                name: { type: "string", description: "Fish species name to search for" }
              }
            },
            execute: async (input: any) => {
              const res = await fetch(`/api/fish${input.name ? `?search=${input.name}` : ""}`);
              return await res.json();
            }
          },
          {
            name: "track-order",
            description: "Track an AQUAVO order by order number. Returns order status and estimated delivery.",
            inputSchema: {
              type: "object",
              properties: {
                orderNumber: { type: "string", description: "Order number (e.g., FW-260424-0001)" }
              },
              required: ["orderNumber"]
            },
            execute: async (input: any) => {
              const res = await fetch(`/api/orders/track/${input.orderNumber}`);
              return await res.json();
            }
          }
        ]
      });
    }
  } catch (e) {
    // WebMCP not supported — silently ignore
  }
}
