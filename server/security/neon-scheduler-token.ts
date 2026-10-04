import { createHash, timingSafeEqual } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb } from "../db.js";

type Row = Record<string, unknown>;

export type NeonSchedulerTokenVerification = {
  ok: boolean;
  reason: string;
};

function rowsOf(result: unknown): Row[] {
  if (Array.isArray(result)) return result as Row[];
  const rows=(result as { rows?: Row[] } | null)?.rows;
  return Array.isArray(rows) ? rows : [];
}

function digestToken(token: string): Buffer {
  return createHash("sha256").update(token,"utf8").digest();
}

/**
 * Verify the dedicated Neon Function scheduler bearer secret against a digest
 * stored in Postgres. The plaintext secret is never persisted or logged by AQUAVO.
 */
export async function verifyNeonSchedulerToken(
  token: string,
): Promise<NeonSchedulerTokenVerification> {
  const candidate=String(token ?? "").trim();
  if (!candidate || candidate.length > 512) return { ok:false,reason:"malformed_token" };

  const db=getDb();
  if (!db) return { ok:false,reason:"db_unavailable" };

  try {
    const result=await db.execute(sql`
      SELECT token_hash
      FROM public.customer_messaging_scheduler_auth
      WHERE id=1 AND enabled=true
      LIMIT 1
    `);
    const row=rowsOf(result)[0];
    const expectedHex=String(row?.token_hash ?? "").trim().toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(expectedHex)) return { ok:false,reason:"not_configured" };

    const candidateDigest=digestToken(candidate);
    const expectedDigest=Buffer.from(expectedHex,"hex");
    const ok=candidateDigest.length===expectedDigest.length
      && timingSafeEqual(candidateDigest,expectedDigest);
    return { ok,reason:ok ? "ok" : "invalid_token" };
  } catch {
    // Rolling deploys may briefly run before migration 0099 is present.
    return { ok:false,reason:"verification_failed" };
  }
}
