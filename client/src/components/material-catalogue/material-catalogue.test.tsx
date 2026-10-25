import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { adaptMaterialProducts } from '@/lib/material-catalogue';
import { MaterialCatalogue } from './material-catalogue';
const items = adaptMaterialProducts([
  { id: 'test-sand', slug: 'test-sand', name: 'Test sand', category: 'Decor', subcategory: 'Sand', thumbnail: '/test/sand.jpg' },
  { id: 'test-stone', slug: 'test-stone', name: 'Test stone', category: 'Decor', subcategory: 'Stones', thumbnail: '/test/stone.jpg' },
]);
describe('MaterialCatalogue', () => {
  it('renders ordinary photos without claiming dry/wet or physical scale', () => {
    render(<MaterialCatalogue items={items} language="en" />);
    expect(screen.getByText('Measurements not yet verified')).toBeVisible();
    expect(screen.queryByText('Dry')).not.toBeInTheDocument();
    expect(screen.queryByText('Wet')).not.toBeInTheDocument();
    expect(screen.queryByText('Individually tracked piece')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View product details' })).toHaveAttribute('href', '/products/test-sand');
  });
  it('renders optional media only after adapter verifies sourced evidence', () => {
    const photo = { verified: true, source: 'Test-only photo record', productId: 'test-sand', materialId: 'test-material', sampleId: 'test-sample', captureSetupId: 'test-setup', kind: 'actual-product-photo' };
    const verifiedItems = adaptMaterialProducts([{ id: 'test-sand', slug: 'test-sand', name: 'Test sand', category: 'Decor', subcategory: 'Sand' }], {
      evidenceById: { 'test-sand': {
        pair: { dry: { ...photo, src: '/test/dry.jpg' }, wet: { ...photo, src: '/test/wet.jpg' } },
        measurements: [{ verified: true, source: 'Test-only measurement record', productId: 'test-sand', value: 2, unit: 'mm', label: 'Test grain' }],
        piece: { verified: true, source: 'Test-only piece ledger', productId: 'test-sand', pieceId: 'test-piece', image: '/test/piece.jpg', kind: 'actual-product-photo', individuallyTracked: true },
      } },
    });
    render(<MaterialCatalogue items={verifiedItems} language="en" />);
    expect(screen.getByText('Dry')).toBeVisible();
    expect(screen.getByText('Wet')).toBeVisible();
    expect(screen.getByText('2 mm')).toBeVisible();
    expect(screen.getByRole('img', { name: 'Individually tracked piece: test-piece' })).toHaveAttribute('src', '/test/piece.jpg');
    expect(screen.queryByText('Measurements not yet verified')).not.toBeInTheDocument();
  });
  it('supports native keyboard material selection and clearly separates selected state', async () => {
    const user = userEvent.setup();
    render(<MaterialCatalogue items={items} language="en" />);
    const stone = screen.getByRole('button', { name: 'Test stone Stone' });
    stone.focus(); await user.keyboard('{Enter}');
    expect(stone).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('heading', { level: 3 })[0]).toHaveTextContent('Test stone');
    expect(screen.getByRole('link')).toHaveAttribute('href', '/products/test-stone');
    const sand = screen.getByRole('button', { name: 'Test sand Sand' });
    sand.focus(); await user.keyboard(' ');
    expect(sand).toHaveAttribute('aria-pressed', 'true');
    expect(stone).toHaveAttribute('aria-pressed', 'false');
  });
  it('uses RTL for Arabic and Kurdish, and handles broken images without substitution', () => {
    const { container, rerender } = render(<MaterialCatalogue items={items} language="ar" />);
    expect(container.querySelector('section')).toHaveAttribute('dir', 'rtl');
    fireEvent.error(screen.getByRole('img', { name: 'Test sand' }));
    expect(screen.getByText('الصورة مو متوفرة هسه')).toBeVisible();
    rerender(<MaterialCatalogue items={items} language="ckb" />);
    expect(container.querySelector('section')).toHaveAttribute('dir', 'rtl');
  });
  it('renders no empty section and safely falls back when selection leaves catalogue', () => {
    const { container, rerender } = render(<MaterialCatalogue items={[]} language="en" />);
    expect(container).toBeEmptyDOMElement();
    rerender(<MaterialCatalogue items={items} language="en" selectedId="missing" />);
    expect(screen.getAllByRole('heading', { level: 3 })[0]).toHaveTextContent('Test sand');
  });
});

