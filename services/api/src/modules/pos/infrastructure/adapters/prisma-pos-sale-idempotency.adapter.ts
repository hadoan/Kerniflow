import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type { SyncPosSaleOutput } from "@corely/contracts";
import type { PosSaleIdempotencyPort } from "../../application/ports/pos-sale-idempotency.port";

@Injectable()
export class PrismaPosSaleIdempotencyAdapter implements PosSaleIdempotencyPort {
  constructor(private prisma: PrismaService) {}

  async get(workspaceId: string, idempotencyKey: string): Promise<SyncPosSaleOutput | null> {
    const record = await this.prisma.posSaleIdempotency.findUnique({
      where: {
        idempotencyKey,
        workspaceId,
      },
    });

    if (!record) {
      return null;
    }

    return {
      ok: true,
      serverInvoiceId: record.serverInvoiceId,
      serverPaymentId: record.serverPaymentId ?? undefined,
      receiptNumber: record.receiptNumber,
    };
  }

  async store(
    workspaceId: string,
    idempotencyKey: string,
    posSaleId: string,
    result: SyncPosSaleOutput
  ): Promise<void> {
    await this.prisma.posSaleIdempotency.create({
      data: {
        idempotencyKey,
        workspaceId,
        posSaleId,
        serverInvoiceId: result.serverInvoiceId!,
        serverPaymentId: result.serverPaymentId ?? null,
        receiptNumber: result.receiptNumber!,
      },
    });
  }
}
