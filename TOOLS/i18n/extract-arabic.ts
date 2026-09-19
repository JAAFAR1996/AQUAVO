/**
 * Codemod: move hard-coded Arabic copy out of React/TS source into the i18n
 * bundles and replace it with translation calls.
 *
 * It uses the TypeScript compiler API to find Arabic-bearing JSX text,
 * string literals and template literals, skips data/identity contexts
 * (object keys, comparisons, `.includes(...)`, element access, switch cases),
 * and rewrites the file surgically (byte-range replacements, no reformatting).
 *
 * - Inside a React component / hook: `t("file.n")` with
 *   `const { t } = useTranslation("<ns>")` inserted at the top of that
 *   component's body.
 * - Anywhere else (module constants, plain helpers, class components):
 *   `i18next.t("<ns>:file.n")`. This is safe because main.tsx loads the
 *   bundles of the URL locale before any application module is evaluated,
 *   and a language change is a full navigation.
 *
 * Extracted Arabic goes to client/src/locales/ar/<ns>.json under the key
 * `<fileSlug>.<n>`; TOOLS/i18n/translate-ui.ts fills en/ckb.
 *
 * Usage: node --import tsx TOOLS/i18n/extract-arabic.ts <file...> | --from-audit [--dry]
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import ts from "typescript";

const ARABIC = /\p{Script=Arabic}/u;
const DRY = process.argv.includes("--dry");
const FROM_AUDIT = process.argv.includes("--from-audit");
const LOCALES_DIR = resolve("client/src/locales");

// Files whose Arabic is data / identity, not copy. Handled by hand or left alone.
const SKIP_FILES = new Set([
  "client/src/lib/variant-dimensions.ts",
  "client/src/components/cart/checkout/types.ts",
  "client/src/components/products/category-scroll-bar.tsx",
  "client/src/components/products/product-variant-selector.tsx",
  "client/src/lib/site-search.ts",
  "client/src/lib/aquascape-data.ts",
  "client/src/components/journey/fish-species-data.ts",
  "client/src/data/blog-articles.ts",
  "client/src/data/breeding-data.ts",
]);

function namespaceFor(file: string): string {
  const f = file.replace(/\\/g, "/");
  if (/pages\/(guides-|beginner-guide|temperature-guide)/.test(f)) return "guides";
  if (/components\/(journey|fish|calculators|ai|chat|gallery|birthday|gamification|recommendations)\//.test(f)) return "tools";
  if (/pages\/(fish-|calculators|aquarium-wizard|journey|cultural-twin|ai-tools|community-gallery|compare|ai-driftwood)/.test(f)) return "tools";
  if (/components\/(profile|auth|wishlist|notifications)\//.test(f) || /pages\/(profile|login|register|forgot-password|wishlist|verify-certificate)/.test(f)) return "account";
  if (/pages\/(order-|invoice-view)/.test(f) || /components\/cart\/(invoice-dialog|checkout-dialog)/.test(f) || /lib\/(accountant-pdf|fulfillment-format|order-stash)/.test(f)) return "orders";
  if (/components\/search\//.test(f) || /pages\/search-results/.test(f)) return "search";
  if (/contexts\/|lib\/validations|lib\/api|lib\/queryClient|components\/ui\//.test(f)) return "common";
  return "pages";
}

function fileSlug(file: string): string {
  return basename(file).replace(/\.(tsx|ts)$/, "").replace(/[^a-zA-Z0-9]+/g, "-");
}

const SKIP_CALLEES = new Set(["includes", "startsWith", "endsWith", "match", "replace", "replaceAll", "split", "indexOf", "has", "get", "set", "delete", "test", "localeCompare", "RegExp", "querySelector", "querySelectorAll", "getElementById", "getItem", "setItem", "removeItem", "trim"]);

function isSkippedContext(node: ts.Node): boolean {
  const p = node.parent;
  if (!p) return true;
  if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p)) return true;
  if (ts.isPropertyAssignment(p) && p.name === node) return true; // object key
  if (ts.isElementAccessExpression(p) && p.argumentExpression === node) return true; // obj["الموديل"]
  if (ts.isBinaryExpression(p) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken].includes(p.operatorToken.kind)) return true;
  if (ts.isCaseClause(p)) return true;
  if (ts.isTypeNode(p) || ts.isLiteralTypeNode(p)) return true;
  if (ts.isCallExpression(p)) {
    const callee = p.expression;
    const name = ts.isPropertyAccessExpression(callee) ? callee.name.text : ts.isIdentifier(callee) ? callee.text : "";
    if (SKIP_CALLEES.has(name)) return true;
  }
  if (ts.isNewExpression(p) && ts.isIdentifier(p.expression) && p.expression.text === "RegExp") return true;
  // array of identity values used for .includes(...) checks: ["رمال","أحجار"].includes(x)
  if (ts.isArrayLiteralExpression(p) && p.parent && ts.isPropertyAccessExpression(p.parent) && SKIP_CALLEES.has(p.parent.name.text)) return true;
  // data-ish props: value=, key=, id=, name= on inputs, href=, src=
  if (ts.isJsxAttribute(p) && ["value", "key", "id", "name", "href", "src", "data-testid", "className", "style", "dir", "lang", "type", "autoComplete", "htmlFor"].includes((p.name as ts.Identifier).text ?? "")) return true;
  if (ts.isPropertyAssignment(p) && ["value", "key", "id", "slug", "path", "href", "url", "src", "className", "icon", "iconName", "color", "category", "categoryId", "field", "sortBy", "type"].includes(ts.isIdentifier(p.name) ? p.name.text : "")) {
    // `value:` and `type:` often carry copy (toast variant does not); keep skip conservative for identity-like keys only
    return true;
  }
  return false;
}

function isComponentLike(fn: ts.Node): boolean {
  if (ts.isFunctionDeclaration(fn) && fn.name) return /^[A-Z]|^use[A-Z]/.test(fn.name.text);
  if (ts.isFunctionExpression(fn) && fn.name && /^[A-Z]|^use[A-Z]/.test(fn.name.text)) return true;
  const p = fn.parent;
  if (p && ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) return /^[A-Z]|^use[A-Z]/.test(p.name.text);
  if (p && ts.isCallExpression(p) && ts.isIdentifier(p.expression) && ["memo", "forwardRef"].includes(p.expression.text)) return true;
  if (p && ts.isExportAssignment(p)) return true;
  return false;
}

function isFunctionLike(n: ts.Node): n is ts.FunctionLikeDeclaration {
  return ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n) || ts.isArrowFunction(n) || ts.isMethodDeclaration(n);
}

/** Outermost component/hook function that contains the node, or null. */
function enclosingComponent(node: ts.Node): ts.FunctionLikeDeclaration | null {
  let found: ts.FunctionLikeDeclaration | null = null;
  let cur: ts.Node | undefined = node.parent;
  while (cur) {
    if (isFunctionLike(cur) && isComponentLike(cur) && cur.body && ts.isBlock(cur.body)) found = cur;
    if (ts.isClassDeclaration(cur)) return null;
    cur = cur.parent;
  }
  return found;
}

