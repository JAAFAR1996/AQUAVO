import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { WoodProductSource } from '@/lib/wood-gallery';
import { WoodGallery } from './WoodGallery';

const products: WoodProductSource[] = [
  { id: 'aquavo-driftwood-dw-01', slug: 'aquavo-driftwood-dw-01', name: 'Natural wood DW-01', price: '28000', stock: 1,
    images: ['/catalogue/dw-01.webp'], specifications: { 'رمز القطعة': 'DW-01', 'ملاحظة': 'الشكل المعروض هو نفس القطعة التي تستلمها' } },
  { id: 'aquavo-driftwood-dw-11', slug: 'aquavo-driftwood-dw-11', name: 'Natural wood DW-11', price: '19600', stock: 0,
    images: ['/catalogue/dw-11.webp'], specifications: { 'رمز القطعة': 'DW-11', 'ملاحظة': 'الشكل المعروض هو نفس القطعة التي تستلمها' } },
];

describe('WoodGallery', () => {
  it('renders separate canonical links, exact prices, current availability and clear evidence limits', () => {
    render(<WoodGallery products={products} language="en" />);
    expect(screen.getByRole('link', { name: 'Natural wood DW-01' })).toHaveAttribute('href', '/products/aquavo-driftwood-dw-01');
    expect(screen.getByRole('link', { name: 'View piece details: DW-11' })).toHaveAttribute('href', '/products/aquavo-driftwood-dw-11');
    expect(screen.getByText('28,000 IQD')).toBeVisible();
    expect(screen.getByText('19,600 IQD')).toBeVisible();
    expect(screen.getByText('Available now')).toBeVisible();
    expect(screen.getByText('Currently unavailable')).toBeVisible();
    expect(screen.getAllByText('Measurements not yet verified')).toHaveLength(2);
    expect(screen.getAllByText('No verified ruler photo yet')).toHaveLength(2);
    expect(screen.getAllByText('No verified second angle yet')).toHaveLength(2);
    expect(screen.getAllByText('No verified in-aquarium photo of this piece yet')).toHaveLength(2);
    expect(screen.getByText(/The product description identifies/)).toHaveTextContent('Image zoom is not a physical-size reference.');
    expect(screen.getByRole('img', { name: 'Natural wood DW-11 · Catalogue photo' })).toHaveAttribute('src', '/catalogue/dw-11.webp');
    expect(screen.queryByRole('button', { name: /cart/i })).not.toBeInTheDocument();
  });
  it('opens from the keyboard, zooms without a physical-scale claim, closes on Escape and resets on reopen', async () => {
    const user = userEvent.setup();
    render(<WoodGallery products={products} language="en" />);
    const opener = screen.getByRole('button', { name: 'Enlarge image: DW-01' });
    opener.focus();
    await user.keyboard('{Enter}');
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/Image zoom only, not actual size/)).toBeVisible();
    expect(within(dialog).getByRole('region')).toHaveAttribute('tabindex', '0');
    await user.click(within(dialog).getByRole('button', { name: 'Zoom image in' }));
    expect(within(dialog).getByText('150%')).toBeVisible();
    await user.click(within(dialog).getByRole('button', { name: 'Reset image' }));
    expect(within(dialog).getByText('100%')).toBeVisible();
    expect(within(dialog).getByRole('button', { name: 'Zoom image out' })).toBeDisabled();
    await user.click(within(dialog).getByRole('button', { name: 'Zoom image in' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(within(screen.getByRole('dialog')).getByText('100%')).toBeVisible();
  });
  it('does not describe additional ordinary catalogue images as measured or verified angles', async () => {
    const user = userEvent.setup();
    render(<WoodGallery products={[{ ...products[0], images: ['/catalogue/front.webp', '/catalogue/back.webp'] }]} language="en" />);
    const second = screen.getByRole('button', { name: 'Catalogue photo 2' });
    second.focus(); await user.keyboard(' ');
    expect(second).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('img', { name: 'Natural wood DW-01 · Catalogue photo' })).toHaveAttribute('src', '/catalogue/back.webp');
    expect(screen.getByText('No verified second angle yet')).toBeVisible();
  });
  it('honors source updates, removes archived pieces, and renders no empty gallery', () => {
    const { rerender, container } = render(<WoodGallery products={products} language="en" />);
    rerender(<WoodGallery products={[{ ...products[0], priceStatus: 'pending', stock: 0 }, { ...products[1], isArchived: true }]} language="en" />);
    expect(screen.getByText('Price awaiting confirmation')).toBeVisible();
    expect(screen.queryByText('28,000 IQD')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Natural wood DW-11' })).not.toBeInTheDocument();
    rerender(<WoodGallery products={[]} language="en" />);
    expect(container).toBeEmptyDOMElement();
  });
  it('handles broken photos without replacing them with generated or unrelated imagery', () => {
    render(<WoodGallery products={[products[0]]} language="en" />);
    fireEvent.error(screen.getByRole('img', { name: 'Natural wood DW-01 · Catalogue photo' }));
    expect(screen.getByText('Photo not available')).toBeVisible();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
  it('supports Arabic and Kurdish RTL and English LTR', () => {
    const { container, rerender } = render(<WoodGallery products={products} language="ar" />);
    expect(container.querySelector('section')).toHaveAttribute('dir', 'rtl');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('اختار خشبة إلها شخصيتها');
    rerender(<WoodGallery products={products} language="ckb" />);
    expect(container.querySelector('section')).toHaveAttribute('dir', 'rtl');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('پارچە دارێک بە شێوەی تایبەت هەڵبژێرە');
    rerender(<WoodGallery products={products} language="en" />);
    expect(container.querySelector('section')).toHaveAttribute('dir', 'ltr');
  });
});
