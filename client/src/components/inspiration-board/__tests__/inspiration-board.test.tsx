import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Router, useLocation } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
import { buildInspirationBoard, INSPIRATION_BOARD_SELECTION, type InspirationProductSource, type InspirationSelection } from '@/lib/inspiration-board';
import { InspirationBoard } from '../inspiration-board';
import { INSPIRATION_BOARD_COPY } from '../inspiration-board-copy';

const products: InspirationProductSource[] = [
  { id: 'aquavo-driftwood-dw-01', slug: 'aquavo-driftwood-dw-01', name: 'Wood DW-01', price: '28000', stock: 1, images: ['/catalogue-wood.webp'] },
  { id: 'houyi-volcanic-stone-red', slug: 'houyi-volcanic-stone-red', name: 'Red lava stone', price: '3851', stock: 17, thumbnail: '/not-the-reviewed-option.webp', images: ['/not-the-reviewed-option.webp'], hasVariants: true,
    variants: [
      { id: 'old', label: 'Old weight', price: 1, stock: 3, isArchived: true, image: '/archived.webp' },
      { id: '1-2cm', label: '1–2 cm', price: null, stock: 0, priceStatus: 'pending', availabilityStatus: 'coming_soon', images: ['/other-option.webp'] },
      { id: '3-5cm', label: '3–5 cm', price: 3851, stock: 17, images: ['/catalogue-red-3-5.webp'] },
    ] },
  { id: 'houyi-stream-sand', slug: 'houyi-stream-sand', name: 'Stream sand', price: '3649', stock: 17, hasVariants: true,
    variants: [{ id: '2-6mm', label: '2–6 mm', price: 3649, stock: 17, image: '/catalogue-sand-2-6.webp' }] },
];

const stoneSelection: InspirationSelection[] = [INSPIRATION_BOARD_SELECTION[1]];
const stone = products[1];
const option = stone.variants![2];
function withOption(patch: Partial<typeof option>): InspirationProductSource {
  return { ...stone, variants: [{ ...option, ...patch }] };
}

function RouteStatus() {
  const [location] = useLocation();
  return <output data-testid="route">{location}</output>;
}

