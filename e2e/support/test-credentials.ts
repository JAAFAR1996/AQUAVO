// Test-credential resolver for the E2E suite and the read-only admin audit.
// NO default/static credentials are baked in. Callers MUST provide credentials
// via environment variables, and logging into a production URL is refused unless
// an explicit read-only-audit flag is set.

export interface TestCreds {
  email: string;
  password: string;
}

// AQUAVO production/preview domains that require the explicit read-only flag.
const PROD_HOSTS = ["aquavoiq.com", "www.aquavoiq.com"];

export function isProductionUrl(baseURL: string | undefined | null): boolean {
  if (!baseURL) return false;
  try {
    const host = new URL(baseURL).hostname.toLowerCase();
    return PROD_HOSTS.some((p) => host === p || host.endsWith("." + p));
  } catch {
    return /aquavoiq\.com/i.test(baseURL);
  }
}

/**
 * Resolve admin credentials for a test/audit run.
 * - Throws clearly when E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD are absent (no fallback).
 * - Refuses a production baseURL unless ADMIN_AUDIT_READ_ONLY === "true".
 */
export function resolveAdminCredentials(
  opts: { baseURL?: string | null; env?: Record<string, string | undefined> } = {}
): TestCreds {
  const env = opts.env ?? process.env;
  const email = env.E2E_ADMIN_EMAIL;
  const password = env.E2E_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Missing E2E admin credentials. Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD in your environment. " +
      "There is NO default password — test and preview credentials must never match production."
    );
  }

  if (isProductionUrl(opts.baseURL) && env.ADMIN_AUDIT_READ_ONLY !== "true") {
    throw new Error(
      "Refusing to run an admin login against a PRODUCTION URL. " +
      "Set ADMIN_AUDIT_READ_ONLY=true ONLY for an explicitly authorized read-only production audit."
    );
  }

  return { email, password };
}

/**
 * Lazy variant of {@link resolveAdminCredentials}.
 *
 * Module-scope credential resolution used to abort an ENTIRE spec file (and, in
 * `contexts.spec.ts`, effectively the whole run) at collection time when the
 * environment was incomplete. This returns a live view instead: resolution — and
 * therefore any throw — happens at property access, inside a test, so a missing
 * credential fails one test rather than the suite.
 *
 * Credentials are supplied by e2e/support/global-setup.mjs, which seeds
 * disposable synthetic accounts on the verify branch. They are never production.
 */
export function lazyAdminCredentials(
  opts: { baseURL?: string | null } = {}
): TestCreds {
  return {
    get email() {
      return resolveAdminCredentials(opts).email;
    },
    get password() {
      return resolveAdminCredentials(opts).password;
    },
  } as TestCreds;
}
