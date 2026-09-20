#!/usr/bin/env node
// Apply a native Sorani reviewer's answers to the glossary, deterministically.
//
// This is the last mile of the CKB release: once a native speaker fills in
// reports/i18n/ckb-native-final-answers.json, the remaining terminology work is
// this one command rather than another review cycle.
//
// WHAT IT REFUSES TO DO
//   * run without a named reviewer and a review date — nothing here may be
//     marked human-reviewed on the strength of a model's opinion
//   * accept an unknown decision id, or silently skip a known one
//   * accept a choice that is not A / B / other / unknown
//   * accept "other" with no custom wording, or a choice pointing at an empty option
//   * write anything in dry-run (the default)
//
// Unanswered and "unknown" decisions stay open and are reported, so a partial
// review is useful rather than all-or-nothing.
//
//   node TOOLS/i18n/apply-ckb-native-final.mjs            # dry run
//   node TOOLS/i18n/apply-ckb-native-final.mjs --commit
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const COMMIT = process.argv.includes("--commit");
const ROOT = process.cwd();
const ANSWERS = path.join(ROOT, "reports/i18n/ckb-native-final-answers.json");
const GLOSSARY = path.join(ROOT, "shared/i18n/glossary.json");

/**
 * decision id → how the accepted wording lands in the glossary.
 *   termId   the glossary term to update (null = no glossary term yet; recorded
 *            under $nativeDecisions so the answer is not lost)
 *   split    for answers that carry two forms separated by " | "
 */
const TARGETS = {
  D01: { termId: null, label: "heater (aquarium)" },
  D02: { termId: null, label: "thermostat" },
  D03: { termId: null, label: "aeration" },
  D04: { termId: null, label: "mechanical / biological filtration", split: true },
  D05: { termId: null, label: "chloramine" },
  D06: { termId: "water-conditioner", label: "dechlorinator / water conditioner" },
  D07: { termId: null, label: "beneficial bacteria" },
  D08: { termId: null, label: "aquarium cycling" },
  D09: { termId: "algae", label: "algae" },
  D10: { termId: "livebearers", label: "livebearers" },
  D11: { termId: null, label: "dose / dosing" },
  D12: { termId: null, label: "fish gills" },
  // "ئاست | بەرزکردنەوەی ئاست" is the tier noun and the upgrade verb phrase.
  D13: { termId: "upgrade-tier", label: "loyalty tier", split: true },
  D14: { termId: "customer-credit", label: "customer credit" },
  D15: { termId: "force-majeure", label: "force majeure" },
  D16: { termId: "discount", label: "discount" },
  D17: { termId: "invoice", label: "invoice" },
  D18: { termId: "thermometer", label: "temperature vs thermometer", split: true },
};

// ── load and validate ────────────────────────────────────────────────────────
if (!fs.existsSync(ANSWERS)) {
  console.error(`No answer file at ${path.relative(ROOT, ANSWERS)}.`);
  process.exit(2);
}
const doc = JSON.parse(fs.readFileSync(ANSWERS, "utf8"));
const answers = doc.answers ?? {};

const reviewer = (doc.reviewer?.name ?? "").trim();
const reviewedAt = (doc.reviewedAt ?? "").trim();
if (!reviewer || !reviewedAt) {
  console.error("\nRefusing to run: reviewer.name and reviewedAt must both be filled in.");
  console.error("These answers become human-reviewed terminology. A model's opinion is not");
  console.error("a native review, and this file is the only place that distinction is recorded.\n");
  process.exit(2);
}

const expected = Object.keys(TARGETS);
const got = Object.keys(answers);
const unknown = got.filter((k) => !expected.includes(k));
const missing = expected.filter((k) => !got.includes(k));
if (unknown.length) { console.error(`Unknown decision id(s): ${unknown.join(", ")}`); process.exit(2); }
if (missing.length) { console.error(`Answer file is missing decision id(s): ${missing.join(", ")}`); process.exit(2); }

