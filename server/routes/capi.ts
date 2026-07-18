// FILE: server/routes/capi.ts
// Meta Conversions API — Server-side event forwarding to Meta Graph API
// Works alongside the browser Pixel for maximum data accuracy & retargeting reach

import { Router, Request, Response } from "express";
import crypto from "crypto";

const router = Router();

const PIXEL_ID = process.env.META_PIXEL_ID;
const ACCESS_TOKEN = process.env.META_CAPI_TOKEN;
const GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || "v21.0";
const TEST_CODE = process.env.META_TEST_EVENT_CODE; // Only for testing — remove in production

// ─── Hash helper (Meta requires SHA-256 for PII) ────────────────────────────
function hash(value: string): string {
  return crypto
    .createHash("sha256")
    .update(value.trim().toLowerCase())
    .digest("hex");
}

// ─── Normalize Iraqi phone number ────────────────────────────────────────────
function normalizeIraqiPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // 07XXXXXXXX → 9647XXXXXXXX (Meta's expected format)
  if (digits.startsWith("07")) return `964${digits.slice(1)}`;
  if (digits.startsWith("7")) return `964${digits}`;
  return digits;
}

// ─── GET /api/capi/status — safe env var presence check (no values exposed) ──
router.get("/status", (_req: Request, res: Response) => {
  res.json({
    pixelIdSet: !!PIXEL_ID,
    tokenSet: !!ACCESS_TOKEN,
    testCodeSet: !!TEST_CODE,
    graphApiVersion: GRAPH_API_VERSION,
    previewDisabled: process.env.VERCEL_ENV === "preview",
  });
});

// ─── POST /api/capi/event ─────────────────────────────────────────────────────
router.post("/event", async (req: Request, res: Response) => {
  if (process.env.VERCEL_ENV === "preview") {
    return res.json({ ok: true, skipped: true, reason: "preview" });
  }
  if (!PIXEL_ID || !ACCESS_TOKEN) {
    console.warn("[CAPI] META_PIXEL_ID or META_CAPI_TOKEN not configured — skipping");
    return res.json({ ok: true, skipped: true });
  }

  try {
    const {
      event_name,
      event_id,
      event_time,
      event_source_url,
      user_agent,
      fbc,
      fbp,
      phone,
      custom_data,
    } = (req.body ?? {}) as Record<string, unknown>;

    if (!event_name || !event_id) {
      return res.status(400).json({ ok: false, error: "event_name and event_id are required" });
    }

    const user_data: Record<string, string> = {};

    if (fbc) user_data.fbc = String(fbc);
    if (fbp) user_data.fbp = String(fbp);
    if (user_agent) user_data.client_user_agent = String(user_agent);

    if (phone) {
      user_data.ph = hash(normalizeIraqiPhone(String(phone)));
    }

    const ip =
      req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() ||
      req.socket.remoteAddress ||
      "";
    if (ip) user_data.client_ip_address = ip;

    const event: Record<string, unknown> = {
      event_name,
      event_id,
      event_time: event_time || Math.floor(Date.now() / 1000),
      event_source_url,
      action_source: "website",
      user_data,
    };

    if (custom_data) event.custom_data = custom_data;

    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${PIXEL_ID}/events`;

    const graphBody: Record<string, unknown> = {
      data: [event],
      access_token: ACCESS_TOKEN,
    };

    if (TEST_CODE) graphBody.test_event_code = TEST_CODE;

    const metaRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(graphBody),
    });

    const metaData = await metaRes.json() as Record<string, unknown>;

    if (!metaRes.ok) {
      const metaError = metaData.error && typeof metaData.error === "object"
        ? metaData.error as Record<string, unknown>
        : {};
      // Log identifiers only: never the response message, payload, token, phone, IP, or cookies.
      console.error("[CAPI] Meta API error", {
        status: metaRes.status,
        type: typeof metaError.type === "string" ? metaError.type : undefined,
        code: typeof metaError.code === "number" ? metaError.code : undefined,
        subcode: typeof metaError.error_subcode === "number" ? metaError.error_subcode : undefined,
      });
      return res.status(200).json({ ok: false, meta_status: metaRes.status });
    }

    return res.json({ ok: true, events_received: metaData.events_received });

  } catch (err) {
    console.error("[CAPI] Unexpected error:", err);
    return res.status(500).json({ ok: false });
  }
});

export function createCAPIRouter() {
  return router;
}

export default router;
