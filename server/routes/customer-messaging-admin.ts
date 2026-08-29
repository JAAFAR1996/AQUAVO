import type { NextFunction, Request, Response, Router as RouterType } from "express";
import { Router } from "express";
import { sql } from "drizzle-orm";
import { requireAdmin } from "../middleware/auth.js";
import { getDb } from "../db.js";
import {
  canManuallyRetryDeliveryCare,
  dispatchDeliveryCareForOrder,
  prepareFailedDeliveryCareRetry,
  runDueDeliveryCareJobs,
  type CustomerMessageDispatchResult,
} from "../services/customer-messaging.js";

const META_MARKETING_LIMIT_CODE = "WHATSAPP_PROVIDER_FAILED_131049";

function rowsOf(result: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(result)) return result as Array<Record<string, unknown>>;
  const rows = (result as { rows?: Array<Record<string, unknown>> } | null)?.rows;
  return Array.isArray(rows) ? rows : [];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function metadataRecord(value: unknown): Record<string, unknown> {
  const direct = asRecord(value);
  if (direct) return direct;
  if (typeof value !== "string") return {};
  try {
    return asRecord(JSON.parse(value)) ?? {};
  } catch {
    return {};
  }
}

function sanitizeCustomerMessageMetadata(value: unknown): Record<string, unknown> | null {
  const root = metadataRecord(value);
  const reply = asRecord(root.delivery_care_reply);
  if (!reply) return null;

  const safeReply: Record<string, unknown> = {};
  const allowedStringFields = [
    "choice",
    "received_at",
    "auto_reply_status",
    "latest_choice",
    "latest_choice_at",
  ] as const;
  for (const field of allowedStringFields) {
    if (typeof reply[field] === "string" && String(reply[field]).trim()) {
      safeReply[field] = reply[field];
    }
  }
  if (Number.isFinite(Number(reply.auto_reply_attempts))) {
    safeReply.auto_reply_attempts = Math.max(0, Number(reply.auto_reply_attempts));
  }

  return Object.keys(safeReply).length > 0
    ? { delivery_care_reply: safeReply }
    : null;
}

function normalizeAdminDispatchResult(result: CustomerMessageDispatchResult) {
  if (
    result.errorCode === "WHATSAPP_ACCEPTED_PERSISTENCE_AMBIGUOUS"
    && result.providerMessageId
  ) {
    return {
      ...result,
      status: "sent" as const,
      trackingWarning: "WHATSAPP_ACCEPTANCE_NOT_DURABLY_RECORDED",
    };
  }
  return result;
}

