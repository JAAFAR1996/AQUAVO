/**
 * AQUAVO E2E — application server harness.
 *
 * Owns the lifecycle of the app under test:
 *   - resolves + verifies the database target BEFORE spawning anything,
 *   - spawns the dev server (tsx) with e2e/support/env-lock.mjs injected via
 *     NODE_OPTIONS (inherited by the tsx child re-exec),
 *   - streams every line of stdout/stderr to e2e-artifacts/server.log,
 *   - polls readiness (/health, /health/db, /) with a bounded timeout,
 *   - fails loudly if the process exits at any point.
 *
 * NOTE ON `/ready`: this application exposes `/health` (process liveness) and
 * `/health/db` (database reachability). There is no `/ready` route and adding
 * one would mean editing server/index.ts, which is outside this agent's
 * ownership. Readiness here = /health 200 AND /health/db 200 AND / 200.
 */
import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assertNonProductionDatabase } from './target-safety.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, '..', '..');
export const ARTIFACT_DIR = path.join(REPO_ROOT, 'e2e-artifacts');

const REDACT = /postgres(ql)?:\/\/\S*/gi;
const redact = (s) => String(s).replace(REDACT, '[REDACTED]');

/**
 * Resolve the database URL E2E is allowed to use. Never falls back to `.env`.
 * @returns {{url:string, endpoint:string, host:string, source:string}}
 */
export function resolveE2EDatabaseUrl(env = process.env) {
    const candidates = [
        ['E2E_DATABASE_URL', env.E2E_DATABASE_URL],
        ['NEON_VERIFY_DATABASE_URL', env.NEON_VERIFY_DATABASE_URL],
    ];
    for (const [source, url] of candidates) {
        if (url && url.trim()) {
            const t = assertNonProductionDatabase(url.trim(), 'e2e-harness');
            return { url: url.trim(), endpoint: t.endpoint, host: t.host, source };
        }
    }
    throw new Error(
        '[e2e-harness] No safe E2E database. Set NEON_VERIFY_DATABASE_URL (verify child branch) ' +
        'or E2E_DATABASE_URL. The committed .env is deliberately NOT consulted — it points at production.'
    );
}

async function probe(url, timeoutMs = 5000) {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeoutMs);
    try {
        const res = await fetch(url, { signal: ac.signal, redirect: 'manual' });
        return res.status;
    } catch {
        return 0;
    } finally {
        clearTimeout(t);
    }
}

/**
 * Poll until the app is genuinely ready, or throw after `timeoutMs`.
 * @returns {Promise<{health:number, db:number, root:number, waitedMs:number}>}
 */
export async function waitForReady(baseUrl, { timeoutMs = 180_000, isDead = () => false } = {}) {
    const started = Date.now();
    let last = { health: 0, db: 0, root: 0 };
    while (Date.now() - started < timeoutMs) {
        if (isDead()) {
            throw new Error(
                `[e2e-harness] Server process exited before becoming ready ` +
                `(last probe health=${last.health} db=${last.db} root=${last.root}). See e2e-artifacts/server.log`
            );
        }
        last = {
            health: await probe(`${baseUrl}/health`),
            db: await probe(`${baseUrl}/health/db`, 15_000),
            root: await probe(`${baseUrl}/`, 30_000),
        };
        if (last.health === 200 && last.db === 200 && last.root === 200) {
            return { ...last, waitedMs: Date.now() - started };
        }
        await new Promise((r) => setTimeout(r, 2000));
    }
    throw new Error(
        `[e2e-harness] Readiness timeout after ${timeoutMs}ms ` +
        `(health=${last.health} db=${last.db} root=${last.root}). See e2e-artifacts/server.log`
    );
}

/**
 * Spawn the app under test with the env lock injected.
 * @returns {{child: import('node:child_process').ChildProcess, logPath: string, exited: () => boolean, exitInfo: () => object|null}}
 */
/**
 * Vite's dev HMR WebSocket binds a FIXED port (24678). An orphaned dev server
 * from a previous run keeps holding it, and when the next server starts Vite
 * logs "Port 24678 is already in use" — which `server/vite.ts` routes into a
 * customLogger whose `error` handler calls `process.exit(1)`. The new dev server
 * therefore dies during startup, or mid-run on any other Vite-level error.
 *
 * We cannot edit server/vite.ts (not this agent's file), so the harness removes
 * the trigger: nothing may be holding the app port or 24678 when we start.
 */
export const VITE_HMR_PORT = 24678;

