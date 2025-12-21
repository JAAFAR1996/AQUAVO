/**
 * Zod validation schemas for form inputs
 * Following OWASP input validation best practices 2025
 */

import { z } from 'zod';

// =================================
// Common Validation Rules
// =================================

// Email validation with comprehensive pattern
const emailSchema = z
  .string()
  .min(1, 'البريد الإلكتروني مطلوب')
  .email('البريد الإلكتروني غير صحيح')
  .max(255, 'البريد الإلكتروني طويل جداً')
  .toLowerCase()
  .trim();

// Password validation - minimum 12 chars with complexity requirements
const passwordSchema = z
  .string()
  .min(12, 'كلمة المرور يجب أن تكون 12 حرفاً على الأقل')
  .max(128, 'كلمة المرور طويلة جداً')
  .regex(/[A-Z]/, 'يجب أن تحتوي على حرف كبير واحد على الأقل')
  .regex(/[a-z]/, 'يجب أن تحتوي على حرف صغير واحد على الأقل')
  .regex(/[0-9]/, 'يجب أن تحتوي على رقم واحد على الأقل')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'يجب أن تحتوي على رمز خاص واحد على الأقل');

// Phone validation (Iraqi format)
const phoneSchema = z
  .string()
  .min(1, 'رقم الهاتف مطلوب')
  .regex(/^(\+964|0)?7[3-9]\d{8}$/, 'رقم الهاتف غير صحيح (يجب أن يكون رقم عراقي)')
  .trim();

// Name validation - Arabic and English letters only
const nameSchema = z
  .string()
  .min(2, 'الاسم قصير جداً')
  .max(100, 'الاسم طويل جداً')
  .regex(/^[\u0600-\u06FFa-zA-Z\s]+$/, 'الاسم يجب أن يحتوي على حروف فقط')
  .trim();

// =================================
// Authentication Schemas
// =================================

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
  rememberMe: z.boolean().optional(),
});

export const registerSchema = z
  .object({
    fullName: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    phone: phoneSchema,
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: 'يجب الموافقة على الشروط والأحكام',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'كلمات المرور غير متطابقة',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'كلمات المرور غير متطابقة',
    path: ['confirmPassword'],
  });

// =================================
// Checkout & Order Schemas
// =================================

export const checkoutSchema = z.object({
  // Personal Information
  fullName: nameSchema,
  email: emailSchema,
  phone: phoneSchema,

  // Shipping Address
  address: z
    .string()
    .min(10, 'العنوان قصير جداً (10 أحرف على الأقل)')
    .max(500, 'العنوان طويل جداً')
    .trim(),
  city: z
    .string()
    .min(2, 'المدينة مطلوبة')
    .max(100, 'المدينة طويلة جداً')
    .trim(),
  postalCode: z
    .string()
    .regex(/^\d{5}$/, 'الرمز البريدي يجب أن يكون 5 أرقام')
    .optional(),

  // Payment
  paymentMethod: z.enum(['cash', 'card', 'online'], {
    errorMap: () => ({ message: 'طريقة الدفع غير صحيحة' }),
  }),

  // Notes
  notes: z.string().max(1000, 'الملاحظات طويلة جداً').optional(),
});

// =================================
// Product Review Schema
// =================================

export const reviewSchema = z.object({
  productId: z.string().min(1, 'معرف المنتج مطلوب'),
  rating: z.number().int().min(1, 'التقييم مطلوب').max(5, 'التقييم يجب أن يكون من 1 إلى 5'),
  title: z.string().max(200, 'العنوان طويل جداً').optional(),
  comment: z
    .string()
    .min(10, 'التعليق قصير جداً (10 أحرف على الأقل)')
    .max(2000, 'التعليق طويل جداً')
    .optional(),
});

// =================================
// Contact & Newsletter Schemas
// =================================

export const newsletterSchema = z.object({
  email: emailSchema,
});

export const contactSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  subject: z.string().min(5, 'الموضوع قصير جداً').max(200, 'الموضوع طويل جداً').trim(),
  message: z
    .string()
    .min(20, 'الرسالة قصيرة جداً (20 حرف على الأقل)')
    .max(5000, 'الرسالة طويلة جداً')
    .trim(),
});

// =================================
// Gallery Submission Schema
// =================================

export const gallerySubmissionSchema = z.object({
  customerName: nameSchema,
  customerPhone: phoneSchema,
  tankSize: z.string().min(1, 'حجم الحوض مطلوب').max(100, 'حجم الحوض طويل جداً'),
  description: z
    .string()
    .min(10, 'الوصف قصير جداً (10 أحرف على الأقل)')
    .max(1000, 'الوصف طويل جداً')
    .trim(),
  imageUrl: z.string().url('رابط الصورة غير صحيح').or(z.string().startsWith('data:image/')),
});

// =================================
// Admin Schemas
// =================================

export const couponSchema = z.object({
  code: z
    .string()
    .min(3, 'كود الكوبون قصير جداً')
    .max(50, 'كود الكوبون طويل جداً')
    .regex(/^[A-Z0-9_-]+$/, 'كود الكوبون يجب أن يحتوي على أحرف كبيرة وأرقام فقط')
    .trim()
    .toUpperCase(),
  type: z.enum(['percentage', 'fixed', 'free_shipping'], {
    errorMap: () => ({ message: 'نوع الكوبون غير صحيح' }),
  }),
  value: z.number().positive('القيمة يجب أن تكون موجبة'),
  minOrderAmount: z.number().nonnegative('الحد الأدنى يجب أن يكون صفر أو أكثر').optional(),
  maxUses: z.number().int().positive('عدد الاستخدامات يجب أن يكون موجب').optional(),
  maxUsesPerUser: z.number().int().positive('عدد الاستخدامات لكل مستخدم يجب أن يكون موجب').optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  isActive: z.boolean(),
});

// =================================
// Type Exports
// =================================

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
export type NewsletterInput = z.infer<typeof newsletterSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type GallerySubmissionInput = z.infer<typeof gallerySubmissionSchema>;
export type CouponInput = z.infer<typeof couponSchema>;