export function createCustomerMessagingAdminRouter(): RouterType {
  const router = Router();
  router.use(requireAdmin);

  router.post(
    "/orders/:id/customer-messaging/delivery-care",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const db = getDb();
        if (!db) {
          res.status(503).json({ success: false, code: "DB_UNAVAILABLE" });
          return;
        }

        const orderId = String(req.params.id ?? "").trim();
        if (!orderId) {
          res.status(400).json({ success: false, code: "ORDER_ID_REQUIRED" });
          return;
        }

        const orderResult = await db.execute(sql`
          SELECT id,status
          FROM public.orders
          WHERE id=${orderId}
          LIMIT 1
        `);
        const order = rowsOf(orderResult)[0];
        if (!order) {
          res.status(404).json({ success: false, code: "ORDER_NOT_FOUND" });
          return;
        }
        if (String(order.status) !== "delivered") {
          res.status(409).json({ success: false, code: "ORDER_NOT_DELIVERED" });
          return;
        }

        const result = normalizeAdminDispatchResult(await dispatchDeliveryCareForOrder(orderId));
        res.status(200).json({ success: result.status === "sent", ...result });
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/customer-messaging/retry-due-care",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const limit = Number(req.body?.limit ?? 5);
        const result = await runDueDeliveryCareJobs(limit);
        res.json({ success: true, ...result });
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/customer-messaging/jobs/:id/retry",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const jobId = String(req.params.id ?? "").trim();
        if (!jobId) {
          res.status(400).json({ success: false, code: "JOB_ID_REQUIRED" });
          return;
        }

        const prepared = await prepareFailedDeliveryCareRetry(jobId);
        if (prepared.status === "db_unavailable") {
          res.status(503).json({ success: false, code: "DB_UNAVAILABLE" });
          return;
        }
        if (prepared.status === "not_found") {
          res.status(404).json({ success: false, code: "MESSAGE_JOB_NOT_FOUND" });
          return;
        }
        if (prepared.errorCode === META_MARKETING_LIMIT_CODE) {
          res.status(409).json({
            success: false,
            code: "MESSAGE_JOB_RETRY_DEFERRED_MARKETING_LIMIT",
            status: "unsafe_to_retry_now",
            errorCode: prepared.errorCode,
          });
          return;
        }
        if (prepared.status !== "ready" || !prepared.orderId) {
          const codeByStatus = {
            wrong_job_type: "MESSAGE_JOB_NOT_DELIVERY_CARE",
            not_failed: "MESSAGE_JOB_NOT_FAILED",
            order_not_delivered: "ORDER_NOT_DELIVERED",
            unsafe_to_retry: "MESSAGE_JOB_RETRY_UNSAFE",
            conflict: "MESSAGE_JOB_RETRY_CONFLICT",
          } as const;
          const code = codeByStatus[prepared.status as keyof typeof codeByStatus] ?? "MESSAGE_JOB_RETRY_REJECTED";
          res.status(409).json({
            success: false,
            code,
            status: prepared.status,
            errorCode: prepared.errorCode,
          });
          return;
        }

        const dispatch = normalizeAdminDispatchResult(
          await dispatchDeliveryCareForOrder(prepared.orderId),
        );
        res.status(200).json({
          success: dispatch.status === "sent" || dispatch.status === "retry_scheduled" || dispatch.status === "disabled",
          requeued: true,
          previousErrorCode: prepared.errorCode,
          ...dispatch,
        });
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/customer-messaging/jobs",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const db = getDb();
        if (!db) {
          res.status(503).json({ success: false, code: "DB_UNAVAILABLE" });
          return;
        }

        const orderId = typeof req.query.orderId === "string" ? req.query.orderId.trim() : "";
        const result = orderId
          ? await db.execute(sql`
              SELECT id,order_id,job_type,status,due_at,attempt_count,
                     provider_message_id,provider_status,provider_status_at,
                     last_error_code,last_error_at,accepted_at,cancelled_at,
                     metadata,created_at,updated_at
              FROM public.customer_message_jobs
              WHERE order_id=${orderId}
              ORDER BY created_at DESC
              LIMIT 50
            `)
          : await db.execute(sql`
              SELECT id,order_id,job_type,status,due_at,attempt_count,
                     provider_message_id,provider_status,provider_status_at,
                     last_error_code,last_error_at,accepted_at,cancelled_at,
                     metadata,created_at,updated_at
              FROM public.customer_message_jobs
              ORDER BY created_at DESC
              LIMIT 100
            `);

        const jobs = rowsOf(result).map((job) => {
          const errorCode = String(job.last_error_code ?? "");
          const marketingLimit = errorCode === META_MARKETING_LIMIT_CODE;
          const errorIsRetrySafe = !marketingLimit && canManuallyRetryDeliveryCare(job.last_error_code);
          const preAcceptanceFailure =
            String(job.status) === "failed"
            && job.provider_message_id == null
            && job.accepted_at == null;
          const confirmedProviderFailure =
            String(job.status) === "completed"
            && String(job.provider_status) === "failed"
            && job.provider_message_id != null
            && job.accepted_at != null
            && errorCode.startsWith("WHATSAPP_PROVIDER_FAILED_");

          return {
            ...job,
            metadata: sanitizeCustomerMessageMetadata(job.metadata),
            manualRetryAllowed: errorIsRetrySafe && (preAcceptanceFailure || confirmedProviderFailure),
          };
        });

        res.set("Cache-Control", "no-store, private");
        res.json({ success: true, jobs });
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}