import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("drizzle-orm", () => ({
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
    __text: Array.from(strings).join("?"),
    __values: values,
  }),
}));

vi.mock("../db.js", () => ({
  getDb: vi.fn(),
  db: null,
}));

vi.mock("../services/customer-messaging.js", () => ({
  normalizeIraqiWhatsAppPhone: (value: unknown): string | null => {
    let digits = String(value ?? "").replace(/\D/g, "");
    if (digits.startsWith("00964")) digits = digits.slice(2);
    if (digits.startsWith("9640")) digits = `964${digits.slice(4)}`;
    if (digits.startsWith("0") && digits.length === 11) digits = `964${digits.slice(1)}`;
    if (digits.startsWith("7") && digits.length === 10) digits = `964${digits}`;
    return /^9647\d{9}$/.test(digits) ? digits : null;
  },
}));

import { getDb } from "../db.js";
import {
  handleDeliveryCareButtonReply,
  runPendingDeliveryCareAutoReplies,
  type DeliveryCareButtonReplyEvent,
} from "../services/whatsapp-delivery-care-replies.js";

type ReplyMetadata = Record<string, unknown>;

type FakeState = {
  job: {
    id: string;
    order_id: string;
    provider_message_id: string;
    status: string;
    customer_phone: string;
    metadata: {
      delivery_care_reply?: ReplyMetadata;
    };
  };
};

function queryParts(query: unknown): { text: string; values: unknown[] } {
  const record = query as { __text?: string; __values?: unknown[] };
  return {
    text: String(record.__text ?? "").replace(/\s+/g, " ").trim(),
    values: Array.isArray(record.__values) ? record.__values : [],
  };
}

function replyStatus(state: FakeState): string {
  return String(state.job.metadata.delivery_care_reply?.auto_reply_status ?? "");
}

function createFakeDb(state: FakeState) {
  return {
    execute: vi.fn(async (query: unknown) => {
      const { text, values } = queryParts(query);
      const reply = state.job.metadata.delivery_care_reply;

      if (text.includes("SELECT job.id") && text.includes("WHERE job.provider_message_id=")) {
        const providerMessageId = String(values[0] ?? "");
        if (providerMessageId !== state.job.provider_message_id || state.job.status !== "completed") return [];
        return [{
          id: state.job.id,
          order_id: state.job.order_id,
          metadata: state.job.metadata,
          customer_phone: state.job.customer_phone,
        }];
      }

      if (text.includes("NOT (COALESCE(metadata, '{}'::jsonb) ? 'delivery_care_reply')")) {
        if (state.job.metadata.delivery_care_reply) return [];
        state.job.metadata.delivery_care_reply = {
          inbound_message_id: String(values[0] ?? ""),
          context_provider_message_id: String(values[1] ?? ""),
          choice: String(values[2] ?? ""),
          button_payload: String(values[3] ?? ""),
          button_text: String(values[4] ?? ""),
          received_at: values[5] instanceof Date ? values[5].toISOString() : String(values[5] ?? ""),
          auto_reply_status: "processing",
          auto_reply_attempts: 1,
          auto_reply_processing_at: new Date().toISOString(),
        };
        return [{ id: state.job.id }];
      }

      if (text.includes("WHATSAPP_REPLY_STALE_PROCESSING_AMBIGUOUS")) {
        const current = state.job.metadata.delivery_care_reply;
        const processingAt = new Date(String(current?.auto_reply_processing_at ?? ""));
        if (
          current?.auto_reply_status === "processing"
          && Number.isFinite(processingAt.getTime())
          && processingAt.getTime() <= Date.now() - (10 * 60_000)
        ) {
          Object.assign(current, {
            auto_reply_status: "ambiguous",
            auto_reply_error_code: "WHATSAPP_REPLY_STALE_PROCESSING_AMBIGUOUS",
            auto_reply_processing_at: null,
            auto_reply_finished_at: new Date().toISOString(),
          });
          return [{ id: state.job.id }];
        }
        return [];
      }

      if (text.includes("auto_reply_status'='disabled'") && text.includes("RETURNING id")) {
        const current = state.job.metadata.delivery_care_reply;
        if (current?.auto_reply_status !== "disabled") return [];
        Object.assign(current, {
          auto_reply_status: "processing",
          auto_reply_attempts: Number(values[0] ?? 1),
          auto_reply_error_code: null,
          auto_reply_processing_at: new Date().toISOString(),
          auto_reply_retry_at: null,
        });
        return [{ id: state.job.id }];
      }

      if (text.includes("auto_reply_status'='retryable_failed'") && text.includes("RETURNING id")) {
        const current = state.job.metadata.delivery_care_reply;
        if (current?.auto_reply_status !== "retryable_failed") return [];
        const retryAt = new Date(String(current.auto_reply_retry_at ?? ""));
        if (String(current.auto_reply_retry_at ?? "") && retryAt.getTime() > Date.now()) return [];
        Object.assign(current, {
          auto_reply_status: "processing",
          auto_reply_attempts: Number(values[0] ?? 1),
          auto_reply_error_code: null,
          auto_reply_processing_at: new Date().toISOString(),
          auto_reply_retry_at: null,
        });
        return [{ id: state.job.id }];
      }

      if (text.includes("IN ('disabled', 'retryable_failed')") && text.includes("ORDER BY job.updated_at")) {
        const current = state.job.metadata.delivery_care_reply;
        if (!current) return [];
        const status = String(current.auto_reply_status ?? "");
        if (status !== "disabled" && status !== "retryable_failed") return [];
        if (status === "retryable_failed") {
          const attempts = Number(current.auto_reply_attempts ?? 0);
          const retryAt = new Date(String(current.auto_reply_retry_at ?? ""));
          if (attempts >= 3) return [];
          if (String(current.auto_reply_retry_at ?? "") && retryAt.getTime() > Date.now()) return [];
        }
        return [{
          id: state.job.id,
          metadata: state.job.metadata,
          customer_phone: state.job.customer_phone,
        }];
      }

      if (
        text.includes("COALESCE(metadata->'delivery_care_reply', '{}'::jsonb) ||")
        && text.includes("WHERE id=")
        && !text.includes("RETURNING id")
      ) {
        const patch = JSON.parse(String(values[0] ?? "{}")) as ReplyMetadata;
        state.job.metadata.delivery_care_reply ??= {};
        Object.assign(state.job.metadata.delivery_care_reply, patch);
        return [];
      }

      throw new Error(`Unexpected fake DB query: ${text}`);
    }),
  };
}

