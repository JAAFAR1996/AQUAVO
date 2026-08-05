import { Router } from "express";

/**
 * Compatibility shim kept temporarily so older imports do not break while the
 * canonical Accounting V2 router owns `/v2/health` exclusively.
 *
 * Do not add routes here. `server/routes/accounting-v2.ts` is the single health
 * source of truth and verifies the complete P0 migration chain through 0070.
 */
export function createAccountingHealthV2Router() {
  return Router();
}
