/**
 * AQUAVO E2E — ENV LOCK (runs INSIDE the application process).
 *
 * WHY THIS EXISTS
 * ---------------
 * `server/env.ts` calls `dotenv.config({ override: true })`, so the committed
 * `.env` file BEATS any DATABASE_URL inherited from the parent shell. The
 * committed `.env` currently resolves to the PRODUCTION Neon endpoint. Because
 * `tsx` re-execs a child process, a parent-only preload is not enough either.
 *
 * This module is injected via NODE_OPTIONS=--import (which IS inherited by the
 * tsx child) and runs before `server/index.ts` -> `server/env.ts`. It:
 *
 *   1. Loads `.env.local` then `.env` itself, in the SAME order server/env.ts
 *      would, so no legitimate config (API keys, Sentry DSN, ...) is lost.
 *   2. DROPS every database-pointing key from those files.
 *   3. Pins DATABASE_URL to the value the launcher explicitly verified
 *      (E2E_DATABASE_URL).
 *   4. Monkey-patches `dotenv.config` to a no-op, so `server/env.ts` CANNOT
 *      re-introduce the production URL afterwards. Same ESM/CJS module
 *      instance, so the patch is effective.
 *   5. Asserts the final target is not production and aborts the process
 *      (exit 78) if it is. This is the runtime assertion — it observes the
 *      value the app will actually use, not a prediction.
 *
 * This file is owned by the Playwright/E2E harness. It does NOT modify
 * server/env.ts.
 */
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { assertNonProductionDatabase, endpointId, safeHost } from './target-safety.mjs';

const TAG = '[e2e-env-lock]';

/** Any env key that could steer the app at a database. */
const DB_KEY_RE = /(DATABASE_URL|POSTGRES_URL|PG_?CONNECTION|NEON_.*URL)/i;

const cwd = process.cwd();

function loadFile(rel) {
    const abs = path.resolve(cwd, rel);
    if (!fs.existsSync(abs)) return {};
    try {
        return dotenv.parse(fs.readFileSync(abs));
    } catch (err) {
        console.warn(`${TAG} could not parse ${rel}: ${err.message}`);
        return {};
    }
}

// 1 + 2: replicate server/env.ts load order, minus anything DB-shaped.
const merged = { ...loadFile('.env.local'), ...loadFile('.env') };
let dropped = 0;
for (const [key, value] of Object.entries(merged)) {
    if (DB_KEY_RE.test(key)) {
        dropped += 1;
        continue;
    }
    process.env[key] = value;
}

// 3: pin the verified target.
const pinned = process.env.E2E_DATABASE_URL;
if (!pinned) {
    console.error(`${TAG} FATAL: E2E_DATABASE_URL was not provided by the launcher.`);
    process.exit(78);
}
process.env.DATABASE_URL = pinned;

// The verify branch is a remote (Neon) host, so server/env.ts's dev guard needs
// the opt-in. It is safe here ONLY because assertNonProductionDatabase() below
// fails closed on anything that is not the allow-listed verify endpoint.
process.env.ALLOW_REMOTE_DATABASE_IN_DEV = 'true';

// 5 (background jobs): no cron during E2E.
process.env.DISABLE_SCHEDULED_JOBS = 'true';

// 4: make it impossible for server/env.ts to override us.
const noop = () => ({ parsed: {} });
try {
    dotenv.config = noop;
    if (dotenv.default && dotenv.default !== dotenv) dotenv.default.config = noop;
} catch (err) {
    console.error(`${TAG} FATAL: could not neutralise dotenv.config: ${err.message}`);
    process.exit(78);
}

// 5: runtime assertion on the value the app will actually use.
try {
    const target = assertNonProductionDatabase(process.env.DATABASE_URL, 'e2e-env-lock');
    // stderr, never stdout: tools such as npx parse the child's stdout.
    console.error(
        `${TAG} OK — dotenv neutralised (${dropped} db key(s) dropped from .env files). ` +
        `DATABASE_URL endpoint=${target.endpoint} host=${target.host} ` +
        `NODE_ENV=${process.env.NODE_ENV ?? 'development'} DISABLE_SCHEDULED_JOBS=true`
    );
} catch (err) {
    console.error(`${TAG} ${err.message}`);
    process.exit(78);
}

// Defence in depth: if anything later reassigns DATABASE_URL to production, kill it.
const lockedValue = process.env.DATABASE_URL;
try {
    Object.defineProperty(process.env, 'DATABASE_URL', {
        configurable: false,
        enumerable: true,
        get: () => lockedValue,
        set: (next) => {
            if (next !== lockedValue) {
                console.error(
                    `${TAG} FATAL: something tried to reassign DATABASE_URL ` +
                    `(endpoint ${endpointId(next)} / host ${safeHost(next)}). Aborting.`
                );
                process.exit(78);
            }
        },
    });
} catch {
    // Some Node builds disallow redefining process.env props; the dotenv patch
    // above is still the primary guarantee.
}
