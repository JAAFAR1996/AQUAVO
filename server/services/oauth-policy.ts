import { createHash, timingSafeEqual } from "node:crypto";
const ALLOWED = new Set(["catalog:read", "mcp:read", "mcp:write"]);
export function normalizeOAuthScope(input: unknown): string | null {
  if (typeof input !== "string" || input.length > 200) return null;
  const scopes = new Set(input.trim().split(/\s+/).filter(Boolean));
  if (scopes.delete("mcp")) { scopes.add("mcp:read"); scopes.add("mcp:write"); }
  if (!scopes.size || [...scopes].some(scope => !ALLOWED.has(scope))) return null;
  return [...scopes].sort().join(" ");
}
export function scopeIsSubset(requested: string, granted: string): boolean {
  const r = normalizeOAuthScope(requested), g = normalizeOAuthScope(granted);
  if (!r || !g) return false;
  const allowed = new Set(g.split(" "));
  return r.split(" ").every(scope => allowed.has(scope));
}
export function verifyS256(verifier: unknown, challenge: unknown): boolean {
  if (typeof verifier !== "string" || !/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) return false;
  if (typeof challenge !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(challenge)) return false;
  const actual = createHash("sha256").update(verifier).digest("base64url");
  return timingSafeEqual(Buffer.from(actual), Buffer.from(challenge));
}
export function tokenDigest(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
