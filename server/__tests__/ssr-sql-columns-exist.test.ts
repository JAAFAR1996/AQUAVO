import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Every column the SSR handlers select must exist in shared/schema.ts.
 *
 * This is the failure mode that keeps recurring in this repo and that mocked
 * tests structurally cannot catch:
 *
 *  - #127: `getBlogMeta` selected "imageUrl" and status='published' against a
 *    table whose columns are image_url and is_published. It threw 42703 on
 *    every blog request that reached it, and a post silently lost its title and
 *    Article schema.
 *  - This file's own motivating case: the crawler-visible review list selected
 *    `r.guest_name`, which does not exist. The query threw, the catch returned
 *    an empty list, and product pages shipped with no reviews at all — visible
 *    only by checking production.
 *
 * A fake pool answers whatever SQL it is given, so the column name is never
 * exercised. Reading the schema is the only cheap way to check it.
 */

const schema = readFileSync(resolve(process.cwd(), "shared/schema.ts"), "utf8");

/** Snake-case column names declared for a pgTable, e.g. text("full_name"). */
function columnsOf(tableConst: string): Set<string> {
  const start = schema.indexOf(`export const ${tableConst} = pgTable(`);
  if (start === -1) throw new Error(`table not found in schema: ${tableConst}`);
  // Stop at the next top-level export so we only read this table's block.
  const rest = schema.slice(start + 1);
  const end = rest.indexOf("\nexport const ");
  const block = end === -1 ? rest : rest.slice(0, end);

  const names = new Set<string>();
  for (const m of block.matchAll(/\b(?:text|integer|boolean|timestamp|jsonb|numeric|serial|uuid|date|real|doublePrecision|bigint)\(\s*"([^"]+)"/g)) {
    names.add(m[1]);
  }
  return names;
}

/** `alias.column` references in a SQL string, as [alias, column] pairs. */
function aliasedColumns(sql: string): Array<[string, string]> {
  return [...sql.matchAll(/\b([a-z])\.([a-z_]+)\b/g)].map((m) => [m[1], m[2]] as [string, string]);
}

function sourceOf(file: string): string {
  return readFileSync(resolve(process.cwd(), file), "utf8");
}

describe("the crawler review query only selects columns that exist", () => {
  const source = sourceOf("api/_ssr-preview-source.ts");
  // The whole statement, projection included. Two earlier versions of this got
  // it wrong in opposite directions and both made the guard useless: starting
  // at `FROM reviews` excluded the projection — exactly where the bad column
  // was — while a lazy match from the file's first `SELECT` swallowed unrelated
  // queries. So: find the FROM, then walk back to ITS own opening backtick.
  const sql = (() => {
    const from = source.indexOf("FROM reviews r");
    if (from === -1) return "";
    const open = source.lastIndexOf("`SELECT", from);
    const close = source.indexOf("`", from);
    return open === -1 || close === -1 ? "" : source.slice(open, close + 1);
  })();

  it("finds the query", () => {
    expect(sql, "review query not found in api/_ssr-preview-source.ts").not.toBe("");
  });

  it("references only real reviews and users columns", () => {
    const reviewColumns = columnsOf("reviews");
    const userColumns = columnsOf("users");
    const byAlias: Record<string, Set<string>> = { r: reviewColumns, u: userColumns };

    for (const [alias, column] of aliasedColumns(sql)) {
      const known = byAlias[alias];
      if (!known) continue; // an alias this test does not model
      expect(known, `${alias}.${column} is not a column of that table`).toContain(column);
    }
  });

  it("does not reference guest_name, the column that broke it", () => {
    // Kept as its own assertion so a regression names itself in the failure.
    expect(sql).not.toContain("guest_name");
  });

  it("still filters to approved reviews only", () => {
    expect(sql).toContain("status = 'approved'");
  });

  it("selects no reviewer PII, so none can be rendered by mistake", () => {
    for (const forbidden of ["ip_address", "user_id AS", "r.ip_address"]) {
      expect(sql).not.toContain(forbidden);
    }
    // user_id may appear ONLY in the join condition, never in the projection.
    const projection = sql.slice(0, sql.indexOf("FROM reviews"));
    expect(projection).not.toContain("user_id");
    expect(projection).not.toContain("ip_address");
  });

  it("never uses an email address as a display name", () => {
    expect(sql).not.toContain("email");
  });
});

describe("the blog query that caused the #127 outage stays correct", () => {
  it("uses the real blog_posts column names", () => {
    const blogColumns = columnsOf("blogPosts");
    const source = sourceOf("api/ssr-meta.ts");
    // From the SELECT, not the FROM — the column list is what matters here.
    const sql = source.match(/`SELECT[\s\S]{0,400}?FROM blog_posts[\s\S]{0,200}?LIMIT 1`/)?.[0] ?? "";
    expect(sql).not.toBe("");

    // The exact pair that threw 42703 in production. A camelCase identifier is
    // fine as an ALIAS (`image_url AS "imageUrl"`) and fatal as a COLUMN, so
    // the check is that every quoted camelCase name is introduced by AS.
    for (const m of sql.matchAll(/(\S+\s+)?"([a-z]+[A-Z]\w*)"/g)) {
      expect(m[1], `"${m[2]}" is selected as a column, not an alias`).toMatch(/\bAS\s+$/i);
    }
    expect(sql).not.toContain("status = 'published'");
    // …and the real ones it should use instead.
    expect(blogColumns).toContain("image_url");
    expect(blogColumns).toContain("is_published");
    expect(sql).toContain("image_url");
    expect(sql).toContain("is_published");
  });
});
