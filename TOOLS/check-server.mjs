// Authoritative server typecheck gate.
//
// `tsconfig.server.json` sets "noCheck": true, so `npm run build` never actually
// typechecks server code — ~300 pre-existing strict errors in legacy service /
// route modules would otherwise block every build. `tsconfig.server.check.json`
// turns checking back on over the same graph; this script runs it and FAILS only
// on errors inside files this effort owns, while still PRINTING the legacy set so
// the debt stays visible and can be burned down file-by-file by widening OWNED.
//
// Same pattern as TOOLS/check-accounting-routes.mjs.
import { execFileSync } from "node:child_process";

// Files whose strict typecheck this effort guarantees green. Widen as legacy
// files are cleaned up. Prefix match on the forward-slashed path.
const OWNED = [
  "server/storage/invoice-storage.ts",
];

let output = "";
try {
  execFileSync("npx", ["tsc", "--noEmit", "-p", "tsconfig.server.check.json"],
    { encoding: "utf8", stdio: "pipe", shell: process.platform === "win32" });
} catch (err) {
  output = `${err.stdout ?? ""}${err.stderr ?? ""}`;
}

const lines = output.split(/\r?\n/).filter((l) => /^\S.*\(\d+,\d+\): error/.test(l));
const owned = lines.filter((l) => OWNED.some((p) => l.replace(/\\/g, "/").startsWith(p)));
const legacy = lines.filter((l) => !owned.includes(l));

if (legacy.length) {
  const files = [...new Set(legacy.map((l) => l.split("(")[0].replace(/\\/g, "/")))];
  console.log(`[check:server] ${legacy.length} PRE-EXISTING strict error(s) in ${files.length} legacy module(s) (not owned by this gate):`);
  for (const f of files) console.log(`  - ${f}`);
}

if (owned.length) {
  console.error(`\n[check:server] FAIL — ${owned.length} error(s) in owned files:`);
  for (const l of owned) console.error(`  ${l}`);
  process.exit(1);
}
console.log("[check:server] OK — no strict errors in owned files.");
