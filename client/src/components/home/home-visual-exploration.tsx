import { InspirationBoard } from "@/components/inspiration-board/inspiration-board";
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/i18n/locale-context';
import { fetchProducts } from '@/lib/api';
import { adaptMaterialProducts } from '@/lib/material-catalogue';
import { MaterialCatalogue } from '@/components/material-catalogue/material-catalogue';
import { ConceptLookbook, type ConceptLookbookCopy } from './concept-lookbook';

export default function HomeVisualExploration() {
  const { locale, dir } = useLocale();
  const { t } = useTranslation('home');
  const materials = useQuery({
    queryKey: ['products', 'visual-materials', locale],
    // Canonical public category value; response localization remains handled by API.
    queryFn: () => fetchProducts({ category: 'تربة وديكور', limit: 100 }),
    staleTime: 300_000,
    retry: 1,
  });
  const items = adaptMaterialProducts(materials.data?.products ?? []);
  return <>
    <InspirationBoard products={materials.data?.products ?? []} isLoading={materials.isLoading} language={locale} />
    <ConceptLookbook products={materials.data?.products ?? []} language={locale} copy={t('lookbook', { returnObjects: true }) as ConceptLookbookCopy} dir={dir} />
    {items.length > 0 && <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8"><MaterialCatalogue items={items} language={locale} compact /></div>}
  </>;
}
