import type session from "express-session";
import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage/index.js";

declare module "express-session" {
  interface SessionData { userId?: string; }
}

export type AuthenticatedRequest = Request & { user?: Awaited<ReturnType<typeof storage.getUser>> };
export const getSession = (req: Pick<Request, "session">): (session.Session & Partial<session.SessionData>) | undefined => req.session;

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const sess = getSession(req);
    if (!sess?.userId) { res.status(401).json({ message: "Unauthorized" }); return; }
    const user = await storage.getUser(sess.userId);
    if (!user || user.deletedAt) { res.status(401).json({ message: "User not found" }); return; }
    (req as AuthenticatedRequest).user = user;
    next();
  } catch (error) { next(error); }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const sess = getSession(req);
    if (!sess?.userId) { res.status(401).json({ message: "يجب تسجيل الدخول أولاً" }); return; }
    const user = await storage.getUser(sess.userId);
    if (!user || user.deletedAt) { res.status(401).json({ message: "المستخدم غير موجود" }); return; }
    if (user.role !== "admin") { res.status(403).json({ message: "غير مصرح لك بالوصول لهذه الصفحة" }); return; }
    (req as AuthenticatedRequest).user = user;
    next();
  } catch (error) { next(error); }
}
