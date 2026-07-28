/**
 * AQUAVO E2E — target safety.
 *
 * Single source of truth for "is this thing pointing at production?".
 * Used by:
 *   - e2e/support/env-lock.mjs      (runs INSIDE the app process, before any DB code)
 *   - e2e/support/start-e2e-server.mjs (launcher)
 *   - e2e/support/seed-synthetic-auth.mjs (seeder)
 *   - playwright.config.ts          (base URL guard)
 *
 * Nothing here ever prints a connection string. Only hostnames / endpoint ids.
 */

/** Neon endpoint ids and branch ids that are PRODUCTION. Never touch. */
export const PRODUCTION_DB_MARKERS = [
    'ep-quiet-moon-a4h7tdze',
    'br-patient-mouse-a4d4cgr4',
];

/** Web hosts that are production / preview. Never point Playwright at these. */
export const PRODUCTION_WEB_HOSTS = [
    'aquavoiq.com',
    'www.aquavoiq.com',
    ['fist', 'live.vercel.app'].join('-'),
];

/**
 * The ONLY remote database endpoints E2E is allowed to use. Each entry is a
 * verify/certification CHILD branch of production — never production itself,
 * which stays blocked by PRODUCTION_DB_MARKERS above regardless of this list.
 *
 *   ep-rapid-breeze-a46glg7f — accounting-fulfillment-verify-20260723
 *                              (br-round-dust-a4t0kt58)
 *   ep-rough-smoke-a4umy5in  — playwright-final-certification-20260724
 *                              (br-cool-bar-a4x1pig5), direct child of
 *                              production taken after the product cleanup
 */
export const ALLOWED_DB_ENDPOINT_PREFIXES = [
    'ep-rapid-breeze-a46glg7f',
    'ep-rough-smoke-a4umy5in',
];

/** @deprecated retained so any existing importer keeps resolving. */
export const ALLOWED_DB_ENDPOINT_PREFIX = ALLOWED_DB_ENDPOINT_PREFIXES[0];

/** Hostname of a URL, or '' when unparseable. Never returns credentials. */
export function safeHost(url) {
    if (!url) return '';
    try {
        return new URL(url).hostname.toLowerCase();
    } catch {
        return '';
    }
}

/** Neon endpoint id from a DB hostname, e.g. 'ep-rapid-breeze-a46glg7f'. */
export function endpointId(url) {
    const host = safeHost(url);
    const first = host.split('.')[0] || '';
    return first.replace(/-pooler$/, '');
}

export function isProductionDatabaseUrl(url) {
    if (!url) return false;
    const haystack = `${safeHost(url)}`;
    return PRODUCTION_DB_MARKERS.some((m) => haystack.includes(m)) ||
        // belt and braces: the raw string may carry the branch id as an option
        PRODUCTION_DB_MARKERS.some((m) => String(url).includes(m));
}

export function isProductionWebUrl(url) {
    const host = safeHost(url);
    if (!host) return false;
    return PRODUCTION_WEB_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}

const LOCAL_WEB_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0']);
export function isLocalWebUrl(url) {
    return LOCAL_WEB_HOSTS.has(safeHost(url));
}

/**
 * Hard gate. Throws unless `url` is an explicitly allow-listed non-production DB.
 * Allowed: localhost, or the verify child-branch endpoint. Everything else fails closed.
 */
export function assertNonProductionDatabase(url, context = 'E2E') {
    if (!url) {
        throw new Error(`[${context}] DATABASE_URL is empty — refusing to continue (E2E needs the verify branch).`);
    }
    if (isProductionDatabaseUrl(url)) {
        throw new Error(
            `[${context}] REFUSING TO RUN: DATABASE_URL resolves to PRODUCTION (endpoint ${endpointId(url)}).`
        );
    }
    const host = safeHost(url);
    const ep = endpointId(url);
    const allowed = LOCAL_WEB_HOSTS.has(host) ||
        ALLOWED_DB_ENDPOINT_PREFIXES.some((p) => ep.startsWith(p));
    if (!allowed) {
        throw new Error(
            `[${context}] REFUSING TO RUN: DATABASE_URL endpoint '${ep}' is not on the E2E allow-list ` +
            `(localhost or one of ${ALLOWED_DB_ENDPOINT_PREFIXES.join(', ')}).`
        );
    }
    return { host, endpoint: ep };
}
