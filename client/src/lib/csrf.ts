/**
 * CSRF Protection Utility
 * Implements Double Submit Cookie pattern with custom headers
 * Based on OWASP recommendations 2025
 */

const CSRF_HEADER_NAME = 'X-CSRF-Token';
const CSRF_STORAGE_KEY = 'aquavo_csrf_token';

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
  let token = sessionStorage.getItem(CSRF_STORAGE_KEY);

  if (!token) {
    token = generateToken();
    sessionStorage.setItem(CSRF_STORAGE_KEY, token);
  }

  return token;
}

/**
 * Add CSRF token to request headers
 */
export function addCsrfHeader(headers: HeadersInit = {}): HeadersInit {
  const token = getCsrfToken();

  return {
    ...headers,
    [CSRF_HEADER_NAME]: token,
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
  sessionStorage.removeItem(CSRF_STORAGE_KEY);
}

/**
 * Refresh CSRF token (after sensitive operations)
 */
export function refreshCsrfToken(): string {
  const newToken = generateToken();
  sessionStorage.setItem(CSRF_STORAGE_KEY, newToken);
  return newToken;
}