describe('material exploration interactions', () => {
  const populated = adaptMaterialProducts([
    { id: 'stream', slug: 'houyi-stream-sand', name: 'رمل جداول — 2–6 ملم', category: 'Decor', subcategory: 'Sand', thumbnail: '/parent.jpg', stock: 7, price: 5000, hasVariants: true, specifications: { 'حجم الحبيبات': '2–6 ملم' }, variants: [
      { id: '2-6mm', label: '2–6 mm', price: 5000, stock: 7, isDefault: true, images: ['/small.jpg', '/small-detail.jpg'], specifications: { 'المقاس': '2–6 ملم' } },
      { id: '5-8mm', label: '5–8 mm', price: null, stock: 0, priceStatus: 'pending', availabilityStatus: 'coming_soon', images: ['/large.jpg'], specifications: { 'المقاس': '5–8 ملم' } },
      { id: 'missing', label: 'No photo option', price: null, stock: 0, images: [], specifications: {} },
      { id: 'old', label: 'Archived 5 kg', price: 100, stock: 0, isArchived: true },
    ] },
    { id: 'stone', slug: 'stone', name: 'River stones', category: 'Decor', subcategory: 'Stones', images: ['/stone.jpg'], specifications: { 'نطاق المقاس التقريبي': '1–4 سم' } },
  ]);
  it('switches variant photo, price and exact dimensions together without archived or parent leakage', async () => {
    const user = userEvent.setup();
    render(<MaterialCatalogue items={populated} language="en" />);
    expect(screen.queryByRole('button', { name: /Archived/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '5–8 mm Coming soon' }));
    expect(screen.getByRole('img', { name: 'رمل جداول — 5–8 ملم' })).toHaveAttribute('src', '/large.jpg');
    expect(screen.getByRole('heading', { level: 3, name: 'رمل جداول — 5–8 ملم' })).toBeVisible();
    expect(screen.queryByText('5,000 IQD')).not.toBeInTheDocument();
    expect(screen.getByText('5–8 ملم')).toBeVisible();
    expect(screen.queryByText('2–6 ملم', { selector: 'bdi' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View product details' })).toHaveAttribute('href', '/products/houyi-stream-sand');
  });
  it('does not substitute another option photograph when the selected gallery is empty', async () => {
    const user = userEvent.setup();
    render(<MaterialCatalogue items={populated} language="en" />);
    await user.click(screen.getByRole('button', { name: 'No photo option' }));
    expect(screen.getByText('No image is listed for this option yet. A different size is not shown in its place.')).toBeVisible();
    expect(screen.queryByRole('img', { name: /رمل جداول/ })).not.toBeInTheDocument();
  });
  it('exposes image detail honestly and supports keyboard position adjustment', async () => {
    const user = userEvent.setup();
    render(<MaterialCatalogue items={populated} language="en" />);
    const detail = screen.getByRole('button', { name: 'Image detail' });
    detail.focus(); await user.keyboard('{Enter}');
    expect(detail).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('This is an image crop, not actual physical scale or a verified macro photograph.')).toBeVisible();
    const horizontal = screen.getByRole('slider', { name: 'Detail horizontal position' });
    fireEvent.change(horizontal, { target: { value: '75' } });
    expect(screen.getByRole('img', { name: 'رمل جداول — 2–6 ملم' })).toHaveStyle({ transformOrigin: '75% 50%' });
    await user.click(screen.getByRole('button', { name: 'Catalogue image 2' }));
    expect(screen.getByRole('img', { name: 'رمل جداول — 2–6 ملم' })).toHaveAttribute('src', '/small-detail.jpg');
    await user.click(screen.getByRole('button', { name: 'Full image' }));
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  });
  it('filters categories with native buttons and recovers selection', async () => {
    const user = userEvent.setup();
    render(<MaterialCatalogue items={populated} language="en" />);
    const stones = screen.getByRole('button', { name: 'Stone 1' });
    stones.focus(); await user.keyboard(' ');
    expect(stones).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { level: 3, name: 'River stones' })).toBeVisible();
    expect(screen.getByText('Approximate size range')).toBeVisible();
    expect(screen.queryByRole('button', { name: /رمل جداول/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'All materials 2' }));
    expect(screen.getByRole('heading', { level: 3, name: 'رمل جداول — 2–6 ملم' })).toBeVisible();
  });
  it('offers all-material navigation in compact mode and keeps translation chrome localized', () => {
    const { rerender } = render(<MaterialCatalogue items={populated} language="en" compact />);
    expect(screen.getByRole('link', { name: 'Explore all materials' })).toHaveAttribute('href', '/materials');
    rerender(<MaterialCatalogue items={populated} language="ar" compact />);
    expect(screen.getByRole('button', { name: 'تفاصيل الصورة' })).toBeVisible();
    rerender(<MaterialCatalogue items={populated} language="ckb" compact />);
    expect(screen.getByRole('button', { name: 'وردەکاریی وێنە' })).toBeVisible();
  });
});
