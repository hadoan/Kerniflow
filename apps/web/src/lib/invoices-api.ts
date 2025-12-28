/**
 * Invoices API Client
 * Handles HTTP calls to invoice endpoints
 */

import type { CreateInvoiceInput, CreateInvoiceOutput, InvoiceDto } from "@kerniflow/contracts";
import { apiClient } from "./api-client";

export class InvoicesApi {
  /**
   * Create a new invoice
   */
  async createInvoice(input: CreateInvoiceInput, idempotencyKey?: string): Promise<InvoiceDto> {
    const result = await apiClient.post<CreateInvoiceOutput>("/invoices", input, {
      idempotencyKey: idempotencyKey || apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.invoice;
  }

  /**
   * Get all invoices
   */
  async listInvoices(): Promise<InvoiceDto[]> {
    const result = await apiClient.get<unknown>("/invoices", {
      correlationId: apiClient.generateCorrelationId(),
    });

    if (Array.isArray(result)) {
      return result as InvoiceDto[];
    }

    if (
      typeof result === "object" &&
      result !== null &&
      "items" in result &&
      Array.isArray((result as { items: unknown }).items)
    ) {
      return (result as { items: InvoiceDto[] }).items;
    }

    if (
      typeof result === "object" &&
      result !== null &&
      "invoices" in result &&
      Array.isArray((result as { invoices: unknown }).invoices)
    ) {
      return (result as { invoices: InvoiceDto[] }).invoices;
    }

    return [];
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(id: string): Promise<InvoiceDto> {
    const result = await apiClient.get<{ invoice: InvoiceDto }>(`/invoices/${id}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.invoice;
  }

  /**
   * Update invoice
   */
  async updateInvoice(id: string, input: Partial<CreateInvoiceInput>): Promise<InvoiceDto> {
    const result = await apiClient.patch<{ invoice: InvoiceDto }>(`/invoices/${id}`, input, {
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.invoice;
  }

  /**
   * Finalize invoice (change from DRAFT to ISSUED)
   */
  async finalizeInvoice(id: string): Promise<InvoiceDto> {
    const result = await apiClient.post<{ invoice: InvoiceDto }>(
      `/invoices/${id}/finalize`,
      {},
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.invoice;
  }

  /**
   * Send invoice to customer
   */
  async sendInvoice(id: string): Promise<InvoiceDto> {
    const result = await apiClient.post<{ invoice: InvoiceDto }>(
      `/invoices/${id}/send`,
      {},
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.invoice;
  }

  /**
   * Cancel invoice
   */
  async cancelInvoice(id: string, reason?: string): Promise<InvoiceDto> {
    const result = await apiClient.post<{ invoice: InvoiceDto }>(
      `/invoices/${id}/cancel`,
      { reason },
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.invoice;
  }
}

export const invoicesApi = new InvoicesApi();
