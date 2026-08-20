export const PASSWORD_MIN_LENGTH = 15;
export const PASSWORD_MAX_LENGTH = 128;

const COMMON_PASSWORDS = new Set([
  "password",
  "password123",
  "12345678",
  "123456789",
  "1234567890",
  "qwerty123",
  "admin123",
  "letmein",
  "welcome123",
  "aquavo123",
]);

export type PasswordPolicyResult = {
  valid: boolean;
  reason?: "required" | "too_short" | "too_long" | "common";
};

export function validatePasswordPolicy(password: unknown): PasswordPolicyResult {
  if (typeof password !== "string" || password.length === 0) {
    return { valid: false, reason: "required" };
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { valid: false, reason: "too_short" };
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return { valid: false, reason: "too_long" };
  }
  if (COMMON_PASSWORDS.has(password.trim().toLowerCase())) {
    return { valid: false, reason: "common" };
  }
  return { valid: true };
}

export function passwordPolicyMessage(result: PasswordPolicyResult): string {
  switch (result.reason) {
    case "required":
      return "كلمة المرور مطلوبة";
    case "too_short":
      return `كلمة المرور لازم تكون ${PASSWORD_MIN_LENGTH} حرف على الأقل`;
    case "too_long":
      return `كلمة المرور لازم ما تتجاوز ${PASSWORD_MAX_LENGTH} حرف`;
    case "common":
      return "كلمة المرور شائعة جداً. استخدم عبارة مرور أطول ومميزة";
    default:
      return "كلمة المرور غير مقبولة";
  }
}
