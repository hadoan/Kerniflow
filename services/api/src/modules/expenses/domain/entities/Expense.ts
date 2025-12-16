export class Expense {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly amount: number,
    public readonly description: string,
    public readonly createdAt: Date,
  ) {}
}