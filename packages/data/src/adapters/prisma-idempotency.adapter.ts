import { Injectable } from "@nestjs/common";
import { IdempotencyPort, TransactionContext } from "@corely/kernel";
import { PrismaService } from "../prisma/prisma.service";
import { getPrismaClient } from "../uow/prisma-unit-of-work.adapter";

/**
 * Prisma implementation of IdempotencyPort.
 * Supports both transactional and non-transactional operations.
 */
@Injectable()
export class PrismaIdempotencyAdapter implements IdempotencyPort {
  private readonly actionKey = "usecase";

  constructor(private readonly prisma: PrismaService) {}

  async isProcessed(key: string, tx?: TransactionContext): Promise<boolean> {
    const client = getPrismaClient(this.prisma, tx);
    const uniqueKey = {
      tenantId: null as unknown as string,
      actionKey: this.actionKey,
      key,
    };
    const record = await client.idempotencyKey.findUnique({
      where: { tenantId_actionKey_key: uniqueKey },
    });
    return record !== null;
  }

  async markAsProcessed(key: string, result?: any, tx?: TransactionContext): Promise<void> {
    const client = getPrismaClient(this.prisma, tx);
    await client.idempotencyKey.create({
      data: {
        tenantId: null,
        actionKey: this.actionKey,
        key,
        responseJson: result ? JSON.stringify(result) : null,
      },
    });
  }

  async getResult<T = any>(key: string, tx?: TransactionContext): Promise<T | null> {
    const client = getPrismaClient(this.prisma, tx);
    const uniqueKey = {
      tenantId: null as unknown as string,
      actionKey: this.actionKey,
      key,
    };
    const record = await client.idempotencyKey.findUnique({
      where: { tenantId_actionKey_key: uniqueKey },
    });
    if (!record || !record.responseJson) {
      return null;
    }
    return JSON.parse(record.responseJson as string);
  }

  async run<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const uniqueKey = {
      tenantId: null as unknown as string,
      actionKey: this.actionKey,
      key,
    };

    // Check if result already exists
    const existing = await this.getResult<T>(key);
    if (existing !== null) {
      return existing;
    }

    // Try to create a placeholder record to claim this key
    try {
      await this.prisma.idempotencyKey.create({
        data: {
          tenantId: null,
          actionKey: this.actionKey,
          key,
          responseJson: null,
        },
      });
    } catch (error: unknown) {
      // Record already exists (unique constraint violation)
      // Another process is handling or has handled this key
      const isPrismaUniqueConstraintError =
        typeof error === "object" && error !== null && "code" in error && error.code === "P2002";

      if (isPrismaUniqueConstraintError) {
        // Wait briefly for the other process to complete
        await new Promise((resolve) => setTimeout(resolve, 100));
        const result = await this.getResult<T>(key);
        if (result !== null) {
          return result;
        }
        throw new Error(`Concurrent execution detected for key ${key}, but no result available`);
      }
      throw error;
    }

    // We successfully claimed the key, now execute the function
    let result: T;
    try {
      result = await fn();
    } catch (error) {
      // Clean up the placeholder record on error
      await this.prisma.idempotencyKey
        .delete({ where: { tenantId_actionKey_key: uniqueKey } })
        .catch(() => {});
      throw error;
    }

    // Update the record with the actual result
    await this.prisma.idempotencyKey.update({
      where: { tenantId_actionKey_key: uniqueKey },
      data: {
        responseJson: JSON.stringify(result),
      },
    });

    return result;
  }
}
