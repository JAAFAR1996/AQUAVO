# PRODUCT_MEDIA.md — دليل استضافة صور المنتجات

## Architecture — المعمارية

| Layer | Storage | When |
|-------|---------|------|
| **New images** | Cloudinary (HTTPS CDN) | All images added from now on |
| **Legacy images** | `client/public/images/products/…` (local static) | Pre-existing images; still served but fragile on Vercel |
| **GLB / 3D models** | `client/public/models/…` (local static) | Out of scope for Cloudinary migration |

> [!IMPORTANT]
> Product images stored in the DB **must** use Cloudinary `secure_url` values for new uploads.
> Local relative paths (`/images/products/…`) are a legacy fallback and should not be used for new products.

---

## Required Environment Variables

```env
# Cloudinary (صور المنتجات)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

These live in `.env` (local) and must be set in Vercel / Railway production environment.
See `.env.example` lines 20–23 for reference.

---

## Cloudinary Folder Structure

```
aquavo/
  products/
    yee/
      yee-ytz-300/
        _model_gemini25flashimage_4k_20260   ← WebP original stored
        _model_gemini25flashimage_4k_20261
        …
    houyi/
      houyi-xxx/
        …
    unknown/                                 ← fallback if brand is empty
      some-product/
        …
```

> [!NOTE]
> `public_id` is derived from the local path:
> `/images/products/yee/yee-ytz-300/model.webp` → `aquavo/products/yee/yee-ytz-300/model`

---

## Migration Script — Full Reference

**Location:** [`scripts/migrate-product-images-to-cloudinary.ts`](file:///c:/Users/jaafa/Desktop/upload/FishWebClean/scripts/migrate-product-images-to-cloudinary.ts)

### CLI Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--slug <slug>` | Target a single product by slug | `ytz-300` |
| `--all` | Process all products in DB | — |
| `--apply` | Required to actually upload + write DB | dry-run if omitted |
| `--batch-size <n>` | Process N products at a time | 5 |
| `--limit <n>` | Cap total products processed (for dry-run testing) | unlimited |

---

## Step-by-Step Execution Order

> [!CAUTION]
> **Never run `--all --apply` without first reviewing the dry-run output.**
> DB updates are immediate and irreversible without a manual DB rollback.

### Step 1 — Dry-run a single product

```bash
npx tsx scripts/migrate-product-images-to-cloudinary.ts --slug ytz-300
```

Output shows for each image: old path, file exists, already on Cloudinary, proposed URL.
No uploads, no DB writes.

### Step 2 — Apply a single product

```bash
npx tsx scripts/migrate-product-images-to-cloudinary.ts --slug ytz-300 --apply
```

### Step 3 — Dry-run ALL products

```bash
npx tsx scripts/migrate-product-images-to-cloudinary.ts --all
```

Shows a full plan table for every product + summary report. No uploads, no DB writes.

### Step 4 — Dry-run first 5 products (testing)

```bash
npx tsx scripts/migrate-product-images-to-cloudinary.ts --all --limit 5
```

### Step 5 — Apply all in batches of 10

```bash
npx tsx scripts/migrate-product-images-to-cloudinary.ts --all --apply --batch-size 10
```

> [!IMPORTANT]
> Running `--all --apply` without `--batch-size` when there are more than 20 products will be **refused** with an error. Always specify `--batch-size`.

### Step 6 — Verify spot-check products

After each batch, open 2–3 products on the website and confirm:
- Main image loads from `https://res.cloudinary.com/…`
- All gallery images display correctly
- No broken image placeholders

### Step 7 — Continue remaining batches

Repeat Step 5 for any remaining products. The script safely **skips** products already fully migrated.

---

## Safety Rules (enforced by script)

| Rule | Behaviour |
|------|-----------|
| Default mode is dry-run | `--apply` is always required for any change |
| Missing local file | Entire product is skipped — no partial DB update |
| Any upload failure | Entire product DB update is skipped — retryable |
| Already on Cloudinary | Reused without re-upload |
| Large batch without `--batch-size` | Refused with clear error message if >20 products |
| DB update scope | `images[]` and `thumbnail` **only** — no other fields touched |
| Image order | Strictly preserved — first image stays first |
| Thumbnail | Set to the first entry in `images[]` after migration |

---

## Upload Quality Rules

