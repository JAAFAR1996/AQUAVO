import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Router, useLocation } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
import { buildInspirationScene, INSPIRATION_SCENE_BACKGROUND, INSPIRATION_SCENE_PROVENANCE, INSPIRATION_SCENE_PUMP_WARNING, type InspirationSceneProductSource } from '@/lib/inspiration-scene';
import { detailImage } from '@/lib/cloudinary';
import { InspirationScene } from '../inspiration-scene';
import { INSPIRATION_SCENE_COPY } from '../inspiration-scene-copy';

const [woodSource, sandSource, pumpSource] = INSPIRATION_SCENE_PROVENANCE;
const products: InspirationSceneProductSource[] = [
  { id: woodSource.productId, slug: woodSource.productId, name: 'Wood DW-01', price: '28000', stock: 1, hasVariants: false, images: [woodSource.image] },
  { id: sandSource.productId, slug: sandSource.productId, name: 'Stream sand', price: '3649', stock: 17, hasVariants: true,
    images: ['/unreviewed-parent.webp'], thumbnail: '/unreviewed-parent.webp', variants: [
      { id: '2-6mm', label: '2–6 mm', price: 3649, stock: 17, priceStatus: 'confirmed', images: [sandSource.image] },
      { id: '5-8mm', label: '5–8 mm', price: null, stock: 0, priceStatus: 'pending', availabilityStatus: 'coming_soon', images: ['/not-the-option.webp'] },
    ] },
  { id: pumpSource.productId, slug: pumpSource.productId, name: 'SOBO wave pump', price: '9996', stock: 4, hasVariants: false, images: [pumpSource.image] },
];
const sand = products[1];
const option = sand.variants![0];
function withOption(patch: Partial<typeof option>): InspirationSceneProductSource {
  return { ...sand, variants: [{ ...option, ...patch }, sand.variants![1]] };
}
function RouteStatus() { const [location] = useLocation(); return <output data-testid="route">{location}</output>; }

describe('catalogue scene identity and source guards', () => {
  it('resolves only the three exact product + option identities without changing source data', () => {
    const before = JSON.stringify(products);
    const items = buildInspirationScene(products);
    expect(items.map(item => [item.number, item.productId, item.variantId, item.image, item.href, item.availability])).toEqual([
      [1, woodSource.productId, undefined, woodSource.image, `/products/${woodSource.productId}`, 'listed'],
      [2, sandSource.productId, '2-6mm', sandSource.image, `/products/${sandSource.productId}`, 'listed'],
      [3, pumpSource.productId, undefined, pumpSource.image, `/products/${pumpSource.productId}`, 'listed'],
    ]);
    expect(items[1].key).toBe(JSON.stringify(['houyi-stream-sand', '2-6mm']));
    expect(new Set(items.map(item => item.key)).size).toBe(3);
    expect(JSON.stringify(products)).toBe(before);
    items.forEach(item => { expect(item).not.toHaveProperty('price'); expect(item).not.toHaveProperty('specifications'); });
  });

  it('fails closed for missing, archived, duplicate, or wrong option identities', () => {
    expect(buildInspirationScene([]).every(item => item.href === null && item.image === null)).toBe(true);
    expect(buildInspirationScene([products[0], products[0]])[0].href).toBeNull();
    expect(buildInspirationScene([{ ...products[0], isArchived: true }])[0].href).toBeNull();
    expect(buildInspirationScene([{ ...products[0], hasVariants: true }])[0].href).toBeNull();
    expect(buildInspirationScene([withOption({ isArchived: true })])[1]).toMatchObject({ href: null, image: null, availability: 'unavailable' });
    expect(buildInspirationScene([{ ...sand, variants: [option, option] }])[1].href).toBeNull();
    expect(buildInspirationScene([{ ...sand, variants: [sand.variants![1]] }])[1].href).toBeNull();
    expect(buildInspirationScene([{ ...sand, hasVariants: false }])[1].href).toBeNull();
    expect(buildInspirationScene([{ ...products[2], id: 'another-pump', variants: [{ ...option, image: pumpSource.image }] }])[2].href).toBeNull();
  });

  it('never substitutes a parent, opaque image, changed source, or another catalogue option', () => {
    expect(buildInspirationScene([withOption({ images: [], image: sandSource.image })])[1].image).toBeNull();
    expect(buildInspirationScene([withOption({ images: undefined, image: undefined })])[1].image).toBeNull();
    expect(buildInspirationScene([withOption({ images: ['/opaque-new-source.jpg', sandSource.image] })])[1].image).toBeNull();
    expect(buildInspirationScene([withOption({ images: [woodSource.image] })])[1].image).toBeNull();
    expect(buildInspirationScene([{ ...products[0], images: [], thumbnail: woodSource.image }])[0].image).toBeNull();
    expect(buildInspirationScene([withOption({ images: undefined, image: sandSource.image })])[1].image).toBe(sandSource.image);
    expect(buildInspirationScene([withOption({ images: ['javascript:alert(1)'] })])[1]).toMatchObject({ image: null, href: `/products/${sandSource.productId}` });
  });

  it('does not claim pending, incoming, archived, unknown-stock, or zero-stock choices are purchasable', () => {
    expect(buildInspirationScene([withOption({ stock: 0 })])[1].availability).toBe('sold-out');
    expect(buildInspirationScene([withOption({ stock: 1, priceStatus: 'pending' })])[1].availability).toBe('pending-price');
    expect(buildInspirationScene([withOption({ stock: 4, availabilityStatus: 'coming_soon' })])[1].availability).toBe('coming-soon');
    expect(buildInspirationScene([withOption({ stock: 0, price: null, priceStatus: 'pending', availabilityStatus: 'coming_soon' })])[1]).toMatchObject({ availability: 'coming-soon', pricePending: true });
    for (const stock of [undefined, '', -1, 0.5, 'unknown']) expect(buildInspirationScene([withOption({ stock })])[1].availability).toBe('unknown');
    expect(buildInspirationScene([withOption({ price: null })])[1].availability).toBe('pending-price');
    expect(buildInspirationScene([{ ...products[2], stock: 0 }])[2].availability).toBe('sold-out');
    expect(buildInspirationScene([{ ...products[2], price: '9996', stock: 4, priceStatus: 'pending' }])[2]).toMatchObject({ availability: 'pending-price', pricePending: true });
    expect(buildInspirationScene([{ ...products[0], price: '28000', stock: 1, priceStatus: 'pending' }])[0].availability).toBe('pending-price');
    expect(buildInspirationScene([{ ...products[2], availabilityStatus: 'coming_soon' }])[2].availability).toBe('coming-soon');
    expect(buildInspirationScene([{ ...products[2], stock: 0, specifications: { __availabilityStatus: 'coming_soon' } }])[2].availability).toBe('coming-soon');
  });

  it('uses canonical encoded product-page links without selecting options', () => {
    expect(buildInspirationScene([{ ...products[0], slug: 'wood/other?x=1' }])[0].href).toBe('/products/wood%2Fother%3Fx%3D1');
    expect(buildInspirationScene([{ ...products[0], slug: '' }])[0].href).toBeNull();
    expect(buildInspirationScene(products)[1].href).not.toContain('?');
  });
});

