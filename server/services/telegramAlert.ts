import https from "https";
import type { FinanceAuditResult } from "./groqFinanceAudit.js";

function isConfigured(): boolean {
  return !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

async function send(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const body = JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" });

  await new Promise<void>((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.telegram.org",
        path: `/bot${token}/sendMessage`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": String(Buffer.byteLength(body)),
        },
      },
      (res) => {
        res.resume();
        res.on("end", () => resolve());
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

export function needsAlert(result: FinanceAuditResult): boolean {
  if (result.error) return true;
  const status = result.report?.overallStatus;
  if (status === "warning" || status === "critical") return true;
  const findings = result.report?.findings ?? [];
  return findings.some(f => f.severity === "high" || f.severity === "critical");
}

export async function sendAuditAlert(result: FinanceAuditResult): Promise<void> {
  if (!isConfigured()) return;

  const alertOnOk = process.env.FINANCE_AUDIT_ALERT_ON_OK === "true";
  if (!needsAlert(result) && !alertOnOk) return;

  const status = result.error ? "failed" : (result.report?.overallStatus ?? "failed");
  const findings = result.report?.findings ?? [];
  const topFinding = findings.find(f => f.severity === "critical") ??
    findings.find(f => f.severity === "high") ??
    findings[0];

  const statusEmoji: Record<string, string> = {
    ok: "✅",
    warning: "⚠️",
    critical: "🚨",
    failed: "❌",
  };

  const lines = [
    `<b>[AQUAVO Finance Audit]</b>`,
    `الحالة: ${statusEmoji[status] ?? ""} ${status}`,
    `التاريخ: ${new Date(result.generatedAt).toLocaleString("ar-IQ")}`,
    `عدد النتائج: ${findings.length}`,
    topFinding
      ? `أهم مشكلة: <i>${topFinding.category} — ${topFinding.title.slice(0, 80)}</i>`
      : "لا مشاكل",
    `الرابط: /admin/finance`,
  ];

  if (result.error) {
    lines.push(`الخطأ: <code>${result.error.slice(0, 200)}</code>`);
  }

  try {
    await send(lines.join("\n"));
  } catch (err) {
    // Telegram alert failure must never crash the audit job
    console.warn("[TelegramAlert] Failed to send alert:", err instanceof Error ? err.message : err);
  }
}
