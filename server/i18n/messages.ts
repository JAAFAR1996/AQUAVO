/**
 * Customer-facing API messages in the request locale.
 *
 * Every response that a customer can see carries a stable `code` plus a
 * `message` rendered in the language of the storefront that made the call
 * (server/middleware/locale.ts). Admin-only and log-only strings stay Arabic.
 */
import type { Request } from "express";
import { DEFAULT_LOCALE, type Locale } from "../../shared/i18n/locales.js";

export const API_MESSAGES = {
  invalidEmail: { ar: "أدخل بريد إلكتروني صالح", en: "Enter a valid email address", ckb: "ئیمەیڵێکی دروست بنووسە" },
  invalidFullName: { ar: "الاسم الكامل مطلوب ويجب أن يكون بين 2 و100 حرف", en: "Full name is required and must be 2 to 100 characters", ckb: "ناوی تەواو پێویستە و دەبێت لە نێوان 2 بۆ 100 پیت بێت" },
  invalidPhone: { ar: "أدخل رقم هاتف صالح", en: "Enter a valid phone number", ckb: "ژمارەی مۆبایلێکی دروست بنووسە" },
  emailTaken: { ar: "البريد الإلكتروني مسجل بالفعل", en: "This email is already registered", ckb: "ئەم ئیمەیڵە پێشتر تۆمار کراوە" },
  ipBlocked: { ar: "تم حظر عنوان IP الخاص بك مؤقتاً بسبب محاولات دخول متعددة فاشلة", en: "Your IP address is temporarily blocked after several failed login attempts", ckb: "ناونیشانی IP ـەکەت بە کاتی بلۆک کراوە بەهۆی چەند هەوڵێکی سەرنەکەوتووی چوونەژوورەوە" },
  badCredentials: { ar: "البريد الإلكتروني أو كلمة المرور غير صحيحة", en: "Incorrect email or password", ckb: "ئیمەیڵ یان وشەی نهێنی هەڵەیە" },
  wrongCurrentPassword: { ar: "كلمة المرور الحالية غير صحيحة", en: "The current password is incorrect", ckb: "وشەی نهێنی ئێستا هەڵەیە" },
  samePassword: { ar: "اختار كلمة مرور جديدة مختلفة عن الحالية", en: "Choose a new password that differs from the current one", ckb: "وشەی نهێنییەکی نوێ هەڵبژێرە کە جیاواز بێت لە ئێستا" },
  passwordChanged: { ar: "تم تغيير كلمة المرور بنجاح", en: "Password changed", ckb: "وشەی نهێنی گۆڕدرا" },
  addressDeleted: { ar: "تم حذف العنوان", en: "Address deleted", ckb: "ناونیشان سڕایەوە" },
  deviceBlocked: { ar: "تم حظر هذا الجهاز من الشراء بسبب رفض استلام طلبات سابقة. تواصل مع الدعم", en: "This device is blocked from ordering after previous deliveries were refused. Please contact support", ckb: "ئەم ئامێرە لە داواکردن بلۆک کراوە بەهۆی ڕەتکردنەوەی وەرگرتنی داواکاری پێشوو. پەیوەندی بە پشتگیری بکە" },
  invalidOrder: { ar: "بيانات الطلب غير صالحة", en: "The order details are invalid", ckb: "زانیاری داواکارییەکە دروست نییە" },
  orderTrackingFailed: { ar: "تعذر التحقق من الطلب. تأكد من المعلومات وحاول مرة ثانية.", en: "We could not verify the order. Check the details and try again.", ckb: "نەتوانرا داواکارییەکە بپشکنرێت. زانیارییەکان بپشکنە و دووبارە هەوڵ بدەوە." },
} as const satisfies Record<string, Record<Locale, string>>;

export type ApiMessageCode = keyof typeof API_MESSAGES;

export function localeOf(req: Pick<Request, "locale"> | undefined): Locale {
  return req?.locale ?? DEFAULT_LOCALE;
}

/** `{ code, message }` for a JSON body, in the request's language. */
export function apiMessage(req: Pick<Request, "locale"> | undefined, code: ApiMessageCode): { code: ApiMessageCode; message: string } {
  return { code, message: API_MESSAGES[code][localeOf(req)] };
}
