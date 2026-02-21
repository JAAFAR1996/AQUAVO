import type { Router as RouterType, Request, Response, NextFunction } from "express";
import { Router } from "express";
import { storage } from "../storage/index.js";
import { insertUserAddressSchema, earlyAccessLeads } from "../../shared/schema.js";
import { requireAuth, getSession } from "../middleware/auth.js";
import { sendPasswordResetEmail } from "../utils/email.js";
import { authLimiter, passwordResetLimiter } from "../middleware/rate-limit.js";
import { hashPassword, verifyPassword } from "../utils/auth.js";
import { SecurityStorage } from "../storage/security-storage.js";
import { getDb } from "../db.js";
import { eq } from "drizzle-orm";
import crypto from "crypto";

/** Strip sensitive fields before sending user to client */
function sanitizeUser(user: Record<string, any>) {
    const { passwordHash, verificationToken, verificationTokenExpiresAt, ...safe } = user;
    return safe;
}

const securityStorage = new SecurityStorage();

export function createUserRouter(): RouterType {
    const router = Router();

    // Register
    router.post("/register", authLimiter, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { email: rawEmail, password, fullName, phone, referralCode } = req.body;
            const email = rawEmail?.toLowerCase().trim();
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

            // Process referral code if provided
            if (referralCode) {
                try {
                    const { ReferralStorage } = await import("../storage/referral-storage.js");
                    const referralStorage = new ReferralStorage();

                    // Get referral code details
                    const refCode = await referralStorage.getReferralCodeByCode(referralCode);
                    if (refCode && refCode.isActive) {
                        // Create referral record (this also awards points to referrer)
                        await referralStorage.createReferral(refCode.id, refCode.userId, user.id);
                        console.log(`✅ Referral processed: ${user.email} referred by code ${referralCode}`);
                    }
                } catch (refErr) {
                    console.error("Failed to process referral:", refErr);
                }
            }

            // Login immediately
            const sess = getSession(req);
            if (sess) sess.userId = user.id;

            res.status(201).json(sanitizeUser(user));
        } catch (err) {
            next(err);
        }
    });

    // Login
    router.post("/login", authLimiter, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { email: rawEmail, password } = req.body;
            const email = rawEmail?.toLowerCase().trim();
            const ipAddress = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
            const userAgent = req.headers['user-agent'] || 'unknown';

            const user = await storage.getUserByEmail(email);

            // Check if IP is blocked - return countdown info if blocked
            try {
                const blockInfo = await securityStorage.getBlockInfo(ipAddress);
                if (blockInfo?.isBlocked) {
                    res.status(429).json({
                        message: "تم حظر عنوان IP الخاص بك مؤقتاً بسبب محاولات دخول متعددة فاشلة",
                        retryAfter: blockInfo.remainingSeconds,
                        expiresAt: blockInfo.expiresAt?.toISOString()
                    });
                    return;
                }
            } catch (blockErr) {
                console.error("Error checking blocked IP:", blockErr);
            }

            if (!user || !verifyPassword(password, user.passwordHash)) {
                // Record failed login attempt
                try {
                    await securityStorage.recordLoginAttempt({
                        userId: user?.id,
                        email,
                        success: false,
                        ipAddress,
                        userAgent,
                        failureReason: !user ? "حساب غير موجود" : "كلمة مرور خاطئة",
                    });
                } catch (logErr) {
                    console.error("Error recording login attempt:", logErr);
                }

                res.status(401).json({ message: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
                return;
            }

            // Record successful login attempt
            try {
                await securityStorage.recordLoginAttempt({
                    userId: user.id,
                    email,
                    success: true,
                    ipAddress,
                    userAgent,
                });
            } catch (logErr) {
                console.error("Error recording login attempt:", logErr);
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

            res.json(sanitizeUser(user));
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
            if (!user) { res.sendStatus(401); return; }

            // Check if user is an early access member (phone matches earlyAccessLeads)
            let isEarlyAccess = false;
            if (user.phone) {
                try {
                    const db = getDb();
                    if (db) {
                        const lead = await db.select({ id: earlyAccessLeads.id })
                            .from(earlyAccessLeads)
                            .where(eq(earlyAccessLeads.phone, user.phone))
                            .limit(1);
                        isEarlyAccess = lead.length > 0;
                    }
                } catch { /* non-critical */ }
            }

            res.json(sanitizeUser({ ...user, isEarlyAccess }));
        } catch (err) {
            next(err);
        }
    });

    // Update User Preferences
    router.patch("/user/preferences", requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const sess = getSession(req);
            if (!sess?.userId) {
                res.sendStatus(401);
                return;
            }

            const { preferences } = req.body;
            if (!preferences) {
                res.status(400).json({ message: "Preferences object is required" });
                return;
            }

            const user = await storage.getUser(sess.userId);
            if (!user) {
                res.status(404).json({ message: "User not found" });
                return;
            }

            // Deep merge or simple merge? users schema defines preferences as jsonb.
            // We'll treat the incoming 'preferences' as a partial update to the existing object.
            const currentPreferences = user.preferences as Record<string, any> || {};
            const updatedPreferences = {
                ...currentPreferences,
                ...preferences,
                // If specific sub-objects like tourSeen need deep merge, handle it:
                tourSeen: {
                    ...(currentPreferences.tourSeen || {}),
                    ...(preferences.tourSeen || {})
                }
            };

            const updatedUser = await storage.updateUser(sess.userId, { preferences: updatedPreferences });
            res.json(sanitizeUser(updatedUser ?? {}));
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

            // Input validation
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


    // Update User Profile (fullName, phone, birthDate)
    router.patch("/user", requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const sess = getSession(req);
            if (!sess?.userId) { res.sendStatus(401); return; }

            const { fullName, phone, birthDate } = req.body;
            const updates: Record<string, any> = {};
            if (fullName && typeof fullName === "string") updates.fullName = fullName.trim().slice(0, 100);
            if (phone !== undefined && typeof phone === "string") updates.phone = phone.trim().slice(0, 20);
            if (birthDate !== undefined) updates.birthDate = birthDate ? new Date(birthDate) : null;

            if (Object.keys(updates).length === 0) {
                res.status(400).json({ message: "No valid fields to update" });
                return;
            }

            const user = await storage.updateUser(sess.userId, updates);
            res.json(sanitizeUser(user ?? {}));
        } catch (err) { next(err); }
    });

    // Change Password
    router.post("/user/change-password", requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const sess = getSession(req);
            if (!sess?.userId) { res.sendStatus(401); return; }

            const { currentPassword, newPassword } = req.body;
            if (!currentPassword || !newPassword) {
                res.status(400).json({ message: "Current password and new password are required" });
                return;
            }
            if (typeof newPassword !== "string" || newPassword.length < 8) {
                res.status(400).json({ message: "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل" });
                return;
            }

            const user = await storage.getUser(sess.userId);
            if (!user || !verifyPassword(currentPassword, user.passwordHash)) {
                res.status(401).json({ message: "كلمة المرور الحالية غير صحيحة" });
                return;
            }

            await storage.updateUser(sess.userId, { passwordHash: hashPassword(newPassword) });
            res.json({ message: "تم تغيير كلمة المرور بنجاح" });
        } catch (err) { next(err); }
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

    router.patch("/user/addresses/:id", requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const sess = getSession(req);
            if (!sess?.userId) { res.sendStatus(401); return; }

            const { id } = req.params as { id: string };
            const { label, address, phone, isDefault } = req.body;
            const updates: Record<string, any> = {};
            if (label !== undefined) updates.label = String(label).slice(0, 50);
            if (address !== undefined) updates.address = String(address).slice(0, 500);
            if (phone !== undefined) updates.phone = String(phone).slice(0, 20);
            if (isDefault !== undefined) updates.isDefault = Boolean(isDefault);

            const updated = await storage.updateUserAddress(id, sess.userId, updates);
            if (!updated) { res.status(404).json({ message: "Address not found" }); return; }
            res.json(updated);
        } catch (err) { next(err); }
    });

    router.delete("/user/addresses/:id", requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const sess = getSession(req);
            if (!sess?.userId) { res.sendStatus(401); return; }

            const { id } = req.params as { id: string };
            const deleted = await storage.deleteUserAddress(id, sess.userId);
            if (!deleted) { res.status(404).json({ message: "Address not found" }); return; }
            res.json({ message: "تم حذف العنوان" });
        } catch (err) { next(err); }
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
