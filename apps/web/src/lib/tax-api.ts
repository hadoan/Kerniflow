/**
 * Tax API Client
 * Wrapper around tax endpoints for managing tax profiles, codes, calculations, and VAT reporting
 */

import type {
  GetTaxProfileOutput,
  UpsertTaxProfileInput,
  UpsertTaxProfileOutput,
  ListTaxCodesOutput,
  CreateTaxCodeInput,
  CreateTaxCodeOutput,
  UpdateTaxCodeInput,
  UpdateTaxCodeOutput,
  ListTaxRatesOutput,
  CreateTaxRateInput,
  CreateTaxRateOutput,
  CalculateTaxInput,
  CalculateTaxOutput,
  LockTaxSnapshotInput,
  LockTaxSnapshotOutput,
  TaxProfileDto,
  TaxCodeDto,
  TaxRateDto,
  TaxBreakdownDto,
  TaxSnapshotDto,
} from "@kerniflow/contracts";
import { apiClient } from "./api-client";

export class TaxApi {
  // ============================================================================
  // Tax Profile
  // ============================================================================

  /**
   * Get active tax profile for tenant
   */
  async getProfile(): Promise<TaxProfileDto | null> {
    const result = await apiClient.get<GetTaxProfileOutput>("/tax/profile", {
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.profile;
  }

  /**
   * Create or update tax profile
   */
  async upsertProfile(
    input: UpsertTaxProfileInput,
    idempotencyKey?: string
  ): Promise<TaxProfileDto> {
    const result = await apiClient.put<UpsertTaxProfileOutput>("/tax/profile", input, {
      idempotencyKey: idempotencyKey || apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.profile;
  }

  // ============================================================================
  // Tax Codes
  // ============================================================================

  /**
   * List all tax codes for tenant
   */
  async listTaxCodes(): Promise<TaxCodeDto[]> {
    const result = await apiClient.get<ListTaxCodesOutput>("/tax/codes", {
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.codes;
  }

  /**
   * Create new tax code
   */
  async createTaxCode(input: CreateTaxCodeInput, idempotencyKey?: string): Promise<TaxCodeDto> {
    const result = await apiClient.post<CreateTaxCodeOutput>("/tax/codes", input, {
      idempotencyKey: idempotencyKey || apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.code;
  }

  /**
   * Update tax code
   */
  async updateTaxCode(
    id: string,
    input: UpdateTaxCodeInput,
    idempotencyKey?: string
  ): Promise<TaxCodeDto> {
    const result = await apiClient.patch<UpdateTaxCodeOutput>(`/tax/codes/${id}`, input, {
      idempotencyKey: idempotencyKey || apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.code;
  }

  // ============================================================================
  // Tax Rates
  // ============================================================================

  /**
   * List rates for a tax code
   */
  async listTaxRates(taxCodeId: string): Promise<TaxRateDto[]> {
    const result = await apiClient.get<ListTaxRatesOutput>(`/tax/rates?taxCodeId=${taxCodeId}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.rates;
  }

  /**
   * Create new tax rate
   */
  async createTaxRate(input: CreateTaxRateInput, idempotencyKey?: string): Promise<TaxRateDto> {
    const result = await apiClient.post<CreateTaxRateOutput>("/tax/rates", input, {
      idempotencyKey: idempotencyKey || apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.rate;
  }

  // ============================================================================
  // Tax Calculation
  // ============================================================================

  /**
   * Calculate tax for draft preview (invoice/expense)
   */
  async calculateTax(input: CalculateTaxInput): Promise<TaxBreakdownDto> {
    const result = await apiClient.post<CalculateTaxOutput>("/tax/calculate", input, {
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.breakdown;
  }

  /**
   * Lock immutable tax snapshot for finalized document
   */
  async lockSnapshot(
    input: LockTaxSnapshotInput,
    idempotencyKey?: string
  ): Promise<TaxSnapshotDto> {
    const result = await apiClient.post<LockTaxSnapshotOutput>("/tax/snapshots/lock", input, {
      idempotencyKey: idempotencyKey || apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.snapshot;
  }
}

export const taxApi = new TaxApi();
