/**
 * Shared LLM access for the translation tools.
 *
 * - One ordered chain of models per locale (override with AQUAVO_TRANSLATE_MODELS,
 *   a comma list of "groq:<model>" / "gemini:<model>"). A model that answers
 *   429 / 5xx / empty is cooled down and the next one is tried; when every
 *   model is cooling, the caller waits for the earliest one.
 * - Only models that produced acceptable Sorani in review are listed for ckb.
 *   groq/compound-mini and qwen/qwen3.8-27b are excluded on purpose.
 * - Output normalisation: Arabic-Indic and Persian digits become ASCII digits
 *   and "٪" becomes "%", because the storefront renders Latin digits in every
 *   locale and the technical-token validator compares numbers exactly.
 * - Glossary: rendered from shared/i18n/glossary.json so every prompt uses the
 *   same term for the same concept.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export type TargetLocale = "en" | "ckb";
export interface ModelSpec { provider: "groq" | "gemini"; model: string; id: string }

const DEFAULT_CHAIN: Record<TargetLocale, string[]> = {
  en: ["groq:openai/gpt-oss-20b", "gemini:gemini-2.5-flash-lite", "gemini:gemini-2.5-flash", "groq:openai/gpt-oss-120b"],
  ckb: ["gemini:gemini-2.5-flash", "groq:openai/gpt-oss-120b", "gemini:gemini-2.5-flash-lite"],
};

export function modelChain(locale: TargetLocale): ModelSpec[] {
  const raw = process.env.AQUAVO_TRANSLATE_MODELS || process.env.AQUAVO_TRANSLATE_MODEL;
  const list = raw ? raw.split(",").map((s) => s.trim()).filter(Boolean) : DEFAULT_CHAIN[locale];
  return list.map((id) => {
    const [provider, ...rest] = id.includes(":") ? id.split(":") : [id.startsWith("gemini") ? "gemini" : "groq", id];
    return { provider: provider as ModelSpec["provider"], model: rest.join(":"), id: `${provider}:${rest.join(":")}` };
  });
}

// ── Glossary ─────────────────────────────────────────────────────────────────
interface GlossaryTerm { id: string; ar: string[]; en: string; ckb: string; ckbAlt?: string[] }
interface Glossary { terms: GlossaryTerm[]; styleExamples: Array<{ ar: string; en: string; ckb: string }> }
let glossaryCache: Glossary | null = null;
export function loadGlossary(): Glossary {
  if (!glossaryCache) glossaryCache = JSON.parse(readFileSync(resolve("shared/i18n/glossary.json"), "utf8")) as Glossary;
  return glossaryCache;
}
export function renderGlossary(locale: TargetLocale): string {
  const g = loadGlossary();
  const lines = g.terms.map((t) => `- ${t.ar[0]} -> ${t[locale]}`);
  const examples = g.styleExamples.map((e) => `Arabic: "${e.ar}"\n${locale === "en" ? "English" : "Sorani"}: "${e[locale]}"`).join("\n");
  return `Glossary (Arabic -> ${locale === "en" ? "English" : "Central Kurdish / Sorani"}). Use these terms consistently:\n${lines.join("\n")}\n\nStyle examples (natural, not a word-for-word calque):\n${examples}\n`;
}

// ── Digit normalisation ──────────────────────────────────────────────────────
const DIGIT_MAP: Record<string, string> = {};
for (let i = 0; i < 10; i++) {
  DIGIT_MAP[String.fromCharCode(0x0660 + i)] = String(i); // Arabic-Indic
  DIGIT_MAP[String.fromCharCode(0x06f0 + i)] = String(i); // Extended Arabic-Indic (Persian/Kurdish)
}
export function normalizeDigits(s: string): string {
  return s.replace(/[٠-٩۰-۹]/g, (d) => DIGIT_MAP[d]).replace(/٪/g, "%").replace(/٫/g, ".").replace(/٬/g, ",");
}
export function normalizeDeep<T>(value: T): T {
  if (typeof value === "string") return normalizeDigits(value) as unknown as T;
  if (Array.isArray(value)) return value.map(normalizeDeep) as unknown as T;
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, normalizeDeep(v)])) as T;
  return value;
}

// ── Providers ────────────────────────────────────────────────────────────────
class Retryable extends Error {
  constructor(message: string, public waitMs: number) { super(message); }
}

function hintedWait(body: string, fallbackMs: number): number {
  const m = /try again in ([0-9.]+)\s*(m|s)/i.exec(body) || /retry in ([0-9.]+)\s*(m|s)/i.exec(body);
  if (!m) return fallbackMs;
  const n = parseFloat(m[1]);
  return Math.ceil((m[2].toLowerCase() === "m" ? n * 60 : n) * 1000) + 1000;
}

async function groqComplete(model: string, system: string, user: string, maxTokens: number): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY missing");
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: maxTokens,
      reasoning_effort: "low",
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }),
  });
  const text = await res.text();
  if (res.status === 429 || res.status >= 500) throw new Retryable(`groq ${res.status}: ${text.slice(0, 120)}`, hintedWait(text, res.status === 429 ? 5 * 60_000 : 20_000));
  if (!res.ok) throw new Error(`groq ${res.status}: ${text.slice(0, 200)}`);
  const json = JSON.parse(text) as { choices: Array<{ message: { content: string } }> };
  return json.choices[0]?.message?.content ?? "";
}

async function geminiComplete(model: string, system: string, user: string, maxTokens: number): Promise<string> {
  const key = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GOOGLE_AI_API_KEY missing");
  const thinking = model.includes("flash-lite") ? {} : { thinkingConfig: { thinkingBudget: 1024 } };
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: maxTokens, responseMimeType: "application/json", ...thinking },
    }),
  });
  const text = await res.text();
  if (res.status === 429 || res.status === 503 || res.status >= 500) throw new Retryable(`gemini ${res.status}: ${text.slice(0, 120).replace(/\s+/g, " ")}`, hintedWait(text, res.status === 429 ? 60_000 : 20_000));
  if (!res.ok) throw new Error(`gemini ${res.status}: ${text.slice(0, 200).replace(/\s+/g, " ")}`);
  const json = JSON.parse(text) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }> };
  const out = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (json.candidates?.[0]?.finishReason === "MAX_TOKENS") throw new Error("gemini: output truncated (MAX_TOKENS)");
  return out;
}

// ── Chain with cooldowns ─────────────────────────────────────────────────────
const cooldownUntil = new Map<string, number>();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface CompletionResult { text: string; model: string }

/**
 * Ask the first available model in the chain; on rate limits move down the
 * chain, cooling the limited model for the hinted duration. Throws only on
 * non-retryable errors from every model.
 */
