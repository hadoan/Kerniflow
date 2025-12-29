import { Injectable } from "@nestjs/common";
import { PrismaService } from "@kerniflow/data";
import type { InventorySettingsRepositoryPort } from "../../application/ports/settings-repository.port";
import { InventorySettingsAggregate } from "../../domain/settings.aggregate";

@Injectable()
export class PrismaInventorySettingsRepository implements InventorySettingsRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByTenant(tenantId: string): Promise<InventorySettingsAggregate | null> {
    const data = await this.prisma.inventorySettings.findFirst({ where: { tenantId } });
    if (!data) {
      return null;
    }
    return InventorySettingsAggregate.fromProps({
      id: data.id,
      tenantId: data.tenantId,
      receiptPrefix: data.receiptPrefix,
      receiptNextNumber: data.receiptNextNumber,
      deliveryPrefix: data.deliveryPrefix,
      deliveryNextNumber: data.deliveryNextNumber,
      transferPrefix: data.transferPrefix,
      transferNextNumber: data.transferNextNumber,
      adjustmentPrefix: data.adjustmentPrefix,
      adjustmentNextNumber: data.adjustmentNextNumber,
      negativeStockPolicy: data.negativeStockPolicy as any,
      reservationPolicy: data.reservationPolicy as any,
      defaultWarehouseId: data.defaultWarehouseId ?? null,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  async save(settings: InventorySettingsAggregate): Promise<void> {
    const props = settings.toProps();
    await this.prisma.inventorySettings.upsert({
      where: { tenantId: props.tenantId },
      update: {
        receiptPrefix: props.receiptPrefix,
        receiptNextNumber: props.receiptNextNumber,
        deliveryPrefix: props.deliveryPrefix,
        deliveryNextNumber: props.deliveryNextNumber,
        transferPrefix: props.transferPrefix,
        transferNextNumber: props.transferNextNumber,
        adjustmentPrefix: props.adjustmentPrefix,
        adjustmentNextNumber: props.adjustmentNextNumber,
        negativeStockPolicy: props.negativeStockPolicy as any,
        reservationPolicy: props.reservationPolicy as any,
        defaultWarehouseId: props.defaultWarehouseId ?? undefined,
        updatedAt: props.updatedAt,
      },
      create: {
        id: props.id,
        tenantId: props.tenantId,
        receiptPrefix: props.receiptPrefix,
        receiptNextNumber: props.receiptNextNumber,
        deliveryPrefix: props.deliveryPrefix,
        deliveryNextNumber: props.deliveryNextNumber,
        transferPrefix: props.transferPrefix,
        transferNextNumber: props.transferNextNumber,
        adjustmentPrefix: props.adjustmentPrefix,
        adjustmentNextNumber: props.adjustmentNextNumber,
        negativeStockPolicy: props.negativeStockPolicy as any,
        reservationPolicy: props.reservationPolicy as any,
        defaultWarehouseId: props.defaultWarehouseId ?? undefined,
        createdAt: props.createdAt,
        updatedAt: props.updatedAt,
      },
    });
  }
}
