type RowResult = { rows: unknown[] };
type QueryConfig = { text: string; rowMode?: string };

/**
 * Keep existing SSR fixtures usable with the driver's QueryConfig/array mode.
 * String queries still pass through untouched. Only the bounded ORM product
 * list reads are adapted; assertions continue to run the real SSR handlers.
 */
export function adaptNeonProductListQuery(
  query: (text: string, values?: unknown[]) => Promise<RowResult>,
): (input: string | QueryConfig, values?: unknown[]) => Promise<RowResult> {
  return async (input, values) => {
    if (typeof input === "string") return query(input, values);
    if (!/from "products"/i.test(input.text) || input.rowMode !== "array") {
      throw new Error("Unexpected query configuration in product-list fixture");
    }
    const columns = /^select (.+?) from /i.exec(input.text)?.[1].split(",").map((column) => {
      const name = column.trim().replaceAll('"', "").split(".").at(-1)!;
      return name.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase());
    });
    if (!columns) throw new Error("Product-list projection missing");

    // The old fixture callbacks accept the optional category as their first
    // value. The actual ORM call also binds the empty-slug exclusion and limit.
    const categoryParameter = /"category"\s*=\s*\$(\d+)/.exec(input.text);
    const fixtureValues = categoryParameter ? [values?.[Number(categoryParameter[1]) - 1]] : [];
    const fixtureText = input.text.replaceAll('"', "").replace(/\bfrom\b/gi, "FROM").replace(/^select /i, "SELECT ");
    const result = await query(fixtureText, fixtureValues);
    return {
      ...result,
      rows: result.rows.map((row) => {
        if (!row || typeof row !== "object" || Array.isArray(row)) throw new Error("Expected object fixture row");
        return columns.map((column) => (row as Record<string, unknown>)[column] ?? null);
      }),
    };
  };
}