describe('editorial catalogue board data contract', () => {
  it('resolves three exact product/option identities and only their supplied images', () => {
    const before = JSON.stringify(products);
    expect(buildInspirationBoard(products).map(item => [item.productId, item.variantId, item.image, item.href, item.availability])).toEqual([
      ['aquavo-driftwood-dw-01', undefined, '/catalogue-wood.webp', '/products/aquavo-driftwood-dw-01', 'listed'],
      ['houyi-volcanic-stone-red', '3-5cm', '/catalogue-red-3-5.webp', '/products/houyi-volcanic-stone-red', 'listed'],
      ['houyi-stream-sand', '2-6mm', '/catalogue-sand-2-6.webp', '/products/houyi-stream-sand', 'listed'],
    ]);
    expect(new Set(buildInspirationBoard(products).map(item => item.key)).size).toBe(3);
    expect(JSON.stringify(products)).toBe(before);
    expect(buildInspirationBoard(products)[1]).not.toHaveProperty('price');
  });

  it('does not substitute an archived, missing, duplicate, or ambiguous identity', () => {
    expect(buildInspirationBoard([withOption({ isArchived: true })], stoneSelection)[0]).toMatchObject({ href: null, image: null, availability: 'unavailable' });
    expect(buildInspirationBoard([], stoneSelection)[0]).toMatchObject({ href: null, image: null, availability: 'unavailable' });
    expect(buildInspirationBoard([stone, stone], stoneSelection)[0].href).toBeNull();
    expect(buildInspirationBoard([{ ...stone, variants: [option, option] }], stoneSelection)[0].href).toBeNull();
    expect(buildInspirationBoard([{ ...stone, hasVariants: false }], stoneSelection)[0].href).toBeNull();
    expect(buildInspirationBoard([{ ...products[0], isArchived: true }])[0].href).toBeNull();
    expect(buildInspirationBoard([stone], [{ productId: stone.id, material: 'stone' }])[0].href).toBeNull();
    expect(buildInspirationBoard(products, [...stoneSelection, ...stoneSelection])).toHaveLength(1);
  });

  it('keeps matching option IDs on different products as distinct compound identities', () => {
    const second = { ...stone, id: 'second-stone', slug: 'second-stone', name: 'Second stone' };
    const items = buildInspirationBoard([stone, second], [stoneSelection[0], { ...stoneSelection[0], productId: second.id }]);
    expect(items).toHaveLength(2);
    expect(items[0].key).not.toBe(items[1].key);
    expect(items.map(item => item.href)).toEqual(['/products/houyi-volcanic-stone-red', '/products/second-stone']);
  });

  it('treats explicit empty or invalid option galleries as missing without parent fallback', () => {
    expect(buildInspirationBoard([withOption({ images: [], image: '/stale-option.webp' })], stoneSelection)[0].image).toBeNull();
    expect(buildInspirationBoard([withOption({ images: undefined, image: undefined })], stoneSelection)[0].image).toBeNull();
    expect(buildInspirationBoard([withOption({ images: ['javascript:alert(1)', '//untrusted.example/image.jpg', 'data:image/png;base64,AAAA'] })], stoneSelection)[0].image).toBeNull();
    expect(buildInspirationBoard([withOption({ images: ['https://example.com/photo.webp'] })], stoneSelection)[0].image).toBe('https://example.com/photo.webp');
    expect(buildInspirationBoard([withOption({ images: ['https://user:password@example.com/photo.webp'] })], stoneSelection)[0].image).toBeNull();
    expect(buildInspirationBoard([{ ...products[0], images: [], thumbnail: '/stale-parent.webp' }])[0].image).toBeNull();
  });

  it('never promotes incoming, pending-price, unknown-stock or zero-stock options as purchasable', () => {
    expect(buildInspirationBoard([withOption({ stock: 0 })], stoneSelection)[0].availability).toBe('sold-out');
    expect(buildInspirationBoard([withOption({ stock: 9, availabilityStatus: 'coming_soon' })], stoneSelection)[0].availability).toBe('coming-soon');
    expect(buildInspirationBoard([withOption({ stock: 9, priceStatus: 'pending' })], stoneSelection)[0].availability).toBe('pending-price');
    expect(buildInspirationBoard([withOption({ stock: 0, price: null, priceStatus: 'pending', availabilityStatus: 'coming_soon' })], stoneSelection)[0]).toMatchObject({ availability: 'coming-soon', pricePending: true });
    expect(buildInspirationBoard([withOption({ stock: undefined })], stoneSelection)[0].availability).toBe('unknown');
    expect(buildInspirationBoard([withOption({ stock: -1 })], stoneSelection)[0].availability).toBe('unknown');
    expect(buildInspirationBoard([withOption({ stock: 0.5 })], stoneSelection)[0].availability).toBe('unknown');
    expect(buildInspirationBoard([withOption({ price: null })], stoneSelection)[0].availability).toBe('pending-price');
    expect(buildInspirationBoard([{ ...products[0], stock: 0, specifications: { __availabilityStatus: 'coming_soon' } }])[0].availability).toBe('coming-soon');
  });

  it('encodes a canonical product path instead of accepting a supplied external destination', () => {
    expect(buildInspirationBoard([{ ...products[0], slug: 'wood/other?x=1#detail' }])[0].href).toBe('/products/wood%2Fother%3Fx%3D1%23detail');
    expect(buildInspirationBoard([{ ...products[0], slug: '' }])[0].href).toBeNull();
  });
});

