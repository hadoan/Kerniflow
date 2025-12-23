export class ExpenseCreated {
  constructor(
    public readonly expenseId: string,
    public readonly tenantId: string,
    public readonly amount: number,
    public readonly description: string
  ) {}
}
