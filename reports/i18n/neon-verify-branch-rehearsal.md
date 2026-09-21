# content_translations migration: Neon branch rehearsal (2026-09-19)

Branch `i18n-content-translations-verify-20260919` (`br-green-lake-a4j5pmgk`), a copy of `production` at LSN 0/80477F70. Production was not touched.

| Step | Result |
|---|---|
| Apply `migrations/add_content_translations.sql` (6 statements, one transaction) | table with 10 columns, 5 indexes (pk + unique + 3), `users.locale` and `orders.locale` added |
| Seed 2 English product rows via the seed script's upsert statement | 2 rows, join to `products` resolves, ILIKE search over `data->>'name'` / `description` returns them |
| Insert with `locale='fr'` | rejected by `content_translations_locale_chk` |
| Mark a row `reviewed`, re-run machine upsert | row unchanged (name, hash, status all kept) |
| Apply `migrations/add_content_translations_rollback.sql` | table and both columns gone; products 114, blog_posts 127, orders 81, users 23 unchanged |
| Re-apply migration | identical result (5 indexes, 2 columns) |

Source-row counts on the branch: products 114, blog_posts 127, categories 14, blog_categories 8. The coverage audit reports 107 / 117 / 11 because it counts only the rows the public API serves (active products, published posts, categories with products).

Still pending, needs explicit approval: the same 6 statements against `production`, then `node --env-file=.env TOOLS/i18n/seed-translations.mjs`.
