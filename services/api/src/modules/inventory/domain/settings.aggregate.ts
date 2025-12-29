import type { InventoryDocumentType, InventorySettingsProps } from "./inventory.types";

export class InventorySettingsAggregate {
  private props: InventorySettingsProps;

  private constructor(props: InventorySettingsProps) {
    this.props = props;
  }

  static createDefault(params: {
    id: string;
    tenantId: string;
    now: Date;
  }): InventorySettingsAggregate {
    return new InventorySettingsAggregate({
      id: params.id,
      tenantId: params.tenantId,
      receiptPrefix: "RCPT-",
      receiptNextNumber: 1,
      deliveryPrefix: "DLV-",
      deliveryNextNumber: 1,
      transferPrefix: "TRF-",
      transferNextNumber: 1,
      adjustmentPrefix: "ADJ-",
      adjustmentNextNumber: 1,
      negativeStockPolicy: "DISALLOW",
      reservationPolicy: "FULL_ONLY",
      defaultWarehouseId: null,
      createdAt: params.now,
      updatedAt: params.now,
    });
  }

  static fromProps(props: InventorySettingsProps): InventorySettingsAggregate {
    return new InventorySettingsAggregate({ ...props });
  }

  allocateDocumentNumber(documentType: InventoryDocumentType): string {
    const prefix = this.prefixFor(documentType);
    const next = this.nextNumberFor(documentType);
    return `${prefix}${next}`;
  }

  touch(now: Date) {
    this.props.updatedAt = now;
  }

  toProps(): InventorySettingsProps {
    return { ...this.props };
  }

  private prefixFor(documentType: InventoryDocumentType): string {
    switch (documentType) {
      case "RECEIPT":
        return this.props.receiptPrefix;
      case "DELIVERY":
        return this.props.deliveryPrefix;
      case "TRANSFER":
        return this.props.transferPrefix;
      case "ADJUSTMENT":
        return this.props.adjustmentPrefix;
    }
  }

  private nextNumberFor(documentType: InventoryDocumentType): number {
    switch (documentType) {
      case "RECEIPT":
        return this.props.receiptNextNumber++;
      case "DELIVERY":
        return this.props.deliveryNextNumber++;
      case "TRANSFER":
        return this.props.transferNextNumber++;
      case "ADJUSTMENT":
        return this.props.adjustmentNextNumber++;
    }
  }
}
