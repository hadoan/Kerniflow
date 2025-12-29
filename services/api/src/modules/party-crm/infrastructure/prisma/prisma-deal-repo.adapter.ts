import { Injectable } from "@nestjs/common";
import { PrismaService } from "@kerniflow/data";
import { DealAggregate } from "../../domain/deal.aggregate";
import type {
  DealRepoPort,
  DealStageTransition,
  ListDealsFilters,
  ListDealsResult,
} from "../../application/ports/deal-repository.port";

type DealRow = {
  id: string;
  tenantId: string;
  title: string;
  partyId: string;
  stageId: string;
  amountCents: number | null;
  currency: string;
  expectedCloseDate: Date | null;
  probability: number | null;
  status: "OPEN" | "WON" | "LOST";
  ownerUserId: string | null;
  notes: string | null;
  tags: string[];
  wonAt: Date | null;
  lostAt: Date | null;
  lostReason: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const toAggregate = (row: DealRow): DealAggregate => {
  return new DealAggregate({
    id: row.id,
    tenantId: row.tenantId,
    title: row.title,
    partyId: row.partyId,
    stageId: row.stageId,
    amountCents: row.amountCents,
    currency: row.currency,
    expectedCloseDate: row.expectedCloseDate
      ? row.expectedCloseDate.toISOString().split("T")[0]
      : null,
    probability: row.probability,
    status: row.status,
    ownerUserId: row.ownerUserId,
    notes: row.notes,
    tags: row.tags ?? [],
    wonAt: row.wonAt,
    lostAt: row.lostAt,
    lostReason: row.lostReason,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
};

@Injectable()
export class PrismaDealRepoAdapter implements DealRepoPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, dealId: string): Promise<DealAggregate | null> {
    const row = await this.prisma.deal.findFirst({
      where: { id: dealId, tenantId },
    });

    if (!row) {
      return null;
    }

    return toAggregate(row as DealRow);
  }

  async list(
    tenantId: string,
    filters: ListDealsFilters,
    pageSize = 20,
    cursor?: string
  ): Promise<ListDealsResult> {
    const where = {
      tenantId,
      ...(filters.partyId ? { partyId: filters.partyId } : {}),
      ...(filters.stageId ? { stageId: filters.stageId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.ownerUserId ? { ownerUserId: filters.ownerUserId } : {}),
    };

    const results = await this.prisma.deal.findMany({
      where,
      take: pageSize,
      skip: cursor ? 1 : 0,
      ...(cursor ? { cursor: { id: cursor } } : {}),
      orderBy: { createdAt: "desc" },
    });

    const deals = results.map((row) => toAggregate(row as DealRow));
    const nextCursor = deals.length === pageSize ? (deals.at(-1)?.id ?? null) : null;

    return { deals, nextCursor };
  }

  async create(tenantId: string, deal: DealAggregate): Promise<void> {
    if (tenantId !== deal.tenantId) {
      throw new Error("Tenant mismatch when creating deal");
    }

    await this.prisma.deal.create({
      data: {
        id: deal.id,
        tenantId: deal.tenantId,
        title: deal.title,
        partyId: deal.partyId,
        stageId: deal.stageId,
        amountCents: deal.amountCents,
        currency: deal.currency,
        expectedCloseDate: deal.expectedCloseDate ? new Date(deal.expectedCloseDate) : null,
        probability: deal.probability,
        status: deal.status,
        ownerUserId: deal.ownerUserId,
        notes: deal.notes,
        tags: deal.tags,
        wonAt: deal.wonAt,
        lostAt: deal.lostAt,
        lostReason: deal.lostReason,
        createdAt: deal.createdAt,
        updatedAt: deal.updatedAt,
      },
    });
  }

  async update(tenantId: string, deal: DealAggregate): Promise<void> {
    if (tenantId !== deal.tenantId) {
      throw new Error("Tenant mismatch when updating deal");
    }

    await this.prisma.deal.update({
      where: { id: deal.id },
      data: {
        title: deal.title,
        partyId: deal.partyId,
        stageId: deal.stageId,
        amountCents: deal.amountCents,
        currency: deal.currency,
        expectedCloseDate: deal.expectedCloseDate ? new Date(deal.expectedCloseDate) : null,
        probability: deal.probability,
        status: deal.status,
        ownerUserId: deal.ownerUserId,
        notes: deal.notes,
        tags: deal.tags,
        wonAt: deal.wonAt,
        lostAt: deal.lostAt,
        lostReason: deal.lostReason,
        updatedAt: deal.updatedAt,
      },
    });
  }

  async recordStageTransition(transition: DealStageTransition): Promise<void> {
    await this.prisma.dealStageTransition.create({
      data: {
        tenantId: transition.tenantId,
        dealId: transition.dealId,
        fromStageId: transition.fromStageId,
        toStageId: transition.toStageId,
        transitionedByUserId: transition.transitionedByUserId,
        transitionedAt: transition.transitionedAt,
      },
    });
  }

  async getStageTransitions(
    tenantId: string,
    dealId: string,
    limit = 100
  ): Promise<DealStageTransition[]> {
    const rows = await this.prisma.dealStageTransition.findMany({
      where: { tenantId, dealId },
      orderBy: { transitionedAt: "desc" },
      take: limit,
    });

    return rows.map((row) => ({
      tenantId: row.tenantId,
      dealId: row.dealId,
      fromStageId: row.fromStageId,
      toStageId: row.toStageId,
      transitionedByUserId: row.transitionedByUserId,
      transitionedAt: row.transitionedAt,
    }));
  }
}
