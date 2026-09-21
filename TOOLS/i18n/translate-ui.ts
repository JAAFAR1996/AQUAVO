/**
 * Fill en / ckb UI bundles from the Arabic source bundles with an LLM.
 *
 * Works key-by-key on the flattened Arabic bundle, skips keys that already
 * have a non-empty translation, batches ~40 strings per request, preserves
 * {{placeholders}} and <tags>, and writes after every batch so a crash or a
 * rate limit loses nothing. Re-run until it reports 0 missing.
 *
 * Usage: node --env-file=.env --import tsx TOOLS/i18n/translate-ui.ts --locale=en|ckb [--ns=guides,tools] [--batch=40]
 * Models: the chain in TOOLS/i18n/_llm.ts (override AQUAVO_TRANSLATE_MODELS="gemini:gemini-2.5-flash,groq:openai/gpt-oss-120b").
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { completeJson, extractJson, modelChain, normalizeDeep, normalizeSoraniDeep, renderGlossary } from "./_llm.js";

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")).map(([k, v]) => [k, v ?? "true"]));
const LOCALE = args.locale as "en" | "ckb";
if (!LOCALE) throw new Error("--locale=en|ckb required");
const NS = args.ns ? String(args.ns).split(",") : ["common", "nav", "home", "products", "product", "cart", "checkout", "account", "orders", "search", "errors", "pages", "seo", "tools", "guides"];
const BATCH = Number(args.batch || 40);
const PACE_MS = Number(args.pace || 1500);
const DIR = resolve("client/src/locales");
const LANGUAGE = LOCALE === "en" ? "English" : "Central Kurdish (Sorani, Arabic script)";

const RULES = `You translate the user interface of AQUAVO, an Iraqi online store for aquarium equipment, from Iraqi Arabic into ${LANGUAGE}.
Rules:
1. Output ONLY a JSON object with exactly the same keys as the input; every value is the translation of the corresponding input value.
2. Preserve placeholders exactly: {{v0}}, {{count}}, {{name}}, etc. Preserve HTML-like tags such as <strong>, <1>, </1>. Preserve numbers, units (L, cm, W, mm, °C), model codes, brand names (AQUAVO, YEE, HYGGER, Houyi), URLs, emails, phone numbers and the currency mark "د.ع" (write it as "IQD" in English).
3. Tone: calm, expert, trustworthy shop copy. No emoji. Keep punctuation style natural for the target language.
4. Short labels stay short (buttons, tabs, aria-labels). Long paragraphs (guides) get a complete, natural translation, never a summary.
${LOCALE === "ckb" ? `5. Central Kurdish / Sorani only, as used in Sulaymaniyah and Erbil, written with Sorani letters (ڕ ڵ ۆ ێ ە ڤ گ چ پ ژ ک ی). Never Kurmanji, never Persian vocabulary where a common Sorani word exists, never a transliteration of the Arabic sentence. Chemical symbols pH/GH/KH/NH3/NO2/NO3/CO2 stay as they are. Write all digits as Western digits (0-9).
` : `5. Product names follow "<Brand> <Model> <descriptive type>". Iraqi idioms are rephrased into natural ecommerce English.`}
${renderGlossary(LOCALE)}`;

function flatten(obj: Record<string, unknown>, prefix = "", out: Record<string, string> = {}): Record<string, string> {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") flatten(v as Record<string, unknown>, key, out);
    else out[key] = String(v);
  }
  return out;
}
function setDeep(obj: Record<string, unknown>, key: string, value: string) {
  const parts = key.split(".");
  let cur: Record<string, unknown> = obj;
  for (const p of parts.slice(0, -1)) {
    if (!cur[p] || typeof cur[p] !== "object") cur[p] = {};
    cur = cur[p] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = value;
}
function placeholders(s: string): string[] {
  return (s.match(/\{\{[^}]+\}\}|<\/?[a-zA-Z0-9]+>/g) ?? []).sort();
}

let lastCall = 0;
let lastModel = "";
async function complete(input: Record<string, string>): Promise<Record<string, string>> {
  const wait = lastCall + PACE_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
  const user = `Translate every value. Input JSON:\n${JSON.stringify(input, null, 1)}`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const { text, model } = await completeJson(LOCALE, RULES, user, { maxTokens: 8000 });
    lastModel = model;
    try {
      const out = normalizeDeep(extractJson(text) as Record<string, string>);
      return LOCALE === "ckb" ? normalizeSoraniDeep(out) : out;
    } catch {
      console.warn(`  bad JSON from ${model}, retrying`);
    }
  }
  throw new Error("exhausted retries");
}

async function main() {
  console.log(`locale=${LOCALE} models=${modelChain(LOCALE).map((m) => m.id).join(" > ")} namespaces=${NS.join(",")}`);
  let translated = 0;
  let remaining = 0;
  for (const ns of NS) {
    const arPath = resolve(DIR, "ar", `${ns}.json`);
    const tgtPath = resolve(DIR, LOCALE, `${ns}.json`);
    if (!existsSync(arPath)) continue;
    const ar = flatten(JSON.parse(readFileSync(arPath, "utf8")));
    const target = existsSync(tgtPath) ? (JSON.parse(readFileSync(tgtPath, "utf8")) as Record<string, unknown>) : {};
    const have = flatten(target);
    const todo = Object.entries(ar).filter(([k, v]) => !(k in have) || !String(have[k]).trim() || (have[k] === v && /\p{Script=Arabic}/u.test(v)));
    console.log(`${ns}: ${todo.length} to translate (${Object.keys(ar).length} total)`);
    for (let i = 0; i < todo.length; i += BATCH) {
      const chunk = Object.fromEntries(todo.slice(i, i + BATCH));
      let out: Record<string, string> = {};
      try {
        out = await complete(chunk);
      } catch (err) {
        console.error(`  ✗ batch ${i / BATCH + 1}: ${(err as Error).message}`);
        remaining += Object.keys(chunk).length;
        continue;
      }
      let ok = 0;
      for (const [k, v] of Object.entries(chunk)) {
        const tr = out[k];
        if (typeof tr !== "string" || !tr.trim()) { remaining++; continue; }
        const a = placeholders(v).join("|");
        const b = placeholders(tr).join("|");
        if (a !== b) { remaining++; continue; } // placeholder drift: leave for the next pass
        setDeep(target, k, tr);
        ok++;
      }
      translated += ok;
      writeFileSync(tgtPath, JSON.stringify(target, null, 2) + "\n");
      console.log(`  ${ns} batch ${i / BATCH + 1}/${Math.ceil(todo.length / BATCH)}: ${ok}/${Object.keys(chunk).length} [${lastModel}]`);
    }
  }
  console.log(`\ndone: ${translated} translated, ${remaining} still missing (re-run to retry)`);
}
main().catch((e) => { console.error(e); process.exit(1); });
