import { useEffect } from "react";
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
import { captureAttributionFromUrl } from "./lib/attribution";

// Production entry includes the merged immersive Journey and loading experience.
initializeClientEnvSideEffects();

// Capture campaign parameters SYNCHRONOUSLY, before React mounts and before the router has any chance
// to replace the URL. PostHog itself is initialised lazily (requestIdleCallback, 3s fallback in
// App.tsx) — waiting for that would mean reading ?fbclid=... from a URL the SPA may already have
// rewritten. This only writes to localStorage; it sends nothing and loads nothing.
captureAttributionFromUrl();

// Arm the semantic-to-client handoff before React starts. The previous cleanup
// depended only on a React effect, so a delayed/suspended first commit could leave
// the crawlable #seo-root visible above an otherwise working application. This
// observer removes it as soon as React inserts a real element into #root.
function armSemanticShellHandoff(): () => void {
  const semanticRoot = document.getElementById("seo-root");
  const clientRoot = document.getElementById("root");
  if (!semanticRoot || !clientRoot || typeof MutationObserver === "undefined") {
    return () => undefined;
  }

  let observer: MutationObserver | null = null;
  const completeHandoff = (): boolean => {
    if (clientRoot.childElementCount === 0) return false;
    clientRoot.setAttribute("data-aq-client-ready", "true");
    semanticRoot.setAttribute("aria-hidden", "true");
    semanticRoot.remove();
    observer?.disconnect();
    observer = null;
    return true;
  };

  observer = new MutationObserver(() => {
    completeHandoff();
  });
  observer.observe(clientRoot, { childList: true });
  completeHandoff();

  return () => {
    observer?.disconnect();
    observer = null;
  };
}

const stopSemanticShellHandoff = armSemanticShellHandoff();

// Keep an effect-level fallback as a second guard. No-JS users and crawlers retain
// the semantic document; JS users lose it only after the real app has committed.
function SemanticShellCleanup() {
  useEffect(() => {
    const semanticRoot = document.getElementById("seo-root");
    const clientRoot = document.getElementById("root");
    clientRoot?.setAttribute("data-aq-client-ready", "true");
    if (!semanticRoot) {
      stopSemanticShellHandoff();
      return;
    }

    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        semanticRoot.remove();
        stopSemanticShellHandoff();
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
      stopSemanticShellHandoff();
    };
  }, []);

  return null;
}

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
    <SemanticShellCleanup />
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
  } catch {
    // WebMCP not supported — silently ignore
  }
}
