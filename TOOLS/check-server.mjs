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
import { resolve } from "node:path";

// Files whose strict typecheck this effort guarantees green. Widen as legacy
// files are cleaned up. Prefix match on the forward-slashed path.
const OWNED = [
  "server/services/accounting-auto-close-v2.ts",
  "server/services/financial-truth.ts",
  "shared/financial-truth.ts",
  "server/services/accounting-engine.ts",
  "server/services/business-intelligence.ts",
  "server/routes/accounting-v2.ts",
  "server/routes/accounting-packaging-canonical.ts",
  "server/services/dashboard-truth.ts",
  "server/services/authenticated-session.ts",
  "server/services/checkout-security.ts",
  "server/services/coupon-policy.ts",
  "server/services/oauth-policy.ts",
  "server/services/oauth-grant-store.ts",
  "server/session-store.ts",
  "server/routes/oauth.ts",
  "server/routes/users.ts",
  "server/routes/orders.ts",
  "server/routes/wayl.ts",
  "server/routes/coupons.ts",
  "server/middleware/accounting-auth-v2.ts",
  "server/services/product-cost-snapshot.ts",
  "shared/public-order.ts",
  "server/storage/invoice-storage.ts",
  // Commerce-critical paths: new strict errors here must block CI even while
  // unrelated legacy server debt is burned down incrementally.
  "server/routes.ts",
  "server/routes/products.ts",
  "server/routes/cart.ts",
  "server/storage/order-storage.ts",
  "server/storage/product-storage.ts",
  "server/services/wayl-order-payment.ts",
  "server/services/inventory-adjustment-service.ts",
  "shared/public-product.ts",
  // Audit repair boundaries: never rely on the production build's noCheck.
  "server/routes/admin-orders-v2.ts",
  "server/routes/admin-invoices.ts",
  "server/routes/ai.ts",
  "server/routes/ai-advanced.ts",
  "server/routes/ai-learnings.ts",
  "server/routes/capi.ts",
  "server/routes/expenses.ts",
  "server/routes/fish.ts",
  "server/routes/fish-patients.ts",
  "server/routes/gallery.ts",
  "server/routes/journey.ts",
  "server/routes/loyalty.ts",
  "server/routes/mcp.ts",
  "server/routes/reviews.ts",
  "server/routes/system.ts",
  "server/routes/upload.ts",
  "server/routes/accounting-evidence-upload-v2.ts",
  "server/routes/account-email-verification.ts",
  "server/routes/a2a.ts",
  "server/routes/agent-auth.ts",
  "server/routes/favorites.ts",
  "server/routes/packaging-admin.ts",
  "server/middleware/auth.ts",
  "server/middleware/error-handler.ts",
  "server/middleware/rate-limit.ts",
  "server/middleware/shared-rate-limit-store.ts",
  "server/middleware/accounting-document-upload.ts",
  "server/services/breeding-plan-email.ts",
  "server/services/account-email-verification.ts",
  "server/services/ai-tools.ts",
  "server/services/aquarium-advisor.ts",
  "server/services/smart-notifications.ts",
  "server/services/analytics-tracker.ts",
  "server/services/capi-purchase.ts",
  "server/services/diagnosis-review-policy.ts",
  "server/services/expense-creation.ts",
  "server/services/feedback-rag.ts",
  "server/services/gemini-ai.ts",
  "server/services/learning-policy.ts",
  "server/services/recommendation-engine.ts",
  "server/services/referral-purchase-reward.ts",
  "server/services/payment-maintenance.ts",
  "server/services/loyalty-notifications.ts",
  "server/services/visual-ai.ts",
  "server/storage/loyalty-storage.ts",
  "server/storage/referral-storage.ts",
  "server/storage/user-storage.ts",
  "server/storage/index.ts",
  "server/storage/winback-engine.ts",
  "server/utils/trusted-image-fetch.ts",
  "server/utils/review-input.ts",
  "server/utils/email.ts",
  "server/routes/early-access.ts",
  "shared/accounting.ts",
  "shared/schema.ts",
  "shared/checkout-quote.ts",
  "shared/home-product-selection.ts",
  "shared/user-address-input.ts",
  "shared/public-gallery.ts",
  "shared/purchase-event-policy.ts",
  "shared/ad-currency.ts",
  "shared/breeding-data.ts",
  "shared/products.ts",
  "api/_ssr-preview-source.ts",
  "api/product-ssr.ts",
  "api/sitemap-pages.ts",
  "api/sitemap-products.ts",
  "api/ssr-meta.ts",
];

let output = "";
let compilerFailed = false;
let compilerFailure = "";
try {
  execFileSync(process.execPath, [resolve("node_modules/typescript/bin/tsc"), "--noEmit", "-p", "tsconfig.server.check.json"],
    { encoding: "utf8", stdio: "pipe", shell: process.platform === "win32" });
} catch (err) {
  compilerFailed = true;
  compilerFailure = `${err.code ?? ""} ${err.signal ?? ""} ${err.message ?? "Compiler failed"}`;
  output = `${err.stdout ?? ""}${err.stderr ?? ""}`;
}

const lines = output.split(/\r?\n/).filter((l) => /^\S.*\(\d+,\d+\): error/.test(l));
// A missing compiler, invalid tsconfig or crashed process is a failed gate,
// never a clean typecheck merely because no file diagnostic was emitted.
if (compilerFailed && lines.length === 0) {
  console.error(`[check:server] Compiler did not complete successfully.\n${compilerFailure}\n${output}`);
  process.exit(1);
}
const owned = lines.filter((l) => OWNED.some((p) => l.replace(/\\/g, "/").startsWith(p)));
const legacy = lines.filter((l) => !owned.includes(l));

if (legacy.length) {
  const files = [...new Set(legacy.map((l) => l.split("(")[0].replace(/\\/g, "/")))];
  console.log(`[check:server] ${legacy.length} strict error(s) in ${files.length} module(s) outside this gate (not certified by this check):`);
  for (const f of files) console.log(`  - ${f}`);
}

if (owned.length) {
  console.error(`\n[check:server] FAIL — ${owned.length} error(s) in owned files:`);
  for (const l of owned) console.error(`  ${l}`);
  process.exit(1);
}
console.log("[check:server] OK — no strict errors in owned files.");
