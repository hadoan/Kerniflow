import type { TaxCodeKind } from "@corely/contracts";
import { TaxCodeRepoPort } from "../../domain/ports";
import type { TaxCodeEntity } from "../../domain/entities";

export class InMemoryTaxCodeRepo extends TaxCodeRepoPort {
  private codes: TaxCodeEntity[] = [];

  async create(
    code: Omit<TaxCodeEntity, "id" | "createdAt" | "updatedAt">
  ): Promise<TaxCodeEntity> {
    const entity: TaxCodeEntity = {
      ...code,
      id: `code-${this.codes.length + 1}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.codes.push(entity);
    return entity;
  }

  async findById(id: string, tenantId: string): Promise<TaxCodeEntity | null> {
    return this.codes.find((c) => c.id === id && c.tenantId === tenantId) || null;
  }

  async findByCode(code: string, tenantId: string): Promise<TaxCodeEntity | null> {
    return this.codes.find((c) => c.code === code && c.tenantId === tenantId) || null;
  }

  async findByKind(kind: TaxCodeKind, tenantId: string): Promise<TaxCodeEntity[]> {
    return this.codes.filter((c) => c.kind === kind && c.tenantId === tenantId);
  }

  async findAll(tenantId: string, activeOnly = false): Promise<TaxCodeEntity[]> {
    return this.codes.filter((c) => c.tenantId === tenantId && (!activeOnly || c.isActive));
  }

  async update(
    id: string,
    tenantId: string,
    updates: Partial<Pick<TaxCodeEntity, "label" | "isActive" | "kind">>
  ): Promise<TaxCodeEntity> {
    const code = await this.findById(id, tenantId);
    if (!code) {
      throw new Error("Code not found");
    }

    Object.assign(code, updates, { updatedAt: new Date() });
    return code;
  }

  async delete(id: string, tenantId: string): Promise<void> {
    this.codes = this.codes.filter((c) => !(c.id === id && c.tenantId === tenantId));
  }

  // Test helper
  reset(): void {
    this.codes = [];
  }
}
