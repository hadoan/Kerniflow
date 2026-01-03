export class Expense {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public merchant: string,
    public totalCents: number,
    public taxAmountCents: number | null,
    public currency: string,
    public category: string | null,
    public issuedAt: Date,
    public readonly createdByUserId: string,
    public readonly createdAt: Date,
    public archivedAt: Date | null = null,
    public archivedByUserId: string | null = null,
    public custom: Record<string, unknown> | null = null
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
    if (data.merchant !== undefined) {
      this.merchant = data.merchant;
    }
    if (data.totalCents !== undefined) {
      this.totalCents = data.totalCents;
    }
    if (data.taxAmountCents !== undefined) {
      this.taxAmountCents = data.taxAmountCents;
    }
    if (data.currency !== undefined) {
      this.currency = data.currency;
    }
    if (data.category !== undefined) {
      this.category = data.category;
    }
    if (data.issuedAt !== undefined) {
      this.issuedAt = data.issuedAt;
    }
    if (data.custom !== undefined) {
      this.custom = data.custom;
    }
  }
}
