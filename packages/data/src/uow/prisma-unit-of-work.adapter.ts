import { Injectable } from "@nestjs/common";
import { UnitOfWorkPort, TransactionContext } from "@corely/kernel";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Prisma implementation of UnitOfWorkPort.
 * Wraps operations in a Prisma transaction and passes the transaction client to repositories.
 */
@Injectable()
export class PrismaUnitOfWork implements UnitOfWorkPort {
  constructor(private readonly prisma: PrismaService) {}

  async withinTransaction<T>(fn: (tx: TransactionContext) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (prismaTransaction) => {
      // Cast the Prisma transaction client to TransactionContext
      // This is safe because TransactionContext is an opaque type
      return fn(prismaTransaction as unknown as TransactionContext);
    });
  }
}

/**
 * Type guard to check if a value is a Prisma transaction client.
 * Used internally by repositories to work with or without transactions.
 */
export type PrismaTransactionClient = Prisma.TransactionClient;

/**
 * Helper to extract Prisma client from transaction context or use default.
 */
export function getPrismaClient(
  prisma: PrismaService,
  tx?: TransactionContext
): PrismaService | PrismaTransactionClient {
  if (tx) {
    return tx as unknown as PrismaTransactionClient;
  }
  return prisma;
}
