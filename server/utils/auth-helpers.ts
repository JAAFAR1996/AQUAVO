
import { Request, Response, NextFunction } from "express";
import session from "express-session";

declare module "express-session" {
    interface SessionData {
        userId?: string;
    }
}

export const getSession = (req: Request): (session.Session & Partial<session.SessionData>) | undefined =>
    (req as Request & { session?: session.Session & Partial<session.SessionData> }).session;

export function localRequireAuth(req: Request, res: Response, next: NextFunction): void {
    const sess = getSession(req);
    if (!sess?.userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    next();
}