describe('editorial catalogue board UI', () => {
  it('provides three numbered, semantic product image links and a permanently visible matching list', () => {
    const { container } = render(<InspirationBoard products={products} language="en" />);
    expect(screen.getByRole('region', { name: INSPIRATION_BOARD_COPY.en.title })).toHaveAttribute('dir', 'ltr');
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(3);
    images.forEach(image => expect(image).toHaveAttribute('loading', 'lazy'));
    expect(screen.getAllByRole('link')).toHaveLength(6);
    const list = screen.getByRole('list', { name: 'Products on this board' });
    expect(list).toBeVisible();
    expect(list.className).not.toMatch(/hidden/);
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    expect(container.querySelectorAll('a[data-product-id]')).toHaveLength(3);
    expect(container.querySelector('a[data-variant-id="3-5cm"]')).toHaveAttribute('href', '/products/houyi-volcanic-stone-red');
    expect(screen.getByText(INSPIRATION_BOARD_COPY.en.disclosure)).toBeVisible();
    expect(screen.getByText(INSPIRATION_BOARD_COPY.en.scaleNote)).toBeVisible();
    expect(container.querySelectorAll('button, form, dialog')).toHaveLength(0);
    expect(container.innerHTML).not.toMatch(/archived.webp|not-the-reviewed-option.webp|other-option.webp/);
  });

  it('supports keyboard Enter and repeated link navigation without a modal or cart mutation', async () => {
    const user = userEvent.setup();
    const location = memoryLocation({ path: '/', record: true });
    render(<Router hook={location.hook}><InspirationBoard products={products} language="en" /><RouteStatus /></Router>);
    const target = screen.getByRole('link', { name: '2. Red lava stone · 3–5 cm. View product details' });
    target.focus();
    expect(target).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('route')).toHaveTextContent('/products/houyi-volcanic-stone-red');
    await user.click(screen.getByRole('link', { name: 'Stream sand. View product details' }));
    expect(screen.getByTestId('route')).toHaveTextContent('/products/houyi-stream-sand');
    await user.click(screen.getByRole('link', { name: 'Wood DW-01. View product details' }));
    expect(screen.getByTestId('route')).toHaveTextContent('/products/aquavo-driftwood-dw-01');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('lets the existing locale router preserve product links without selecting an option', () => {
    const location = memoryLocation({ path: '/en/' });
    render(<Router base="/en" hook={location.hook}><InspirationBoard products={products} language="en" /></Router>);
    expect(screen.getByRole('link', { name: '2. Red lava stone · 3–5 cm. View product details' })).toHaveAttribute('href', '/en/products/houyi-volcanic-stone-red');
  });

  it('keeps pending and zero-stock catalogue links honest, without purchasing controls', () => {
    const incoming = withOption({ stock: 0, price: null, priceStatus: 'pending', availabilityStatus: 'coming_soon' });
    render(<InspirationBoard products={[products[0], incoming, { ...products[2], variants: [{ ...products[2].variants![0], stock: 0 }] }]} language="en" />);
    expect(screen.getByText('Coming soon, not available to buy yet')).toBeVisible();
    expect(screen.getByText('Price not yet confirmed')).toBeVisible();
    expect(screen.getByText('Out of stock')).toBeVisible();
    expect(screen.getAllByText('Listed in stock in the catalogue')).toHaveLength(1);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows unavailable slots and image failures honestly, recovering on changed source images', () => {
    const view = render(<InspirationBoard products={products} language="en" />);
    fireEvent.error(screen.getByAltText('Red lava stone · 3–5 cm'));
    expect(screen.getByText('A photo of this option is not available yet')).toBeVisible();
    expect(screen.getAllByRole('link')).toHaveLength(6);
    view.rerender(<InspirationBoard products={[products[0], withOption({ images: ['/new-reviewed.webp'] }), products[2]]} language="en" />);
    expect(screen.getByAltText('Red lava stone · 3–5 cm')).toHaveAttribute('src', '/new-reviewed.webp');
    view.rerender(<InspirationBoard products={[]} language="en" />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getAllByText('This selection is not in the catalogue now').length).toBeGreaterThan(0);
  });

  it('does not expose stale product links during loading, then preserves the current props', () => {
    const before = JSON.stringify(products);
    const view = render(<InspirationBoard products={products} isLoading language="en" />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading catalogue selections');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    view.rerender(<InspirationBoard products={products} language="ar" />);
    expect(screen.getByRole('region')).toHaveAttribute('dir', 'rtl');
    expect(screen.getByText(INSPIRATION_BOARD_COPY.ar.disclosure)).toBeVisible();
    view.rerender(<InspirationBoard products={products} language="ckb" />);
    expect(screen.getByRole('region')).toHaveAttribute('dir', 'rtl');
    expect(screen.getByText(INSPIRATION_BOARD_COPY.ckb.disclosure)).toBeVisible();
    expect(JSON.stringify(products)).toBe(before);
  });
});
