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
        _model_gemini25flashimage_4k_20260_25   ← WebP original stored
        _model_gemini25flashimage_4k_20260_26
        At_the_bottom_4k_202602091620
        …
    houyi/
      houyi-xxx/
        …
```

> [!NOTE]
> `public_id` is derived from the local path:
> `/images/products/yee/yee-ytz-300/model.webp` → `aquavo/products/yee/yee-ytz-300/model`

---

## How to Migrate One Product (dry-run first)

### 1. Dry-run — inspect only, no changes

```bash
npx tsx scripts/migrate-product-images-to-cloudinary.ts --slug ytz-300
```

Output shows for each image:
- Old path
- Whether local file exists (`true` / `false`)
- Whether it is already on Cloudinary
- Proposed Cloudinary `secure_url`

**No uploads, no DB writes.**

### 2. Apply — upload + update DB

```bash
npx tsx scripts/migrate-product-images-to-cloudinary.ts --slug ytz-300 --apply
```

What the script does when `--apply` is passed:
1. For each relative path in `product.images[]`:
   - Checks if Cloudinary `public_id` already exists → reuses it (no re-upload)
   - Otherwise uploads the local file with `quality: auto:best` (high quality)
2. Replaces relative paths with `secure_url` values in the `images[]` array
3. Sets `thumbnail` to the first Cloudinary URL
4. Calls `db.update(products).set({ images, thumbnail }).where(eq(id))`
5. **Does not touch price, stock, category, description, variants, or any other field**
6. **Does not delete local files**

> [!CAUTION]
> Only run `--apply` after reviewing the dry-run output. The DB update is immediate and irreversible without a manual DB rollback.

---

## Upload Quality Rules

| Rule | Value |
|------|-------|
| Format | WebP input stays WebP; JPEG input stays JPEG |
| Quality | `auto:best` (Cloudinary stores a high-quality master) |
| Overwrite | `false` by default — existing `public_id` is reused, not re-uploaded |
| Max file | 10 MB (multer limit in `server/routes/upload.ts`) |
| Transformations | `f_auto`/`q_auto` are delivery-time only (URL params), never applied destructively to the stored original |
| Folder | `aquavo/products/<brand>/<slug>/` |

---

## Admin UI Image Upload Flow

When an admin uploads via the Admin Dashboard:

1. Image is sent to `PATCH /api/admin/products/:id` with `imageBase64` or `images[]` containing base64 strings
2. `server/routes/admin.ts` calls `uploadImage(base64)` → Cloudinary
3. Cloudinary `secure_url` is stored in `images[]` and `thumbnail`
4. The product page `<ProductImageGallery>` component renders both relative paths and HTTPS URLs without modification

> [!TIP]
> The `ProductImageGallery` component is already URL-agnostic — it passes `src` to `<img>` as-is. Cloudinary URLs work without any frontend changes.

---

## Multi-Upload Failure Behaviour (as of fix 2026-06-08)

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

Do **not** delete local images until all products are migrated and verified in production.

---

## Adding Images for a New Product

1. Upload via Admin Dashboard image uploader (automatically goes to Cloudinary)
2. Or use the migration script if you have local files ready:
   ```bash
   npx tsx scripts/migrate-product-images-to-cloudinary.ts --slug <new-slug> --apply
   ```
3. Verify the product page shows images correctly

---

*Last updated: 2026-06-08 | Maintainer: AQUAVO Dev*
