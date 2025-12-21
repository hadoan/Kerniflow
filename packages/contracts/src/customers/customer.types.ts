import { z } from "zod";
import { utcInstantSchema } from "../shared/local-date.schema";

export const CustomerBillingAddressSchema = z.object({
  line1: z.string(),
  line2: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
});

export const CustomerDtoSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  billingAddress: CustomerBillingAddressSchema.optional(),
  vatId: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  archivedAt: utcInstantSchema.nullable().optional(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
});

export type CustomerDto = z.infer<typeof CustomerDtoSchema>;
export type CustomerDTO = CustomerDto;

export const CustomerBillingSnapshotSchema = z.object({
  partyId: z.string(),
  displayName: z.string(),
  email: z.string().email().optional(),
  vatId: z.string().optional(),
  billingAddress: CustomerBillingAddressSchema.optional(),
});

export type CustomerBillingSnapshotDto = z.infer<typeof CustomerBillingSnapshotSchema>;
export type CustomerBillingSnapshotDTO = CustomerBillingSnapshotDto;