const resolved = [];
const open = [];
for (const id of expected) {
  const a = answers[id];
  const choice = (a.choice ?? "").trim();
  if (choice === "" || choice === "unknown") { open.push({ id, label: TARGETS[id].label }); continue; }
  if (!["A", "B", "other"].includes(choice)) {
    console.error(`${id}: choice must be "A", "B", "other" or "unknown" — got ${JSON.stringify(choice)}`);
    process.exit(2);
  }
  const value = choice === "other" ? (a.custom ?? "").trim() : (a[choice] ?? "").trim();
  if (!value) {
    console.error(`${id}: choice "${choice}" resolves to an empty value. Fill in ${choice === "other" ? '"custom"' : `"${choice}"`}.`);
    process.exit(2);
  }
  resolved.push({ id, choice, value, ...TARGETS[id] });
}

console.log(`Reviewer : ${reviewer}${doc.reviewer?.dialectRegion ? ` (${doc.reviewer.dialectRegion})` : ""}`);
console.log(`Reviewed : ${reviewedAt}`);
console.log(`Decisions: ${resolved.length} answered, ${open.length} still open\n`);

// ── apply ────────────────────────────────────────────────────────────────────
const glossary = JSON.parse(fs.readFileSync(GLOSSARY, "utf8"));
glossary.$nativeDecisions ??= {};
let glossaryChanges = 0;

for (const r of resolved) {
  const forms = r.split ? r.value.split("|").map((s) => s.trim()).filter(Boolean) : [r.value];
  const primary = forms[0];

  glossary.$nativeDecisions[r.id] = {
    label: r.label,
    value: r.value,
    choice: r.choice,
    reviewer,
    reviewedAt,
  };

  if (r.termId) {
    const term = glossary.terms.find((t) => t.id === r.termId);
    if (!term) {
      console.log(`  · ${r.id} ${r.label}: no glossary term "${r.termId}" — recorded only`);
      continue;
    }
    if (term.ckb === primary) { console.log(`  = ${r.id} ${r.label}: already "${primary}"`); continue; }
    // The form the reviewer did not pick stays as an accepted alternate rather
    // than being deleted: it is attested somewhere in the corpus, and demoting
    // it keeps the validator from flagging existing good strings.
    const demoted = [term.ckb, ...forms.slice(1)].filter((v) => v && v !== primary);
    term.ckbAlt = [...new Set([...(term.ckbAlt ?? []), ...demoted])].filter((v) => v !== primary);
    term.ckb = primary;
    term.nativeReviewed = { reviewer, reviewedAt, decision: r.id };
    delete term.needsNativeReview;
    glossaryChanges++;
    console.log(`  → ${r.id} ${r.label}: ckb = "${primary}"`);
  } else {
    console.log(`  + ${r.id} ${r.label}: "${primary}" recorded (no glossary term yet)`);
  }
}

if (open.length) {
  console.log(`\nStill open (left untouched):`);
  for (const o of open) console.log(`  ? ${o.id} ${o.label}`);
}

// Keep $unresolved honest: drop anything the reviewer has now answered.
if (glossary.$unresolved?.terms) {
  const answeredLabels = new Set(resolved.map((r) => r.label));
  const before = glossary.$unresolved.terms.length;
  glossary.$unresolved.terms = glossary.$unresolved.terms.filter((t) => !answeredLabels.has(t));
  const dropped = before - glossary.$unresolved.terms.length;
  if (dropped) console.log(`\n${dropped} term(s) removed from $unresolved.`);
}

if (!COMMIT) {
  console.log(`\nDRY RUN — ${glossaryChanges} glossary term(s) would change. Nothing written.`);
  console.log("Re-run with --commit to apply.");
  process.exit(0);
}

fs.writeFileSync(GLOSSARY, `${JSON.stringify(glossary, null, 2)}\n`);
console.log(`\nwrote shared/i18n/glossary.json (${glossaryChanges} term(s) changed)`);

console.log("\nRe-running the translation validator…\n");
try {
  const out = execFileSync("node", ["--import", "tsx", "TOOLS/i18n/validate-translations.ts", "--scope=all"], {
    cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"],
  });
  console.log(out.trim().split("\n").slice(-6).join("\n"));
} catch (err) {
  console.error("Validator failed — review the output above before committing.");
  process.exit(1);
}

console.log("\nNext: the corpus strings themselves still need the chosen forms applied.");
console.log("Run TOOLS/i18n/apply-ckb-corrections.mjs after adding the accepted");
console.log("token swaps, then re-run the full gate set.");
