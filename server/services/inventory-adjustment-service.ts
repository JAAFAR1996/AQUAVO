import { randomUUID } from "crypto";
import { sql } from "drizzle-orm";
import { preserveInternalVariantFields } from "../../shared/public-product.js";

export type InventoryAdjustmentActor = {
  clientId: string;
  mode: "oauth" | "static" | "admin";
};

export type InventoryAdjustmentResult = {
  id: string;
  variant_id: string | null;
  previous_stock: number;
  new_stock: number;
  adjustment: number;
  changed: boolean;
};

type InventoryAdjustmentTx = {
  execute: (query: unknown) => Promise<unknown>;
};

/**
 * Set absolute product/variant stock through the canonical append-only ledger.
 *
 * Production blocks direct writes to products.stock and variant stock when
 * inventory_ledger_mode=enforce. This function serializes updates per SKU,
 * derives the required delta from MAIN inventory_movements, appends one
 * manual_adjustment movement, and lets DB projection triggers update storefront
 * stock.
 *
 * Call inside a database transaction.
 */
export async function setCanonicalProductStock(
  tx: InventoryAdjustmentTx,
  actor: InventoryAdjustmentActor,
  productId: string,
  targetStockInput: unknown,
  variantId?: string | null,
): Promise<InventoryAdjustmentResult> {
  const targetStock = Number(targetStockInput);
  if (!Number.isInteger(targetStock) || targetStock < 0) {
    throw new Error("stock يجب أن يكون عدداً صحيحاً أكبر من أو يساوي صفر");
  }

  const normalizedVariantId =
    typeof variantId === "string" && variantId.trim() ? variantId.trim() : null;

  await tx.execute(sql`
    SELECT pg_advisory_xact_lock(
      hashtext(${productId || ""} || ':' || ${normalizedVariantId ?? "base"})
    )
  `);

  const productResult = await tx.execute(sql`
    SELECT id, name, has_variants, variants
    FROM products
    WHERE id = ${productId} AND deleted_at IS NULL
    FOR UPDATE
  `) as { rows?: Array<{ id: string; name: string; has_variants: boolean; variants: unknown }> };
  const product = productResult.rows?.[0];
  if (!product) throw new Error(`المنتج "${productId}" غير موجود`);

  const hasVariants = Boolean(product.has_variants);
  if (hasVariants && !normalizedVariantId) {
    throw new Error("هذا المنتج يحتوي خيارات. استخدم variant_id لتحديد الخيار المطلوب.");
  }
  if (!hasVariants && normalizedVariantId) {
    throw new Error("هذا المنتج لا يستخدم خيارات حالياً؛ لا ترسل variant_id.");
  }

  if (normalizedVariantId) {
    const variants = Array.isArray(product.variants) ? product.variants : [];
    if (!variants.some((variant) => {
      if (!variant || typeof variant !== "object") return false;
      return String((variant as { id?: unknown }).id ?? "") === normalizedVariantId;
    })) {
      throw new Error(`الخيار "${normalizedVariantId}" غير موجود حالياً في المنتج`);
    }
  }

  const locationResult = await tx.execute(sql`
    SELECT id
    FROM inventory_locations
    WHERE code = 'MAIN' AND is_active = true
    LIMIT 1
  `) as { rows?: Array<{ id: string }> };
  const locationId = locationResult.rows?.[0]?.id;
  if (!locationId) throw new Error("موقع المخزون MAIN غير موجود أو غير فعال");

  const balanceResult = (normalizedVariantId
    ? await tx.execute(sql`
        SELECT COALESCE(SUM(quantity_delta), 0)::int AS qty
        FROM inventory_movements
        WHERE product_id = ${productId}
          AND variant_id = ${normalizedVariantId}
          AND location_id = ${locationId}
      `)
    : await tx.execute(sql`
        SELECT COALESCE(SUM(quantity_delta), 0)::int AS qty
        FROM inventory_movements
        WHERE product_id = ${productId}
          AND variant_id IS NULL
          AND location_id = ${locationId}
      `)) as { rows?: Array<{ qty: number | string }> };

  const previousStock = Number(balanceResult.rows?.[0]?.qty ?? 0);
  const adjustment = targetStock - previousStock;
  if (adjustment === 0) {
    return {
      id: productId,
      variant_id: normalizedVariantId,
      previous_stock: previousStock,
      new_stock: targetStock,
      adjustment: 0,
      changed: false,
    };
  }

  const sourceId = randomUUID();
  const sourceType = actor.mode === "admin" ? "admin_stock_adjustment" : "mcp_stock_adjustment";
  const createdBy = actor.mode === "admin" ? `admin:${actor.clientId}` : `mcp:${actor.clientId}`;
  const idempotencyPrefix = actor.mode === "admin" ? "admin-stock" : "mcp-stock";
  await tx.execute(sql`
    INSERT INTO inventory_movements (
      product_id,
      variant_id,
      location_id,
      quantity_delta,
      movement_type,
      source_type,
      source_id,
      idempotency_key,
      happened_at,
      metadata,
      created_by
    ) VALUES (
      ${productId},
      ${normalizedVariantId},
      ${locationId},
      ${adjustment},
      'manual_adjustment',
${sourceType},
      ${sourceId},
      ${idempotencyPrefix + ":" + sourceId},
      now(),
      jsonb_build_object(
        'client_id', ${actor.clientId},
        'auth_mode', ${actor.mode},
        'target_stock', ${targetStock},
        'previous_stock', ${previousStock},
        'variant_id', ${normalizedVariantId}
      ),
      ${createdBy}
    )
  `);

  return {
    id: productId,
    variant_id: normalizedVariantId,
    previous_stock: previousStock,
    new_stock: targetStock,
    adjustment,
    changed: true,
  };
}


