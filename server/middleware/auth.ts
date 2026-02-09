import type session from "express-session";
import { storage } from "../storage/index.js";

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

export const getSession = (req: any): (session.Session & Partial<session.SessionData>) | undefined =>
  req.session;

export async function requireAuth(req: any, res: any, next: any) {
  const sess = getSession(req);
  if (!sess?.userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  // Fetch user and attach to request
  const user = await storage.getUser(sess.userId);
  if (!user) {
    res.status(401).json({ message: "User not found" });
    return;
  }

  req.user = user;
  next();
}

export async function requireAdmin(req: any, res: any, next: any) {
  const sess = getSession(req);

  // Check if user is logged in
  if (!sess?.userId) {
    console.log("❌ Admin access denied: No session");
    return res.status(401).json({ message: "يجب تسجيل الدخول أولاً" });
  }

  // Get user from database
  const user = await storage.getUser(sess.userId);

  if (!user) {
    console.log("❌ Admin access denied: User not found");
    return res.status(401).json({ message: "المستخدم غير موجود" });
  }

  // Check if user has admin role
  if (user.role !== "admin") {
    console.log(`❌ Admin access denied: User ${user.id} is not admin (role: ${user.role})`);
    return res.status(403).json({ message: "غير مصرح لك بالوصول لهذه الصفحة" });
  }

  // Grant access
  req.user = user;
  console.log(`✅ Admin access granted: ${user.id}`);
  next();
}
