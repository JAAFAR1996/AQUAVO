/**
 * Early Access Routes - مسارات الحجز المبكر
 * 
 * API endpoints for early access landing page
 * With spam protection and Iraqi phone validation
 */

import { Router, Request, Response } from "express";
import { getDb } from "../db.js";
import { earlyAccessLeads, insertEarlyAccessLeadSchema, coupons } from "../../shared/schema.js";
import { count, eq, and, gte, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();

// Maximum spots available
const MAX_SPOTS = 50;
const INITIAL_DISPLAY_OFFSET = 5; // Start showing 45/50 (50 - 5 = 45)
const DISCOUNT_PERCENTAGE = 5; // 5% discount
const MAX_REGISTRATIONS_PER_IP = 100; // Increased for launch/testing
const RATE_LIMIT_HOURS = 24;

// Iraqi phone number regex (07xx-xxx-xxxx format)
const IRAQI_PHONE_REGEX = /^07[3-9]\d{8}$/;

/**
 * Validate Iraqi phone number format
 */
function isValidIraqiPhone(phone: string): boolean {
    // Remove all non-digits
    const digitsOnly = phone.replace(/\D/g, "");
    // Check if matches Iraqi mobile format (07xxxxxxxxx - 11 digits starting with 07)
    return IRAQI_PHONE_REGEX.test(digitsOnly);
}

/**
 * Normalize phone number to standard format
 */
function normalizePhone(phone: string): string {
    // Remove all non-digits
    let digits = phone.replace(/\D/g, "");

    // Remove country code if present (964)
    if (digits.startsWith("964")) {
        digits = "0" + digits.slice(3);
    }

    // Ensure it starts with 0
    if (!digits.startsWith("0")) {
        digits = "0" + digits;
    }

    return digits;
}

/**
 * Generate unique coupon code
 */
function generateCouponCode(): string {
    // Format: AQUA-XXXX (8 characters total, easy to type)
    const randomPart = nanoid(6).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
    return `AQUA-${randomPart}`;
}

/**
 * GET /api/early-access/spots
 * Get remaining spots count
 */
router.get("/spots", async (req: Request, res: Response) => {
    try {
        const db = getDb();

        if (!db) {
            // Return default if DB not available
            return res.json({ spotsRemaining: MAX_SPOTS - INITIAL_DISPLAY_OFFSET });
        }

        // Count existing leads
        const result = await db
            .select({ count: count() })
            .from(earlyAccessLeads);

        const leadCount = result[0]?.count || 0;
        const spotsRemaining = Math.max(0, MAX_SPOTS - leadCount - INITIAL_DISPLAY_OFFSET);

        res.json({
            spotsRemaining,
            totalSpots: MAX_SPOTS,
            registered: leadCount + INITIAL_DISPLAY_OFFSET,
        });
    } catch (error) {
        console.error("[EarlyAccess] Error getting spots:", error);
        res.json({ spotsRemaining: MAX_SPOTS - INITIAL_DISPLAY_OFFSET });
    }
});

/**
 * POST /api/early-access/register
 * Register a new early access lead with unique coupon code
 * Protected against spam with rate limiting and phone validation
 */
router.post("/register", async (req: Request, res: Response) => {
    try {
        const db = getDb();

        if (!db) {
            return res.status(500).json({
                success: false,
                message: "Database not available",
                spotsRemaining: 0,
            });
        }

        // Get client IP
        const clientIp = (req.headers["x-forwarded-for"]?.toString().split(",")[0] || req.ip || "unknown").trim();

        // Validate input
        const validation = insertEarlyAccessLeadSchema.safeParse({
            phone: req.body.phone,
            name: req.body.name,
            source: req.body.source || "landing_page",
            ipAddress: clientIp,
            userAgent: req.headers["user-agent"],
        });

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: validation.error.errors[0]?.message || "Invalid input",
                spotsRemaining: 0,
            });
        }

        // Normalize and validate phone number
        const cleanPhone = normalizePhone(validation.data.phone);

        if (!isValidIraqiPhone(cleanPhone)) {
            return res.status(400).json({
                success: false,
                message: "يرجى إدخال رقم عراقي صحيح (مثال: 07701234567)",
                spotsRemaining: 0,
            });
        }

        // Check rate limiting by IP (max registrations per IP in 24 hours)
        const rateLimitTime = new Date(Date.now() - RATE_LIMIT_HOURS * 60 * 60 * 1000);

        const ipRegistrations = await db
            .select({ count: count() })
            .from(earlyAccessLeads)
            .where(
                and(
                    eq(earlyAccessLeads.ipAddress, clientIp),
                    gte(earlyAccessLeads.createdAt, rateLimitTime)
                )
            );

        const ipCount = ipRegistrations[0]?.count || 0;

        if (ipCount >= MAX_REGISTRATIONS_PER_IP) {
            console.log(`[EarlyAccess] ⚠️ Rate limit exceeded for IP: ${clientIp} (${ipCount} registrations)`);
            return res.status(429).json({
                success: false,
                message: "تم تجاوز الحد المسموح للتسجيلات. يرجى المحاولة لاحقاً.",
                spotsRemaining: 0,
            });
        }

        // Check current spots
        const countResult = await db
            .select({ count: count() })
            .from(earlyAccessLeads);

        const currentCount = countResult[0]?.count || 0;

        if (currentCount + INITIAL_DISPLAY_OFFSET >= MAX_SPOTS) {
            return res.status(400).json({
                success: false,
                message: "عذراً، نفذت جميع الأماكن المتاحة",
                spotsRemaining: 0,
            });
        }

        // Check if phone already registered
        const existingLead = await db.query.earlyAccessLeads?.findFirst({
            where: (leads, { eq }) => eq(leads.phone, cleanPhone),
        });

        if (existingLead) {
            const spotsRemaining = Math.max(0, MAX_SPOTS - currentCount - INITIAL_DISPLAY_OFFSET);
            return res.status(400).json({
                success: false,
                message: "هذا الرقم مسجل مسبقاً! سنتواصل معك قريباً",
                spotsRemaining,
            });
        }

        // Generate unique coupon code
        let couponCode = generateCouponCode();
        let attempts = 0;
        const maxAttempts = 5;

        // Ensure coupon code is unique
        while (attempts < maxAttempts) {
            const existingCoupon = await db.query.coupons?.findFirst({
                where: (c, { eq }) => eq(c.code, couponCode),
            });

            if (!existingCoupon) break;

            couponCode = generateCouponCode();
            attempts++;
        }

        // Create coupon in database (single use, 20% discount)
        await db.insert(coupons).values({
            code: couponCode,
            type: "percentage",
            value: DISCOUNT_PERCENTAGE.toString(),
            maxUses: 1,
            usedCount: 0,
            maxUsesPerUser: 1,
            isActive: true,
            description: `كود خصم الحجز المبكر - ${cleanPhone}`,
            // Set expiry to 90 days from now
            endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        });

        // Insert new lead with coupon code reference
        await db.insert(earlyAccessLeads).values({
            phone: cleanPhone,
            name: validation.data.name,
            source: validation.data.source,
            ipAddress: clientIp,
            userAgent: validation.data.userAgent,
            notes: `Coupon: ${couponCode}`, // Store coupon reference
        });

        const newCount = currentCount + 1;
        const spotsRemaining = Math.max(0, MAX_SPOTS - newCount - INITIAL_DISPLAY_OFFSET);

        console.log(`[EarlyAccess] ✅ New lead registered: ${cleanPhone} with coupon ${couponCode} from IP ${clientIp} (${newCount + INITIAL_DISPLAY_OFFSET}/${MAX_SPOTS})`);

        res.json({
            success: true,
            message: "تم التسجيل بنجاح!",
            spotsRemaining,
            couponCode, // Return coupon code to display
        });

    } catch (error: any) {
        console.error("[EarlyAccess] Error registering:", error);

        // Handle unique constraint violation
        if (error?.code === "23505") {
            return res.status(400).json({
                success: false,
                message: "هذا الرقم مسجل مسبقاً!",
                spotsRemaining: 0,
            });
        }

        res.status(500).json({
            success: false,
            message: "حدث خطأ، يرجى المحاولة مرة أخرى",
            spotsRemaining: 0,
        });
    }
});

