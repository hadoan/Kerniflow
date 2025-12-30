import { z } from "zod";
import type { CreateCustomerInput, UpdateCustomerInput } from "@corely/contracts";

export const customerFormSchema = z.object({
  displayName: z.string().min(1, "Display name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
  vatId: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  billingAddress: z
    .object({
      line1: z.string().optional(),
      line2: z.string().optional(),
      city: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
});

export type CustomerFormData = z.infer<typeof customerFormSchema>;

export function toCreateCustomerInput(data: CustomerFormData): CreateCustomerInput {
  return {
    displayName: data.displayName,
    email: data.email || undefined,
    phone: data.phone || undefined,
    vatId: data.vatId || undefined,
    notes: data.notes || undefined,
    tags: data.tags,
    billingAddress:
      data.billingAddress?.line1 || data.billingAddress?.city
        ? {
            line1: data.billingAddress.line1 || "",
            line2: data.billingAddress.line2,
            city: data.billingAddress.city,
            postalCode: data.billingAddress.postalCode,
            country: data.billingAddress.country,
          }
        : undefined,
  };
}

export function toUpdateCustomerInput(data: CustomerFormData): UpdateCustomerInput["patch"] {
  return {
    displayName: data.displayName,
    email: data.email || null,
    phone: data.phone || null,
    vatId: data.vatId || null,
    notes: data.notes || null,
    tags: data.tags || null,
    billingAddress:
      data.billingAddress?.line1 || data.billingAddress?.city
        ? {
            line1: data.billingAddress.line1 || "",
            line2: data.billingAddress.line2,
            city: data.billingAddress.city,
            postalCode: data.billingAddress.postalCode,
            country: data.billingAddress.country,
          }
        : null,
  };
}

export function getDefaultCustomerFormValues(): CustomerFormData {
  return {
    displayName: "",
    email: "",
    phone: "",
    vatId: "",
    notes: "",
    tags: [],
    billingAddress: {
      line1: "",
      line2: "",
      city: "",
      postalCode: "",
      country: "",
    },
  };
}