function makeState(): FakeState {
  return {
    job: {
      id: "job-1",
      order_id: "order-1",
      provider_message_id: "wamid.delivery-care",
      status: "completed",
      customer_phone: "9647721310937",
      metadata: {},
    },
  };
}

function makeEvent(overrides: Partial<DeliveryCareButtonReplyEvent> = {}): DeliveryCareButtonReplyEvent {
  return {
    inboundMessageId: "wamid.customer-button",
    contextProviderMessageId: "wamid.delivery-care",
    fromPhone: "9647721310937",
    receivedAt: new Date("2026-08-19T10:00:00.000Z"),
    payload: "aquavo_delivery_ok_v1",
    buttonText: "وصلتني وكلشي تمام",
    ...overrides,
  };
}

function enableCloud(): void {
  process.env.WHATSAPP_CLOUD_ENABLED = "true";
  process.env.WHATSAPP_API_VERSION = "v25.0";
  process.env.WHATSAPP_PHONE_NUMBER_ID = "1014828128375442";
  process.env.WHATSAPP_ACCESS_TOKEN = "test-system-user-token";
}

function successfulMetaResponse(id = "wamid.auto-reply") {
  return {
    ok: true,
    status: 200,
    json: vi.fn(async () => ({ messages: [{ id }] })),
  } as unknown as Response;
}

function rejectedMetaResponse(status = 500, code = 131000) {
  return {
    ok: false,
    status,
    json: vi.fn(async () => ({ error: { code } })),
  } as unknown as Response;
}

