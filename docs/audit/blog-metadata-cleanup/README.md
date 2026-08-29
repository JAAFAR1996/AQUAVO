# Blog metadata cleanup — `blog-metadata-truth-20260829`

Corrects the stored values behind the five published claims the truth audit
disproved. The render-side corrections already shipped in `c3af2257` (PR #185);
this brings the database into agreement with what the site now publishes, so the
two cannot drift apart again.

**Status: prepared, reviewed, NOT executed.** See *Execution* below.

| | |
|---|---|
| Migration ID | `blog-metadata-truth-20260829` |
| Target | Neon project `shiny-tree-43710630` (`fishweb`), production default branch |
| Table | `blog_posts` (81 rows) |
| Rows written | **81** — 10 dates, 11 bylines, 81 read-times (overlapping sets) |
| Prepared against | Production state read 2026-08-29 |
| Point-in-time window | 6 h (`history_retention_seconds = 21600`) |

## What changes

### Set A — 10 fabricated publication dates

Each row was inserted `2026-02-23` and stamped with a date from the previous
autumn, spaced weekly, manufacturing a publishing history that did not happen.

| slug | before | after |
|---|---|---|
| `algae-war-guide` | 2025-10-31 | 2026-02-23 |
| `filter-types-guide` | 2025-11-04 | 2026-02-23 |
| `budget-aquascaping` | 2025-11-09 | 2026-02-23 |
| `tank-mates-compatibility` | 2025-11-17 | 2026-02-23 |
| `nitrogen-cycle-simple` | 2025-11-24 | 2026-02-23 |
| `top-5-mistakes` | 2025-11-30 | 2026-02-23 |
| `cloudy-water-fix` | 2025-12-07 | 2026-02-23 |
| `real-vs-fake-plants` | 2025-12-14 | 2026-02-23 |
| `goldfish-bowl-myth` | 2025-12-21 | 2026-02-23 |
| `iraqi-summer-aquarium-cooling` | 2025-12-27 | 2026-02-23 |

**Only these ten.** All 81 rows have `published_at` a few *milliseconds* before
`created_at` — an artifact of the seed insert order, not a backdate. The
predicate that identified this set therefore required a gap of more than a day.
Correcting the other 71 would move real dates for no reason.

### Set B — 11 chatbot-persona bylines

`شريمب 🦐` → `AQUAVO Editorial Team`, on the 11 rows that carry it. شريمب is the
storefront's AI chat assistant, cast in its own system prompt as an aquarium
specialist of fifteen years. The 70 legitimate `AQUAVO Team` bylines are
untouched.

The eleventh row (`auto-1787451489298`) is in this set **for its byline only** —
its publication date is genuine and is deliberately absent from Set A.

### Set C — 81 stale `read_time` strings → `NULL`

Every one overstates its own article: median **4.5×**, worst **15×** (an
11-minute claim on a 227-word post).

Cleared rather than recomputed, deliberately. Nothing reads this column any
more — both the browser and the crawler derive the figure from the article body
via `shared/article-reading.ts`. Writing fresh numbers into a column nothing
consumes would put them straight back on the path to being stale, which is how
these became false in the first place. `NULL` removes the false claim without
inventing a replacement.

The column is left in place; dropping it is a schema change that belongs with
removing it from `shared/schema.ts`.

## Not touched

`content`, `title`, `excerpt`, `slug`, `category`, `image_url`, `is_published`,
`is_featured`, `view_count`, `created_at`, `updated_at`, and the 70 legitimate
`AQUAVO Team` bylines.

## Safety properties

- **No unconstrained bulk `UPDATE`.** 21 of the 22 statements are keyed to an
  explicit primary key. The 22nd (Set C) is bounded by `read_time IS NOT NULL`
  and by the row-count guard, and its rollback restores all 81 values.
- **Pre-flight guard.** Aborts unless it finds exactly 81 posts, 11 persona rows
  and 10 backdated rows — so it cannot run against a catalogue that has moved on
  from the one reviewed.
- **Backup inside the transaction.** `STEP 0` snapshots `id, slug, author,
  published_at, read_time` for all 81 rows into
  `blog_posts_metadata_backup_20260829` in the *same* transaction as the writes.
  There is no window in which a row could change between being backed up and
  being corrected; if the transaction aborts, backup and changes vanish together.
- **Post-flight verification before `COMMIT`.** Re-counts backdated rows,
  personas, read-times, team bylines and total rows. Any mismatch raises and
  rolls the whole thing back.
- **Two independent recovery paths.** `rollback.sql` (restores by join from the
  backup table, then verifies every restored row matches), and Neon
  point-in-time restore within the 6-hour retention window.

## Rollback

```sql
\i rollback.sql
```

Restores `author`, `published_at` and `read_time` for every snapshotted row and
verifies each one matches the backup. It restores the false data faithfully —
that is what a rollback is for; it returns production to its prior state rather
than re-deciding the question.

The backup table is **not** dropped by either file. Drop it by hand once the
correction is accepted:

```sql
DROP TABLE blog_posts_metadata_backup_20260829;
```

## Execution

**This has not been run.** The Neon MCP server available to this session is
configured read-only: every write tool is removed and connection strings are
withheld because they carry a privileged role password. `.env` is
permission-guarded in this environment, so `DATABASE_URL` is not reachable
either. The migration was therefore prepared and reviewed but could not be
executed, and it could not be rehearsed on a Neon child branch for the same
reason.

To run it, either:

1. **From the Neon console or `psql`**, with a `DATABASE_URL` for the production
   branch:

   ```
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f docs/audit/blog-metadata-cleanup/migration.sql
   ```

   The file is a single transaction and verifies itself before committing.

2. **Re-authorise the Neon MCP with write access** (remove the `readonly` query
   param from the server URL, or log out and back in selecting full access) and
   ask for it to be applied — preferably rehearsed on a child branch first.

### After it runs

```sql
SELECT count(*) FILTER (WHERE author = 'شريمب 🦐')                          AS personas,      -- expect 0
       count(*) FILTER (WHERE published_at < created_at - interval '1 day') AS backdated,     -- expect 0
       count(read_time)                                                     AS read_times,   -- expect 0
       count(*)                                                             AS total          -- expect 81
  FROM blog_posts;
```

Then re-check a corrected post live, as a browser and as a crawler:

```
curl -sL https://www.aquavoiq.com/api/blog/posts/algae-war-guide | jq -r .author
# expect: AQUAVO Editorial Team   (currently returns the raw persona string)
```

The rendered page already reads correctly either way — the render layer resolves
the persona to the editorial team regardless of what is stored. This migration
removes the last place the false values still exist.
