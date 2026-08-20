// Smart carton recommendation for orders whose canonical packing table is still
// incomplete.
//
// This route intentionally sits BEFORE packaging-admin.ts. If every ordered SKU
// already has canonical 3-D + packed weight we call next() and the original,
// fully-audited planner remains authoritative. Otherwise we reuse owner stocktake
// measurements and explicit catalogue specs to produce a transparent carton
// RECOMMENDATION.
//
// A recommendation can never be validated/reserved: /plan/validate is still
// owned by packaging-admin.ts and rebuilds exclusively from canonical packing
// data. That preserves the safety/accounting boundary while removing the bad UX
// where known measurements were ignored and the owner was told to start over.
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { sql } from "drizzle-orm";
import { requireAdmin } from "../middleware/auth.js";
import { getDb } from "../db.js";
import type { FulfillmentDb } from "../services/fulfillment-db.js";
import { planOrder } from "../services/carton-planner.js";
import { resolveSmartPacking, type CanonicalPackingLike } from "../services/smart-packing-resolver.js";
import { cmToMm, kgToG, type CartonSpec, type PackingItemSpec } from "../../shared/packing-types.js";

const router = Router();
const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(requireAdmin);

function db(): FulfillmentDb {
  const d = getDb() as FulfillmentDb | null;
  if (!d) throw new Error("Database not available");
  return d;
}

function rowsOf<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  return (((value as { rows?: unknown[] } | null)?.rows ?? []) as T[]);
}

function num(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value));
  return Number.isFinite(n) ? n : null;
}

function variantSpecifications(variants: unknown, variantId: string | null): unknown {
  if (!variantId || !Array.isArray(variants)) return null;
  const row = variants.find(
    (v) => v && typeof v === "object" && String((v as Record<string, unknown>).id ?? "") === variantId,
  ) as Record<string, unknown> | undefined;
  return row?.specifications ?? null;
}

interface OrderLineRow extends CanonicalPackingLike {
  product_id: string;
  quantity: number | string;
  variant_id: string | null;
  name: string;
  specifications: unknown;
  variants: unknown;
  legacy_package_length_cm: unknown;
  legacy_package_width_cm: unknown;
  packed_height_cm: unknown;
  packed_width_cm: unknown;
  packed_depth_cm: unknown;
  packed_weight_kg: unknown;
  rotation_allowed: boolean | null;
  must_stay_upright: boolean | null;
  fragile: boolean | null;
  compressible: boolean | null;
  can_support_items_above: boolean | null;
  max_supported_weight_above_kg: unknown;
  minimum_support_ratio: unknown;
  maximum_overhang_ratio: unknown;
  requires_full_base_support: boolean | null;
  safety_allowance_cm: unknown;
  requires_separate_carton: boolean | null;
  max_qty_per_carton: number | null;
}

async function orderLines(orderId: string): Promise<OrderLineRow[]> {
  const result = await db().execute(sql`
    SELECT
      oi.product_id,
      oi.quantity,
      NULLIF(oi.metadata->>'variantId', '') AS variant_id,
      p.name,
      p.specifications,
      p.variants,
      legacy.package_length_cm AS legacy_package_length_cm,
      legacy.package_width_cm AS legacy_package_width_cm,
      ppd.packed_height_cm,
      ppd.packed_width_cm,
      ppd.packed_depth_cm,
      ppd.packed_weight_kg,
      ppd.rotation_allowed,
      ppd.must_stay_upright,
      ppd.fragile,
      ppd.compressible,
      ppd.can_support_items_above,
      ppd.max_supported_weight_above_kg,
      ppd.minimum_support_ratio,
      ppd.maximum_overhang_ratio,
      ppd.requires_full_base_support,
      ppd.safety_allowance_cm,
      ppd.requires_separate_carton,
      ppd.max_qty_per_carton
    FROM order_items_relational oi
    JOIN products p ON p.id = oi.product_id
    LEFT JOIN LATERAL (
      SELECT d.*
      FROM product_packing_data d
      WHERE d.product_id = oi.product_id
        AND (
          d.variant_id = NULLIF(oi.metadata->>'variantId', '')
          OR d.variant_id IS NULL
        )
      ORDER BY
        CASE WHEN d.variant_id IS NOT DISTINCT FROM NULLIF(oi.metadata->>'variantId', '') THEN 0 ELSE 1 END,
        d.updated_at DESC
      LIMIT 1
    ) ppd ON TRUE
    LEFT JOIN LATERAL (
      SELECT l.package_length_cm, l.package_width_cm
      FROM inventory_stocktake_allocations a
      JOIN inventory_stocktake_lines l ON l.id = a.stocktake_line_id
      WHERE a.product_id = oi.product_id
        AND (
          a.variant_id = NULLIF(oi.metadata->>'variantId', '')
          OR a.variant_id IS NULL
        )
        AND (l.package_length_cm IS NOT NULL OR l.package_width_cm IS NOT NULL)
      ORDER BY
        CASE WHEN a.variant_id IS NOT DISTINCT FROM NULLIF(oi.metadata->>'variantId', '') THEN 0 ELSE 1 END,
        CASE a.mapping_confidence
          WHEN 'exact' THEN 0
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          ELSE 3
        END,
        l.updated_at DESC
      LIMIT 1
    ) legacy ON TRUE
    WHERE oi.order_id = ${orderId}
    ORDER BY oi.product_id
  `);
  return rowsOf<OrderLineRow>(result);
}

