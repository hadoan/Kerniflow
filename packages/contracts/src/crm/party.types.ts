import { z } from "zod";
import { utcInstantSchema } from "../shared/local-date.schema";

export const PartyRoleTypeSchema = z.enum(["CUSTOMER", "SUPPLIER", "EMPLOYEE", "CONTACT"]);
export type PartyRoleType = z.infer<typeof PartyRoleTypeSchema>;

export const ContactPointTypeSchema = z.enum(["EMAIL", "PHONE"]);
export type ContactPointType = z.infer<typeof ContactPointTypeSchema>;

export const ContactPointSchema = z.object({
  type: ContactPointTypeSchema,
  value: z.string(),
  isPrimary: z.boolean(),
});

export type ContactPoint = z.infer<typeof ContactPointSchema>;

export const AddressSchema = z.object({
  line1: z.string(),
  line2: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
});

export type Address = z.infer<typeof AddressSchema>;

export const PartyDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  displayName: z.string(),
  roles: z.array(PartyRoleTypeSchema),
  vatId: z.string().nullable(),
  notes: z.string().nullable(),
  tags: z.array(z.string()),
  email: z.string().email().nullable().optional(), // primary email (derived from contactPoints)
  phone: z.string().nullable().optional(), // primary phone (derived from contactPoints)
  billingAddress: AddressSchema.nullable().optional(), // billing address (derived from addresses)
  archivedAt: utcInstantSchema.nullable(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
});

export type PartyDto = z.infer<typeof PartyDtoSchema>;
export type PartyDTO = PartyDto;
