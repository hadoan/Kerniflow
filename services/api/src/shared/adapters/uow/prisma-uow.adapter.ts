import { PrismaClient } from "@prisma/client";
import { UnitOfWorkPort } from "@kerniflow/kernel";

/**
 * Wraps a PrismaClient $transaction. Nested calls reuse the outer scope.
 * Note: repositories must use the same Prisma client instance passed here.
 */
export class PrismaUnitOfWorkAdapter implements UnitOfWorkPort {
  private depth = 0;

  constructor(private readonly prisma: PrismaClient) {}

  async withinTransaction<T>(fn: () => Promise<T>): Promise<T> {
    if (this.depth > 0) {
      return fn();
    }

    this.depth += 1;
    try {
      return await this.prisma.$transaction(async () => fn());
    } finally {
      this.depth -= 1;
    }
  }
}
