export class CopilotMessage {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly runId: string,
    public readonly role: string,
    public readonly partsJson: string,
    public readonly createdAt: Date,
    public readonly traceId?: string
  ) {}
}