export async function completeJson(locale: TargetLocale, system: string, user: string, opts: { maxTokens?: number; log?: (m: string) => void } = {}): Promise<CompletionResult> {
  const chain = modelChain(locale);
  const maxTokens = opts.maxTokens ?? 8000;
  const log = opts.log ?? ((m: string) => console.warn(`  ${m}`));
  for (let round = 0; round < 6; round++) {
    let earliest = Infinity;
    for (const spec of chain) {
      const until = cooldownUntil.get(spec.id) ?? 0;
      if (until > Date.now()) { earliest = Math.min(earliest, until); continue; }
      try {
        const text = spec.provider === "groq"
          ? await groqComplete(spec.model, system, user, maxTokens)
          : await geminiComplete(spec.model, system, user, maxTokens);
        if (!text.trim()) throw new Retryable(`${spec.id}: empty output`, 15_000);
        return { text, model: spec.id };
      } catch (err) {
        if (err instanceof Retryable) {
          cooldownUntil.set(spec.id, Date.now() + err.waitMs);
          log(`${err.message} -> cooling ${spec.id} ${Math.round(err.waitMs / 1000)}s`);
          earliest = Math.min(earliest, Date.now() + err.waitMs);
          continue;
        }
        log(`${spec.id}: ${(err as Error).message.slice(0, 160)} -> next model`);
      }
    }
    if (earliest === Infinity) break;
    const wait = Math.max(1000, earliest - Date.now());
    log(`all models cooling; waiting ${Math.round(wait / 1000)}s`);
    await sleep(wait);
  }
  throw new Error("no model produced output");
}

/** Extract the first JSON object from a model reply (tolerates fences / prose). */
export function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("no JSON object in reply");
  return JSON.parse(text.slice(start, end + 1));
}

/**
 * Sorani orthography: Arabic kaf (ك U+0643) and yeh (ي U+064A / ى U+0649)
 * are never used in Central Kurdish; the Kurdish keheh (ک U+06A9) and farsi
 * yeh (ی U+06CC) are. Models trained mostly on Arabic slip these in.
 */
export function normalizeSorani(s: string): string {
  return s.replace(/ك/g, "ک").replace(/[يى]/g, "ی");
}
export function normalizeSoraniDeep<T>(value: T): T {
  if (typeof value === "string") return normalizeSorani(value) as unknown as T;
  if (Array.isArray(value)) return value.map(normalizeSoraniDeep) as unknown as T;
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, normalizeSoraniDeep(v)])) as T;
  return value;
}
