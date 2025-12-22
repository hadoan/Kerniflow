export interface UseCaseContext {
  tenantId: string;
  userId: string;
  correlationId?: string;
  idempotencyKey?: string;
}
