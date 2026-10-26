import { useTranslation } from 'react-i18next';
import { isolateNumericRanges as bidi } from '@shared/i18n/bidi';
import type { ChoiceFact } from '@/lib/product-choice-facts';

export function ProductChoiceSummary({ facts, dimensions = false, variantLabel }: { facts: ChoiceFact[]; dimensions?: boolean; variantLabel?: string }) {
  const { t } = useTranslation('product');
  const rows = facts.filter(f => dimensions ? f.kind === 'size' : f.kind !== 'size');
  if (!rows.length) return null;
  return <section className="my-4 border-s-2 border-primary ps-4" aria-label={t(dimensions ? 'choice.dimensions' : 'choice.title')}>
    <h2 className="text-sm font-bold">{t(dimensions ? 'choice.dimensions' : 'choice.title')}</h2>
    {variantLabel && <p className="mt-1 text-sm text-primary">{bidi(variantLabel)}</p>}
    <dl className="mt-3 space-y-2 text-sm">
      {rows.map(row => <div key={`${row.kind}-${row.label}`} className="grid gap-1"><dt className="text-muted-foreground">{row.label}</dt><dd className="break-words leading-6">{bidi(row.value)}</dd></div>)}
    </dl>
    {dimensions && <p className="mt-3 text-xs leading-5 text-muted-foreground">{t('choice.scaleNote')}</p>}
  </section>;
}
