import { APIRequestContext } from "@playwright/test";
import { HttpClient } from "./http-client.ts";
import { 
  createCashRegister, 
  listCashRegisters, 
  getCashRegister, 
  updateCashRegister, 
  createCashEntry, 
  listCashEntries, 
  reverseCashEntry, 
  submitCashDayClose, 
  getCashDayClose, 
  listCashDayCloses, 
  uploadBase64Document, 
  attachBelegToEntry, 
  listEntryAttachments, 
  exportCashBook, 
  downloadCashExport 
} from "./cash-management-fixtures.ts";

import { type AuthContext } from "./auth.ts";

export class CashApiClient {
  public httpClient: HttpClient;

  constructor(request: APIRequestContext, auth: AuthContext) {
    this.httpClient = new HttpClient(request, auth);
  }

  async createCashRegister(tenantId: string, input: any, idempotency = "") {
    return createCashRegister(this.httpClient, input, idempotency);
  }

  async listCashRegisters(tenantId: string, query?: any) {
    return listCashRegisters(this.httpClient, query);
  }

  async getCashRegister(tenantId: string, registerId: string) {
    return getCashRegister(this.httpClient, registerId);
  }

  async updateCashRegister(tenantId: string, registerId: string, patch: any, idempotency = "") {
    return updateCashRegister(this.httpClient, registerId, patch, idempotency);
  }

  async createCashEntry(tenantId: string, registerId: string, input: any, idempotency = "") {
    return createCashEntry(this.httpClient, registerId, input, idempotency);
  }

  async listCashEntries(tenantId: string, registerId: string, query?: any) {
    return listCashEntries(this.httpClient, registerId, query);
  }

  async reverseCashEntry(tenantId: string, entryId: string, input: any, idempotency = "") {
    return reverseCashEntry(this.httpClient, entryId, input, idempotency);
  }

  async submitCashDayClose(tenantId: string, registerId: string, dayKey: string, input: any, idempotency = "") {
    return submitCashDayClose(this.httpClient, registerId, dayKey, input, idempotency);
  }

  async getCashDayClose(tenantId: string, registerId: string, dayKey: string) {
    return getCashDayClose(this.httpClient, registerId, dayKey);
  }

  async listCashDayCloses(tenantId: string, registerId: string, query?: any) {
    return listCashDayCloses(this.httpClient, registerId, query);
  }

  async uploadBase64Document(tenantId: string, input: any, idempotency = "") {
    return uploadBase64Document(this.httpClient, input, idempotency);
  }

  async attachBelegToEntry(tenantId: string, entryId: string, documentId: string, idempotency = "") {
    return attachBelegToEntry(this.httpClient, entryId, documentId, idempotency);
  }

  async listEntryAttachments(tenantId: string, entryId: string) {
    return listEntryAttachments(this.httpClient, entryId);
  }

  async exportCashBook(tenantId: string, input: any, idempotency = "") {
    return exportCashBook(this.httpClient, input, idempotency);
  }

  async downloadCashExport(tenantId: string, fileToken: string) {
    return downloadCashExport(this.httpClient, fileToken);
  }
}
