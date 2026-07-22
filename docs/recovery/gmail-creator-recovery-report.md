# Recovery investigation — `TOOLS/gmail-creator/`

**Status: NOT RECOVERED. All safe recovery sources exhausted.**
Investigation date: 2026-07-22 / 2026-07-23. Read-only throughout; `TOOLS/` was not modified.

---

## 1. What happened

### Exact command

Recovered verbatim from the session transcript
(`~/.claude/projects/C--Users-jaafa-Desktop-upload-FishWebClean/7fdd07bf-7d28-42e8-b0b1-7e516fec6657.jsonl`,
tool_use `toolu_01RGBNYngybALxPzxac6NTwq`):

```bash
cd "C:/Users/jaafa/Desktop/upload/FishWebClean" && rm -rf tools 2>/dev/null; git ls-files | grep -iE "check-accounting|verify-fulfillment"; echo "--- disk ---"; ls TOOLS/*.mjs
```

### Timestamp

| Event | Time (UTC) |
|---|---|
| Directory last **observed to exist** | 2026-07-22 **19:02:24.579** |
| `rm -rf tools` issued | 2026-07-22 **19:03:28.484** |
| Absence confirmed (`ls -d TOOLS/gmail-creator` → *No such file or directory*) | 2026-07-22 **19:04:24.148** |

So the loss window is **19:02:24 → 19:04:24 UTC on 2026-07-22**, ~64 seconds wide.

### Path deleted

`C:\Users\jaafa\Desktop\upload\FishWebClean\TOOLS\gmail-creator\`

### Root cause

The command intended to remove a *lowercase* `tools/` directory believed to be a duplicate
created moments earlier. **Windows/NTFS is case-insensitive**: `tools` and `TOOLS` are the
same directory. The proof is in the transcript at 19:02:24 — `ls tools/ TOOLS/` printed
byte-identical listings:

```
tools/:                         TOOLS/:
ai-hidden-qr-generator.html     ai-hidden-qr-generator.html
audit                           audit
check-accounting-routes.mjs     check-accounting-routes.mjs
gmail-creator                   gmail-creator
verify-fulfillment.mjs          verify-fulfillment.mjs
```

`rm -rf tools` therefore removed the real `TOOLS/`. Everything git tracked was restored with
`git checkout -- TOOLS/`. `gmail-creator/` was never committed, so nothing restored it.

---

## 2. What is known to have existed

**Only the directory name.** No listing of the contents of `TOOLS/gmail-creator/` exists in
any transcript, log, or archive found during this investigation.

| Known | Evidence |
|---|---|
| `TOOLS/gmail-creator` existed as a **directory** entry under `TOOLS/` | `ls TOOLS/` output at 2026-07-22 19:02:24 UTC |
| It was **untracked** by git | `git log --all -- 'TOOLS/gmail-creator' 'tools/gmail-creator'` → empty; `git check-ignore -v` → no match (untracked, not ignored) |
| It was **not present** in the 2026-07-12 repo tarballs | see §3.5 |

**Not known and not inferred:** file names, file count, language, purpose, size, or authorship.
This report does not speculate about the contents. Only the owner can state what was in it.

---

## 3. Recovery sources checked

### 3.1 Repository and parent-directory search

```bash
find /c/Users/jaafa /c/ProgramData -maxdepth 8 -iname '*gmail*' \
  | grep -viE 'node_modules|\.git/|AppData/Local/(Google|Microsoft)/'
