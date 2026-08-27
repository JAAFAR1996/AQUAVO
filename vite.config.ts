import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { metaImagesPlugin } from "./vite-plugin-meta-images";
import viteCompression from "vite-plugin-compression";
import { visualizer } from "rollup-plugin-visualizer";

const isProduction = process.env.NODE_ENV === "production";

const getVendorChunkName = (id: string): string | null => {
  if (id.includes("commonjsHelpers")) return "vendor-commonjs";
  if (!id.includes("node_modules")) return null;

  const moduleId = id.replace(/\\/g, "/");
  const includesPackage = (packageName: string) =>
    moduleId.includes(`/node_modules/${packageName}/`) ||
    moduleId.includes(`/node_modules/.pnpm/${packageName.replace("/", "+")}@`);

  if (
    includesPackage("react") ||
    includesPackage("react-dom") ||
    includesPackage("scheduler")
  ) {
    return "vendor-react";
  }

  if (
    [
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
      "@radix-ui/react-popover",
      "@radix-ui/react-accordion",
    ].some(includesPackage)
  ) {
    return "vendor-ui";
  }

  if (includesPackage("lucide-react")) return "vendor-icons";
  if (includesPackage("framer-motion")) return "vendor-animation";

  // Only packages the eager entry actually needs belong here. `vendor-utils`
  // is a static import of the entry, so anything named here is downloaded,
  // parsed and compiled on every route.
  //
  // `zod` and `date-fns` used to be in this list and are deliberately not:
  // zod's only importers are client/src/components/admin/*, the admin-only
  // hooks/use-packaging.ts, and lib/validations.ts (which nothing imports at
  // all), while date-fns is imported solely by two admin panels and the blog
  // components. Every one of those sits behind a React.lazy route boundary in
  // App.tsx, whose single static page import is Home. Naming them here pinned
  // 75 KB raw / ~18 KB brotli of admin-only code into the critical path of
  // every storefront page load. Left unnamed, they fall to the bundler's
  // default splitting and land in chunks reachable only from those routes.
  if (
    [
      "@tanstack/react-query",
      "wouter",
      "clsx",
      "tailwind-merge",
    ].some(includesPackage)
  ) {
    return "vendor-utils";
  }

  return null;
};

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    metaImagesPlugin(),
    // Gzip compression for 60-80% file size reduction
    viteCompression({
      algorithm: "gzip",
      ext: ".gz",
      threshold: 1024, // Only compress files > 1KB
    }),
    // Brotli compression (better than gzip, supported by modern browsers)
    viteCompression({
      algorithm: "brotliCompress",
      ext: ".br",
      threshold: 1024,
    }),
    // Bundle analyzer - generates stats.html after build
    visualizer({
      filename: "dist/stats.html",
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  css: {
    postcss: {
      plugins: [],
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 500,
    // "hidden" generates .map files but does NOT serve them publicly.
    // Sentry reads them during upload (if configured later); browsers never get them.
    sourcemap: isProduction ? "hidden" : true,
    // Disable automatic modulepreload hints — they force browser to fetch
    // ALL chunks (including vendor-charts 110KB, vendor-animation 44KB) on every page.
    // Chunks will still load on-demand when their importing code executes.
    modulePreload: false,
    // Enable CSS code splitting for better caching
    cssCodeSplit: true,
    minify: "oxc",
    target: "baseline-widely-available",
    rolldownOptions: {
      output: {
        minify: isProduction
          ? {
              compress: {
                dropConsole: true,
                dropDebugger: true,
              },
            }
          : "dce-only",
        codeSplitting: {
          groups: [
            {
              name: getVendorChunkName,
              test: (id) => id.includes("commonjsHelpers") || id.includes("node_modules"),
            },
          ],
        },
        // Asset file naming for better caching
        assetFileNames: "assets/[name]-[hash][extname]",
        chunkFileNames: "chunks/[name]-[hash].js",
        entryFileNames: "entries/[name]-[hash].js",
      },
    },
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
