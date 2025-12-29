import { type CustomerDto } from "@kerniflow/contracts";
import { type PartyAggregate } from "../../domain/party.aggregate";

export const toCustomerDto = (party: PartyAggregate): CustomerDto => ({
  id: party.id,
  displayName: party.displayName,
  email: party.primaryEmail,
  phone: party.primaryPhone,
  billingAddress: party.billingAddress
    ? {
        line1: party.billingAddress.line1,
        line2: party.billingAddress.line2 ?? undefined,
        city: party.billingAddress.city ?? undefined,
        postalCode: party.billingAddress.postalCode ?? undefined,
        country: party.billingAddress.country ?? undefined,
      }
    : undefined,
  vatId: party.vatId ?? undefined,
  notes: party.notes ?? undefined,
  tags: party.tags ?? [],
  archivedAt: party.archivedAt ? party.archivedAt.toISOString() : null,
  createdAt: party.createdAt.toISOString(),
  updatedAt: party.updatedAt.toISOString(),
});
