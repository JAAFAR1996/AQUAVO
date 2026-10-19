/** Keep a physical Arabic verb from triggering an unrelated financial term. */
export function sourceForGlossaryConcept(source: string, concept: string): string {
  if (concept !== "payment") return source;
  // Remove only this physical occurrence. A later payment reference in the
  // same sentence must still be checked against the financial glossary.
  return source.replace(/(?<![\p{L}\p{M}])دفع(?=\s+السلك(?:[^\p{L}\p{M}]|$))/gu, "");
}