find "$HOME"/{Desktop,Documents,Downloads,OneDrive,AppData/Local/Temp} -maxdepth 6 -iname '*gmail*creator*'
find . -maxdepth 4 -iname '*gmail-creator*' -not -path './node_modules/*'
```

**Result:** no `gmail-creator` directory anywhere on the machine. Every hit was unrelated —
Gmail *plugin/extension* caches under `~/.codex/plugins/`, `~/.gemini/antigravity-browser-profile/`,
and `~/AppData/Local/claude-cli-nodejs/Cache/.../mcp-logs-claude-ai-Gmail`, plus one item in §5.

### 3.2 Git object recovery

| Check | Command | Result |
|---|---|---|
| Tracked history | `git log --all --oneline -- 'TOOLS/gmail-creator' 'tools/gmail-creator' '*gmail-creator*'` | **empty** — never committed on any branch |
| Reflog | `git log -g --oneline` | 20+ entries, all accounting/fulfillment commits; no TOOLS-related state |
| Unreachable/dangling objects | `git fsck --full --no-reflogs --unreachable --no-progress` | unreachable commits/trees/blobs exist, but they belong to prior branch work; **an untracked file never becomes a git object**, so none of them can contain this directory |
| Stash | `git stash list` | one entry: `stash@{0}: WIP on update/html-template-assets: e3298b8` — unrelated branch, predates the loss |
| Staged state | never staged (would appear in `git log --all --` above) | n/a |
| Worktrees | `git worktree list` (14 worktrees) + `ls */TOOLS` | every worktree's `TOOLS/` contains only `ai-hidden-qr-generator.html` and `audit/` — tracked files only |

**This is decisive.** Git records only what is added to the index. An untracked directory
leaves no blob, no tree, no reflog entry. There is no git-side recovery path, and none was
expected — but all five were checked rather than assumed.

### 3.3 Editor / local-history sources

| Source | Path | Result |
|---|---|---|
| VS Code Timeline | `~/AppData/Roaming/Code/User/History` | present; `grep -rl 'gmail-creator'` → **no match** |
| Cursor local history | `~/AppData/Roaming/Cursor/User/History` | present; no match |
| Windsurf local history | `~/AppData/Roaming/Windsurf/User/History` | present; no match |
| VS Code hot-exit backups | `~/AppData/Roaming/Code/Backups` | present; no match |
| Claude Code checkpoints | `.claude/checkpoints`, `~/.claude/checkpoints` | **do not exist**; only `~/.claude/shell-snapshots` (shell env dumps, no file content) |

Local history only captures files that were **opened in the editor**. Nothing under
`gmail-creator/` ever was, on any of the three editors.

### 3.4 Windows recovery locations

| Source | Result |
|---|---|
| Recycle Bin | Enumerated `C:\$Recycle.Bin\S-1-5-21-704698637-3952977447-429345012-1001`. Decoded every `$I` metadata header (UTF-16LE original-path field) — **0 entries** reference `gmail` or `TOOLS`. Expected: `rm -rf` unlinks directly and bypasses the Recycle Bin entirely. |
| Windows File History | `HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\FileHistory` — **key absent**; File History was never configured. |
| Previous Versions / VSS shadow copies | `vssadmin list shadows` → **"You don't have the correct permissions"**. `Get-ComputerRestorePoint` → **Access denied**. ⚠️ *Not proven absent — requires an elevated shell. See §6.* |
| OneDrive | `C:\Users\jaafa\OneDrive` exists but Desktop is **not** redirected into it (`HKCU:\...\User Shell Folders\Desktop` = `C:\Users\jaafa\Desktop`). OneDrive contains only 2023–2026 documents; the repo was never synced. No version history applies. |
| Windows temp | `%LOCALAPPDATA%\Temp` searched — no match. |
| Defender quarantine | `C:\ProgramData\Microsoft\Windows Defender\Quarantine` — empty; `Get-MpThreatDetection` — no detections. |
| Third-party backup software | none detected on the machine. |

### 3.5 Archives and project copies

| Archive | Date | Contains `TOOLS/`? | Contains `gmail-creator`? |
|---|---|---|---|
| `Desktop/upload/AQUAVO-vercel-rc-9a5c25d-20260712-2308.tar` | 2026-07-12 | yes — 11 tracked files | **no** |
| `Desktop/upload/AQUAVO-vercel-rc-a9fcb3d-20260712-2327.tar` | 2026-07-12 | yes — 11 tracked files | **no** |
| `Desktop/AQUAVO-UX-Audit-Final-Review.zip` | — | no | no |
| `Desktop/جعفر الجعفور/_codex_backups/tool2_separation_prechange_20260625_230350.zip` | 2026-06-25 | no | no |
| `Downloads/*.zip` (25+ AQUAVO/ros archives) | various | no | no |
| External drives (`D:`, `E:`, `F:`) | — | **none mounted** | n/a |

Both July-12 tarballs were built from git-tracked content, which is consistent with
`gmail-creator/` being untracked — their silence neither confirms nor denies it existed then.

---

## 4. Recoverable objects

**None.** Nothing attributable to `TOOLS/gmail-creator/` was recovered.
The directory `recovery/gmail-creator-candidate/` was therefore **not created** — there was
nothing to place in it. `TOOLS/` was not touched.

## 5. One unrelated item worth the owner's eyes

`C:\Users\jaafa\Desktop\upload\New folder (7)\Auto-Gmail-Creator-master\` — a 14-file
third-party Python project (`app.py`, `requirements.txt`, `README.md`, `user.csv`,
`data/{First_Name_DB.csv, Last_Name_DB.csv, Proxy_DB.csv}`, 7 `data/images/*.jpg`),
last modified **2025-09-26**, ten months before the loss.

**This is not the deleted directory and must not be treated as a recovery.** It has a
different name, a different location, and predates the loss by months. It is listed only
because it is the sole `gmail`-named project artifact on the machine, and the owner may
recognize it as the *source* the deleted folder was derived from — a judgment only they can
make. It has not been copied, moved, or modified.

## 6. Unrecovered

Everything. The contents of `TOOLS/gmail-creator/` are lost and, absent a shadow copy
(§3.4, unverifiable without elevation), unrecoverable by any means available here.

---

## 7. Recommended owner actions

1. **Check Volume Shadow Copies yourself, soon.** This is the only untested source, and it
   ages out. In an **elevated** PowerShell:
   ```powershell
   vssadmin list shadows
   # if any shadow predates 2026-07-22 19:03 UTC:
   #   mklink /d C:\shadow \\?\GLOBALROOT\Device\HarddiskVolumeShadowCopyN\
   #   dir C:\shadow\Users\jaafa\Desktop\upload\FishWebClean\TOOLS
   ```
   Do this before the volume churns; shadow copies are recycled under space pressure.
   If they are disabled (likely — File History and restore points are both off), stop here.
2. **Tell me what was in it.** If it can be rebuilt, say what it did and I will rebuild it.
3. **Commit it next time, or exempt it deliberately.** If it was intentionally untracked
   because it holds credentials, keep it out of git but put it in the backup set instead
   (`docs/recovery/pre-neon-backup-manifest.md` now covers untracked content).
4. **Turn on File History or a scheduled backup.** Nothing on this machine was protecting
   untracked work. The backup created today is a one-off, not a policy.
5. The recurrence guard is in place: `.claude/SAFETY-POLICY.md` plus `permissions.deny` /
   `permissions.ask` rules in `.claude/settings.json`. `rm -rf`, `git clean`, and
   `git reset --hard` are now hard-denied for agents in this repository.
