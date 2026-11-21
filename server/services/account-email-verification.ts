import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { users } from "../../shared/schema.js";
import { getDb } from "../db.js";
import { OperationalError } from "../middleware/error-handler.js";
import { sendEmail } from "../utils/email.js";

const PREFIX = "account-email-v1";
const VALID_FOR_MS = 10 * 60 * 1000;
const RESEND_AFTER_MS = 60 * 1000;

function database() {
  const db = getDb();
  if (!db) throw new OperationalError("تأكيد البريد غير متاح حاليا، حاول بعد شوي", 503);
  return db;
}

function digest(code: string, userId: string, email: string, nonce: string): string {
  const secret = process.env.EMAIL_VERIFICATION_SECRET || process.env.SESSION_SECRET || process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new OperationalError("تأكيد البريد غير متاح حاليا، حاول بعد شوي", 503);
  return createHmac("sha256", secret)
    .update(JSON.stringify([PREFIX, userId, email.trim().toLowerCase(), nonce, code])).digest("hex");
}

export async function getAccountEmailVerification(userId: string) {
  const [user] = await database().select({ emailVerified: users.emailVerified,
    token: users.verificationToken, expiresAt: users.verificationTokenExpiresAt }).from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt))).limit(1);
  if (!user) throw new OperationalError("الحساب غير موجود", 401);
  if (user.emailVerified) return { verified: true };
  const remaining = Math.ceil(((user.expiresAt?.getTime() || 0) - Date.now()) / 1000);
  // Restoring this status lets someone reopen the dialog and enter a code they
  // already requested, without sending another message or exhausting the budget.
  if (user.token?.startsWith(`${PREFIX}:`) && remaining > 0) return {
    verified: false, codePending: true, expiresInSeconds: remaining,
    retryAfterSeconds: Math.max(0, remaining - (VALID_FOR_MS - RESEND_AFTER_MS) / 1000),
  };
  return { verified: false };
}

/** Uses the existing dedicated email fields, never password-reset tokens. */
export async function requestAccountEmailVerification(userId: string) {
  const db = database();
  const issue = await db.transaction(async tx => {
    const [user] = await tx.select({ id: users.id, email: users.email, emailVerified: users.emailVerified,
      token: users.verificationToken, expiresAt: users.verificationTokenExpiresAt }).from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt))).limit(1).for("update");
    if (!user) throw new OperationalError("الحساب غير موجود", 401);
    if (user.emailVerified) return { verified: true as const };
    const now = Date.now();
    if (user.token && user.expiresAt && user.expiresAt.getTime() > now) {
      if (!user.token.startsWith(`${PREFIX}:`)) throw new OperationalError("يوجد طلب تأكيد سابق. حاول بعد انتهاء صلاحيته", 409);
      if (user.expiresAt.getTime() - now > VALID_FOR_MS - RESEND_AFTER_MS) {
        throw new OperationalError("انتظر دقيقة قبل طلب رمز جديد", 429);
      }
    }
    const code = String(randomInt(0, 100_000_000)).padStart(8, "0");
    const nonce = randomBytes(16).toString("hex");
    const token = `${PREFIX}:${nonce}:${digest(code, user.id, user.email, nonce)}`;
    await tx.update(users).set({ verificationToken: token,
      verificationTokenExpiresAt: new Date(now + VALID_FOR_MS), updatedAt: new Date(now),
    }).where(eq(users.id, user.id));
    return { verified: false as const, token, code, email: user.email };
  });
  if (issue.verified) return { verified: true };
  let sent = false;
  try {
    // No caller-provided HTML, names, recipient or Host-header links enter this message.
    sent = await sendEmail({
      to: issue.email,
      sensitive: true,
      subject: "رمز تأكيد بريد حساب AQUAVO",
      text: `رمز تأكيد بريد حسابك في AQUAVO: ${issue.code}\nالرمز صالح لمدة 10 دقائق ولمرة واحدة. اكتبه في صفحة حاسبة التكاثر. إذا ما طلبت الرمز، تجاهل هذه الرسالة.`,
      html: `<div lang="ar" dir="rtl"><h1>تأكيد بريد حساب AQUAVO</h1><p>اكتب هذا الرمز في صفحة حاسبة التكاثر:</p><p dir="ltr" style="font-size:28px;letter-spacing:4px">${issue.code}</p><p>الرمز صالح لمدة 10 دقائق ولمرة واحدة. إذا ما طلبته، تجاهل هذه الرسالة.</p></div>`,
    });
  } catch {
    // A provider exception must not expose the message or its one-time code.
    sent = false;
  } finally {
    if (!sent) {
      // Do not clear a newer concurrent request's token if this delivery failed.
      await db.update(users).set({ verificationToken: null, verificationTokenExpiresAt: null })
        .where(and(eq(users.id, userId), eq(users.verificationToken, issue.token)));
    }
  }
  if (!sent) throw new OperationalError("ما تم إرسال رمز التأكيد. حاول بعد شوي", 503);
  return { verified: false, expiresInSeconds: VALID_FOR_MS / 1000, retryAfterSeconds: RESEND_AFTER_MS / 1000 };
}

export async function confirmAccountEmailVerification(userId: string, code: string) {
  if (!/^\d{8}$/.test(code)) throw new OperationalError("اكتب الرمز المكوّن من 8 أرقام", 400);
  return database().transaction(async tx => {
    const [user] = await tx.select({ id: users.id, email: users.email,
      token: users.verificationToken, expiresAt: users.verificationTokenExpiresAt }).from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt))).limit(1).for("update");
    const invalid = () => new OperationalError("الرمز غير صحيح أو انتهت صلاحيته. راجعه أو اطلب رمز جديد", 400);
    if (!user?.token || !user.expiresAt || user.expiresAt.getTime() <= Date.now()) throw invalid();
    const parts = user.token.split(":");
    if (parts.length !== 3 || parts[0] !== PREFIX || !/^[0-9a-f]{32}$/.test(parts[1]) || !/^[0-9a-f]{64}$/.test(parts[2])) throw invalid();
    const expected = digest(code, user.id, user.email, parts[1]);
    if (!timingSafeEqual(Buffer.from(parts[2], "hex"), Buffer.from(expected, "hex"))) throw invalid();
    await tx.update(users).set({ emailVerified: true, verificationToken: null,
      verificationTokenExpiresAt: null, updatedAt: new Date(),
    }).where(eq(users.id, user.id));
    return { verified: true };
  });
}
