import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./styles/aquavo-ui-fixes.css";
import "./styles/mobile-product-cleanup.css";
import "./styles/motion-tokens.css";
import "./styles/experience-polish.css";
import "./styles/experience-safety.css";
import { FirstDiveIntro } from "./components/effects/first-dive-intro";
import { DisplacementRuntime } from "./components/motion/displacement-runtime";
import { initializeClientEnvSideEffects } from "./lib/config/env";

// Production entry includes the merged immersive Journey and loading experience.
initializeClientEnvSideEffects();

// The previous init screen blocked first paint for a fixed half-second. Keep its
// legacy branch bypassed while FirstDiveIntro runs over an already rendered app.
try {
  window.sessionStorage.setItem("aq_init", "1");
} catch {
  // Storage can be unavailable in private/sandboxed contexts.
}

createRoot(document.getElementById("root")!).render(
  <>
    <App />
    <FirstDiveIntro />
    <DisplacementRuntime />
  </>,
);

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
            description: "Track an AQUAVO order using its order number and the last four customer phone digits.",
            inputSchema: {
              type: "object",
              properties: {
                orderNumber: { type: "string", description: "Order number (e.g., FW-260424-0001)" },
                phoneLast4: { type: "string", description: "Last four digits of the phone used for the order" }
              },
              required: ["orderNumber", "phoneLast4"]
            },
            execute: async (input: { orderNumber: string; phoneLast4: string }) => {
              const res = await fetch(`/api/orders/track/${encodeURIComponent(input.orderNumber)}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phoneLast4: input.phoneLast4 }),
              });
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