interface Replacement { start: number; end: number; text: string }

function processFile(file: string, store: Map<string, Record<string, Record<string, string>>>): { changed: boolean; count: number } {
  const rel = file.replace(/\\/g, "/");
  if (SKIP_FILES.has(rel)) return { changed: false, count: 0 };
  const src = readFileSync(file, "utf8");
  if (!ARABIC.test(src)) return { changed: false, count: 0 };
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, rel.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const ns = namespaceFor(rel);
  const slug = fileSlug(rel);
  const bundle = store.get(ns) ?? {};
  store.set(ns, bundle);
  const entries = bundle[slug] ?? {};
  bundle[slug] = entries;
  let counter = Object.keys(entries).length;
  const replacements: Replacement[] = [];
  const hookTargets = new Set<ts.FunctionLikeDeclaration>();
  let usesI18next = false;
  const hasLocalT = /\b(const|let|var)\s+t\b|\bfunction t\b|\(\s*t\s*[,)]/.test(src);
  const tName = hasLocalT ? "tr" : "t";

  const keyFor = (text: string): string => {
    for (const [k, v] of Object.entries(entries)) if (v === text) return k;
    const key = `s${++counter}`;
    entries[key] = text;
    return key;
  };

  const emit = (node: ts.Node, text: string, params: string[] = [], jsxChild = false, jsxAttr = false) => {
    const key = keyFor(text);
    const comp = enclosingComponent(node);
    let call: string;
    const opts = params.length ? `, { ${params.map((p, i) => `v${i}: ${p}`).join(", ")} }` : "";
    if (comp) {
      hookTargets.add(comp);
      call = `${tName}("${slug}.${key}"${opts})`;
    } else {
      usesI18next = true;
      call = `i18next.t("${ns}:${slug}.${key}"${opts})`;
    }
    if (jsxChild || jsxAttr) call = `{${call}}`;
    return call;
  };

  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node)) {
      if (ARABIC.test(node.text)) {
        const raw = node.getText(sf);
        const lead = raw.match(/^\s*/)?.[0] ?? "";
        const trail = raw.match(/\s*$/)?.[0] ?? "";
        const inner = raw.slice(lead.length, raw.length - trail.length).replace(/\s+/g, " ");
        if (inner) replacements.push({ start: node.getStart(sf), end: node.getEnd(), text: `${lead}${emit(node, inner, [], true)}${trail}` });
      }
      return;
    }
    if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && ARABIC.test(node.text)) {
      if (isSkippedContext(node)) return;
      const p = node.parent;
      const inAttr = ts.isJsxAttribute(p);
      const inJsxExpr = ts.isJsxExpression(p);
      const text = node.text.replace(/\s+/g, " ").trim();
      let out = emit(node, text, [], false, inAttr);
      if (inJsxExpr) out = out; // {"..."} -> {t(...)}
      replacements.push({ start: node.getStart(sf), end: node.getEnd(), text: out });
      return;
    }
    if (ts.isTemplateExpression(node)) {
      const literalParts = [node.head.text, ...node.templateSpans.map((s) => s.literal.text)];
      if (literalParts.some((t) => ARABIC.test(t))) {
        if (isSkippedContext(node)) return;
        const params = node.templateSpans.map((s) => s.expression.getText(sf));
        let text = node.head.text;
        node.templateSpans.forEach((s, i) => { text += `{{v${i}}}` + s.literal.text; });
        const inAttr = ts.isJsxAttribute(node.parent);
        replacements.push({ start: node.getStart(sf), end: node.getEnd(), text: emit(node, text.replace(/\s+/g, " ").trim(), params, false, inAttr) });
        return;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  if (replacements.length === 0) return { changed: false, count: 0 };

  // Hook insertions at the start of each component body.
  for (const comp of hookTargets) {
    const body = comp.body as ts.Block;
    const bodyText = src.slice(body.getStart(sf), body.getEnd());
    const hasHook = /useTranslation\(/.test(bodyText);
    if (hasHook) {
      // Reuse the existing hook only if it declares the same namespace; otherwise add a second one.
      if (bodyText.includes(`useTranslation("${ns}")`)) continue;
      replacements.push({ start: body.getStart(sf) + 1, end: body.getStart(sf) + 1, text: `\n  const { t: ${tName} } = useTranslation("${ns}");` });
      continue;
    }
    replacements.push({ start: body.getStart(sf) + 1, end: body.getStart(sf) + 1, text: `\n  const { t${tName === "t" ? "" : `: ${tName}`} } = useTranslation("${ns}");` });
  }
  // Apply from the end so offsets stay valid.
  replacements.sort((a, b) => b.start - a.start || b.end - a.end);
  let out = src;
  for (const r of replacements) out = out.slice(0, r.start) + r.text + out.slice(r.end);
  // Imports.
  const imports: string[] = [];
  if (hookTargets.size && !/from "react-i18next"/.test(out)) imports.push(`import { useTranslation } from "react-i18next";`);
  if (usesI18next && !/import \{ i18next \} from "@\/i18n"/.test(out)) imports.push(`import { i18next } from "@/i18n";`);
  if (imports.length) {
    // Insert after the last import *statement* (multi-line imports included).
    const sf2 = ts.createSourceFile(file, out, ts.ScriptTarget.Latest, true, rel.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    let lastEnd = 0;
    for (const st of sf2.statements) if (ts.isImportDeclaration(st)) lastEnd = st.getEnd();
    const at = lastEnd ? out.indexOf("\n", lastEnd) + 1 : 0;
    out = out.slice(0, at) + imports.join("\n") + "\n" + out.slice(at);
  }
  if (!DRY) writeFileSync(file, out);
  return { changed: true, count: replacements.length - hookTargets.size };
}

function main() {
  let files = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  if (FROM_AUDIT) {
    const report = JSON.parse(readFileSync(resolve("reports/i18n/coverage-report.json"), "utf8")) as { classified: { D: Array<{ file: string }> } };
    files = report.classified.D.map((d) => d.file);
  }
  const store = new Map<string, Record<string, Record<string, string>>>();
  const ar = (ns: string) => resolve(LOCALES_DIR, "ar", `${ns}.json`);
  // Preload existing Arabic bundles so keys accumulate.
  for (const ns of ["guides", "tools", "account", "orders", "search", "common", "pages"]) {
    store.set(ns, existsSync(ar(ns)) ? (JSON.parse(readFileSync(ar(ns), "utf8")) as Record<string, Record<string, string>>) : {});
  }
  let total = 0;
  let changedFiles = 0;
  for (const file of files) {
    const { changed, count } = processFile(file, store);
    if (changed) { changedFiles++; total += count; console.log(`${count}\t${file}`); }
  }
  if (!DRY) {
    for (const [ns, bundle] of store) {
      writeFileSync(ar(ns), JSON.stringify(bundle, null, 2) + "\n");
      for (const locale of ["en", "ckb"]) {
        const p = resolve(LOCALES_DIR, locale, `${ns}.json`);
        if (!existsSync(p)) writeFileSync(p, "{}\n");
      }
    }
  }
  console.log(`\n${changedFiles} files, ${total} strings extracted${DRY ? " (dry run)" : ""}`);
}
main();
