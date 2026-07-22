# Pre-Neon safety backup manifest

Created 2026-07-23. Purpose: guarantee that nothing in the working directory — **tracked or
not** — can be lost by the Neon verification work that follows.

---

## 1. Backup location

```
C:\Users\jaafa\Desktop\upload\_backups\FishWebClean-preneon-20260723-000738.tar.gz
```

| | |
|---|---|
| Size | 4,861,547,993 bytes (4.53 GiB) |
| Entries | 11,819 |
| SHA-256 | `105b0ec9fac9f9485390211dfa6c6e597010f9e7e637f09237c5fb0a09737f7e` |
| Created | 2026-07-23 00:07:38 → 00:12 local |
| Location | **outside** the repository, so no repo operation can touch it |

Command used:

```bash
mkdir -p /c/Users/jaafa/Desktop/upload/_backups
cd /c/Users/jaafa/Desktop/upload
tar -czf "_backups/FishWebClean-preneon-$TS.tar.gz" \
  --exclude='FishWebClean/node_modules' --exclude='*/node_modules' \
  --exclude='FishWebClean/dist' --exclude='FishWebClean/.vite' --exclude='FishWebClean/.next' \
  --exclude='FishWebClean/playwright-report' --exclude='FishWebClean/test-results' \
  --exclude='FishWebClean/.claude/worktrees' \
  --exclude='FishWebClean/.env' --exclude='FishWebClean/.env.local' \
  --exclude='FishWebClean/.env.vercel' --exclude='FishWebClean/.env.vercel.production' \
  FishWebClean
```

## 2. What is excluded, and why

| Excluded | Reason |
|---|---|
| `node_modules/` | regenerable via `pnpm install` |
| `dist/`, `.vite/`, `.next/` | build output |
| `playwright-report/`, `test-results/` | regenerable browser output |
| `.claude/worktrees/` | git worktree checkouts of committed state |
| `.env`, `.env.local`, `.env.vercel`, `.env.vercel.production` | **live secrets — deliberately withheld** |

`.env.example` **is** included (it is a template, not a credential).

**No private-secrets backup was created.** The four `.env*` files above still exist only in
the working directory and are unprotected. If you want them preserved, say so and I will
write them to a separate, clearly-labelled, non-shareable archive.

## 3. What is included — verified, not assumed

```bash
# leak check — must print nothing
tar -tzf "$B" | grep -E 'node_modules|FishWebClean/\.env($|\.local|\.vercel)'
→ (empty)  ✅

# critical trees present
tar -tzf "$B" | grep -cE '^FishWebClean/(server|client|migrations|docs|scripts|TOOLS|e2e)/'
→ 3072  ✅
```

Included: full source (`server/`, `client/`, `shared/`), **all** `migrations/`, `docs/`,
`scripts/`, `TOOLS/`, `e2e/`, `.git/` (complete history + reflog), `.agents/`, `.claude/`
(agents, skills, commands, settings, the new safety policy), `Launch_Ideas/`,
`client/public/` (1,868 image/asset entries), `.vercel/output`, and **every untracked file**
listed in §4.

## 4. File inventory at backup time

| Class | Count |
|---|---|
| Tracked | **4,629** |
| Modified (unstaged) | 17 |
| Deleted (unstaged) | 8 |
| Untracked | 53 |
| Ignored | 83 |
| Total porcelain entries | 78 |

### 4.1 Important untracked project assets — all captured

| Path | Size |
|---|---|
| `skool-downloader-extension/` | dir, 15 files |
| `docs/ux-ui-audit-2026/` | dir, 10 files |
| `migrations/archive_orphan_backup_tables.sql` | 1,189 B |
| `migrations/archive_orphan_backup_tables_rollback.sql` | 421 B |
| `client/src/components/products/__tests__/product-3d-viewer.test.tsx` | 2,337 B |
| `ruvector.db` | 1,589,248 B |
| `config-backups/` | dir, 1 file |
| `.claude-flow/` metrics + state | 9 files |
| `.swarm/` | dir, 3 files |

⚠️ **`migrations/archive_orphan_backup_tables.sql` and its rollback are untracked SQL.**
They are *not* part of the Neon plan below, but they are migration files sitting outside git.
Recommend committing or deliberately ignoring them.

### 4.2 Repo-root junk needing your decision — captured, not deleted

38 zero-byte files with names that are fragments of shell/JS syntax:
`'variantLabel'`, `({`, `({,+`, `{const`, `{try{const`, `a.code`, `b[1].qty`,
`console.log('`, `document.documentElement.clientWidth`, `parseFloat(product.price)`,
`isRealizedStatus(o.status)).length`, `no`, `s`, `host`, `500`, `3`, `{}`, … and similar.

These are artifacts of mis-quoted shell commands — a redirection wrote an empty file named
after the fragment. They are almost certainly garbage. **Per the freeze in
`.claude/SAFETY-POLICY.md` I did not delete them**, and they are inside the backup. They need
one word from you before removal, and the removal must name each file explicitly.

## 5. Critical-file checksums (working tree at backup time)

| File | SHA-256 |
|---|---|
| `migrations/add_fulfillment_costing.sql` | `ea34a32f5f3d84b5913ca700531941a5ba7f53edf9ba125aa865345a979901d1` |
| `migrations/add_fulfillment_costing_rollback.sql` | `80fb2b54da93ed0f3c932e71e9321a3adfe185476facd29ccf686cb46f291296` |
| `migrations/add_fulfillment_hardening.sql` | `5a7f43634f801f7dc2c77a5f621204c39b1ae1b9cf245a1377e2c67615547f47` |
| `migrations/add_fulfillment_hardening_rollback.sql` | `8a7d97347556de33a7e8fc0c214e85f2fd881ac9e95a70b35724ea3282c510b4` |
| `server/services/accounting-engine.ts` | `5f56b0fc3a41205858b6508ef2316b9985e968af4f7e41788ebb818c2c59d46a` |
| `TOOLS/verify-fulfillment.mjs` | `37dea11ed9c3cae5d51794648b7e5c9b548401ac8286b24be157319bc3e7354a` |
| `TOOLS/check-accounting-routes.mjs` | `18cdcf81b1c755d0d6b9bc773e21c9f11e92c32b57754aa36c8b6cce040461e0` |
| `.claude/SAFETY-POLICY.md` | `cf226654618f3c60e36f2a936c2b1c3f356daab60b38a21103a1d51ccc5d29b0` |

The four migration hashes are the exact bytes reviewed in
`docs/audit/neon-migration-review.md` and the exact bytes proposed for the Neon child branch.
Re-hash before applying; if a hash differs, the review is stale.

## 6. How to verify or restore

```bash
# integrity
sha256sum "/c/Users/jaafa/Desktop/upload/_backups/FishWebClean-preneon-20260723-000738.tar.gz"
# expect 105b0ec9fac9f9485390211dfa6c6e597010f9e7e637f09237c5fb0a09737f7e

# restore to a NEW directory — never over the live repo
mkdir -p /c/Users/jaafa/Desktop/upload/_restore-test
tar -xzf ".../FishWebClean-preneon-20260723-000738.tar.gz" -C /c/Users/jaafa/Desktop/upload/_restore-test
cd /c/Users/jaafa/Desktop/upload/_restore-test/FishWebClean && pnpm install
# then re-add the four .env* files by hand — they are intentionally absent
```

A restore drill has **not** been performed (it would take ~5 GB and a full `pnpm install`).
The archive's integrity and contents were verified by listing, not by extraction.
