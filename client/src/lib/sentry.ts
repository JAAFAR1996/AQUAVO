import * as Sentry from "@sentry/react";
import { browserTracingIntegration } from "@sentry/react";

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;

// Known third-party noise that is not AQUAVO code
const IGNORED_MESSAGES = [
  "ResizeObserver loop",
  "ResizeObserver loop limit exceeded",
  "ResizeObserver loop completed with undelivered notifications",
  "Non-Error promise rejection captured",
  "fbq is not defined",
  "ttq is not defined",
  "ReactDOM.render is no longer supported",
  "cancelled",
  "Load failed",
];

const IGNORED_URL_PATTERNS = [
  /chrome-extension:\/\//,
  /moz-extension:\/\//,
  /safari-web-extension:\/\//,
  /connect\.facebook\.net/,
  /analytics\.tiktok\.com/,
  /static\.ads-twitter\.com/,
  /googletagmanager\.com/,
  /doubleclick\.net/,
];

function isThirdPartyUrl(url: string): boolean {
  return IGNORED_URL_PATTERNS.some((re) => re.test(url));
}

export function initSentry(): void {
  if (!DSN) return;

  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.MODE,
    integrations: [browserTracingIntegration()],

    // 10% of transactions — enough for production insight without volume cost
    tracesSampleRate: 0.1,

    // Session replay disabled — costs quota and not configured yet
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,

    beforeSend(event, hint) {
      const error = hint?.originalException;

      // Drop errors from known third-party scripts
      const frames = event.exception?.values?.[0]?.stacktrace?.frames ?? [];
      if (
        frames.length > 0 &&
        frames.every((f) => f.filename && isThirdPartyUrl(f.filename))
      ) {
        return null;
      }

      // Drop by message pattern
      const message =
        event.exception?.values?.[0]?.value ??
        (error instanceof Error ? error.message : String(error ?? ""));

      if (
        IGNORED_MESSAGES.some((pattern) =>
          message.toLowerCase().includes(pattern.toLowerCase())
        )
      ) {
        return null;
      }

      return event;
    },

    beforeSendTransaction(event) {
      // Drop transactions from third-party iframes / extensions
      const url = event.request?.url ?? "";
      if (isThirdPartyUrl(url)) return null;
      return event;
    },
  });
}

// ── User context ─────────────────────────────────────────────────────────────

export function setSentryUser(user: {
  id: string | number;
  username?: string;
  email?: string;
}) {
  Sentry.setUser({ id: String(user.id), username: user.username, email: user.email });
}

export function clearSentryUser() {
  Sentry.setUser(null);
}

// ── Flow tagging ──────────────────────────────────────────────────────────────

export type AquavoFlow =
  | "cart"
  | "checkout"
  | "order"
  | "search"
  | "newsletter"
  | "product";

export function setSentryFlow(flow: AquavoFlow) {
  Sentry.setTag("flow", flow);
}

// ── Capture helpers ───────────────────────────────────────────────────────────

export function captureException(
  error: unknown,
  context?: Record<string, unknown>
) {
  if (context) {
    Sentry.withScope((scope) => {
      scope.setExtras(context);
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = "info"
) {
  Sentry.captureMessage(message, level);
}

export function addBreadcrumb(breadcrumb: Sentry.Breadcrumb) {
  Sentry.addBreadcrumb(breadcrumb);
}

// Backwards-compatible aliases (used by existing code/tests)
export const setUser = setSentryUser;
export const clearUser = clearSentryUser;

// Re-export ErrorBoundary for use in JSX
export { Sentry };
