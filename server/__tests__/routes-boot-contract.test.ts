/**
 * Boot contract for server/routes.ts.
 *
 * Production incident (2026-08-06): `app.use("/api/admin/packaging", cartonOnboardingRouter())`
 * invoked an Express Router *instance* as if it were a factory. Express routers are callable
 * middleware `(req, res, next)`, so calling one with no arguments runs it with `req === undefined`
 * and throws `TypeError: Cannot read properties of undefined (reading 'method')` at import time.
 * That escaped `registerRoutes`, killed `buildApp()`, and every API route returned HTTP 500 —
 * login, products, and the accounting health gate included.
 *
 * These tests pin the invariant for EVERY mount, not just the one that broke.
 */
import express from "express";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROUTES_FILE = path.resolve(__dirname, "../routes.ts");
const SERVER_DIR = path.resolve(__dirname, "..");
const source = readFileSync(ROUTES_FILE, "utf8");

/** Default-imported local modules: `import foo from "./x.js"` */
function defaultImports(src: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const [, name, mod] of src.matchAll(/^import\s+(\w+)\s+from\s+"(\.[^"]+)";/gm)) {
    out.set(name, mod);
  }
  return out;
}

/** `app.use("/path", symbol)` or `app.use("/path", symbol())` */
interface Mount { line: number; mountPath: string; symbol: string; invoked: boolean }
function mounts(src: string): Mount[] {
  const found: Mount[] = [];
  for (const m of src.matchAll(/app\.use\(\s*"([^"]+)"\s*,\s*(\w+)(\(\))?\s*\)/g)) {
    found.push({
      line: src.slice(0, m.index).split("\n").length,
      mountPath: m[1],
      symbol: m[2],
      invoked: Boolean(m[3]),
    });
  }
  return found;
}

/** True when the module's default export is a Router INSTANCE rather than a factory. */
function defaultExportIsRouterInstance(moduleSpecifier: string): boolean {
  const file = path.join(SERVER_DIR, moduleSpecifier.replace(/\.js$/, ".ts"));
  if (!existsSync(file)) return false;
  const text = readFileSync(file, "utf8");
  const def = text.match(/export\s+default\s+(\w+)\s*;/);
  if (!def) return false;
  const ident = def[1];
  return new RegExp(
    String.raw`\b(?:const|let|var)\s+${ident}\s*(?::[^=]+)?=\s*(?:express\.)?Router\(\)`,
  ).test(text);
}

describe("server/routes.ts mount contract", () => {
  const imports = defaultImports(source);
  const allMounts = mounts(source);

  it("discovers the router mounts (guards against a regex that silently matches nothing)", () => {
    expect(allMounts.length).toBeGreaterThan(20);
  });

  it("never invokes a Router instance as a factory", () => {
    const offenders = allMounts
      .filter((m) => m.invoked)
      .filter((m) => {
        const mod = imports.get(m.symbol);
        return Boolean(mod) && defaultExportIsRouterInstance(mod as string);
      })
      .map((m) => `routes.ts:${m.line} — app.use("${m.mountPath}", ${m.symbol}()) but ${m.symbol} is a Router instance`);

    expect(offenders).toEqual([]);
  });

  it("mounts cartonOnboardingRouter without invoking it", () => {
    const carton = allMounts.find((m) => m.symbol === "cartonOnboardingRouter");
    expect(carton, "cartonOnboardingRouter mount not found").toBeDefined();
    expect(carton?.invoked, "cartonOnboardingRouter must be passed by reference, not called").toBe(false);
    expect(carton?.mountPath).toBe("/api/admin/packaging");
  });
});

describe("carton onboarding router shape", () => {
  it("default-exports a Router instance, not a factory", async () => {
    const mod = await import("../routes/carton-onboarding.js");
    const router = mod.default as unknown as express.Router & { stack?: unknown[] };
    expect(typeof router).toBe("function");
    // An Express Router carries a middleware stack; a factory function does not.
    expect(Array.isArray(router.stack)).toBe(true);
  });

  it("throws the production TypeError when invoked as a factory", async () => {
    const mod = await import("../routes/carton-onboarding.js");
    const router = mod.default as unknown as () => unknown;
    // This is precisely what routes.ts:162 used to do.
    expect(() => router()).toThrowError(/Cannot read properties of undefined \(reading 'method'\)/);
  });

  it("is mountable on an express app without throwing", async () => {
    const mod = await import("../routes/carton-onboarding.js");
    const app = express();
    expect(() => app.use("/api/admin/packaging", mod.default)).not.toThrow();
  });
});