export type VariantConfigurationInput = Record<string, unknown> & {
  id?: unknown;
  stock?: unknown;
};

export type VariantConfigurationResult = {
  has_variants: boolean;
  variants: Array<Record<string, unknown>>;
  stock_adjustments: InventoryAdjustmentResult[];
};

/**
 * Replace a product's variant structure without bypassing ledger enforcement.
 *
 * Safe sequence inside ONE transaction:
 * 1) zero inventory for variants being removed (or base stock when enabling variants),
 * 2) update variant metadata with unchanged/zero stock only,
 * 3) project requested target stocks through inventory_movements,
 * 4) when disabling variants, reconcile the base ledger back to zero.
 *
 * The database guard intentionally blocks direct quantity changes. Structure-only
 * add/remove is safe when the absent side is treated as stock=0 (migration 0088).
 */
export async function setCanonicalVariantConfiguration(
  tx: InventoryAdjustmentTx,
  actor: InventoryAdjustmentActor,
  productId: string,
  hasVariantsInput: unknown,
  variantsInput: unknown,
): Promise<VariantConfigurationResult> {
  const hasVariants = Boolean(hasVariantsInput);
  const requestedVariants = hasVariants
    ? (Array.isArray(variantsInput) ? variantsInput as VariantConfigurationInput[] : [])
    : [];

  if (hasVariants && requestedVariants.length === 0) {
    throw new Error("عند تفعيل الخيارات يجب إضافة خيار واحد على الأقل");
  }

  const ids = new Set<string>();
  const targets = new Map<string, number>();
  for (const raw of requestedVariants) {
    const id = typeof raw?.id === "string" ? raw.id.trim() : "";
    if (!id) throw new Error("كل خيار يحتاج id غير فارغ");
    if (ids.has(id)) throw new Error(`معرّف الخيار مكرر: ${id}`);
    ids.add(id);

    const stock = Number(raw.stock ?? 0);
    if (!Number.isInteger(stock) || stock < 0) {
      throw new Error(`مخزون الخيار "${id}" يجب أن يكون عدداً صحيحاً أكبر من أو يساوي صفر`);
    }
    targets.set(id, stock);
  }

  await tx.execute(sql`
    SELECT pg_advisory_xact_lock(hashtext(${productId || ""} || ':variant-config'))
  `);

  const currentResult = await tx.execute(sql`
    SELECT id, has_variants, stock, variants
    FROM products
    WHERE id = ${productId} AND deleted_at IS NULL
    FOR UPDATE
  `) as {
    rows?: Array<{
      id: string;
      has_variants: boolean;
      stock: number | string;
      variants: unknown;
    }>;
  };
  const current = currentResult.rows?.[0];
  if (!current) throw new Error(`المنتج "${productId}" غير موجود`);

  const currentHasVariants = Boolean(current.has_variants);
  const currentVariants = Array.isArray(current.variants)
    ? current.variants as Array<Record<string, unknown>>
    : [];
  const currentById = new Map(
    currentVariants
      .map((variant) => [String(variant?.id ?? ""), variant] as const)
      .filter(([id]) => Boolean(id)),
  );

  const adjustments: InventoryAdjustmentResult[] = [];

  // A simple SKU and a variant SKU must never both carry canonical stock.
  if (!currentHasVariants && hasVariants) {
    adjustments.push(await setCanonicalProductStock(tx, actor, productId, 0, null));
  }

  if (currentHasVariants) {
    for (const variant of currentVariants) {
      const id = String(variant?.id ?? "");
      if (!id || ids.has(id)) continue;
      // Removed variants must be emptied through the ledger before their JSON
      // entry disappears, otherwise historical positive stock would be orphaned.
      adjustments.push(await setCanonicalProductStock(tx, actor, productId, 0, id));
    }
  }

  const structureVariants = requestedVariants.map((variant) => {
    const id = String(variant.id);
    const existing = currentHasVariants ? currentById.get(id) : undefined;
    return {
      ...variant,
      // Existing SKU keeps its projected stock until phase 3. New SKU starts
      // at zero so the direct JSON write carries no inventory quantity.
      stock: existing ? Number(existing.stock ?? 0) : 0,
    };
  });

  const merged = hasVariants
    ? preserveInternalVariantFields(structureVariants, currentVariants)
    : null;

  await tx.execute(sql`
    UPDATE products
    SET has_variants = ${hasVariants},
        variants = ${merged === null ? null : JSON.stringify(merged)}::jsonb,
        updated_at = now()
    WHERE id = ${productId}
  `);

  if (hasVariants) {
    for (const variant of requestedVariants) {
      const id = String(variant.id);
      adjustments.push(
        await setCanonicalProductStock(tx, actor, productId, targets.get(id) ?? 0, id),
      );
    }
  } else {
    // After the structure becomes simple, clear any historical base-ledger
    // residue that may have existed while the product was variant-based.
    adjustments.push(await setCanonicalProductStock(tx, actor, productId, 0, null));
  }

  return {
    has_variants: hasVariants,
    variants: hasVariants ? requestedVariants.map((variant) => ({ ...variant })) : [],
    stock_adjustments: adjustments,
  };
}
