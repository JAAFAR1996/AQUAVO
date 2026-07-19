/**
 * Regression guards for the persistent-shell layout groups.
 *
 * The shell renders ONE Navbar/Footer per route based on layoutGroup(); these
 * tests pin the exceptions (bare admin/checkout/guides/wizard, navbarOnly, and
 * the standard default) so the shell can never silently add chrome to a
 * chrome-less route or drop it from a standard one.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { layoutGroup } from '../layout-group';

describe('layoutGroup — persistent shell classifier', () => {
  it('gives standard chrome (Navbar + Footer) to commerce/content routes', () => {
    for (const p of ['/', '/products', '/deals', '/wishlist', '/order-tracking', '/blog', '/contact', '/faq', '/login', '/profile']) {
      expect(layoutGroup(p)).toBe('standard');
    }
  });

  it('gives standard chrome to dynamic routes (default) and the 404 fallback', () => {
    expect(layoutGroup('/products/some-slug')).toBe('standard');
    expect(layoutGroup('/blog/my-post')).toBe('standard');
    expect(layoutGroup('/order-confirmation/FH-260719-ABC')).toBe('standard');
    expect(layoutGroup('/verify-certificate/xyz')).toBe('standard');
    expect(layoutGroup('/this-route-does-not-exist')).toBe('standard');
  });

  it('gives navbarOnly (Navbar, no Footer) to /journey and /admin/partners', () => {
    expect(layoutGroup('/journey')).toBe('navbarOnly');
    expect(layoutGroup('/admin/partners')).toBe('navbarOnly');
  });

  it('keeps admin app routes bare (no chrome), except /admin/partners', () => {
    for (const p of ['/admin', '/admin/login', '/admin/finance', '/admin/merge-products', '/admin/ai']) {
      expect(layoutGroup(p)).toBe('bare');
    }
    expect(layoutGroup('/admin/partners')).toBe('navbarOnly');
  });

  it('keeps checkout, invoice, links, temperature-guide, wizards, ai-tools bare', () => {
    for (const p of ['/checkout', '/invoice/tok123', '/links', '/temperature-guide', '/aquarium-wizard', '/tank-builder', '/ai-tools', '/beginner-guide', '/experiments/ai-natural-matte-driftwood']) {
      expect(layoutGroup(p)).toBe('bare');
    }
  });

  it('keeps guide content pages bare — except the one standard guide (eco-friendly)', () => {
    expect(layoutGroup('/guides/eco-friendly')).toBe('standard');
    for (const p of ['/guides/5-mistakes', '/guides/water-myths', '/guides/new-aquarium-setup-iraq', '/guides/aquarium-water-test-guide']) {
      expect(layoutGroup(p)).toBe('bare');
    }
  });
});

describe('no page re-introduces chrome (shell owns Navbar/Footer)', () => {
  // Guards against duplicate Navbar/Footer: after the shell migration, NO page
  // component may render its own <Navbar/> or <Footer/>.
  const pagesDir = join(process.cwd(), 'client/src/pages');

  const collect = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const p = join(dir, e.name);
      if (e.isDirectory()) return collect(p);
      return e.isFile() && e.name.endsWith('.tsx') ? [p] : [];
    });

  it('has zero <Navbar/> or <Footer/> usages in any page', () => {
    const offenders: string[] = [];
    for (const file of collect(pagesDir)) {
      const src = readFileSync(file, 'utf8');
      if (/<Navbar[\s/>]/.test(src) || /<Footer[\s/>]/.test(src)) {
        offenders.push(file.replace(pagesDir, 'pages'));
      }
    }
    expect(offenders).toEqual([]);
  });
});
