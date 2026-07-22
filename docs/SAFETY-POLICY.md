# Repository Safety Policy — destructive filesystem operations

**Status:** in force from 2026-07-22, after `TOOLS/gmail-creator/` was destroyed by an
unreviewed `rm -rf tools` (see `docs/recovery/gmail-creator-recovery-report.md`).

This policy binds any agent (Claude Code or otherwise) operating in this repository.

## 1. Forbidden without explicit, in-conversation owner approval

Never run, in any shell (bash, PowerShell, cmd) or via any tool:

- `rm`, `rm -rf`, `rm -fr`, `rmdir`, `del`, `rd /s`, `Remove-Item` (with or without `-Recurse`)
- `git clean` in any form
- `git reset --hard`, `git checkout -- <path>`, `git restore <path>` — these discard uncommitted work
- `git stash drop`, `git branch -D`, `git worktree remove`
- any deletion driven by a wildcard, glob, or variable that has not been expanded and shown first
- `npm run db:push` (pre-existing rule; the schema has drifted — apply additive SQL surgically)

`.claude/settings.json` enforces this: `rm -rf`, `git clean`, and `git reset --hard`
are in `permissions.deny`; the rest are in `permissions.ask`.
The settings file is the mechanism; this document is the rule. Do not weaken either.

## 2. Untracked directories are irreplaceable

Git protects only what is committed. An untracked directory that is deleted is gone —
there is no reflog, no `fsck`, no dangling blob. Therefore:

- **Never delete or move an untracked directory**, for any reason, including "cleanup".
- Before touching anything under a top-level tools/asset directory, run
  `git status --porcelain --ignored <path>` and read the result.

## 3. Show the target before deleting

Any proposed deletion must be preceded, in the same message, by the literal output of a
listing command (`ls -la <exact path>` or `git status --porcelain <exact path>`) showing
exactly what will be removed. "Cleaning up X" is not a target; a file list is.

## 4. Case-insensitivity is a live hazard on Windows

`tools/` and `TOOLS/` are **the same directory** on this machine. A command that looks like
it targets a lowercase duplicate will hit the real directory. This is precisely how
`TOOLS/gmail-creator/` was lost. Never assume two paths differing only in case are distinct;
verify with `ls -d` on both and compare inode/contents before acting.

## 5. `TOOLS/` is frozen during recovery investigation

Do not create, modify, move, or delete anything under `TOOLS/` until the owner closes the
recovery item. Recovered candidates go to `recovery/<name>-candidate/` for review, never
straight back into `TOOLS/`.

## 6. Prefer non-destructive alternatives

- To stop tracking a file: `git rm --cached`, not `rm`.
- To discard a change: propose the diff and let the owner decide, or move the file into
  `.trash/` inside the repo (reversible) rather than unlinking it.
- To reclaim space: name the exact directory (`node_modules`, `dist`, `.vite`) and confirm
  it is regenerable, and still ask.

## 7. Backups are a precondition, not a follow-up

Before any batch operation that touches many files, confirm a current backup exists
(`docs/recovery/pre-neon-backup-manifest.md`) and say so.
