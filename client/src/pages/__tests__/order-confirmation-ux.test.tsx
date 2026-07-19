/**
 * Focused guards for the AQUAVO UX repair:
 *  - the visible order date must NOT be presented on the confirmation UI,
 *  - the order date must still exist internally (createdAt) for the invoice,
 *  - the page must use the global theme tokens (no hard-coded dark hex),
 *  - the branded loader must be theme-token based (no hard-coded surface).
 *
 * These are source-level assertions so they hold regardless of order state.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8');

const OC = 'client/src/pages/order-confirmation.tsx';
const LOADERS_CSS = 'client/src/components/ui/loaders.css';

describe('Order confirmation — visible order date removed', () => {
  const src = read(OC);

  it('does not render a visible "تاريخ الطلب" fact', () => {
    expect(src).not.toContain('تاريخ الطلب');
  });

  it('drops the now-unused formatDate/Calendar visible-date imports', () => {
    expect(src).not.toMatch(/import\s*{[^}]*\bformatDate\b[^}]*}\s*from\s*["']@\/lib\/utils["']/);
    expect(src).not.toMatch(/\bCalendar\b/);
  });

  it('keeps the order date internally (createdAt still used for the invoice)', () => {
    // The date must remain in the order data path even though it is not shown.
    expect(src).toMatch(/createdAt/);
    expect(src).toMatch(/orderDate:\s*createdAt/);
  });
});

describe('Order confirmation — inherits the global theme (no hard-coded dark)', () => {
  const src = read(OC);

  it('has no hard-coded dark hex surfaces from the old dark-only design', () => {
    for (const hex of ['#0B1E28', '#0F2731', '#0C222C', '#EAF1F3', '#8CA1AB', '#35C0D1']) {
      expect(src).not.toContain(hex);
    }
  });

  it('uses semantic theme tokens for the page and card surfaces', () => {
    expect(src).toContain('bg-background');
    expect(src).toContain('bg-card');
    expect(src).toContain('text-foreground');
    expect(src).toContain('border-border');
    expect(src).toContain('text-primary');
  });

  it('keeps RTL and the intentional WhatsApp green CTA', () => {
    expect(src).toContain('dir="rtl"');
    expect(src).toContain('bg-green-600');
  });
});

describe('Branded loader — theme-token based, not a forced surface', () => {
  const css = read(LOADERS_CSS);

  it('derives colors from theme tokens', () => {
    expect(css).toContain('hsl(var(--background))');
    expect(css).toContain('hsl(var(--foreground))');
    expect(css).toContain('hsl(var(--primary))');
  });

  it('does not hard-code the old light/dark loader surfaces', () => {
    expect(css).not.toContain('#F6F4EF');
    expect(css).not.toContain('#0B1E28');
    expect(css).not.toContain('#0B93A6');
  });

  it('gates all travel/rotation motion behind prefers-reduced-motion', () => {
    expect(css).toContain('@media (prefers-reduced-motion: no-preference)');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
