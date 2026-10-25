import { InspirationScene } from "@/components/inspiration-scene/inspiration-scene";
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/i18n/locale-context';
import { fetchProducts, fetchProductBySlug } from '@/lib/api';
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
  const scenePump = useQuery({
    queryKey: ['products', 'visual-scene-pump', locale],
    // One public GET; no catalogue-wide equipment fetch or view/order mutation.
    queryFn: () => fetchProductBySlug('houyi-wave-pump'),
    staleTime: 300_000,
    retry: 1,
  });
  const sceneProducts = [...(materials.data?.products ?? [])];
  if (scenePump.data && !sceneProducts.some(product => product.id === scenePump.data.id)) sceneProducts.push(scenePump.data);
  const items = adaptMaterialProducts(materials.data?.products ?? []);
  return <>
    <InspirationScene products={sceneProducts} isLoading={materials.isLoading || scenePump.isLoading} language={locale} />
    <ConceptLookbook products={materials.data?.products ?? []} language={locale} copy={t('lookbook', { returnObjects: true }) as ConceptLookbookCopy} dir={dir} />
    {items.length > 0 && <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8"><MaterialCatalogue items={items} language={locale} compact /></div>}
  </>;
}
