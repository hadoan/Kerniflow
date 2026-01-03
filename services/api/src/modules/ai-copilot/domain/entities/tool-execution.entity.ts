export class ToolExecution {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly runId: string,
    public readonly toolCallId: string,
    public readonly toolName: string,
    public readonly inputJson: string,
    public status: string,
    public readonly startedAt: Date,
    public finishedAt?: Date,
    public outputJson?: string,
    public errorJson?: string,
    public readonly traceId?: string
  ) {}
}
