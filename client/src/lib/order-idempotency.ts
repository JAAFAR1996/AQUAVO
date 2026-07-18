const STORAGE_KEY = "aquavo_checkout_attempt_v1";

type StoredAttempt = {
  cartSignature: string;
  idempotencyKey: string;
};

function isStoredAttempt(value: unknown): value is StoredAttempt {
  if (!value || typeof value !== "object") return false;
  const attempt = value as Partial<StoredAttempt>;
  return typeof attempt.cartSignature === "string"
    && typeof attempt.idempotencyKey === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(attempt.idempotencyKey);
}

export function getOrderIdempotencyKey(cartSignature: string): string {
  try {
    const existing = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null") as unknown;
    if (isStoredAttempt(existing) && existing.cartSignature === cartSignature) {
      return existing.idempotencyKey;
    }
  } catch {
    // A blocked or malformed session store must not prevent checkout.
  }

  const idempotencyKey = crypto.randomUUID();
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ cartSignature, idempotencyKey }));
  } catch {
    // The in-flight request still receives a valid key even without persistence.
  }
  return idempotencyKey;
}

export function clearOrderIdempotencyKey(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Checkout completion must not fail because storage is unavailable.
  }
}
