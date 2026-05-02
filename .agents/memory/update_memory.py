#!/usr/bin/env python3
"""
AQUAVO Auto-Memory Updater
يُشغَّل بعد كل جلسة عمل — يكتشف التغييرات ويحدّث ملفات الميموري تلقائياً.

Usage:
    python update_memory.py              # Full auto-detect and update
    python update_memory.py --summary    # Show what changed only
    python update_memory.py --force      # Force full rebuild
"""

import json
import os
import sys
import subprocess
from pathlib import Path
from datetime import datetime, timezone

# ── Paths ───────────────────────────────────────────────────────────
PROJECT_ROOT = Path(r"C:\Users\jaafa\Desktop\upload\FishWebClean")
BASARAI_ROOT = Path(r"C:\Users\jaafa\Desktop\basarai\backend")
MEMORY_DIR   = PROJECT_ROOT / ".agents" / "memory"
CLAUDE_MD    = PROJECT_ROOT / "CLAUDE.md"
STATE_FILE   = MEMORY_DIR / ".memory_state.json"  # tracks last-known state

# ── State Management ─────────────────────────────────────────────────
def load_state() -> dict:
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text(encoding="utf-8"))
    return {"last_run": None, "decisions": [], "milestones": [], "open_items": []}

def save_state(state: dict):
    STATE_FILE.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")

# ── Detectors ────────────────────────────────────────────────────────
def detect_new_prompts() -> dict:
    """Scan IMPROVED dir and count prompts per week."""
    improved_dir = PROJECT_ROOT / "Launch_Ideas" / "promot" / "IMPROVED"
    stats = {}
    if not improved_dir.exists():
        return stats
    for f in sorted(improved_dir.glob("*_IMPROVED.json")):
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
            week = data.get("meta", {}).get("week", 0)
            theme = data.get("meta", {}).get("theme", "")
            prompts = data.get("prompts", data.get("schedule", []))
            stats[week] = {"theme": theme, "count": len(prompts), "file": f.name}
        except Exception:
            pass
    return stats

def detect_completed_prompts() -> int:
    """Count completed prompts from log."""
    log_file = BASARAI_ROOT / "completed_prompts.json"
    if not log_file.exists():
        return 0
    try:
        data = json.loads(log_file.read_text(encoding="utf-8"))
        return len(data)
    except Exception:
        return 0

def detect_approved_images() -> dict:
    """Count approved images per week."""
    approved_dir = BASARAI_ROOT / "approved_content"
    stats = {}
    if not approved_dir.exists():
        return stats
    for week_dir in approved_dir.iterdir():
        if week_dir.is_dir():
            count = sum(1 for f in week_dir.rglob("*.png")) + \
                    sum(1 for f in week_dir.rglob("*.jpg"))
            stats[week_dir.name] = count
    return stats

def detect_bot_version() -> str:
    """Extract bot version from telegram_content_bot.py."""
    bot_file = BASARAI_ROOT / "telegram_content_bot.py"
    if bot_file.exists():
        first_lines = bot_file.read_text(encoding="utf-8")[:200]
        for line in first_lines.splitlines():
            if "v" in line.lower() and ("bot" in line.lower() or "version" in line.lower()):
                return line.strip().strip('"""').strip()
    return "Unknown"

def detect_git_changes() -> list[str]:
    """Get recent git commits."""
    try:
        result = subprocess.run(
            ["git", "log", "--oneline", "-5"],
            cwd=str(PROJECT_ROOT), capture_output=True, text=True, timeout=10
        )
        if result.returncode == 0:
            return result.stdout.strip().splitlines()
    except Exception:
        pass
    return []

def detect_schema_tables() -> list[str]:
    """Extract table names from Drizzle schema."""
    schema_file = PROJECT_ROOT / "server" / "db" / "schema.ts"
    tables = []
    if schema_file.exists():
        content = schema_file.read_text(encoding="utf-8")
        import re
        matches = re.findall(r'export const (\w+) = pgTable', content)
        tables = matches
    return tables

# ── Updaters ─────────────────────────────────────────────────────────
def update_content_engine_memory(prompt_stats: dict, completed: int, approved: dict):
    """Update 05_content_engine.md with latest stats."""
    target = MEMORY_DIR / "05_content_engine.md"
    if not target.exists():
        return

    content = target.read_text(encoding="utf-8")

    # Build new stats table
    table_lines = ["| Week | File | Prompts | Theme |", "|------|------|---------|-------|"]
    total = 0
    for week, info in sorted(prompt_stats.items()):
        table_lines.append(f"| {week} | {info['file']} | {info['count']} | {info['theme']} |")
        total += info["count"]
    table_lines.append(f"\n**Total:** {total} prompts improved")
    table_lines.append(f"**Completed:** {completed} generated & approved")

    # Find and replace the stats section
    import re
    new_table = "\n".join(table_lines)
    # Replace the Content Calendar Stats section
    pattern = r'(## Content Calendar Stats\n)(.*?)(\n## )'
    replacement = f'\\1\n{new_table}\n\\3'
    new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)

    if new_content != content:
        target.write_text(new_content, encoding="utf-8")
        print(f"  ✓ Updated 05_content_engine.md (prompts: {total}, completed: {completed})")

def update_decisions_log(new_decision: str = None):
    """Append a new decision to 04_decisions_log.md."""
    target = MEMORY_DIR / "04_decisions_log.md"
    if not target.exists() or not new_decision:
        return

    content = target.read_text(encoding="utf-8")
    today = datetime.now().strftime("%Y-%m-%d")

    # Add before the OPEN DECISIONS section
    entry = f"\n---\n\n## [{today}] {new_decision}\n\n"
    open_marker = "## 📌 OPEN DECISIONS"
    if open_marker in content:
        content = content.replace(open_marker, entry + open_marker)
        target.write_text(content, encoding="utf-8")
        print(f"  ✓ Added decision: {new_decision[:60]}...")

