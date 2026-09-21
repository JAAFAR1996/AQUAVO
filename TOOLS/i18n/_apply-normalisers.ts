/** One-off: apply unit + Sorani normalisation to already stored translations. Idempotent. */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { normalizeSoraniDeep } from "./_llm.js";
import { normalizeUnitsDeep } from "./_units.js";
for (const locale of ["en", "ckb"] as const) for (const f of ["products", "blog_posts", "blog_categories"]) {
  const p = `data/i18n/translations/${locale}/${f}.json`;
  if (!existsSync(p)) continue;
  const store = JSON.parse(readFileSync(p, "utf8")) as Record<string, { data: unknown }>;
  let changed = 0;
  for (const e of Object.values(store)) {
    const before = JSON.stringify(e.data);
    e.data = normalizeUnitsDeep(e.data, locale);
    if (locale === "ckb") e.data = normalizeSoraniDeep(e.data);
    if (JSON.stringify(e.data) !== before) changed++;
  }
  writeFileSync(p, JSON.stringify(store, null, 2) + "\n");
  console.log(locale, f, "normalised:", changed);
}
