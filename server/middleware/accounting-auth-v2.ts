import type { NextFunction, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { users } from "../../shared/schema.js";
import { getDb } from "../db.js";

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

/**
 * Minimal admin guard for money-critical V2 routes.
 *
 * The legacy auth middleware imports the monolithic storage graph (analytics,
 * recommendations and AI services). Accounting does not need that graph to
 * authenticate one session. This guard reads the canonical users table directly
 * and attaches only the verified database user to the request.
 */
export async function requireAccountingAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ message: "يجب تسجيل الدخول أولاً" });
    return;
  }

  const db = getDb();
  if (!db) {
    res.status(503).json({ message: "قاعدة البيانات غير مهيأة" });
    return;
  }

  try {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      res.status(401).json({ message: "المستخدم غير موجود" });
      return;
    }
    if (user.role !== "admin") {
      res.status(403).json({ message: "غير مصرح لك بالوصول لهذه الصفحة" });
      return;
    }

    (req as Request & { user?: typeof user }).user = user;
    next();
  } catch (error) {
    next(error);
  }
}
