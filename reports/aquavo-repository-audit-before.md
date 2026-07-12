# AQUAVO Repository Audit — Before

Audit date: 2026-07-11

## Architecture actually present

- React 19.2.6
- Vite 8.0.13
- Wouter 3.9.0
- Express 4.22
- Drizzle ORM with Neon PostgreSQL
- pnpm 10
- Vercel build and SSR metadata function

The repository is not a Next.js 15 application despite stale project-memory wording.

## Source-control safety

- Starting branch: `main`
- Starting commit: `67ff987fcff9ef8c506d6312509652501fcc08fd`
- User-owned dirty files on `main` were not touched: one XLSX file, two migration files and `skool-downloader-extension/`.
- Implementation is isolated in an external Git worktree on `codex/aquavo-website-v2-20260711`.

## Baseline engineering findings

- TypeScript failed because `Product.imageUrls` does not exist; the schema exposes `images`.
- Main `tsconfig.json` excludes server and API coverage.
- `tsconfig.server.json` has `noCheck: true`.
- Explicit `any` baseline: client 215, server 517, API 2, shared 2.
- Full Vitest baseline previously exceeded 184 seconds and cannot be represented as passing.
- Generated test evidence is tracked in `.playwright-mcp`, `playwright-report` and `test-results`.
- Both `api/ssr-meta.ts` and `server/static.ts` duplicated visible SEO shells outside React.
- The source contains Cloudinary storage paths despite project memory stating R2 only. Storage migration is outside this website transformation and will not be silently expanded.

## Phase 1 verification

- `pnpm install --frozen-lockfile`: passed.
- `pnpm exec tsc -p tsconfig.json --noEmit --incremental false`: passed after the image mapping fix.
- Focused regression tests: 3 passed.
