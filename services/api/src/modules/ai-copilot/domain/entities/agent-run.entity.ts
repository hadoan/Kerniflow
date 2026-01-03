export class AgentRun {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly createdByUserId: string | null,
    public status: string,
    public readonly startedAt: Date,
    public finishedAt?: Date,
    public metadataJson?: string,
    public readonly traceId?: string
  ) {}
}
