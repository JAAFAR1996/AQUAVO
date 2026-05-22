import { Router, type Request, type Response, type NextFunction } from "express";
import { requireAdmin } from "../middleware/auth.js";
import {
  runFinanceAudit,
  getLastAuditResult,
} from "../services/groqFinanceAudit.js";
import { financeAuditStorage } from "../services/financeAuditStorage.js";

const router = Router();
router.use(requireAdmin);

function sanitize(v: unknown): unknown {
  return JSON.parse(JSON.stringify(v, (_k, val) => (typeof val === "bigint" ? Number(val) : val)));
}

// POST /api/admin/finance/audit/run
// Builds a finance snapshot, runs invariant checks, calls Groq, persists result.
// Read-only — never modifies accounting data.
router.post(
  "/audit/run",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (process.env.FINANCE_AI_AUDIT_ENABLED !== "true") {
        res.status(403).json({
          success: false,
          message:
            "تدقيق المحاسب الآلي معطّل. أضف FINANCE_AI_AUDIT_ENABLED=true إلى ملف .env لتفعيله.",
        });
        return;
      }

      if (process.env.FINANCE_AI_AUTO_FIX === "true") {
        console.warn(
          "[FinanceAudit] FINANCE_AI_AUTO_FIX=true is set but auto-fix is not implemented and never will be. Proceeding as read-only."
        );
      }

      const adminId = (req.session as { userId?: string }).userId ?? "manual";
      const result = await runFinanceAudit(adminId);

      res.json({ success: true, data: sanitize(result) });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/admin/finance/audit/latest
// Returns the most recent audit run from DB, falls back to in-memory cache.
router.get(
  "/audit/latest",
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Try DB first (survives server restarts)
      try {
        const dbResult = await financeAuditStorage.getLatestRun();
        if (dbResult) {
          res.json({ success: true, data: sanitize(dbResult), persistenceSource: "db" });
          return;
        }
      } catch {
        // DB not ready (tables not migrated yet) — fall through to in-memory
      }

      // Fallback: in-memory cache from this process lifetime
      const memResult = getLastAuditResult();
      res.json({
        success: true,
        data: memResult ? sanitize(memResult) : null,
        persistenceSource: memResult ? "memory" : null,
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/admin/finance/audit/history
// Returns the last 10 audit run summaries (no full snapshot) for the dashboard history list.
router.get(
  "/audit/history",
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const history = await financeAuditStorage.getHistory(10);
      res.json({ success: true, data: sanitize(history) });
    } catch (err) {
      next(err);
    }
  }
);

export function createFinanceAuditRouter() {
  return router;
}
