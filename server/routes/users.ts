import type { Router as RouterType, Request, Response, NextFunction } from "express";
import { Router } from "express";
import { storage } from "../storage/index.js";
import { insertUserSchema, insertUserAddressSchema, insertNewsletterSubscriptionSchema } from "../../shared/schema.js";
import { requireAuth, getSession } from "../middleware/auth.js";
import { sendPasswordResetEmail } from "../utils/email.js";
import { authLimiter, passwordResetLimiter } from "../middleware/rate-limit.js";
import { hashPassword, verifyPassword } from "../utils/auth.js";
import crypto from "crypto";


export function createUserRouter(): RouterType {
    const router = Router();

    // Register
    router.post("/register", authLimiter, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { email, password, fullName, phone } = req.body;
            const existingUser = await storage.getUserByEmail(email);
            if (existingUser) {
                res.status(400).json({ message: "البريد الإلكتروني مسجل بالفعل" });
                return;
            }

            const user = await storage.createUser({
                email,
                passwordHash: hashPassword(password),
                fullName,
                phone,
                role: "user"
            });

            // Create Welcome Coupon (3% off)
            try {
                const couponCode = `WELCOME3_${user.id.substring(0, 8).toUpperCase()}`;
                await storage.createCoupon({
                    code: couponCode,
                    type: "percentage",
                    value: "3",
                    maxUses: 1,
                    maxUsesPerUser: 1,
                    isActive: true,
                    description: "3% خصم ترحيبي للأعضاء الجدد",
                    startDate: new Date(),
                    userId: user.id
                });

                // Audit Log: Registration
                await storage.createAuditLog({
                    userId: user.id,
                    action: "register",
                    entityType: "user",
                    entityId: user.id,
                    changes: { email: user.email, coupon: couponCode }
                });

            } catch (couponErr) {
                console.error("Failed to create welcome coupon/log:", couponErr);
            }

            // Login immediately
            const sess = getSession(req);
            if (sess) sess.userId = user.id;

            res.status(201).json(user);
        } catch (err) {
            next(err);
        }
    });

    // Login
    router.post("/login", authLimiter, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { email, password } = req.body;
            const user = await storage.getUserByEmail(email);

            if (!user || !verifyPassword(password, user.passwordHash)) {
                res.status(401).json({ message: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
                return;
            }

            const sess = getSession(req);
            if (sess) sess.userId = user.id;

            // Audit Log: Login
            await storage.createAuditLog({
                userId: user.id,
                action: "login",
                entityType: "user",
                entityId: user.id,
                changes: { ip: req.ip }
            });

            res.json(user);
        } catch (err) {
            next(err);
        }
    });

    // Logout
    router.post("/logout", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        if ((req as any).session) {
            (req as any).session.destroy((err: any) => {
                if (err) {
                    next(err);
                    return;
                }
                res.json({ message: "Logged out" });
            });
        } else {
            res.json({ message: "Logged out" });
        }
    });

    // Get Current User
    router.get("/user", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const sess = getSession(req);
            if (!sess?.userId) {
                res.sendStatus(401);
                return;
            }
            const user = await storage.getUser(sess.userId);
            res.json(user);
        } catch (err) {
            next(err);
        }
    });

    // Forgot Password
    router.post("/auth/forgot-password", passwordResetLimiter, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { email } = req.body;
            const user = await storage.getUserByEmail(email);
            if (user) {
                const token = crypto.randomBytes(32).toString("hex");
                const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
                const expiresAt = new Date(Date.now() + 3600000); // 1 hour

                await storage.createPasswordResetToken(user.id, tokenHash, expiresAt);
                await sendPasswordResetEmail(email, token, "https://aquavo.iq");
            }
            res.json({ message: "If account exists, email sent" });
        } catch (err) {
            next(err);
        }
    });

    // Reset Password
    router.post("/auth/reset-password", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { token, newPassword } = req.body;

            // Input validation (2025 Best Practice: Validate before processing)
            if (!token || typeof token !== 'string') {
                res.status(400).json({ message: "Token is required" });
                return;
            }

            if (!newPassword || typeof newPassword !== 'string') {
                res.status(400).json({ message: "New password is required" });
                return;
            }

            // Password strength validation
            if (newPassword.length < 8) {
                res.status(400).json({ message: "Password must be at least 8 characters" });
                return;
            }

            const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

            // Atomic reset to prevent race conditions
            const success = await storage.processPasswordReset(tokenHash, hashPassword(newPassword));

            if (!success) {
                res.status(400).json({ message: "Invalid or expired token" });
                return;
            }

            res.json({ message: "Password reset successful" });
        } catch (err) {
            console.error("Password reset error:", err);
            next(err);
        }
    });


    // Addresses
    router.get("/user/addresses", requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const sess = getSession(req);
            if (!sess?.userId) {
                res.sendStatus(401);
                return;
            }
            const addresses = await storage.getUserAddresses(sess.userId);
            res.json(addresses);
        } catch (err) {
            next(err);
        }
    });

    router.post("/user/addresses", requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const sess = getSession(req);
            if (!sess?.userId) {
                res.sendStatus(401);
                return;
            }
            const parsed = insertUserAddressSchema.parse({ ...req.body, userId: sess.userId });
            const address = await storage.createUserAddress(parsed);
            res.status(201).json(address);
        } catch (err) {
            next(err);
        }
    });

    // Coupons (My Coupons)
    router.get("/coupons/my-coupons", requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const sess = getSession(req);
            if (!sess?.userId) {
                res.sendStatus(401);
                return;
            }
            const coupons = await storage.getCouponsByUserId(sess.userId);
            res.json(coupons);
        } catch (err) {
            next(err);
        }
    });

    // Validate Coupon Public
    router.post("/coupons/validate", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { code, totalAmount } = req.body;
            const coupon = await storage.getCouponByCode(code);
            if (!coupon) {
                res.status(404).json({ message: "Invalid" });
                return;
            }
            res.json(coupon);
        } catch (err) {
            next(err);
        }
    });

    return router;
}
