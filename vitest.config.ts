import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./vitest.setup.ts'],
    // The accounting/fulfillment integration tests boot a real Postgres (PGlite WASM)
    // in beforeAll. Under parallel workers that boot can exceed the 10s hook default,
    // which shows up as a spurious "Hook timed out" suite failure.
    hookTimeout: 90_000,
    testTimeout: 30_000,
    // BOUNDED CONCURRENCY — required, not a tuning preference.
    //
    // Phase 1A added a number of migration/immutability suites that each spin up
    // their own PGlite (Postgres compiled to WASM) instance. At the default worker
    // count these contend for memory and CPU, and the failure surfaces as assertion
    // errors inside unrelated suites — e.g. a migration reporting a missing column
    // that plainly exists. Measured on this repo: the full server suite reports
    // ~13 failures at the default worker count and 3 (the known pre-existing
    // ssr-hero-preload ones) at maxWorkers: 2, with every affected file passing in
    // isolation either way.
    //
    // Capping the pool here rather than in a hand-typed command means `npm test`,
    // `vitest run` and the CI step (`pnpm run test --run`) all get the stable
    // behaviour. It costs wall-clock time; on a suite that guards financial
    // immutability, a trustworthy red/green signal is worth more than the minutes.
    maxWorkers: 2,
    include: [
      'client/src/**/*.{test,spec}.{ts,tsx}',
      'server/**/*.{test,spec}.{ts,tsx}',
      'shared/**/*.{test,spec}.{ts,tsx}',
      'test/**/*.{test,spec}.{ts,tsx}',
      'scripts/**/*.{test,spec}.{ts,tsx}',
    ],
    exclude: [
      'node_modules/**',
      '**/node_modules/**',
      'dist/**',
      '.claude/worktrees/**',
      'e2e/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'test/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
});