interface CartonRow {
  id: string;
  sku: string | null;
  name: string;
  internal_length_cm: unknown;
  internal_width_cm: unknown;
  internal_height_cm: unknown;
  safety_padding_cm: unknown;
  max_weight_kg: unknown;
  current_unit_cost: unknown;
  available_qty: unknown;
}

async function cartonSpecs(): Promise<CartonSpec[]> {
  const result = await db().execute(sql`
    SELECT
      m.id,
      m.sku,
      m.name,
      m.internal_length_cm,
      m.internal_width_cm,
      m.internal_height_cm,
      m.safety_padding_cm,
      m.max_weight_kg,
      m.current_unit_cost,
      GREATEST(
        0,
        COALESCE((
          SELECT SUM(pim.quantity)
          FROM packaging_inventory_movements pim
          WHERE pim.material_id = m.id
        ), 0)
        - COALESCE((
          SELECT SUM(cr.quantity)
          FROM carton_reservations cr
          WHERE cr.material_id = m.id AND cr.state = 'active'
        ), 0)
      ) AS available_qty
    FROM fulfillment_materials m
    WHERE m.material_kind = 'carton'
      AND m.active = TRUE
      AND m.archived_at IS NULL
    ORDER BY m.name
  `);

  return rowsOf<CartonRow>(result).flatMap((c) => {
    const L = num(c.internal_length_cm);
    const W = num(c.internal_width_cm);
    const H = num(c.internal_height_cm);
    const maxWeightKg = num(c.max_weight_kg);
    if (L == null || W == null || H == null || maxWeightKg == null) return [];
    return [{
      materialId: c.id,
      sku: c.sku ?? c.id,
      name: c.name,
      internalLengthMm: cmToMm(L),
      internalWidthMm: cmToMm(W),
      internalHeightMm: cmToMm(H),
      safetyPaddingMm: cmToMm(num(c.safety_padding_cm) ?? 0),
      maxWeightG: kgToG(maxWeightKg),
      unitCost: num(c.current_unit_cost),
      availableQty: Math.max(0, Math.floor(num(c.available_qty) ?? 0)),
    } satisfies CartonSpec];
  });
}

