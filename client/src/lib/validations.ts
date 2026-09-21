/**
 * Zod validation schemas for form inputs
 * Following OWASP input validation best practices
 */

import { z } from 'zod';
import { i18next } from "@/i18n";

// =================================
// Common Validation Rules
// =================================

// Email validation with comprehensive pattern
const emailSchema = z
  .string()
  .min(1, i18next.t("common:validations.s1"))
  .email(i18next.t("common:validations.s2"))
  .max(255, i18next.t("common:validations.s3"))
  .toLowerCase()
  .trim();

// Password validation - minimum 12 chars with complexity requirements
const passwordSchema = z
  .string()
  .min(12, i18next.t("common:validations.s4"))
  .max(128, i18next.t("common:validations.s5"))
  .regex(/[A-Z]/, i18next.t("common:validations.s6"))
  .regex(/[a-z]/, i18next.t("common:validations.s7"))
  .regex(/[0-9]/, i18next.t("common:validations.s8"))
  .regex(/[!@#$%^&*(),.?":{}|<>]/, i18next.t("common:validations.s9"));

// Phone validation (Iraqi format)
const phoneSchema = z
  .string()
  .min(1, i18next.t("common:validations.s10"))
  .regex(/^(\+964|0)?7[3-9]\d{8}$/, i18next.t("common:validations.s11"))
  .trim();

// Name validation - Arabic and English letters only
const nameSchema = z
  .string()
  .min(2, i18next.t("common:validations.s12"))
  .max(100, i18next.t("common:validations.s13"))
  .regex(/^[\u0600-\u06FFa-zA-Z\s]+$/, i18next.t("common:validations.s14"))
  .trim();

// =================================
// Authentication Schemas
// =================================

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, i18next.t("common:validations.s15")),
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
      message: i18next.t("common:validations.s16"),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: i18next.t("common:validations.s17"),
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
    message: i18next.t("common:validations.s17"),
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
    .min(10, i18next.t("common:validations.s18"))
    .max(500, i18next.t("common:validations.s19"))
    .trim(),
  city: z
    .string()
    .min(2, i18next.t("common:validations.s20"))
    .max(100, i18next.t("common:validations.s21"))
    .trim(),
  postalCode: z
    .string()
    .regex(/^\d{5}$/, i18next.t("common:validations.s22"))
    .optional(),

  // Payment
  paymentMethod: z.enum(['cod', 'online'], {
    errorMap: () => ({ message: i18next.t("common:validations.s23") }),
  }),

  // Notes
  notes: z.string().max(1000, i18next.t("common:validations.s24")).optional(),
});

// =================================
// Product Review Schema
// =================================

export const reviewSchema = z.object({
  productId: z.string().min(1, i18next.t("common:validations.s25")),
  rating: z.number().int().min(1, i18next.t("common:validations.s26")).max(5, i18next.t("common:validations.s27")),
  title: z.string().max(200, i18next.t("common:validations.s19")).optional(),
  comment: z
    .string()
    .min(10, i18next.t("common:validations.s28"))
    .max(2000, i18next.t("common:validations.s29"))
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
  subject: z.string().min(5, i18next.t("common:validations.s30")).max(200, i18next.t("common:validations.s31")).trim(),
  message: z
    .string()
    .min(20, i18next.t("common:validations.s32"))
    .max(5000, i18next.t("common:validations.s33"))
    .trim(),
});

// =================================
// Gallery Submission Schema
// =================================

export const gallerySubmissionSchema = z.object({
  customerName: nameSchema,
  customerPhone: phoneSchema,
  tankSize: z.string().min(1, i18next.t("common:validations.s34")).max(100, i18next.t("common:validations.s35")),
  description: z
    .string()
    .min(10, i18next.t("common:validations.s36"))
    .max(1000, i18next.t("common:validations.s37"))
    .trim(),
  imageUrl: z.string().url(i18next.t("common:validations.s38")).or(z.string().startsWith('data:image/')),
});

// =================================
// Admin Schemas
// =================================

export const couponSchema = z.object({
  code: z
    .string()
    .min(3, i18next.t("common:validations.s39"))
    .max(50, i18next.t("common:validations.s40"))
    .regex(/^[A-Z0-9_-]+$/, i18next.t("common:validations.s41"))
    .trim()
    .toUpperCase(),
  type: z.enum(['percentage', 'fixed', 'free_shipping'], {
    errorMap: () => ({ message: i18next.t("common:validations.s42") }),
  }),
  value: z.number().positive(i18next.t("common:validations.s43")),
  minOrderAmount: z.number().nonnegative(i18next.t("common:validations.s44")).optional(),
  maxUses: z.number().int().positive(i18next.t("common:validations.s45")).optional(),
  maxUsesPerUser: z.number().int().positive(i18next.t("common:validations.s46")).optional(),
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
