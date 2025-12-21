export type UseCaseContext = {
  tenantId?: string;
  userId?: string;
  correlationId?: string;
  requestId?: string;
  roles?: string[];
  metadata?: Record<string, unknown>;
};