/**
 * GET /api/early-access/leads (Admin only)
 * Get all early access leads
 */
router.get("/leads", requireAdmin, async (req: Request, res: Response) => {
    try {
        const db = getDb();
        if (!db) {
            return res.status(500).json({
                success: false,
                message: "Database not available",
            });
        }

        const leads = await db.query.earlyAccessLeads?.findMany({
            orderBy: (leads, { desc }) => [desc(leads.createdAt)],
        });

        res.json({
            success: true,
            leads: leads || [],
            count: leads?.length || 0,
        });

    } catch (error) {
        console.error("[EarlyAccess] Error fetching leads:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching leads",
        });
    }
});

/**
 * DELETE /api/early-access/leads/:id (Admin only)
 * Delete a fake/spam lead and deactivate its coupon
 */
router.delete("/leads/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
        const db = getDb();
        if (!db) {
            return res.status(500).json({
                success: false,
                message: "Database not available",
            });
        }

        const { id } = req.params;

        // Find the lead
        const lead = await db.query.earlyAccessLeads?.findFirst({
            where: (leads, { eq }) => eq(leads.id, id as any),
        });

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: "Lead not found",
            });
        }

        // Extract coupon code from notes
        const couponMatch = lead.notes?.match(/Coupon:\s*(\S+)/);
        const couponCode = couponMatch ? couponMatch[1] : null;

        // Deactivate the coupon if exists
        if (couponCode) {
            await db
                .update(coupons)
                .set({ isActive: false })
                .where(eq(coupons.code, couponCode));

            console.log(`[EarlyAccess] 🗑️ Deactivated coupon: ${couponCode}`);
        }

        // Delete the lead
        await db
            .delete(earlyAccessLeads)
            .where(eq(earlyAccessLeads.id, lead.id));

        console.log(`[EarlyAccess] 🗑️ Deleted lead: ${lead.phone} by admin`);

        res.json({
            success: true,
            message: "تم حذف السجل بنجاح",
        });

    } catch (error) {
        console.error("[EarlyAccess] Error deleting lead:", error);
        res.status(500).json({
            success: false,
            message: "Error deleting lead",
        });
    }
});

export default router;
