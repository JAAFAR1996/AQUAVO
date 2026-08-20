import type { Router as RouterType, Request, Response, NextFunction } from "express";
import { Router } from "express";
import { storage } from "../storage/index.js";
import { insertUserAddressSchema, earlyAccessLeads } from "../../shared/schema.js";
import { passwordPolicyMessage, validatePasswordPolicy } from "../../shared/password-policy.js";
import { requireAuth, getSession } from "../middleware/auth.js";
import { sendPasswordResetEmail } from "../utils/email.js";
import { authLimiter, passwordResetLimiter } from "../middleware/rate-limit.js";
import { hashPassword, verifyPassword } from "../utils/auth.js";
import { SecurityStorage } from "../storage/security-storage.js";
import { getDb } from "../db.js";
import { eq } from "drizzle-orm";
import crypto from "crypto";

function sanitizeUser(user: Record<string, any>) {
    const { passwordHash, verificationToken, verificationTokenExpiresAt, ...safe } = user;
    return safe;
}

function normalizeEmail(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const email = value.trim().toLowerCase();
    if (email.length < 3 || email.length > 254) return null;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
    return email;
}

function normalizeName(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const name = value.replace(/\s+/g, " ").trim();
    return name.length >= 2 && name.length <= 100 ? name : null;
}

function normalizePhone(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const phone = value.trim();
    if (phone.length < 7 || phone.length > 20) return null;
    if (!/^[0-9+()\-\s]+$/.test(phone)) return null;
    return phone;
}

const securityStorage = new SecurityStorage();

