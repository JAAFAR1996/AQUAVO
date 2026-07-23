/**
 * AQUAVO E2E — global setup.
 *
 * Runs once, before any worker starts. Responsibilities:
 *   1. Resolve + hard-assert the database target (fails closed on production).
 *   2. Seed synthetic admin/customer accounts with a per-run random password,
 *      and export them as E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD so the existing
 *      specs (admin.spec, contexts.spec, fulfillment-admin.spec) stop depending
 *      on unavailable production credentials.
 *   3. Start the app with the env lock injected, tee its logs.
 *   4. Wait for readiness (bounded).
 *   5. PROVE at runtime that the running server is on the seeded verify branch,
 *      by logging in with a credential that exists ONLY there.
 *   6. Write e2e-artifacts/run-manifest.json.
 *
 * Returns a teardown function that stops the server.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
    ARTIFACT_DIR,
    resolveE2EDatabaseUrl,
    startServer,
    stopServer,
    pidsOnPort,
    tailLog,
    waitForReady,
} from './server-harness.mjs';
import {
    generateSyntheticPassword,
    seedSyntheticAuth,
    SYNTHETIC_ADMIN_EMAIL,
    SYNTHETIC_USER_EMAIL,
} from './seed-synthetic-auth.mjs';
import { isProductionWebUrl } from './target-safety.mjs';

export default async function globalSetup(config) {
    const baseURL = config.projects[0]?.use?.baseURL || process.env.PLAYWRIGHT_BASE_URL;
    if (!baseURL) throw new Error('[e2e-global-setup] No baseURL resolved.');
    if (isProductionWebUrl(baseURL)) {
        throw new Error(`[e2e-global-setup] REFUSING: baseURL is production (${baseURL}).`);
    }

    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

    // 1. Target safety.
    const target = resolveE2EDatabaseUrl();
    console.log(
        `[e2e-global-setup] DB target verified: endpoint=${target.endpoint} ` +
        `source=${target.source} (production endpoints are structurally rejected)`
    );

    // 2. Synthetic auth — no production credentials anywhere.
    const password = generateSyntheticPassword();
    const seeded = await seedSyntheticAuth(target.url, password);
    if (seeded.releasedLoopbackBlocks) {
        console.warn(
            `[e2e-global-setup] released ${seeded.releasedLoopbackBlocks} stale loopback IP block(s) ` +
            'left by a previous run — see seed-synthetic-auth.mjs for why these do not expire on their own.'
        );
    }
    process.env.E2E_ADMIN_EMAIL = SYNTHETIC_ADMIN_EMAIL;
    process.env.E2E_ADMIN_PASSWORD = password;
    process.env.E2E_USER_EMAIL = SYNTHETIC_USER_EMAIL;
    process.env.E2E_USER_PASSWORD = password;
    console.log('[e2e-global-setup] Seeded synthetic admin + customer (password is per-run, never persisted).');

    // 3 + 4. Start and wait.
    const port = Number(process.env.E2E_PORT || new URL(baseURL).port || 5199);
    const server = startServer({ port, databaseUrl: target.url });
    let ready;
    try {
        ready = await waitForReady(baseURL.replace(/\/$/, ''), {
            timeoutMs: Number(process.env.E2E_READY_TIMEOUT_MS || 240_000),
            isDead: server.exited,
        });
    } catch (err) {
        console.error(`[e2e-global-setup] ${err.message}\n--- server.log tail ---\n${tailLog(server.logPath)}`);
        stopServer(server, port);
        throw err;
    }
    console.log(`[e2e-global-setup] App ready in ${ready.waitedMs}ms (health/db/root all 200).`);

    // 5. Runtime proof that the SERVER is on the seeded branch.
    const loginRes = await fetch(`${baseURL.replace(/\/$/, '')}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: baseURL },
        body: JSON.stringify({ email: SYNTHETIC_ADMIN_EMAIL, password }),
    });
    if (loginRes.status !== 200) {
        stopServer(server, port);
        throw new Error(
            `[e2e-global-setup] TARGET PROOF FAILED: synthetic admin login returned ${loginRes.status}. ` +
            `The running server is NOT using the seeded verify branch. Aborting rather than testing an ` +
            `unknown target.\n--- server.log tail ---\n${tailLog(server.logPath)}`
        );
    }
    console.log(
        '[e2e-global-setup] Target proof OK — the running server authenticated an account that exists ' +
        'only on the verify child branch.'
    );

    fs.writeFileSync(
        path.join(ARTIFACT_DIR, 'run-manifest.json'),
        JSON.stringify(
            {
                startedAt: new Date().toISOString(),
                baseURL,
                port,
                dbEndpoint: target.endpoint,
                dbHost: target.host,
                dbSource: target.source,
                scheduledJobs: 'disabled',
                readiness: ready,
                syntheticAdmin: SYNTHETIC_ADMIN_EMAIL,
                syntheticUser: SYNTHETIC_USER_EMAIL,
                serverLog: path.relative(process.cwd(), server.logPath),
                workers: process.env.E2E_WORKERS ?? 'default',
            },
            null,
            2
        )
    );

    return async () => {
        console.log('[e2e-global-teardown] stopping app server...');
        console.log('[e2e-global-teardown] self pid=' + process.pid + ' serverPid=' + server.child.pid + ' pidsOnAppPort=' + JSON.stringify(pidsOnPort(port)) + ' pidsOnHmr=' + JSON.stringify(pidsOnPort(24678)));
        if (process.env.E2E_SKIP_TEARDOWN === 'true') { console.log('[e2e-global-teardown] SKIPPED by E2E_SKIP_TEARDOWN'); return; }
        stopServer(server, port);
    };
}
