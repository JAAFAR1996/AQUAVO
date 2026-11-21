/**
 * CSRF Protection Utility
 * Implements Double Submit Cookie pattern with custom headers
 * Based on OWASP recommendations 2025
 */

const CSRF_HEADER_NAME = 'X-CSRF-Token';
const CSRF_STORAGE_KEY = 'aquavo_csrf_token';
let memoryToken: string | null = null;

/**
 * Generate a cryptographically secure random token
 */
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Get or create CSRF token for the current session
 */
export function getCsrfToken(): string {
  if (memoryToken) return memoryToken;
  try {
    const stored = sessionStorage.getItem(CSRF_STORAGE_KEY);
    if (stored) { memoryToken = stored; return stored; }
  } catch { /* Storage restrictions must not disable authenticated requests. */ }
  memoryToken ??= generateToken();
  try { sessionStorage.setItem(CSRF_STORAGE_KEY, memoryToken); } catch { /* per-page fallback */ }
  return memoryToken;
}

/**
 * Add CSRF token to request headers
 */
export function addCsrfHeader(headers: HeadersInit = {}): HeadersInit {
  const token = getCsrfToken();

  return {
    ...headers,
    [CSRF_HEADER_NAME]: token,
    // Every API call carries the storefront language so localized content
    // (products, articles, error messages) comes back in the language on screen.
    "x-locale": typeof document !== "undefined" ? document.documentElement.getAttribute("lang") || "ar" : "ar",
  };
}

/**
 * Verify CSRF token (client-side validation)
 */
export function verifyCsrfToken(token: string): boolean {
  const storedToken = getCsrfToken();
  return token === storedToken;
}

/**
 * Clear CSRF token (on logout)
 */
export function clearCsrfToken(): void {
  memoryToken = null;
  try { sessionStorage.removeItem(CSRF_STORAGE_KEY); } catch { /* storage may be blocked */ }
}

/**
 * Refresh CSRF token (after sensitive operations)
 */
export function refreshCsrfToken(): string {
  const newToken = generateToken();
  memoryToken = newToken;
  try { sessionStorage.setItem(CSRF_STORAGE_KEY, newToken); } catch { /* per-page fallback */ }
  return newToken;
}
