import { Router, type Request, type Response, type NextFunction } from "express";
import { requireAdmin } from "../middleware/auth.js";
import {
  getLastResilientFinanceAuditResult,
  runResilientFinanceAudit,
} from "../services/groq-finance-audit-resilient.js";
import { financeAuditStorage } from "../services/financeAuditStorage.js";

const router = Router();
router.use(requireAdmin);

function sanitize(v: unknown): unknown {
  return JSON.parse(JSON.stringify(v, (_k, val) => (typeof val === "bigint" ? Number(val) : val)));
}

// POST /api/admin/finance/audit/run
// Builds the canonical finance snapshot, runs deterministic checks, then uses the
// resilient Groq layer. Read-only — never modifies accounting data.
router.post(
  "/audit/run",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (process.env.FINANCE_AI_AUDIT_ENABLED !== "true") {
        res.status(403).json({
          success: false,
          message:
            "تدقيق المحاسب الآلي معطّل. أضف FINANCE_AI_AUDIT_ENABLED=true إلى إعدادات الإنتاج لتفعيله.",
        });
        return;
      }

      if (process.env.FINANCE_AI_AUTO_FIX === "true") {
        console.warn(
          "[FinanceAudit] FINANCE_AI_AUTO_FIX=true is set but auto-fix is not implemented. Proceeding read-only.",
        );
      }

      const adminId = (req.session as { userId?: string }).userId ?? "manual";
      const result = await runResilientFinanceAudit(adminId);
      res.json({ success: !result.error, data: sanitize(result) });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/admin/finance/audit/latest
router.get(
  "/audit/latest",
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      try {
        const dbResult = await financeAuditStorage.getLatestRun();
        if (dbResult) {
          res.json({ success: true, data: sanitize(dbResult), persistenceSource: "db" });
          return;
        }
      } catch {
        // Fall back to the current process cache if persistence is temporarily unavailable.
      }

      const memResult = getLastResilientFinanceAuditResult();
      res.json({
        success: true,
        data: memResult ? sanitize(memResult) : null,
        persistenceSource: memResult ? "memory" : null,
      });
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  "/audit/history",
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const history = await financeAuditStorage.getHistory(10);
      res.json({ success: true, data: sanitize(history) });
    } catch (err) {
      next(err);
    }
  },
);

export function createFinanceAuditRouter() {
  return router;
}
