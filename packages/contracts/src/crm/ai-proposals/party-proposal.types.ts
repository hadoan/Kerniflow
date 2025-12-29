import { z } from "zod";
import { PartyRoleTypeSchema, AddressSchema } from "../party.types";

export const PartyProposalSchema = z.object({
  displayName: z.string(),
  roles: z.array(PartyRoleTypeSchema),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  billingAddress: AddressSchema.optional(),
  vatId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  duplicates: z
    .array(
      z.object({
        id: z.string(),
        displayName: z.string(),
        email: z.string().optional(),
        matchScore: z.number().min(0).max(1),
      })
    )
    .optional(),
});

export type PartyProposal = z.infer<typeof PartyProposalSchema>;

export const ProvenanceSchema = z.object({
  sourceText: z.string().optional(),
  extractedFields: z.array(z.string()).optional(),
  referencedEntities: z
    .array(
      z.object({
        type: z.string(),
        id: z.string(),
        name: z.string(),
      })
    )
    .optional(),
});

export type Provenance = z.infer<typeof ProvenanceSchema>;

export const PartyProposalCardSchema = z.object({
  ok: z.literal(true),
  proposal: PartyProposalSchema,
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  provenance: ProvenanceSchema,
});

export type PartyProposalCard = z.infer<typeof PartyProposalCardSchema>;