/** PIDs listening on `port` (Windows: netstat; POSIX: lsof). */
export function pidsOnPort(port) {
    try {
        if (process.platform === 'win32') {
            const out = execSync(`netstat -ano -p TCP | findstr LISTENING | findstr :${port}`, {
                stdio: ['ignore', 'pipe', 'ignore'],
            }).toString();
            return [...new Set(
                out.split(/\r?\n/)
                    .map((l) => l.trim().split(/\s+/).pop())
                    .filter((p) => p && /^\d+$/.test(p) && p !== '0')
            )];
        }
        const out = execSync(`lsof -ti tcp:${port}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
        return [...new Set(out.split(/\s+/).filter(Boolean))];
    } catch {
        return [];
    }
}

export function killPort(port) {
    const pids = pidsOnPort(port);
    for (const pid of pids) {
        try {
            if (process.platform === 'win32') {
                execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
            } else {
                execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
            }
        } catch { /* already gone */ }
    }
    return pids;
}

/** Free the app port and Vite's fixed HMR port before starting. */
export function preflight(port) {
    const killed = { app: killPort(port), hmr: killPort(VITE_HMR_PORT) };
    if (killed.app.length || killed.hmr.length) {
        console.warn(
            `[e2e-harness] preflight killed orphaned listeners — ` +
            `port ${port}: [${killed.app.join(',')}], vite HMR ${VITE_HMR_PORT}: [${killed.hmr.join(',')}]`
        );
    }
    return killed;
}

export function startServer({ port, databaseUrl, logName = 'server.log' }) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    preflight(port);
    const logPath = path.join(ARTIFACT_DIR, logName);
    const log = fs.createWriteStream(logPath, { flags: 'w' });

    const envLock = pathToFileURL(path.join(__dirname, 'env-lock.mjs')).href;
    // Spawn node directly on tsx's CLI entry rather than the .bin shim: a
    // shell/.cmd wrapper becomes an extra process layer that can exit early and
    // orphan the real server, which is how port 24678 ended up permanently held.
    const tsxCli = path.join(REPO_ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');

    const env = {
        ...process.env,
        PORT: String(port),
        E2E_DATABASE_URL: databaseUrl,
        // env-lock.mjs sets DISABLE_SCHEDULED_JOBS + ALLOW_REMOTE_DATABASE_IN_DEV
        // itself; setting them here too makes the intent explicit.
        DISABLE_SCHEDULED_JOBS: 'true',
        NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --import ${envLock}`.trim(),
    };
    // Never let the ambient/committed production URL reach the child by accident.
    delete env.DATABASE_URL;

    const child = spawn(process.execPath, [tsxCli, 'server/index.ts'], {
        cwd: REPO_ROOT,
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: process.platform !== 'win32',
    });

    let exitInfo = null;
    const stamp = (stream, prefix) => {
        stream.on('data', (buf) => {
            for (const line of redact(buf).split(/\r?\n/)) {
                if (line.trim()) log.write(`${new Date().toISOString()} ${prefix} ${line}\n`);
            }
        });
    };
    stamp(child.stdout, '[out]');
    stamp(child.stderr, '[err]');

    child.on('exit', (code, signal) => {
        exitInfo = { code, signal, at: new Date().toISOString() };
        log.write(`${exitInfo.at} [harness] SERVER PROCESS EXITED code=${code} signal=${signal}\n`);
    });

    return {
        child,
        logPath,
        exited: () => exitInfo !== null,
        exitInfo: () => exitInfo,
    };
}

/**
 * Stop the server AND verify the ports are actually free. A half-killed tree is
 * what poisons the next run (see VITE_HMR_PORT above), so this is deliberately
 * belt-and-braces: kill the process tree, then kill anything still listening.
 */
export function stopServer(handle, port) {
    if (handle?.child && !handle.exited()) {
        try {
            if (process.platform === 'win32') {
                execSync(`taskkill /PID ${Number(handle.child.pid)} /T /F`, { stdio: 'ignore' });
            } else {
                process.kill(-handle.child.pid, 'SIGTERM');
            }
        } catch {
            try { handle.child.kill('SIGKILL'); } catch { /* already gone */ }
        }
    }
    if (port) killPort(Number(port));
    killPort(VITE_HMR_PORT);
}

export function tailLog(logPath, lines = 60) {
    try {
        return fs.readFileSync(logPath, 'utf8').split(/\r?\n/).slice(-lines).join('\n');
    } catch {
        return '(no server log)';
    }
}
