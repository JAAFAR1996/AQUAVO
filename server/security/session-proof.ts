import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request } from "express";

export interface SessionIdentity {
  id: string;
  passwordHash: string;
  role: string;
  deletedAt?: unknown;
}
declare module "express-session" {
  interface SessionData { authProof?: string; checkoutOwner?: string }
}
function signingKey(): string {
  const key = process.env.SESSION_SECRET || process.env.JWT_SECRET;
  if (!key) throw new Error("Session signing secret is not configured");
  return key;
}
export function sessionProof(user: SessionIdentity): string {
  return createHmac("sha256", signingKey())
    .update(JSON.stringify(["aquavo-session-v2", user.id, user.passwordHash, user.role]))
    .digest("hex");
}
export function sessionMatchesUser(session: { userId?: string; authProof?: string }, user: SessionIdentity | null | undefined): boolean {
  if (!user || user.deletedAt || session.userId !== user.id || !/^[a-f0-9]{64}$/.test(session.authProof ?? "")) return false;
  const expected = sessionProof(user);
  return timingSafeEqual(Buffer.from(session.authProof!, "hex"), Buffer.from(expected, "hex"));
}
/** Rotate the session identifier before attaching and persisting authenticated state. */
export async function establishAuthenticatedSession(req: Request, user: SessionIdentity): Promise<void> {
  if (!req.session || user.deletedAt) throw Object.assign(new Error("Authentication unavailable"), { status: 401 });
  await new Promise<void>((resolve, reject) => req.session.regenerate((error) => error ? reject(error) : resolve()));
  req.session.userId = user.id;
  req.session.authProof = sessionProof(user);
  await new Promise<void>((resolve, reject) => req.session.save((error) => error ? reject(error) : resolve()));
}
