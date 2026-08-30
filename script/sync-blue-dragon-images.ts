import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const slug = "houyi-blue-dragon-stone";
const images = [
  "/products/houyi-blue-dragon-stone/blue-dragon-stone-hero.webp",
  "/products/houyi-blue-dragon-stone/blue-dragon-stone-scale.webp",
  "/products/houyi-blue-dragon-stone/blue-dragon-stone-variation.webp",
];

const pool = new Pool({ connectionString });

try {
  const result = await pool.query(
    `UPDATE products
     SET images = $1::jsonb,
         thumbnail = $2,
         updated_at = NOW()
     WHERE slug = $3
     RETURNING slug, images, thumbnail`,
    [JSON.stringify(images), images[0], slug],
  );

  if (result.rowCount !== 1) {
    throw new Error(`Expected to update exactly one product, updated ${result.rowCount ?? 0}`);
  }

  const row = result.rows[0];
  if (row.thumbnail !== images[0] || JSON.stringify(row.images) !== JSON.stringify(images)) {
    throw new Error("Blue Dragon Stone image verification failed after update");
  }

  console.log(JSON.stringify({ ok: true, slug: row.slug, images: row.images, thumbnail: row.thumbnail }));
} finally {
  await pool.end();
}
