import type { Product } from '@/types';
import { getVerifiedExternalAnnotations } from '@/lib/verified-external-annotations';
import { ExplodedProductView } from './exploded-product-view';

/** Optional explanatory media stays outside the critical product-route chunk. */
export default function AnnotatedProductView({ product, selectedVariantId, locale }: { product: Product; selectedVariantId?: string; locale: string }) {
  const annotations = getVerifiedExternalAnnotations(product, { photoUrl: product.image || product.thumbnail || product.images?.[0], selectedVariantId, locale });
  return <ExplodedProductView product={product} annotations={annotations ?? undefined} />;
}
