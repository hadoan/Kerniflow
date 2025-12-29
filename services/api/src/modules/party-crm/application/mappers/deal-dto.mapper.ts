import type { DealDto } from "@kerniflow/contracts";
import type { DealAggregate } from "../../domain/deal.aggregate";

export function toDealDto(deal: DealAggregate): DealDto {
  return {
    id: deal.id,
    tenantId: deal.tenantId,
    title: deal.title,
    partyId: deal.partyId,
    stageId: deal.stageId,
    amountCents: deal.amountCents,
    currency: deal.currency,
    expectedCloseDate: deal.expectedCloseDate,
    probability: deal.probability,
    status: deal.status,
    ownerUserId: deal.ownerUserId,
    notes: deal.notes,
    tags: deal.tags,
    wonAt: deal.wonAt ? deal.wonAt.toISOString() : null,
    lostAt: deal.lostAt ? deal.lostAt.toISOString() : null,
    lostReason: deal.lostReason,
    createdAt: deal.createdAt.toISOString(),
    updatedAt: deal.updatedAt.toISOString(),
  };
}