| Rule | Value |
|------|-------|
| Format | WebP input stays WebP; JPEG input stays JPEG |
| Quality | `auto:best` (high-quality master stored) |
| Overwrite | `false` — existing `public_id` is reused, not re-uploaded |
| Max file (admin upload) | 10 MB (multer limit in `server/routes/upload.ts`) |
| Transformations | `f_auto`/`q_auto` are delivery-time only — never applied destructively |
| Folder | `aquavo/products/<brand>/<slug>/` |

---

## Rollback Strategy

The script **does not delete local files**. Rolling back is always possible:

1. **If a product was incorrectly updated:**
   ```sql
   -- Restore from your last DB backup, or manually set images back:
   UPDATE products
   SET images = '["\/images\/products\/yee\/yee-ytz-300\/model.webp"]',
       thumbnail = '/images/products/yee/yee-ytz-300/model.webp'
   WHERE slug = 'ytz-300';
   ```

2. **If many products need rollback:**
   - Restore from a NEON DB snapshot (point-in-time recovery)
   - Or re-run the original seed script for those products

3. **Local files are intact:** The original `client/public/images/products/…` files are never deleted by the migration script. Reverting to local paths will work immediately.

---

## Admin UI Image Upload Flow

When an admin uploads via the Admin Dashboard:

1. Image is sent to `PATCH /api/admin/products/:id` with `imageBase64` or `images[]` containing base64 strings
2. `server/routes/admin.ts` calls `uploadImage(base64)` → Cloudinary
3. Cloudinary `secure_url` is stored in `images[]` and `thumbnail`
4. The product page renders both relative paths and HTTPS URLs without modification

> [!TIP]
> The image gallery component is URL-agnostic — Cloudinary URLs work without any frontend changes.

---

## Multi-Upload Failure Behaviour (since 2026-06-08)

`POST /api/upload/images` now returns:

| Scenario | HTTP Status | `success` |
|----------|-------------|-----------|
| All uploads succeeded | `200` | `true` |
| Some uploads failed | `207 Multi-Status` | `false` |
| All uploads failed | `500` | `false` |

Previously all three scenarios returned `200 success:true`, which could silently store an empty `images[]` array in the DB.

---

## Frontend Compatibility

Both path formats work without code changes:

```tsx
// Relative local path (legacy)
<img src="/images/products/yee/yee-ytz-300/model.webp" />

// Cloudinary absolute URL (new)
<img src="https://res.cloudinary.com/aquavo/image/upload/aquavo/products/yee/yee-ytz-300/model.webp" />
```

> [!WARNING]
> Do **not** delete local images until all products are migrated, verified in production, and the rollback period (minimum 7 days) has passed.

---

## Final Migration Report Fields

The script prints a structured report after every run:

```
═══════════════════════════════════════════════════════════════
  MIGRATION REPORT  [APPLY]
═══════════════════════════════════════════════════════════════
  Products scanned         : 45
  Products skipped         : 3      ← already fully on Cloudinary
  Products migrated        : 40
  Products failed/blocked  : 2      ← missing files or upload error
  ──────────────────────────────────────────────────────────────
  Images uploaded          : 187
  Images already Cloudinary: 14
  Images missing locally   : 5
  Upload failures          : 0
  ──────────────────────────────────────────────────────────────
  DB rows updated          : 40
═══════════════════════════════════════════════════════════════
```

---

## Test Coverage

Unit tests live in [`scripts/__tests__/migrate-product-images.test.ts`](file:///c:/Users/jaafa/Desktop/upload/FishWebClean/scripts/__tests__/migrate-product-images.test.ts).

Run with:
```bash
pnpm exec vitest run scripts/__tests__/migrate-product-images.test.ts
```

| Test | Coverage |
|------|---------|
| `isRelativePath` | 5 cases |
| `toPublicId` | 4 cases |
| `buildProductFolder` | 4 cases (brand normalization) |
| `buildPlan` | 6 cases (skip absolute, missing file, already-Cloudinary, new file, order, no-API) |
| `migrateProduct` — dry-run | No upload, no DB write |
| `migrateProduct` — missing file | Blocks DB update |
| `migrateProduct` — already done | Skip without re-upload |
| `migrateProduct` — order preservation | First image → thumbnail |
| `migrateProduct` — upload failure | Blocks DB update |
| `migrateProduct` — empty images | No DB write |

---

*Last updated: 2026-06-08 | Maintainer: AQUAVO Dev*
