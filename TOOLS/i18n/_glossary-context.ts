export interface GlossaryContext {
  specificationValue?: unknown;
}

/** Resolve an ambiguous Arabic term only when its source context is explicit. */
export function sourceForGlossaryConcept(source: string, concept: string, context?: GlossaryContext): string {
  // A charging-port specification uses the same Arabic label as shipping.
  // Only an exact USB value disambiguates this label; shipping prose and UI
  // strings still have to satisfy the delivery glossary.
  if (concept === "delivery" && source.trim() === "الشحن"
    && typeof context?.specificationValue === "string"
    && /^USB(?:-C)?$/i.test(context.specificationValue.trim())) return "";
  if (concept !== "payment") return source;
  // Remove only this physical occurrence. A later payment reference in the
  // same sentence must still be checked against the financial glossary.
  return source.replace(/(?<![\p{L}\p{M}])دفع(?=\s+(?:السلك|العوالق)(?:[^\p{L}\p{M}]|$))/gu, "");
}
