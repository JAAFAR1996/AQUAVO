/**
 * AQUAVO E2E — synthetic authentication seed.
 *
 * Creates (or re-points) two DISPOSABLE accounts on the E2E target database so
 * the suite never needs real/production admin credentials:
 *
 *   e2e-admin@e2e.aquavo.invalid   role=admin
 *   e2e-user@e2e.aquavo.invalid    role=user
 *
 * - `.invalid` is the RFC 2606 reserved TLD: these addresses can never receive
 *   mail and can never collide with a real customer.
 * - The password is generated FRESH for every run and never written to disk.
 * - Refuses to run against anything that is not the allow-listed verify branch.
 */
import crypto from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { assertNonProductionDatabase } from './target-safety.mjs';

export const SYNTHETIC_ADMIN_EMAIL = 'e2e-admin@e2e.aquavo.invalid';
export const SYNTHETIC_USER_EMAIL = 'e2e-user@e2e.aquavo.invalid';

/** Mirrors server/utils/auth.ts hashPassword() (scrypt, 16-byte hex salt, 64-byte key). */
function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const digest = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${digest}`;
}

export function generateSyntheticPassword() {
    // 32 hex chars + mixed classes, satisfies any plausible password policy.
    return `E2e!${crypto.randomBytes(16).toString('hex')}A9`;
}

/**
 * @param {string} databaseUrl
 * @param {string} password
 * @returns {Promise<{adminEmail:string,userEmail:string,endpoint:string}>}
 */
export async function seedSyntheticAuth(databaseUrl, password) {
    const target = assertNonProductionDatabase(databaseUrl, 'e2e-seed');
    const sql = neon(databaseUrl);

    for (const [email, role, name] of [
        [SYNTHETIC_ADMIN_EMAIL, 'admin', 'E2E Synthetic Admin'],
        [SYNTHETIC_USER_EMAIL, 'user', 'E2E Synthetic Customer'],
    ]) {
        const hash = hashPassword(password);
        await sql`
            INSERT INTO users (email, password_hash, full_name, role, email_verified)
            VALUES (${email}, ${hash}, ${name}, ${role}, true)
            ON CONFLICT (email) DO UPDATE
            SET password_hash = EXCLUDED.password_hash,
                role          = EXCLUDED.role,
                full_name     = EXCLUDED.full_name,
                email_verified = true,
                deleted_at    = NULL,
                updated_at    = NOW()
        `;
    }

    // ── Release loopback IP blocks left behind by previous runs ───────────────
    //
    // `POST /api/login` consults `blocked_ips` BEFORE checking the password and
    // answers 429. Negative-path auth tests trip the "5 failed attempts" rule and
    // block 127.0.0.1 in the DATABASE, which survives server restarts — one run
    // then locks out every later run.
    //
    // Worse, the release is broken: a block whose `expires_at` is 3 hours in the
    // PAST is still reported as active, because `blocked_ips.expires_at` is read
    // back with a +03:00 (Asia/Baghdad) skew — a row stored as 09:54:20.907Z was
    // served to the client as `expiresAt: 12:54:20.907Z`. So expired blocks are
    // not self-healing and must be cleared explicitly.
    //
    // Scope is deliberately narrow: loopback addresses only, on a branch already
    // proven non-production. No real customer IP is ever touched.
    const releasedBlocks = await sql`
        UPDATE blocked_ips
        SET is_active = false
        WHERE is_active = true
          AND ip_address IN ('127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost', 'unknown')
        RETURNING ip_address
    `;

    // Also clear the failed-attempt history that feeds the blocker, so a fresh
    // run starts from a clean slate rather than one attempt away from a lockout.
    await sql`
        DELETE FROM login_attempts
        WHERE success = false
          AND (ip_address IN ('127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost', 'unknown')
               OR email IN (${SYNTHETIC_ADMIN_EMAIL}, ${SYNTHETIC_USER_EMAIL}))
    `;

    return {
        adminEmail: SYNTHETIC_ADMIN_EMAIL,
        userEmail: SYNTHETIC_USER_EMAIL,
        endpoint: target.endpoint,
        releasedLoopbackBlocks: releasedBlocks.length,
    };
}
