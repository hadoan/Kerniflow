import type { LocalDate } from "@corely/kernel";

export type DealStatus = "OPEN" | "WON" | "LOST";

type DealProps = {
  id: string;
  tenantId: string;
  title: string;
  partyId: string;
  stageId: string;
  amountCents: number | null;
  currency: string;
  expectedCloseDate: LocalDate | null;
  probability: number | null;
  status: DealStatus;
  ownerUserId: string | null;
  notes: string | null;
  tags: string[];
  wonAt: Date | null;
  lostAt: Date | null;
  lostReason: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export class DealAggregate {
  id: string;
  tenantId: string;
  title: string;
  partyId: string;
  stageId: string;
  amountCents: number | null;
  currency: string;
  expectedCloseDate: LocalDate | null;
  probability: number | null;
  status: DealStatus;
  ownerUserId: string | null;
  notes: string | null;
  tags: string[];
  wonAt: Date | null;
  lostAt: Date | null;
  lostReason: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(props: DealProps) {
    // Validate required fields
    if (!props.title.trim()) {
      throw new Error("Deal title is required");
    }
    if (!props.partyId) {
      throw new Error("Deal must be associated with a party");
    }
    if (!props.stageId) {
      throw new Error("Deal must have a stage");
    }

    // Validate probability if provided
    if (props.probability !== null && (props.probability < 0 || props.probability > 100)) {
      throw new Error("Probability must be between 0 and 100");
    }

    this.id = props.id;
    this.tenantId = props.tenantId;
    this.title = props.title;
    this.partyId = props.partyId;
    this.stageId = props.stageId;
    this.amountCents = props.amountCents;
    this.currency = props.currency;
    this.expectedCloseDate = props.expectedCloseDate;
    this.probability = props.probability;
    this.status = props.status;
    this.ownerUserId = props.ownerUserId;
    this.notes = props.notes;
    this.tags = props.tags;
    this.wonAt = props.wonAt;
    this.lostAt = props.lostAt;
    this.lostReason = props.lostReason;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static createDeal(params: {
    id: string;
    tenantId: string;
    title: string;
    partyId: string;
    stageId: string;
    amountCents?: number | null;
    currency?: string;
    expectedCloseDate?: LocalDate | null;
    probability?: number | null;
    ownerUserId?: string | null;
    notes?: string | null;
    tags?: string[];
    createdAt: Date;
  }) {
    return new DealAggregate({
      ...params,
      currency: params.currency ?? "EUR",
      amountCents: params.amountCents ?? null,
      expectedCloseDate: params.expectedCloseDate ?? null,
      probability: params.probability ?? null,
      ownerUserId: params.ownerUserId ?? null,
      notes: params.notes ?? null,
      tags: params.tags ?? [],
      status: "OPEN",
      wonAt: null,
      lostAt: null,
      lostReason: null,
      updatedAt: params.createdAt,
    });
  }

  updateDeal(
    patch: Partial<
      Pick<
        DealProps,
        | "title"
        | "partyId"
        | "amountCents"
        | "currency"
        | "expectedCloseDate"
        | "probability"
        | "ownerUserId"
        | "notes"
        | "tags"
      >
    >,
    now: Date
  ) {
    if (this.status !== "OPEN") {
      throw new Error("Cannot update a closed deal (status: WON or LOST)");
    }

    if (patch.title !== undefined) {
      if (!patch.title.trim()) {
        throw new Error("Deal title cannot be empty");
      }
      this.title = patch.title;
    }
    if (patch.partyId !== undefined) {
      this.partyId = patch.partyId;
    }
    if (patch.amountCents !== undefined) {
      this.amountCents = patch.amountCents;
    }
    if (patch.currency !== undefined) {
      this.currency = patch.currency;
    }
    if (patch.expectedCloseDate !== undefined) {
      this.expectedCloseDate = patch.expectedCloseDate;
    }
    if (patch.probability !== undefined) {
      if (patch.probability !== null && (patch.probability < 0 || patch.probability > 100)) {
        throw new Error("Probability must be between 0 and 100");
      }
      this.probability = patch.probability;
    }
    if (patch.ownerUserId !== undefined) {
      this.ownerUserId = patch.ownerUserId;
    }
    if (patch.notes !== undefined) {
      this.notes = patch.notes;
    }
    if (patch.tags !== undefined) {
      this.tags = patch.tags;
    }

    this.touch(now);
  }

  moveToStage(newStageId: string, now: Date) {
    if (this.status !== "OPEN") {
      throw new Error("Cannot move stage for a closed deal");
    }
    this.stageId = newStageId;
    this.touch(now);
  }

  markWon(wonAt: Date, now: Date) {
    if (this.status !== "OPEN") {
      throw new Error("Deal is already closed");
    }
    this.status = "WON";
    this.wonAt = wonAt;
    this.touch(now);
  }

  markLost(lostAt: Date, reason: string | null, now: Date) {
    if (this.status !== "OPEN") {
      throw new Error("Deal is already closed");
    }
    this.status = "LOST";
    this.lostAt = lostAt;
    this.lostReason = reason;
    this.touch(now);
  }

  private touch(now: Date) {
    this.updatedAt = now;
  }
}
