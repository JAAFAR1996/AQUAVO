import type { Request } from "express";

declare module "express-session" {
  interface SessionData {
    authVersion?: number;
    checkoutStarted?: boolean;
  }
}

/** Login always rotates the SID, then durably saves the verified identity. */
export async function establishAuthenticatedSession(
  req: Request,
  user: { id: string; authVersion?: number; deletedAt?: unknown },
): Promise<void> {
  if (user.deletedAt || !req.session) throw new Error("Authentication session unavailable");
  await new Promise<void>((resolve,reject) => req.session.regenerate(err => err ? reject(err) : resolve()));
  req.session.userId = user.id;
  req.session.authVersion = user.authVersion ?? 0;
  await new Promise<void>((resolve,reject) => req.session.save(err => err ? reject(err) : resolve()));
}

/** Ensure a guest's replay credential survives the first checkout response. */
export async function persistCheckoutSession(req: Request): Promise<void> {
  if (!req.session || !req.sessionID) throw new Error("Checkout session unavailable");
  req.session.checkoutStarted = true;
  await new Promise<void>((resolve,reject) => req.session.save(err => err ? reject(err) : resolve()));
}