def update_main_claude(prompt_stats: dict, completed: int, bot_version: str,
                        approved: dict, git_changes: list):
    """Update CLAUDE.md with fresh stats."""
    if not CLAUDE_MD.exists():
        return

    content = CLAUDE_MD.read_text(encoding="utf-8")
    now = datetime.now().strftime("%Y-%m-%d %H:%M")

    # Update Content Calendar Status table
    import re
    table_rows = []
    for week, info in sorted(prompt_stats.items()):
        table_rows.append(
            f"| Week {week} | {info['theme']} | {info['count']} | ✅ IMPROVED |"
        )
    total = sum(info["count"] for info in prompt_stats.values())

    new_calendar = (
        "## 📅 CONTENT CALENDAR STATUS\n\n"
        "| Week | Theme | Prompts | Status |\n"
        "|------|-------|---------|--------|\n"
        + "\n".join(table_rows) +
        f"\n\n**Total:** {total} prompts improved | **Completed:** {completed} images generated"
    )

    # Replace the section
    pattern = r'## 📅 CONTENT CALENDAR STATUS.*?(?=\n---|\n## ⚠️|\Z)'
    new_content = re.sub(pattern, new_calendar, content, flags=re.DOTALL)

    # Add last-updated footer
    footer_pattern = r'\n> \*\*Last Updated.*?\*\*\n?$'
    footer = f'\n\n> **Last Updated:** {now} | Prompts: {total} | Completed: {completed}\n'
    if re.search(footer_pattern, new_content):
        new_content = re.sub(footer_pattern, footer, new_content)
    else:
        new_content = new_content.rstrip() + footer

    if new_content != content:
        CLAUDE_MD.write_text(new_content, encoding="utf-8")
        print(f"  ✓ Updated CLAUDE.md (total={total}, completed={completed})")

def append_completed_milestone(milestone: str):
    """Add a completed milestone to decisions log."""
    target = MEMORY_DIR / "04_decisions_log.md"
    if not target.exists():
        return

    content = target.read_text(encoding="utf-8")
    today = datetime.now().strftime("%Y-%m-%d")
    entry = f"- [x] [{today}] {milestone}\n"

    # Find the completed milestones section
    marker = "## ✅ COMPLETED MILESTONES\n"
    if marker in content:
        idx = content.index(marker) + len(marker)
        content = content[:idx] + entry + content[idx:]
        target.write_text(content, encoding="utf-8")
        print(f"  ✓ Added milestone: {milestone[:60]}")

# ── Main ─────────────────────────────────────────────────────────────
def main():
    args = sys.argv[1:]
    force = "--force" in args
    summary_only = "--summary" in args

    print(f"\n{'='*50}")
    print(f"  AQUAVO Memory Updater — {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"{'='*50}\n")

    # Load state
    state = load_state()
    print("📊 Detecting changes...")

    # Run all detectors
    prompt_stats  = detect_new_prompts()
    completed     = detect_completed_prompts()
    approved      = detect_approved_images()
    bot_version   = detect_bot_version()
    git_changes   = detect_git_changes()
    schema_tables = detect_schema_tables()

    # Show summary
    total_prompts = sum(info["count"] for info in prompt_stats.values())
    print(f"\n  📁 Improved Prompts: {total_prompts} across {len(prompt_stats)} weeks")
    for week, info in sorted(prompt_stats.items()):
        print(f"     Week {week}: {info['count']} prompts ({info['theme']})")
    print(f"  ✅ Completed Images: {completed}")
    print(f"  🤖 Bot Version: {bot_version}")
    print(f"  🗃️ DB Tables: {', '.join(schema_tables) if schema_tables else 'N/A'}")

    if approved:
        print(f"  📸 Approved Content:")
        for folder, count in sorted(approved.items()):
            print(f"     {folder}: {count} images")

    if git_changes:
        print(f"\n  🔀 Recent Git Changes:")
        for line in git_changes:
            print(f"     {line}")

    if summary_only:
        print("\n[Summary mode — no files updated]")
        return

    # Check if anything changed
    last_total = state.get("last_prompt_total", 0)
    last_completed = state.get("last_completed", 0)
    changed = force or total_prompts != last_total or completed != last_completed

    if not changed:
        print("\n✨ No changes detected — memory is up to date!")
        return

    print(f"\n📝 Updating memory files...")

    # Run all updaters
    update_content_engine_memory(prompt_stats, completed, approved)
    update_main_claude(prompt_stats, completed, bot_version, approved, git_changes)

    # Log new milestones
    if completed > last_completed and completed > 0:
        diff = completed - last_completed
        append_completed_milestone(
            f"Generated {diff} new approved images (total: {completed})"
        )

    if total_prompts > last_total and total_prompts > 0:
        new_weeks = len(prompt_stats) - state.get("last_weeks_count", 0)
        if new_weeks > 0:
            append_completed_milestone(
                f"Added Week {max(prompt_stats.keys())} prompts ({prompt_stats[max(prompt_stats.keys())]['count']} prompts)"
            )

    # Save updated state
    state.update({
        "last_run": datetime.now(timezone.utc).isoformat(),
        "last_prompt_total": total_prompts,
        "last_completed": completed,
        "last_weeks_count": len(prompt_stats),
        "last_bot_version": bot_version,
        "last_approved_total": sum(approved.values()),
    })
    save_state(state)

    print(f"\n{'='*50}")
    print(f"  ✅ Memory updated successfully!")
    print(f"{'='*50}\n")


# ── Entry Point ───────────────────────────────────────────────────────
if __name__ == "__main__":
    main()
