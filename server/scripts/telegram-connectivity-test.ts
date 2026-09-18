/**
 * One-off Telegram connectivity check for the order-notification channel.
 *
 * Usage (credentials come from the environment, never from arguments):
 *   TELEGRAM_BOT_TOKEN=... TELEGRAM_CHAT_ID=... npx tsx server/scripts/telegram-connectivity-test.ts
 * or after `vercel env pull .env.telegram.local --environment=production`:
 *   npx tsx --env-file=.env.telegram.local server/scripts/telegram-connectivity-test.ts
 *
 * Sends exactly one technical test message (clearly not a customer order) and
 * prints only Telegram's acceptance status. The token is never printed.
 */
import {
  buildTelegramConnectivityTestMessage,
  isTelegramConfigured,
  sendTelegramMessage,
} from "../services/order-notifications.js";

async function main(): Promise<void> {
  if (!isTelegramConfigured()) {
    console.error("TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID are not set in this environment. Nothing sent.");
    process.exitCode = 2;
    return;
  }
  const message = buildTelegramConnectivityTestMessage();
  console.log("Sending connectivity test message:\n" + message.replace(/<[^>]+>/g, "") + "\n");
  try {
    const accepted = await sendTelegramMessage(message);
    console.log(accepted ? "Telegram accepted the message (HTTP 2xx)." : "Nothing sent (not configured).");
    process.exitCode = accepted ? 0 : 2;
  } catch (error) {
    console.error("Telegram rejected the message:", error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

void main();
