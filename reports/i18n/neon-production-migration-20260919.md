# content_translations: production migration and seed (2026-09-19)

Approved by the owner on 2026-09-19 for exactly: snapshot, apply the rehearsed migration, verify, seed existing translations. Executed on Neon project `fishweb`, branch `production` (`br-patient-mouse-a4d4cgr4`) at 11:32 UTC.

## Counts and Arabic fingerprints

| | before | after migration | after seed |
|---|---|---|---|
| products | 114 | 114 | 114 |
| blog_posts | 127 | 127 | 127 |
| orders | 81 | 81 | 81 |
| users | 23 | 23 | 23 |
| categories | 14 | 14 | 14 |
| blog_categories | 8 | 8 | 8 |
| products fingerprint (md5 of id, name, description ordered by id) | 18ff6327f4e2d392fcba185aa4a46b8b | same | same |
| blog_posts fingerprint (md5 of id, title, content) | 9c46dfb2b2744287246d1a172d8b921e | same | same |

## Migration result

Six statements from `migrations/add_content_translations.sql` in one transaction, no errors.
- `content_translations`: 10 columns.
- Indexes (5): pkey, `content_translations_entity_locale_key`, `content_translations_type_locale_idx`, `content_translations_name_idx`, `content_translations_title_idx`.
- Constraints (5): pkey, unique (entity_type, entity_id, locale), `locale_chk` (en|ckb), `status_chk` (machine|reviewed), `entity_chk`.
- `users.locale` and `orders.locale`: nullable text, no values set (0 rows).

## Seed result

`node --env-file=.env TOOLS/i18n/seed-translations.mjs` (dry run first: 50 planned).

| entity | locale | rows | status |
|---|---|---|---|
| product | en | 50 | machine |
| product | ckb | 0 | |
| blog_post / blog_category / category / guide | en, ckb | 0 | |

0 orphan rows (every row joins a products.id), 0 empty names, 0 rows marked reviewed. Errors: none.

## Not changed

No merge to main, no deployment, no Vercel setting, no Arabic row edited, no SEO / noindex rule changed, no other migration. The storefront on aquavoiq.com still runs `main`, which does not read this table, so customers see no change until the feature branch is reviewed and deployed.
