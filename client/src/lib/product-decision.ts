/** Presentation only: no inferred specifications, doses or tank-volume formulas. */
export function productIntro(description: string | undefined, benefit: unknown): string {
  if (typeof benefit === 'string' && benefit.trim() && benefit.trim().length <= 220) return benefit.trim();
  const paragraph = (description ?? '').trim().split(/\n\s*\n/)[0];
  if (paragraph.length <= 220) return paragraph;
  // Use a complete sentence, never truncate a dose or its safety qualification.
  const sentence = paragraph.match(/^.{1,219}?[.!؟](?:\s|$)/)?.[0]?.trim();
  return sentence ?? '';
}

export function variantChoiceHint(specs: Record<string, unknown> = {}, productSlug?: string): string | undefined {
  // The YSH package chart and existing catalogue disagree. Do not promote either
  // as a fit claim until the actual stock variants have been reconciled.
  if (productSlug === 'yee-3006') return undefined;
  for (const key of ['حجم الحوض المناسب', 'التوافق', 'محتويات العبوة', 'عدد الاختبارات']) {
    const value = specs[key];
    if (typeof value === 'string' && value.trim() && value.length <= 100) return value.trim();
  }
  return undefined;
}

export function visibleProductSpecs(base: Record<string, unknown>, variant: Record<string, unknown> | undefined, slug: string): Record<string, unknown> {
  const merged = { ...base, ...variant };
  if (slug === 'yee-3006') {
    delete merged['مناسب'];
    delete merged['حجم الحوض المناسب'];
  }
  return merged;
}
