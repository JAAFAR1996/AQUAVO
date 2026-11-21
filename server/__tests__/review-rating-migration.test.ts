import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

let pg: PGlite;
const migration = readFileSync(resolve("migrations/0108_review_rating_guard.sql"), "utf8");
beforeAll(async () => {
  pg = new PGlite(); await pg.waitReady;
  await pg.exec("CREATE TABLE reviews(id text PRIMARY KEY,rating integer NOT NULL,title text); CREATE TABLE schema_migrations(version text PRIMARY KEY,checksum text,notes text); INSERT INTO reviews(id,rating) VALUES ('legacy-invalid',8)");
  const checksum = createHash("sha256").update(migration).digest("hex");
  await pg.query("SELECT set_config('aquavo.migration_checksum',$1,false)", [checksum]);
  await pg.exec(migration);
});
afterAll(async () => { await pg?.close(); });
describe("0108 review rating write guard", () => {
  it("preserves historical invalid data without pretending the constraint is validated", async () => {
    expect((await pg.query("SELECT rating FROM reviews WHERE id='legacy-invalid'")).rows).toEqual([{ rating: 8 }]);
    expect((await pg.query("SELECT convalidated FROM pg_constraint WHERE conname='reviews_rating_range'")).rows).toEqual([{ convalidated: false }]);
  });
  it("rejects new or updated ratings outside the allowed range and permits 1 and 5", async () => {
    await expect(pg.query("INSERT INTO reviews(id,rating) VALUES ('bad-low',0)")).rejects.toMatchObject({ code: "23514" });
    await expect(pg.query("INSERT INTO reviews(id,rating) VALUES ('bad-high',6)")).rejects.toMatchObject({ code: "23514" });
    await pg.query("INSERT INTO reviews(id,rating) VALUES ('minimum',1),('maximum',5)");
    await expect(pg.query("UPDATE reviews SET rating=7 WHERE id='minimum'")).rejects.toMatchObject({ code: "23514" });
    expect((await pg.query("SELECT rating FROM reviews WHERE id='minimum'")).rows).toEqual([{ rating: 1 }]);
  });
});
