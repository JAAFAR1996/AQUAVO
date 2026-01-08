/**
 * Early Access Routes - مسارات الحجز المبكر
 * 
 * API endpoints for early access landing page
 */

import { Router, Request, Response } from "express";
import { getDb } from "../db.js";
import { earlyAccessLeads, insertEarlyAccessLeadSchema, coupons } from "../../shared/schema.js";
import { count } from "drizzle-orm";
import { nanoid } from "nanoid";

const router = Router();

// Maximum spots available
const MAX_SPOTS = 30;
const INITIAL_DISPLAY_OFFSET = 6; // Start showing 24/30 (30 - 6 = 24)
const DISCOUNT_PERCENTAGE = 20; // 20% discount

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

        // Validate input
        const validation = insertEarlyAccessLeadSchema.safeParse({
            phone: req.body.phone,
            name: req.body.name,
            source: req.body.source || "landing_page",
            ipAddress: req.ip || req.headers["x-forwarded-for"]?.toString(),
            userAgent: req.headers["user-agent"],
        });

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: validation.error.errors[0]?.message || "Invalid input",
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

        // Clean phone number
        const cleanPhone = validation.data.phone.replace(/\s/g, "").replace(/^00/, "+");

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
            ipAddress: validation.data.ipAddress,
            userAgent: validation.data.userAgent,
            notes: `Coupon: ${couponCode}`, // Store coupon reference
        });

        const newCount = currentCount + 1;
        const spotsRemaining = Math.max(0, MAX_SPOTS - newCount - INITIAL_DISPLAY_OFFSET);

        console.log(`[EarlyAccess] ✅ New lead registered: ${cleanPhone} with coupon ${couponCode} (${newCount + INITIAL_DISPLAY_OFFSET}/${MAX_SPOTS})`);

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
router.get("/leads", async (req: Request, res: Response) => {
    try {
        // Check if user is admin
        if (!req.user || (req.user as any).role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Unauthorized",
            });
        }

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

export default router;
