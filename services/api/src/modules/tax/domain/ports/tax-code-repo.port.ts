import type { TaxCodeEntity } from "../entities";
import type { TaxCodeKind } from "@corely/contracts";

export abstract class TaxCodeRepoPort {
  /**
   * Create new tax code
   */
  abstract create(
    code: Omit<TaxCodeEntity, "id" | "createdAt" | "updatedAt">
  ): Promise<TaxCodeEntity>;

  /**
   * Find tax code by ID
   */
  abstract findById(id: string, tenantId: string): Promise<TaxCodeEntity | null>;

  /**
   * Find tax code by code string
   */
  abstract findByCode(code: string, tenantId: string): Promise<TaxCodeEntity | null>;

  /**
   * Find tax codes by kind
   */
  abstract findByKind(kind: TaxCodeKind, tenantId: string): Promise<TaxCodeEntity[]>;

  /**
   * List all tax codes for tenant
   */
  abstract findAll(tenantId: string, activeOnly?: boolean): Promise<TaxCodeEntity[]>;

  /**
   * Update tax code
   */
  abstract update(
    id: string,
    tenantId: string,
    updates: Partial<Pick<TaxCodeEntity, "label" | "isActive" | "kind">>
  ): Promise<TaxCodeEntity>;

  /**
   * Delete tax code (if no rates exist)
   */
  abstract delete(id: string, tenantId: string): Promise<void>;
}
