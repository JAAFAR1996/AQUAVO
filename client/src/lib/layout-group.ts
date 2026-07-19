// Layout groups for the persistent application shell.
//
// The shell (AppShell in App.tsx) renders ONE Navbar + Footer around the router
// and chooses which chrome to show per route via layoutGroup(). This reproduces
// each route's original chrome exactly (verified against the pre-shell pages):
//   - standard   → Navbar + Footer   (default; all commerce/content/dynamic routes)
//   - navbarOnly → Navbar, no Footer  (/journey, /admin/partners)
//   - bare       → neither            (admin app, checkout, invoice, guides/*,
//                                       wizard, ai-tools, links, temperature-guide,
//                                       beginner-guide, ai-driftwood experiment)
//
// Keeping this pure + standalone makes it unit-testable and keeps the shell logic
// in one authoritative place.

export type LayoutGroup = 'standard' | 'navbarOnly' | 'bare';

const NAVBAR_ONLY = new Set<string>(['/journey', '/admin/partners']);

const BARE_EXACT = new Set<string>([
  '/aquarium-wizard', '/tank-builder', '/experiments/ai-natural-matte-driftwood',
  '/beginner-guide', '/ai-tools', '/checkout', '/links', '/temperature-guide',
  '/admin', '/admin/login', '/admin/finance', '/admin/merge-products',
  '/admin/merge-product', '/admin/ai',
]);

export function layoutGroup(path: string): LayoutGroup {
  if (NAVBAR_ONLY.has(path)) return 'navbarOnly';       // before /admin & /guides prefixes
  if (path === '/guides/eco-friendly') return 'standard'; // the lone standard guide, before prefix
  if (path.startsWith('/guides/')) return 'bare';
  if (path.startsWith('/invoice/')) return 'bare';
  if (path === '/admin' || path.startsWith('/admin/')) return 'bare'; // /admin/partners handled above
  if (BARE_EXACT.has(path)) return 'bare';
  return 'standard';                                     // default = full chrome (dynamic routes + 404)
}