describe('illustrative catalogue scene UI', () => {
  it('renders exact source layers, responsive empty background, and three stable product links plus the visible list', () => {
    const { container } = render(<InspirationScene products={products} language="en" />);
    const region = screen.getByRole('region', { name: INSPIRATION_SCENE_COPY.en.title });
    expect(region).toHaveAttribute('dir', 'ltr');
    const layers = container.querySelectorAll('a[data-scene-layer]');
    expect(layers).toHaveLength(3);
    layers.forEach((layer, index) => {
      expect(layer).toHaveAttribute('href', `/products/${INSPIRATION_SCENE_PROVENANCE[index].productId}`);
      expect(layer.querySelector('img')).toHaveAttribute('src', detailImage(INSPIRATION_SCENE_PROVENANCE[index].image));
      expect(layer.querySelector('img')).toHaveAttribute('loading', 'lazy');
      expect(layer.querySelector('img')).toHaveAttribute('data-catalogue-source', INSPIRATION_SCENE_PROVENANCE[index].image);
      expect(layer.querySelector('img')?.getAttribute('srcset')).toContain('c_limit');
      expect(layer.querySelector('img')?.getAttribute('srcset')).not.toMatch(/c_fill|c_pad|b_auto/);
    });
    expect(container.querySelector('a[data-variant-id="2-6mm"]')).not.toBeNull();
    const background = screen.getByAltText(INSPIRATION_SCENE_COPY.en.backgroundAlt);
    expect(background).toHaveAttribute('src', INSPIRATION_SCENE_BACKGROUND.src);
    expect(background).toHaveAttribute('srcset', INSPIRATION_SCENE_BACKGROUND.srcSet);
    expect(background).toHaveAttribute('width', '1672');
    expect(screen.getAllByRole('link')).toHaveLength(6);
    const list = screen.getByRole('list', { name: INSPIRATION_SCENE_COPY.en.listLabel });
    expect(list).toBeVisible();
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    expect(container.querySelectorAll('button, dialog, form, canvas')).toHaveLength(0);
    expect(container.innerHTML).not.toMatch(/unreviewed-parent|not-the-option|WP-50M|3000L/);
  });

  it('keeps the AI, source provenance, no-scale/no-kit, and unpowered pump warnings visible', () => {
    render(<InspirationScene products={products} language="en" />);
    expect(screen.getByText(INSPIRATION_SCENE_COPY.en.disclosure)).toBeVisible();
    expect(screen.getByText(INSPIRATION_SCENE_COPY.en.scopeNote)).toBeVisible();
    expect(screen.getByText(INSPIRATION_SCENE_COPY.en.settingLabel)).toBeVisible();
    expect(screen.getByText(INSPIRATION_SCENE_PUMP_WARNING)).toBeVisible();
    expect(screen.getByText(INSPIRATION_SCENE_COPY.en.pumpWarning)).toBeVisible();
    expect(screen.getByText(INSPIRATION_SCENE_COPY.en.unpowered)).toBeVisible();
    expect(screen.getByRole('link', { name: '3. SOBO wave pump. View product details' }).getAttribute('aria-describedby')?.split(' ')).toHaveLength(2);
  });

  it('supports keyboard navigation, locale routes, and repeated links without a cart action or modal', async () => {
    const user = userEvent.setup();
    const location = memoryLocation({ path: '/en/', record: true });
    render(<Router base="/en" hook={location.hook}><InspirationScene products={products} language="en" /><RouteStatus /></Router>);
    const target = screen.getByRole('link', { name: '2. Stream sand · 2–6 mm. View product details' });
    expect(target).toHaveAttribute('href', '/en/products/houyi-stream-sand');
    target.focus();
    expect(target).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('route')).toHaveTextContent('/products/houyi-stream-sand');
    await user.click(screen.getByRole('link', { name: 'SOBO wave pump. View product details' }));
    expect(screen.getByTestId('route')).toHaveTextContent('/products/houyi-wave-pump');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('does not substitute failed images, but preserves details links and recovers when identity source returns', () => {
    const view = render(<InspirationScene products={products} language="en" />);
    fireEvent.error(screen.getByAltText('Stream sand · 2–6 mm'));
    expect(view.container.querySelector('a[data-scene-layer="sand"]')).toBeNull();
    expect(screen.getByRole('link', { name: 'Stream sand. View product details' })).toBeVisible();
    view.rerender(<InspirationScene products={[products[0], withOption({ images: [] }), products[2]]} language="en" />);
    expect(screen.getByText(INSPIRATION_SCENE_COPY.en.missingPhoto)).toBeVisible();
    view.rerender(<InspirationScene products={products} language="en" />);
    expect(screen.getByAltText('Stream sand · 2–6 mm')).toHaveAttribute('src', detailImage(sandSource.image));
  });

  it('honestly renders missing identities, pending/zero stock, loading, and RTL without mutations', () => {
    const before = JSON.stringify(products);
    const view = render(<InspirationScene products={products} language="ar" isLoading />);
    expect(screen.getByRole('status')).toHaveTextContent(INSPIRATION_SCENE_COPY.ar.loading);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    view.rerender(<InspirationScene products={products} language="ar" />);
    expect(screen.getByRole('region')).toHaveAttribute('dir', 'rtl');
    expect(screen.getByText(INSPIRATION_SCENE_PUMP_WARNING)).toBeVisible();
    view.rerender(<InspirationScene products={products} language="ckb" />);
    expect(screen.getByRole('region')).toHaveAttribute('dir', 'rtl');
    expect(screen.getByText(INSPIRATION_SCENE_COPY.ckb.disclosure)).toBeVisible();
    view.rerender(<InspirationScene products={[products[0], withOption({ stock: 0, priceStatus: 'pending', price: null }), { ...products[2], stock: 0 }]} language="en" />);
    expect(screen.getByText('Price not yet confirmed')).toBeVisible();
    expect(screen.getByText('Out of stock')).toBeVisible();
    expect(screen.getAllByText('Listed in stock in the catalogue')).toHaveLength(1);
    view.rerender(<InspirationScene products={[]} language="en" />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(view.container.querySelectorAll('[data-scene-layer]')).toHaveLength(0);
    expect(JSON.stringify(products)).toBe(before);
  });

  it('preserves catalogue proportions without raster filters, cropping, transforms, or animation', () => {
    const css = readFileSync('client/src/components/inspiration-scene/inspiration-scene.css', 'utf8');
    expect(css).toContain('height:auto');
    expect(css).toContain('object-fit:contain');
    expect(css).toContain('focus-visible');
    expect(css).toContain('width:44px;height:44px');
    expect(css).not.toMatch(/(?:transform|filter|mix-blend-mode|clip-path|animation|transition)\s*:/);
    expect(css).not.toContain('object-fit:cover');
    expect(css).not.toMatch(/#[a-f\d]{3,8}\b|font-family:Arial|letter-spacing/);
    expect(css).not.toMatch(/display\s*:\s*none|visibility\s*:\s*hidden/);
  });
});
