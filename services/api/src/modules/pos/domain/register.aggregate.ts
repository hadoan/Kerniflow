import type { Register as RegisterDto } from "@corely/contracts";

/**
 * Register Aggregate - POS device/location
 */
export class Register {
  constructor(
    public readonly id: string,
    public readonly workspaceId: string,
    public name: string,
    public defaultWarehouseId: string | null,
    public defaultBankAccountId: string | null,
    public status: "ACTIVE" | "INACTIVE",
    public readonly createdAt: Date,
    public updatedAt: Date
  ) {}

  /**
   * Update register details
   */
  update(data: {
    name?: string;
    defaultWarehouseId?: string | null;
    defaultBankAccountId?: string | null;
  }): void {
    if (data.name !== undefined) {
      this.name = data.name;
    }
    if (data.defaultWarehouseId !== undefined) {
      this.defaultWarehouseId = data.defaultWarehouseId;
    }
    if (data.defaultBankAccountId !== undefined) {
      this.defaultBankAccountId = data.defaultBankAccountId;
    }
    this.updatedAt = new Date();
  }

  /**
   * Deactivate register
   */
  deactivate(): void {
    this.status = "INACTIVE";
    this.updatedAt = new Date();
  }

  /**
   * Activate register
   */
  activate(): void {
    this.status = "ACTIVE";
    this.updatedAt = new Date();
  }

  /**
   * Convert to DTO
   */
  toDto(): RegisterDto {
    return {
      registerId: this.id,
      workspaceId: this.workspaceId,
      name: this.name,
      defaultWarehouseId: this.defaultWarehouseId,
      defaultBankAccountId: this.defaultBankAccountId,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
