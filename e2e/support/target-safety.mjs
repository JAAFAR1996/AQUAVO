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

/** The ONLY remote database endpoint E2E is allowed to use (verify child branch). */
export const ALLOWED_DB_ENDPOINT_PREFIX = 'ep-rapid-breeze-a46glg7f';

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
    const allowed = LOCAL_WEB_HOSTS.has(host) || ep.startsWith(ALLOWED_DB_ENDPOINT_PREFIX);
    if (!allowed) {
        throw new Error(
            `[${context}] REFUSING TO RUN: DATABASE_URL endpoint '${ep}' is not on the E2E allow-list ` +
            `(localhost or ${ALLOWED_DB_ENDPOINT_PREFIX}*).`
        );
    }
    return { host, endpoint: ep };
}
