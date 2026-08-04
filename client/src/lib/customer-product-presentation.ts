import type { Product, ProductVariant } from "@/types";

const CUSTOMER_DIMENSION_PRIORITY = [
  "اللون",
  "النوع",
  "الحجم",
  "المقاس",
  "الأبعاد",
  "القدرة",
  "القوة",
  "السعة",
  "الوزن",
  "العدد",
  "الطول",
  "العرض",
] as const;

const HIDDEN_MODEL_KEYS = new Set([
  "الموديل",
  "موديل",
  "رقم الموديل",
  "رقم موديل",
  "model",
  "model no",
  "model number",
  "model name",
]);

function cleanValue(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeSpecificationKey(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[.:]/g, "")
    .replace(/\s+/g, " ");
}

export function isHiddenModelSpecificationKey(key: string): boolean {
  return HIDDEN_MODEL_KEYS.has(normalizeSpecificationKey(key));
}

export function sanitizeCustomerSpecifications<T>(specifications: T): T {
  if (!specifications || typeof specifications !== "object" || Array.isArray(specifications)) {
    return specifications;
  }

  const cleaned = Object.fromEntries(
    Object.entries(specifications as Record<string, unknown>).filter(
      ([key]) => !isHiddenModelSpecificationKey(key),
    ),
  );

  return cleaned as T;
}

export function sanitizeCustomerSpecsText(specs: string): string {
  const trimmed = specs.trim();
  if (!trimmed) return specs;

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return JSON.stringify(sanitizeCustomerSpecifications(parsed));
    }
  } catch {
    // Legacy specs can be normal text instead of JSON.
  }

  const withoutModelLines = specs
    .split(/\r?\n/)
    .filter((line) => {
      const separatorIndex = line.search(/[:：]/);
      if (separatorIndex < 0) return true;
      return !isHiddenModelSpecificationKey(line.slice(0, separatorIndex));
    })
    .join("\n");

  return withoutModelLines
    .replace(
      /(?:^|[;|،,]\s*)(?:الموديل|موديل|رقم\s+(?:الموديل|موديل)|model(?:\s+(?:no|number|name))?)\s*[:：]\s*[^;|،,\n]+/gi,
      "",
    )
    .replace(/^\s*[;|،,]\s*|\s*[;|،,]\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function getModelValues(specifications: ProductVariant["specifications"]): string[] {
  if (!specifications || typeof specifications !== "object" || Array.isArray(specifications)) {
    return [];
  }

  return Object.entries(specifications as Record<string, unknown>)
    .filter(([key]) => isHiddenModelSpecificationKey(key))
    .map(([, value]) => cleanValue(value))
    .filter((value): value is string => Boolean(value));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanVariantLabel(label: string, modelValues: string[]): string | null {
  let cleaned = label.trim();

  for (const modelValue of modelValues) {
    cleaned = cleaned.replace(new RegExp(escapeRegExp(modelValue), "gi"), " ");
  }

  cleaned = cleaned
    .replace(/\bmodel\b/gi, " ")
    .replace(/الموديل|موديل/g, " ")
    .replace(/^[\s—–\-:|/،,]+|[\s—–\-:|/،,]+$/g, "")
    .replace(/[\s—–\-:|/،,]{2,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.length > 0 ? cleaned : null;
}

export function getCustomerFacingVariantLabel(
  variant: ProductVariant,
  preferredDimensionKey?: string,
  fallbackIndex = 0,
): string {
  if (preferredDimensionKey) {
    const preferredValue = cleanValue(variant.specifications?.[preferredDimensionKey]);
    if (preferredValue) return preferredValue;
  }

  const modelValues = getModelValues(variant.specifications);
  const cleanedLabel = cleanVariantLabel(variant.label || "", modelValues);
  if (cleanedLabel) return cleanedLabel;

  for (const key of CUSTOMER_DIMENSION_PRIORITY) {
    const dimensionValue = cleanValue(variant.specifications?.[key]);
    if (dimensionValue) return dimensionValue;
  }

  return `الخيار ${fallbackIndex + 1}`;
}

export function sanitizeProductForCustomer(product: Product): Product {
  const sanitizedProduct: Product = { ...product };

  if (product.specs !== undefined) {
    sanitizedProduct.specs = sanitizeCustomerSpecsText(product.specs);
  }

  if (product.specifications !== undefined) {
    sanitizedProduct.specifications = sanitizeCustomerSpecifications(product.specifications);
  }

  if (product.variants !== undefined) {
    sanitizedProduct.variants = product.variants?.map((variant, index) => {
      const sanitizedVariant: ProductVariant = {
        ...variant,
        label: getCustomerFacingVariantLabel(variant, undefined, index),
      };

      if (variant.specifications !== undefined) {
        sanitizedVariant.specifications = sanitizeCustomerSpecifications(variant.specifications);
      }

      return sanitizedVariant;
    });
  }

  return sanitizedProduct;
}
