import { prisma } from "@kerniflow/data";
import { IdempotencyPort, StoredResponse } from "../../ports/idempotency.port";

export class PrismaIdempotencyAdapter implements IdempotencyPort {
  async get(
    actionKey: string,
    tenantId: string | null,
    key: string
  ): Promise<StoredResponse | null> {
    const existing = await prisma.idempotencyKey.findUnique({
      where: {
        tenantId_actionKey_key: {
          tenantId: tenantId as string,
          actionKey,
          key,
        },
      },
    });
    if (!existing || !existing.responseJson) return null;
    return {
      statusCode: existing.statusCode ?? undefined,
      body: JSON.parse(existing.responseJson),
    };
  }

  async store(
    actionKey: string,
    tenantId: string | null,
    key: string,
    response: StoredResponse
  ): Promise<void> {
    await prisma.idempotencyKey.upsert({
      where: {
        tenantId_actionKey_key: {
          tenantId: tenantId as string,
          actionKey,
          key,
        },
      },
      update: {
        responseJson: JSON.stringify(response.body ?? null),
        statusCode: response.statusCode,
      },
      create: {
        tenantId,
        actionKey,
        key,
        responseJson: JSON.stringify(response.body ?? null),
        statusCode: response.statusCode,
      },
    });
  }
}
