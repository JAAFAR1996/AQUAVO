const STATIC_SITE_PATHS = new Set([
  "/",
  "/ar",
  "/products",
  "/deals",
  "/tank-builder",
  "/aquarium-wizard",
  "/experiments/ai-natural-matte-driftwood",
  "/guides",
  "/guides/eco-friendly",
  "/guides/5-mistakes",
  "/guides/fish-hiding",
  "/guides/water-myths",
  "/guides/essential-tools",
  "/guides/water-change-schedule",
  "/guides/tank-rescue-plan",
  "/guides/feeding-table",
  "/guides/filter-choice",
  "/guides/temperature-guide",
  "/guides/happy-fish-signs",
  "/guides/aquarium-salt",
  "/guides/filter-media",
  "/guides/algae-control",
  "/guides/white-scale",
  "/guides/quarantine",
  "/guides/heater-choice",
  "/guides/treatment-basics",
  "/guides/new-aquarium-setup-iraq",
  "/guides/aquarium-water-test-guide",
  "/guides/aquarium-decor-stones-guide",
  "/guides/water-conditioner-guide",
  "/guides/aquarium-weekly-maintenance",
  "/guides/cloudy-water-causes",
  "/guides/filter-maintenance",
  "/guides/fish-gasping-surface",
  "/guides/aquarium-maintenance-checklist",
  "/beginner-guide",
  "/calculators",
  "/journey",
  "/ai-tools",
  "/fish-encyclopedia",
  "/fish-finder",
  "/fish-compatibility",
  "/encyclopedia",
  "/wishlist",
  "/search",
  "/compare",
  "/community-gallery",
  "/fish-health-diagnosis",
  "/fish-health",
  "/fish-patients",
  "/cultural-twin",
  "/fish-breeding-calculator",
  "/sustainability",
  "/about",
  "/about-aquavo",
  "/why-aquavo",
  "/return-policy",
  "/privacy-policy",
  "/terms",
  "/contact",
  "/faq",
  "/order-tracking",
  "/blog",
  "/partners",
  "/invest",
  "/cart",
  "/admin-login",
  "/returns",
  "/fish-doctor",
  "/auth",
  "/shipping",
  "/login",
  "/register",
  "/profile",
  "/forgot-password",
  "/admin/login",
  "/admin/finance",
  "/admin/partners",
  "/admin",
  "/admin/merge-products",
  "/admin/merge-product",
  "/admin/ai",
  "/checkout",
  "/links",
  "/temperature-guide",
]);

const DYNAMIC_SITE_PATHS = [
  /^\/products\/[^/]+$/,
  /^\/verify-certificate\/[^/]+$/,
  /^\/order-confirmation\/[^/]+$/,
  /^\/blog\/[^/]+$/,
  /^\/invoice\/[^/]+$/,
];

function normalizePathname(pathname: string): string {
  const pathOnly = pathname.split(/[?#]/, 1)[0] || "/";
  try {
    const decoded = decodeURIComponent(pathOnly);
    return decoded.replace(/\/+$/, "") || "/";
  } catch {
    return pathOnly.replace(/\/+$/, "") || "/";
  }
}

export function isKnownSitePath(pathname: string, standaloneGuidePaths: readonly string[] = []): boolean {
  const normalized = normalizePathname(pathname);

  if (STATIC_SITE_PATHS.has(normalized)) return true;
  if (standaloneGuidePaths.some((guidePath) => normalizePathname(guidePath) === normalized)) return true;

  return DYNAMIC_SITE_PATHS.some((pattern) => pattern.test(normalized));
}

export const staticSitePaths = Object.freeze(Array.from(STATIC_SITE_PATHS));
