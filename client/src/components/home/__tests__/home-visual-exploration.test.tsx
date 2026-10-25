import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HomeVisualExploration from '../home-visual-exploration';

const api = vi.hoisted(() => ({ fetchProducts: vi.fn(), fetchProductBySlug: vi.fn() }));
vi.mock('@/lib/api', () => api);
vi.mock('@/i18n/locale-context', () => ({ useLocale: () => ({ locale: 'ar', dir: 'rtl' }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: () => ({}) }) }));
vi.mock('@/lib/material-catalogue', () => ({ adaptMaterialProducts: () => [] }));
vi.mock('@/components/material-catalogue/material-catalogue', () => ({ MaterialCatalogue: () => null }));
vi.mock('../concept-lookbook', () => ({ ConceptLookbook: () => null }));
vi.mock('@/components/inspiration-scene/inspiration-scene', () => ({ InspirationScene: ({ products }: { products: { id: string }[] }) => <div data-testid="scene-products">{products.map(product => product.id).join(',')}</div> }));

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><HomeVisualExploration /></QueryClientProvider>);
}

describe('lazy home scene public data integration', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('adds only the targeted pump read to the existing materials query', async () => {
    api.fetchProducts.mockResolvedValue({ products: [{ id: 'houyi-stream-sand' }] });
    api.fetchProductBySlug.mockResolvedValue({ id: 'houyi-wave-pump' });
    mount();
    await waitFor(() => expect(screen.getByTestId('scene-products')).toHaveTextContent('houyi-stream-sand,houyi-wave-pump'));
    expect(api.fetchProducts).toHaveBeenCalledWith({ category: 'تربة وديكور', limit: 100 });
    expect(api.fetchProductBySlug).toHaveBeenCalledExactlyOnceWith('houyi-wave-pump');
  });
  it('does not create an ambiguous duplicate when a category response already contains the same product', async () => {
    api.fetchProducts.mockResolvedValue({ products: [{ id: 'houyi-wave-pump' }] });
    api.fetchProductBySlug.mockResolvedValue({ id: 'houyi-wave-pump' });
    mount();
    await waitFor(() => expect(screen.getByTestId('scene-products')).toHaveTextContent('houyi-wave-pump'));
    expect(screen.getByTestId('scene-products').textContent).toBe('houyi-wave-pump');
  });
});