describe("delivery-care Quick Reply runtime safety", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WHATSAPP_CLOUD_ENABLED = "false";
    delete process.env.WHATSAPP_API_VERSION;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    delete process.env.WHATSAPP_ACCESS_TOKEN;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.WHATSAPP_CLOUD_ENABLED;
    delete process.env.WHATSAPP_API_VERSION;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    delete process.env.WHATSAPP_ACCESS_TOKEN;
  });

  it("durably defers a button reply while sending is disabled and resumes it after enablement", async () => {
    const state = makeState();
    (getDb as any).mockReturnValue(createFakeDb(state));
    const fetchMock = vi.fn(async () => successfulMetaResponse());
    vi.stubGlobal("fetch", fetchMock);

    const first = await handleDeliveryCareButtonReply(makeEvent());
    expect(first.status).toBe("disabled");
    expect(replyStatus(state)).toBe("disabled");
    expect(fetchMock).not.toHaveBeenCalled();

    enableCloud();
    const recovered = await runPendingDeliveryCareAutoReplies(5);

    expect(recovered.replied).toBe(1);
    expect(recovered.processed).toBe(1);
    expect(replyStatus(state)).toBe("sent");
    expect(state.job.metadata.delivery_care_reply?.auto_reply_attempts).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("backs off explicit 5xx failures and lets the worker retry the same callback safely", async () => {
    const state = makeState();
    (getDb as any).mockReturnValue(createFakeDb(state));
    enableCloud();

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(rejectedMetaResponse(500, 131000))
      .mockResolvedValueOnce(successfulMetaResponse("wamid.retry-success"));
    vi.stubGlobal("fetch", fetchMock);

    const first = await handleDeliveryCareButtonReply(makeEvent());
    expect(first.status).toBe("retryable_failed");
    expect(replyStatus(state)).toBe("retryable_failed");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const earlyDuplicate = await handleDeliveryCareButtonReply(makeEvent());
    expect(earlyDuplicate.status).toBe("duplicate");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    state.job.metadata.delivery_care_reply!.auto_reply_retry_at = new Date(Date.now() - 1_000).toISOString();
    const recovered = await runPendingDeliveryCareAutoReplies(5);

    expect(recovered.replied).toBe(1);
    expect(replyStatus(state)).toBe("sent");
    expect(state.job.metadata.delivery_care_reply?.auto_reply_attempts).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("never retries a transport timeout because Meta may already have accepted the reply", async () => {
    const state = makeState();
    (getDb as any).mockReturnValue(createFakeDb(state));
    enableCloud();

    const timeout = Object.assign(new Error("timeout"), { name: "TimeoutError" });
    const fetchMock = vi.fn(async () => { throw timeout; });
    vi.stubGlobal("fetch", fetchMock);

    const first = await handleDeliveryCareButtonReply(makeEvent());
    expect(first.status).toBe("ambiguous");
    expect(replyStatus(state)).toBe("ambiguous");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const recovered = await runPendingDeliveryCareAutoReplies(5);
    expect(recovered.processed).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const duplicate = await handleDeliveryCareButtonReply(makeEvent());
    expect(duplicate.status).toBe("duplicate");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("allows only one send when the same webhook is processed concurrently", async () => {
    const state = makeState();
    (getDb as any).mockReturnValue(createFakeDb(state));
    enableCloud();

    const fetchMock = vi.fn(async () => successfulMetaResponse());
    vi.stubGlobal("fetch", fetchMock);

    const results = await Promise.all([
      handleDeliveryCareButtonReply(makeEvent()),
      handleDeliveryCareButtonReply(makeEvent()),
    ]);

    expect(results.map((result) => result.status).sort()).toEqual(["duplicate", "replied"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(replyStatus(state)).toBe("sent");
  });

  it("rejects a button callback whose sender does not match the order phone", async () => {
    const state = makeState();
    (getDb as any).mockReturnValue(createFakeDb(state));
    enableCloud();

    const fetchMock = vi.fn(async () => successfulMetaResponse());
    vi.stubGlobal("fetch", fetchMock);

    const result = await handleDeliveryCareButtonReply(makeEvent({ fromPhone: "9647700000000" }));

    expect(result.status).toBe("sender_mismatch");
    expect(state.job.metadata.delivery_care_reply).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("expires abandoned processing claims as ambiguous instead of resending them", async () => {
    const state = makeState();
    state.job.metadata.delivery_care_reply = {
      inbound_message_id: "wamid.customer-button",
      context_provider_message_id: "wamid.delivery-care",
      choice: "delivered_ok",
      button_payload: "aquavo_delivery_ok_v1",
      button_text: "وصلتني وكلشي تمام",
      received_at: "2026-08-19T10:00:00.000Z",
      auto_reply_status: "processing",
      auto_reply_attempts: 1,
      auto_reply_processing_at: new Date(Date.now() - 11 * 60_000).toISOString(),
    };
    (getDb as any).mockReturnValue(createFakeDb(state));
    enableCloud();

    const fetchMock = vi.fn(async () => successfulMetaResponse());
    vi.stubGlobal("fetch", fetchMock);

    const recovered = await runPendingDeliveryCareAutoReplies(5);

    expect(recovered.staleAmbiguous).toBe(1);
    expect(recovered.processed).toBe(0);
    expect(replyStatus(state)).toBe("ambiguous");
    expect(state.job.metadata.delivery_care_reply?.auto_reply_error_code)
      .toBe("WHATSAPP_REPLY_STALE_PROCESSING_AMBIGUOUS");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
