export type ActivityType = "NOTE" | "TASK" | "CALL" | "MEETING" | "EMAIL_DRAFT";
export type ActivityStatus = "OPEN" | "COMPLETED" | "CANCELED";

type ActivityProps = {
  id: string;
  tenantId: string;
  type: ActivityType;
  subject: string;
  body: string | null;
  channelKey: string | null;
  messageDirection: string | null;
  messageTo: string | null;
  openUrl: string | null;
  partyId: string | null;
  dealId: string | null;
  dueAt: Date | null;
  completedAt: Date | null;
  status: ActivityStatus;
  assignedToUserId: string | null;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export class ActivityEntity {
  id: string;
  tenantId: string;
  type: ActivityType;
  subject: string;
  body: string | null;
  channelKey: string | null;
  messageDirection: string | null;
  messageTo: string | null;
  openUrl: string | null;
  partyId: string | null;
  dealId: string | null;
  dueAt: Date | null;
  completedAt: Date | null;
  status: ActivityStatus;
  assignedToUserId: string | null;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(props: ActivityProps) {
    // Validate required fields
    if (!props.subject.trim()) {
      throw new Error("Activity subject is required");
    }

    // Validate that at least one context is provided (partyId or dealId)
    if (!props.partyId && !props.dealId) {
      throw new Error("Activity must be associated with either a party or a deal");
    }

    this.id = props.id;
    this.tenantId = props.tenantId;
    this.type = props.type;
    this.subject = props.subject;
    this.body = props.body;
    this.channelKey = props.channelKey;
    this.messageDirection = props.messageDirection;
    this.messageTo = props.messageTo;
    this.openUrl = props.openUrl;
    this.partyId = props.partyId;
    this.dealId = props.dealId;
    this.dueAt = props.dueAt;
    this.completedAt = props.completedAt;
    this.status = props.status;
    this.assignedToUserId = props.assignedToUserId;
    this.createdByUserId = props.createdByUserId;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(params: {
    id: string;
    tenantId: string;
    type: ActivityType;
    subject: string;
    body?: string | null;
    channelKey?: string | null;
    messageDirection?: string | null;
    messageTo?: string | null;
    openUrl?: string | null;
    partyId?: string | null;
    dealId?: string | null;
    dueAt?: Date | null;
    assignedToUserId?: string | null;
    createdByUserId?: string | null;
    createdAt: Date;
  }) {
    return new ActivityEntity({
      ...params,
      body: params.body ?? null,
      channelKey: params.channelKey ?? null,
      messageDirection: params.messageDirection ?? null,
      messageTo: params.messageTo ?? null,
      openUrl: params.openUrl ?? null,
      partyId: params.partyId ?? null,
      dealId: params.dealId ?? null,
      dueAt: params.dueAt ?? null,
      assignedToUserId: params.assignedToUserId ?? null,
      createdByUserId: params.createdByUserId ?? null,
      status: "OPEN",
      completedAt: null,
      updatedAt: params.createdAt,
    });
  }

  updateActivity(
    patch: Partial<Pick<ActivityProps, "subject" | "body" | "dueAt" | "assignedToUserId">>,
    now: Date
  ) {
    if (this.status === "COMPLETED") {
      throw new Error("Cannot update a completed activity");
    }
    if (this.status === "CANCELED") {
      throw new Error("Cannot update a canceled activity");
    }

    if (patch.subject !== undefined) {
      if (!patch.subject.trim()) {
        throw new Error("Activity subject cannot be empty");
      }
      this.subject = patch.subject;
    }
    if (patch.body !== undefined) {
      this.body = patch.body;
    }
    if (patch.dueAt !== undefined) {
      this.dueAt = patch.dueAt;
    }
    if (patch.assignedToUserId !== undefined) {
      this.assignedToUserId = patch.assignedToUserId;
    }

    this.touch(now);
  }

  complete(completedAt: Date, now: Date) {
    if (this.status === "COMPLETED") {
      throw new Error("Activity is already completed");
    }
    if (this.status === "CANCELED") {
      throw new Error("Cannot complete a canceled activity");
    }

    this.status = "COMPLETED";
    this.completedAt = completedAt;
    this.touch(now);
  }

  cancel(now: Date) {
    if (this.status === "COMPLETED") {
      throw new Error("Cannot cancel a completed activity");
    }
    if (this.status === "CANCELED") {
      throw new Error("Activity is already canceled");
    }

    this.status = "CANCELED";
    this.touch(now);
  }

  reopen(now: Date) {
    if (this.status === "OPEN") {
      throw new Error("Activity is already open");
    }

    this.status = "OPEN";
    this.completedAt = null;
    this.touch(now);
  }

  private touch(now: Date) {
    this.updatedAt = now;
  }
}
