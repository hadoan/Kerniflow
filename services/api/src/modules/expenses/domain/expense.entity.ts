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

  update(data: {
    merchant?: string;
    totalCents?: number;
    taxAmountCents?: number | null;
    currency?: string;
    category?: string | null;
    issuedAt?: Date;
    custom?: Record<string, unknown> | null;
  }) {
    if (data.merchant !== undefined) {this.merchant = data.merchant;}
    if (data.totalCents !== undefined) {this.totalCents = data.totalCents;}
    if (data.taxAmountCents !== undefined) {this.taxAmountCents = data.taxAmountCents;}
    if (data.currency !== undefined) {this.currency = data.currency;}
    if (data.category !== undefined) {this.category = data.category;}
    if (data.issuedAt !== undefined) {this.issuedAt = data.issuedAt;}
    if (data.custom !== undefined) {this.custom = data.custom;}
  }
}
