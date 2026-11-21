import { z } from "zod";

const addressFields = z.object({
  label: z.string().trim().max(50).nullable().optional(),
  addressLine1: z.string().trim().min(1).max(500).optional(),
  // Accept the old public field, but always write the real database column.
  address: z.string().trim().min(1).max(500).optional(),
  phone: z.string().trim().max(20).regex(/^[+0-9٠-٩۰-۹()\s-]*$/).nullable().optional(),
  city: z.string().trim().min(1).max(100).optional(),
  country: z.string().trim().min(1).max(100).optional(),
  isDefault: z.boolean().optional(),
}).strict();

export const createUserAddressInput = addressFields
  .refine(value => Boolean(value.addressLine1 ?? value.address), { path: ["addressLine1"], message: "Address is required" })
  .transform(({ address, ...value }) => ({
    ...value,
    addressLine1: value.addressLine1 ?? address!,
    label: value.label || null,
    phone: value.phone || null,
    city: value.city ?? "العراق",
    country: value.country ?? "Iraq",
    isDefault: value.isDefault ?? false,
  }));

export const updateUserAddressInput = addressFields
  .refine(value => Object.keys(value).length > 0, { message: "Address update is empty" })
  .transform(({ address, ...value }) => ({
    ...value,
    ...(address !== undefined && value.addressLine1 === undefined ? { addressLine1: address } : {}),
    ...(value.phone !== undefined ? { phone: value.phone || null } : {}),
  }));
