export interface ChoiceFact { label: string; value: string; kind: 'fit' | 'size' | 'contents' | 'requirement' }
const groups: Record<ChoiceFact['kind'], string[]> = {
  fit: ['التوافق', 'الأسماك المناسبة', 'حجم الحوض المناسب', 'الاستخدام', 'أفضل استخدام', 'نمط الاستخدام', 'compatibility', 'suitableFor'],
  size: ['الأبعاد', 'القياس', 'الحجم', 'حجم القطع', 'حجم الحبيبات', 'الحجم التقريبي', 'الأحجام', 'الطول', 'القطر', 'dimensions', 'size'],
  contents: ['محتويات العبوة', 'المحتويات', 'وحدة البيع', 'الموس الحي', 'packageContents'],
  requirement: ['يحتاج', 'متطلبات التشغيل', 'غير مشمول', 'requirements'],
};
function clean(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
}
/** Read explicit catalogue fields only. Never infer fit from watts, names or photos. */
export function productChoiceFacts(base: Record<string, unknown> = {}, variant?: Record<string, unknown>, awaitingVariant = false): ChoiceFact[] {
  const facts: ChoiceFact[] = [];
  for (const [kind, keys] of Object.entries(groups) as [ChoiceFact['kind'], string[]][]) {
    if (kind === 'size' && awaitingVariant) continue;
    const useVariantOnly = kind === 'size' && variant !== undefined;
    for (const label of keys) {
      const value = clean(variant && Object.hasOwn(variant, label) ? variant[label] : useVariantOnly ? undefined : base[label]);
      if (value && !facts.some(fact => fact.kind === kind && fact.value === value)) facts.push({ kind, label, value });
    }
  }
  return facts;
}
