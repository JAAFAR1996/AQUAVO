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
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Test stone');
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
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Test sand');
  });
});
