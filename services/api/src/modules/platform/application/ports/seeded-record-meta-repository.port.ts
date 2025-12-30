import type { TransactionContext } from "@kerniflow/kernel";

export interface SeededRecordMetaEntity {
  id: string;
  tenantId: string;
  targetTable: string;
  targetId: string;
  sourceTemplateId: string;
  sourceTemplateVersion: string;
  isCustomized: boolean;
  customizedAt?: Date | null;
  customizedByUserId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSeededRecordMetaDto {
  id: string;
  tenantId: string;
  targetTable: string;
  targetId: string;
  sourceTemplateId: string;
  sourceTemplateVersion: string;
  isCustomized?: boolean;
}

/**
 * Seeded Record Meta Repository Port
 * Tracks template-seeded records for customization protection
 */
export interface SeededRecordMetaRepositoryPort {
  /**
   * Find metadata by target
   */
  findByTarget(
    tenantId: string,
    targetTable: string,
    targetId: string,
    tx?: TransactionContext
  ): Promise<SeededRecordMetaEntity | null>;

  /**
   * Create seeded record metadata
   */
  create(data: CreateSeededRecordMetaDto, tx?: TransactionContext): Promise<SeededRecordMetaEntity>;

  /**
   * Mark a record as customized
   */
  markAsCustomized(
    tenantId: string,
    targetTable: string,
    targetId: string,
    userId: string,
    tx?: TransactionContext
  ): Promise<void>;

  /**
   * List all seeded records from a template
   */
  listByTemplate(
    tenantId: string,
    sourceTemplateId: string,
    tx?: TransactionContext
  ): Promise<SeededRecordMetaEntity[]>;

  /**
   * Check if a record is customized
   */
  isCustomized(
    tenantId: string,
    targetTable: string,
    targetId: string,
    tx?: TransactionContext
  ): Promise<boolean>;
}

export const SEEDED_RECORD_META_REPOSITORY_TOKEN = Symbol("SEEDED_RECORD_META_REPOSITORY_TOKEN");
