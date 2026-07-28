// Strict typecheck for the fulfillment route layer.
//
// tsc reports diagnostics for the WHOLE import graph, and `requireAdmin` transitively
// pulls in legacy modules that predate this work and still fail strict mode. This
// script runs tsc and fails ONLY on errors inside files this effort owns, while still
// printing the legacy errors so they stay visible rather than silently suppressed.
import { execFileSync } from "node:child_process";

const OWNED = [
  "server/routes/fulfillment-admin.ts",
  "server/services/fulfillment-",
  "server/services/material-cost-service.ts",
  "server/services/packaging-profile-service.ts",
  "server/services/accounting-engine.ts",
  "shared/schema.ts",
];

let output = "";
try {
  execFileSync("npx", ["tsc", "--noEmit", "-p", "tsconfig.accounting-routes.json"],
    { encoding: "utf8", stdio: "pipe", shell: process.platform === "win32" });
} catch (err) {
  output = `${err.stdout ?? ""}${err.stderr ?? ""}`;
}

const lines = output.split(/\r?\n/).filter((l) => /^\S.*\(\d+,\d+\): error/.test(l));
const owned = lines.filter((l) => OWNED.some((p) => l.replace(/\\/g, "/").startsWith(p)));
const legacy = lines.filter((l) => !owned.includes(l));

if (legacy.length) {
  console.log(`[check:accounting:routes] ${legacy.length} PRE-EXISTING strict errors in legacy modules (not owned by this effort):`);
  for (const l of [...new Set(legacy.map((l) => l.split("(")[0]))]) console.log(`  - ${l}`);
}

if (owned.length) {
  console.error(`\n[check:accounting:routes] FAIL — ${owned.length} error(s) in owned files:`);
  for (const l of owned) console.error(`  ${l}`);
  process.exit(1);
}
console.log("[check:accounting:routes] OK — no strict errors in owned files.");