router.post("/orders/:orderId/plan", readLimiter, async (req, res, next) => {
  try {
    const orderId = String(req.params.orderId ?? "").trim();
    if (!orderId) {
      res.status(400).json({ error: "ORDER_ID_REQUIRED" });
      return;
    }

    const lines = await orderLines(orderId);
    if (lines.length === 0) {
      // Let the canonical route keep its established response contract.
      next();
      return;
    }

    const resolutions = lines.map((line) => {
      const canonical: CanonicalPackingLike = {
        packedHeightCm: line.packed_height_cm,
        packedWidthCm: line.packed_width_cm,
        packedDepthCm: line.packed_depth_cm,
        packedWeightKg: line.packed_weight_kg,
        rotationAllowed: line.rotation_allowed,
        mustStayUpright: line.must_stay_upright,
        fragile: line.fragile,
        compressible: line.compressible,
        canSupportItemsAbove: line.can_support_items_above,
        maxSupportedWeightAboveKg: line.max_supported_weight_above_kg,
        minimumSupportRatio: line.minimum_support_ratio,
        maximumOverhangRatio: line.maximum_overhang_ratio,
        requiresFullBaseSupport: line.requires_full_base_support,
        safetyAllowanceCm: line.safety_allowance_cm,
        requiresSeparateCarton: line.requires_separate_carton,
        maxQtyPerCarton: line.max_qty_per_carton,
      };
      return {
        line,
        resolved: resolveSmartPacking({
          productName: line.name,
          specifications: line.specifications,
          variantSpecifications: variantSpecifications(line.variants, line.variant_id),
          canonical,
          legacyPackageLengthCm: line.legacy_package_length_cm,
          legacyPackageWidthCm: line.legacy_package_width_cm,
        }),
      };
    });

    // If everything is canonical, do not fork the source of truth. The original
    // planner route handles it and remains validate/reserve compatible.
    if (resolutions.every((r) => r.resolved.canonicalComplete)) {
      next();
      return;
    }

    const missing = resolutions
      .filter((r) => !r.resolved.recommendationReady)
      .map(({ line, resolved }) => ({
        productId: line.product_id,
        variantId: line.variant_id,
        productName: line.name,
        missing: [
          ...resolved.unresolvedGeometryFields,
          ...(resolved.weightUnknown ? ["packed_weight_kg"] : []),
        ],
      }));

    if (missing.length > 0) {
      res.json({
        outcome: "manual_review",
        code: "SMART_DATA_STILL_INSUFFICIENT",
        messageAr: "النظام استخدم القياسات القديمة وبيانات المنتجات، بس أكو منتج بعده ما عنده حتى بعدين كافيين حتى نختار كارتونة بثقة.",
        missing,
        rejections: [],
      });
      return;
    }

    const items: PackingItemSpec[] = [];
    for (const { line, resolved } of resolutions) {
      const allowance = resolved.safetyAllowanceCm;
      const quantity = Math.max(0, Math.floor(Number(line.quantity)));
      for (let seq = 1; seq <= quantity; seq++) {
        items.push({
          key: `${line.product_id}|${line.variant_id ?? ""}|${seq}`,
          productId: line.product_id,
          variantId: line.variant_id,
          seq,
          name: line.name,
          widthMm: cmToMm((resolved.widthCm as number) + allowance),
          heightMm: cmToMm((resolved.heightCm as number) + allowance),
          depthMm: cmToMm((resolved.depthCm as number) + allowance),
          weightG: kgToG(resolved.plannerWeightKg),
          rotationAllowed: resolved.rotationAllowed,
          mustStayUpright: resolved.mustStayUpright,
          fragile: resolved.fragile,
          compressible: resolved.compressible,
          canSupportItemsAbove: resolved.canSupportItemsAbove,
          maxSupportedWeightAboveG:
            resolved.maxSupportedWeightAboveKg != null
              ? kgToG(resolved.maxSupportedWeightAboveKg)
              : null,
          minSupportRatioBp: Math.round((resolved.minimumSupportRatio ?? 0) * 10_000),
          maxOverhangRatioBp:
            resolved.maximumOverhangRatio != null
              ? Math.round(resolved.maximumOverhangRatio * 10_000)
              : -1,
          requiresFullBaseSupport: resolved.requiresFullBaseSupport,
          requiresSeparateCarton: resolved.requiresSeparateCarton,
          maxQtyPerCarton: resolved.maxQtyPerCarton,
        });
      }
    }

    const cartons = await cartonSpecs();
    const planned = planOrder({ items, cartons, missing: [] });
    if (planned.outcome !== "plan") {
      res.json({
        ...planned,
        messageAr:
          planned.code === "NO_CARTON_FITS"
            ? "استفدت من القياسات الموجودة، بس لا الكارتون الصغير ولا الوسط يستوعب ترتيب هذا الطلب. نحتاج كارتونة أكبر أو قياس أدق للمنتج."
            : planned.messageAr,
      });
      return;
    }

    const notes = [...new Set(resolutions.flatMap((r) => r.resolved.notesAr))];
    const estimatedProducts = resolutions.filter((r) => r.resolved.estimated).length;
    const unknownWeightProducts = resolutions.filter((r) => r.resolved.weightUnknown).length;
    const cartonNames = [...new Set(planned.cartons.map((c) => c.carton.name))].join(" + ");

    res.json({
      outcome: "recommendation",
      cartons: planned.cartons,
      totalKnownCost: planned.totalKnownCost,
      costStatus: planned.costStatus,
      engineVersion: `${planned.engineVersion}+smart-data`,
      explanationAr: [
        `اقتراح النظام: ${cartonNames}.`,
        "تم اختيار أصغر كارتونة استطاع المحرك ترتيب المنتجات بداخلها اعتماداً على القياسات التي أدخلتها سابقاً وبيانات المنتج المتاحة.",
        ...(unknownWeightProducts > 0
          ? ["الوزن غير مكتمل لبعض المنتجات، لذلك هذا اقتراح تجهيز ذكي وليس اعتماداً محاسبياً/سلامياً نهائياً."]
          : []),
        ...notes,
      ].join("\n"),
      recommendationConfidence: unknownWeightProducts > 0 ? "geometry_only" : "estimated",
      estimatedProducts,
      unknownWeightProducts,
      recommendationNotes: notes,
      validationBlocked: true,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
