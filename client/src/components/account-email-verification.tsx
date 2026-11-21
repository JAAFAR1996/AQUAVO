import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addCsrfHeader } from "@/lib/csrf";

const endpoint = "/api/fish/breeding-plan/email/verification";
type VerificationResult = { verified: boolean; codePending: boolean; retryAfterSeconds?: number };
type Phase = "checking" | "unverified" | "sent" | "verified" | "error";
type ErrorMessageKey = "signInAgain" | "tooManyAttempts" | "previousRequest" | "invalidCode" | "unavailable";

class VerificationRequestError extends Error {
  constructor(readonly status: number) { super("Email verification request failed"); }
}

function messageFor(error: unknown, action: "status" | "request" | "confirm"): ErrorMessageKey {
  if (error instanceof VerificationRequestError) {
    if (error.status === 401) return "signInAgain";
    if (error.status === 429) return "tooManyAttempts";
    if (error.status === 409) return "previousRequest";
    if (error.status === 400 && action === "confirm") return "invalidCode";
  }
  return "unavailable";
}

async function verificationRequest(path: string, controller: AbortController, body?: object): Promise<VerificationResult> {
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(`${endpoint}${path}`, {
      method: body ? "POST" : "GET", credentials: "include", signal: controller.signal, cache: "no-store",
      headers: addCsrfHeader({ "Content-Type": "application/json" }),
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) throw new VerificationRequestError(response.status);
    const result: unknown = await response.json();
    if (!result || typeof result !== "object" || !("verified" in result) || typeof result.verified !== "boolean") {
      throw new VerificationRequestError(502);
    }
    return { verified: result.verified, codePending: "codePending" in result && result.codePending === true,
      retryAfterSeconds: "retryAfterSeconds" in result
      && typeof result.retryAfterSeconds === "number" ? result.retryAfterSeconds : undefined };
  } finally { clearTimeout(timeout); }
}

/** Opening this panel only reads status; sending any message requires an explicit click. */
export function AccountEmailVerification({ email, onVerified }: {
  email: string;
  onVerified: (email: string | null) => void;
}) {
  const { t } = useTranslation("tools");
  const key = "fish-breeding-calculator.emailVerification";
  const codeId = useId();
  const [phase, setPhase] = useState<Phase>("checking");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [errorKey, setErrorKey] = useState<ErrorMessageKey | "">("");
  const [retryIn, setRetryIn] = useState(0);
  const [statusAttempt, setStatusAttempt] = useState(0);
  const activeRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    activeRequest.current = controller;
    onVerified(null); setPhase("checking"); setErrorKey(""); setCode(""); setPending(false); setRetryIn(0);
    verificationRequest("", controller).then(result => {
      if (activeRequest.current !== controller) return;
      setPhase(result.verified ? "verified" : result.codePending ? "sent" : "unverified");
      if (result.codePending) setRetryIn(Math.min(3600, Math.max(0, Math.ceil(result.retryAfterSeconds || 0))));
      onVerified(result.verified ? email : null);
    }).catch((error: unknown) => {
      if (activeRequest.current !== controller) return;
      setPhase("error"); setErrorKey(messageFor(error, "status"));
    });
    return () => { activeRequest.current?.abort(); activeRequest.current = null; };
  }, [email, onVerified, statusAttempt]);

  useEffect(() => {
    if (retryIn <= 0) return;
    const timer = setTimeout(() => setRetryIn(seconds => Math.max(0, seconds - 1)), 1000);
    return () => clearTimeout(timer);
  }, [retryIn]);

  const act = async (action: "request" | "confirm") => {
    if (pending || (action === "confirm" && !/^\d{8}$/.test(code))) return;
    const controller = new AbortController();
    activeRequest.current?.abort(); activeRequest.current = controller;
    setPending(true); setErrorKey("");
    try {
      const result = await verificationRequest(`/${action}`, controller, action === "confirm" ? { code } : {});
      if (activeRequest.current !== controller) return;
      if (result.verified) {
        setPhase("verified"); setCode(""); onVerified(email);
      } else if (action === "request") {
        setPhase("sent"); setCode("");
        setRetryIn(Math.min(3600, Math.max(60, Math.ceil(result.retryAfterSeconds || 60))));
      } else { setErrorKey("invalidCode"); }
    } catch (error) {
      if (activeRequest.current !== controller) return;
      setErrorKey(messageFor(error, action));
    } finally {
      if (activeRequest.current === controller) setPending(false);
    }
  };

  return <div className="space-y-3 rounded-md border p-3">
    {phase === "checking" && <p role="status" className="text-sm">{t(`${key}.checking`)}</p>}
    {phase === "verified" && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">{t(`${key}.verified`)}</p>}
    {phase === "error" && <Button type="button" variant="outline" onClick={() => setStatusAttempt(attempt => attempt + 1)}>
      {t(`${key}.checkAgain`)}
    </Button>}
    {(phase === "unverified" || phase === "sent") && <>
      <p className="text-sm text-muted-foreground">{t(`${key}.${phase === "sent" ? "codeSent" : "explanation"}`)}</p>
      {phase === "sent" && <div className="space-y-2">
        <Label htmlFor={codeId}>{t(`${key}.codeLabel`)}</Label>
        <Input id={codeId} inputMode="numeric" autoComplete="one-time-code" dir="ltr" maxLength={8}
          value={code} disabled={pending} aria-invalid={errorKey === "invalidCode"}
          onChange={event => setCode(event.target.value.replace(/[٠-٩۰-۹]/g, digit =>
            String(digit.charCodeAt(0) - (digit <= "٩" ? 0x660 : 0x6f0))).replace(/\D/g, "").slice(0, 8))} />
        <Button type="button" disabled={pending || !/^\d{8}$/.test(code)} onClick={() => void act("confirm")}>
          {t(`${key}.${pending ? "working" : "confirm"}`)}
        </Button>
      </div>}
      <Button type="button" variant="outline" disabled={pending || retryIn > 0} onClick={() => void act("request")}>
        {pending ? t(`${key}.working`) : retryIn > 0 ? t(`${key}.resendIn`, { seconds: retryIn })
          : t(`${key}.${phase === "sent" ? "resend" : "sendCode"}`)}
      </Button>
    </>}
    {errorKey && <p role="alert" className="text-sm text-destructive">{t(`${key}.${errorKey}`)}</p>}
  </div>;
}
