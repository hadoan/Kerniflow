export class Expense {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly merchant: string,
    public readonly totalCents: number,
    public readonly taxAmountCents: number | null,
    public readonly currency: string,
    public readonly category: string | null,
    public readonly issuedAt: Date,
    public readonly createdByUserId: string,
    public readonly createdAt: Date,
    public archivedAt: Date | null = null,
    public archivedByUserId: string | null = null,
    public readonly custom: Record<string, unknown> | null = null
  ) {}

  archive(now: Date, userId: string) {
    if (this.archivedAt) {
      return;
    }
    this.archivedAt = now;
    this.archivedByUserId = userId;
  }

  unarchive() {
    this.archivedAt = null;
    this.archivedByUserId = null;
  }
}