export function createUserRouter(): RouterType {
    const router = Router();

    router.post("/register", authLimiter, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { email: rawEmail, password, fullName: rawFullName, phone: rawPhone, referralCode } = req.body ?? {};
            const email = normalizeEmail(rawEmail);
            const fullName = normalizeName(rawFullName);
            const phone = normalizePhone(rawPhone);
            const passwordPolicy = validatePasswordPolicy(password);

            if (!email) {
                res.status(400).json({ message: "أدخل بريد إلكتروني صالح" });
                return;
            }
            if (!fullName) {
                res.status(400).json({ message: "الاسم الكامل مطلوب ويجب أن يكون بين 2 و100 حرف" });
                return;
            }
            if (!phone) {
                res.status(400).json({ message: "أدخل رقم هاتف صالح" });
                return;
            }
            if (!passwordPolicy.valid) {
                res.status(400).json({ message: passwordPolicyMessage(passwordPolicy) });
                return;
            }

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
                role: "user",
            });

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
                    userId: user.id,
                });
                await storage.createAuditLog({
                    userId: user.id,
                    action: "register",
                    entityType: "user",
                    entityId: user.id,
                    changes: { email: user.email, coupon: couponCode },
                });
            } catch (couponErr) {
                console.error("Failed to create welcome coupon/log:", couponErr);
            }

            try {
                const { loyaltyStorage } = await import("../storage/loyalty-storage.js");
                await loyaltyStorage.awardWelcomeBonus(user.id);
            } catch (bonusErr) {
                console.error("Failed to award welcome bonus:", bonusErr);
            }

            if (typeof referralCode === "string" && referralCode.trim()) {
                try {
                    const { ReferralStorage } = await import("../storage/referral-storage.js");
                    const referralStorage = new ReferralStorage();
                    const refCode = await referralStorage.getReferralCodeByCode(referralCode.trim());
                    if (refCode && refCode.isActive) {
                        await referralStorage.createReferral(refCode.id, refCode.userId, user.id);
                    }
                } catch (refErr) {
                    console.error("Failed to process referral:", refErr);
                }
            }

            const sess = getSession(req);
            if (sess) sess.userId = user.id;
            res.status(201).json(sanitizeUser(user));
        } catch (err) {
            next(err);
        }
    });

    router.post("/login", authLimiter, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const email = normalizeEmail(req.body?.email);
            const password = typeof req.body?.password === "string" ? req.body.password : "";
            const ipAddress = req.ip || req.headers["x-forwarded-for"] as string || "unknown";
            const userAgent = req.headers["user-agent"] || "unknown";
            const user = email ? await storage.getUserByEmail(email) : null;

            try {
                const blockInfo = await securityStorage.getBlockInfo(ipAddress);
                if (blockInfo?.isBlocked) {
                    res.status(429).json({
                        message: "تم حظر عنوان IP الخاص بك مؤقتاً بسبب محاولات دخول متعددة فاشلة",
                        retryAfter: blockInfo.remainingSeconds,
                        expiresAt: blockInfo.expiresAt?.toISOString(),
                    });
                    return;
                }
            } catch (blockErr) {
                console.error("Error checking blocked IP:", blockErr);
            }

            if (!user || !password || !verifyPassword(password, user.passwordHash)) {
                try {
                    await securityStorage.recordLoginAttempt({
                        userId: user?.id,
                        email: email ?? "invalid-email",
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

            try {
                await securityStorage.recordLoginAttempt({
                    userId: user.id,
                    email: user.email,
                    success: true,
                    ipAddress,
                    userAgent,
                });
            } catch (logErr) {
                console.error("Error recording login attempt:", logErr);
            }

            const sess = getSession(req);
            if (sess) sess.userId = user.id;
            await storage.createAuditLog({
                userId: user.id,
                action: "login",
                entityType: "user",
                entityId: user.id,
                changes: { ip: req.ip },
            });
            res.json(sanitizeUser(user));
        } catch (err) {
            next(err);
        }
    });

    router.post("/logout", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        if ((req as any).session) {
            (req as any).session.destroy((err: any) => {
                if (err) return next(err);
                res.json({ message: "Logged out" });
            });
        } else {
            res.json({ message: "Logged out" });
        }
    });

    router.get("/user", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const sess = getSession(req);
            if (!sess?.userId) { res.json(null); return; }
            const user = await storage.getUser(sess.userId);
            if (!user) { res.json(null); return; }

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

    router.patch("/user/preferences", requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const sess = getSession(req);
            if (!sess?.userId) { res.sendStatus(401); return; }
            const { preferences } = req.body;
            if (!preferences || typeof preferences !== "object" || Array.isArray(preferences)) {
                res.status(400).json({ message: "Preferences object is required" });
                return;
            }
            const user = await storage.getUser(sess.userId);
            if (!user) { res.status(404).json({ message: "User not found" }); return; }

            const currentPreferences = user.preferences as Record<string, any> || {};
            const updatedPreferences = {
                ...currentPreferences,
                ...preferences,
                tourSeen: {
                    ...(currentPreferences.tourSeen || {}),
                    ...((preferences as Record<string, any>).tourSeen || {}),
                },
            };
            const updatedUser = await storage.updateUser(sess.userId, { preferences: updatedPreferences });
            res.json(sanitizeUser(updatedUser ?? {}));
        } catch (err) {
            next(err);
        }
    });

    router.post("/auth/forgot-password", passwordResetLimiter, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const email = normalizeEmail(req.body?.email);
            if (email) {
                const user = await storage.getUserByEmail(email);
                if (user) {
                    const token = crypto.randomBytes(32).toString("hex");
                    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
                    const expiresAt = new Date(Date.now() + 3600000);
                    await storage.createPasswordResetToken(user.id, tokenHash, expiresAt);
                    await sendPasswordResetEmail(email, token, "https://www.aquavoiq.com");
                }
            }
            // Intentionally identical response for existing and non-existing accounts.
            res.json({ message: "If account exists, email sent" });
        } catch (err) {
            next(err);
        }
    });

    router.post("/auth/reset-password", passwordResetLimiter, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { token, newPassword } = req.body ?? {};
            if (!token || typeof token !== "string") {
                res.status(400).json({ message: "Token is required" });
                return;
            }
            const passwordPolicy = validatePasswordPolicy(newPassword);
            if (!passwordPolicy.valid) {
                res.status(400).json({ message: passwordPolicyMessage(passwordPolicy) });
                return;
            }

            const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
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

    router.patch("/user", requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const sess = getSession(req);
            if (!sess?.userId) { res.sendStatus(401); return; }

            const { fullName, phone, birthDate } = req.body;
            const updates: Record<string, any> = {};
            if (fullName !== undefined) {
                const normalized = normalizeName(fullName);
                if (!normalized) { res.status(400).json({ message: "Invalid full name" }); return; }
                updates.fullName = normalized;
            }
            if (phone !== undefined) {
                const normalized = phone === "" ? "" : normalizePhone(phone);
                if (normalized === null) { res.status(400).json({ message: "Invalid phone" }); return; }
                updates.phone = normalized;
            }
            if (birthDate !== undefined) {
                if (!birthDate) {
                    updates.birthDate = null;
                } else {
                    const parsedBirthDate = new Date(birthDate);
                    if (!Number.isFinite(parsedBirthDate.getTime()) || parsedBirthDate > new Date()) {
                        res.status(400).json({ message: "Invalid birth date" });
                        return;
                    }
                    updates.birthDate = parsedBirthDate;
                }
            }

            if (Object.keys(updates).length === 0) {
                res.status(400).json({ message: "No valid fields to update" });
                return;
            }
            const user = await storage.updateUser(sess.userId, updates);
            res.json(sanitizeUser(user ?? {}));
        } catch (err) { next(err); }
    });

    router.post("/user/change-password", requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const sess = getSession(req);
            if (!sess?.userId) { res.sendStatus(401); return; }

            const { currentPassword, newPassword } = req.body ?? {};
            if (typeof currentPassword !== "string" || !currentPassword) {
                res.status(400).json({ message: "Current password is required" });
                return;
            }
            const passwordPolicy = validatePasswordPolicy(newPassword);
            if (!passwordPolicy.valid) {
                res.status(400).json({ message: passwordPolicyMessage(passwordPolicy) });
                return;
            }

            const user = await storage.getUser(sess.userId);
            if (!user || !verifyPassword(currentPassword, user.passwordHash)) {
                res.status(401).json({ message: "كلمة المرور الحالية غير صحيحة" });
                return;
            }
            if (verifyPassword(newPassword, user.passwordHash)) {
                res.status(400).json({ message: "اختار كلمة مرور جديدة مختلفة عن الحالية" });
                return;
            }

            await storage.updateUser(sess.userId, { passwordHash: hashPassword(newPassword) });
            res.json({ message: "تم تغيير كلمة المرور بنجاح" });
        } catch (err) { next(err); }
    });

    router.get("/user/addresses", requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const sess = getSession(req);
            if (!sess?.userId) { res.sendStatus(401); return; }
            const addresses = await storage.getUserAddresses(sess.userId);
            res.json(addresses);
        } catch (err) {
            next(err);
        }
    });

    router.post("/user/addresses", requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const sess = getSession(req);
            if (!sess?.userId) { res.sendStatus(401); return; }
            const { label, address: addressText, addressLine1, city, country, isDefault } = req.body;
            const parsed = insertUserAddressSchema.parse({
                label: label || null,
                addressLine1: addressLine1 || addressText || "",
                city: city || "العراق",
                country: country || "Iraq",
                isDefault: isDefault ?? false,
                userId: sess.userId,
            });
            const savedAddress = await storage.createUserAddress(parsed);
            res.status(201).json(savedAddress);
        } catch (err) {
            next(err);
        }
    });

    router.patch("/user/addresses/:id", requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const sess = getSession(req);
            if (!sess?.userId) { res.sendStatus(401); return; }

            const { id } = req.params as { id: string };
            const { label, address, addressLine1, phone, isDefault } = req.body;
            const updates: Record<string, any> = {};
            if (label !== undefined) updates.label = String(label).slice(0, 50);
            const nextAddress = addressLine1 ?? address;
            if (nextAddress !== undefined) updates.address = String(nextAddress).slice(0, 500);
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

    router.get("/coupons/my-coupons", requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const sess = getSession(req);
            if (!sess?.userId) { res.sendStatus(401); return; }
            const coupons = await storage.getCouponsByUserId(sess.userId);
            res.json(coupons);
        } catch (err) {
            next(err);
        }
    });

    return router;
}
