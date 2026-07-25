import type {
  AttachBelegInput,
  CashDashboardResponse,
  CashDayClose,
  CashEntry,
  CashEntryAttachment,
  CashRegister,
  CreateCashEntryInput,
  CreateCashRegister,
  ExportCashBookInput,
  ExportCashBookOutput,
  GetCashDashboardQuery,
  ListCashDayClosesQuery,
  ListCashEntriesQuery,
  ListCashRegistersQuery,
  ReverseCashEntryInput,
  SubmitCashDayCloseInput,
  UpdateCashRegister,
} from "@corely/contracts";
import { apiClient } from "./api-client";

type RegisterListInput = Partial<ListCashRegistersQuery>;
type EntryListInput = Omit<Partial<ListCashEntriesQuery>, "registerId">;
type DayCloseListInput = Omit<Partial<ListCashDayClosesQuery>, "registerId">;
type CreateRegisterInput = Omit<CreateCashRegister, "tenantId" | "workspaceId">;
type CreateEntryInput = Omit<CreateCashEntryInput, "tenantId" | "workspaceId" | "registerId">;
type ReverseEntryInput = Omit<ReverseCashEntryInput, "tenantId" | "entryId" | "originalEntryId">;
type SubmitDayCloseInput = Omit<
  SubmitCashDayCloseInput,
  "tenantId" | "workspaceId" | "registerId" | "dayKey"
>;
type AttachBelegRequest = Omit<AttachBelegInput, "tenantId" | "workspaceId" | "entryId">;
type ExportRequest = Omit<ExportCashBookInput, "tenantId" | "workspaceId" | "registerId">;
type DashboardRequest = Omit<GetCashDashboardQuery, "registerId">;

const toQueryString = (params: Record<string, unknown>): string => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    query.set(key, String(value));
  }
  const encoded = query.toString();
  return encoded ? `?${encoded}` : "";
};

export class CashManagementApi {
  async listRegisters(params: RegisterListInput = {}): Promise<{ registers: CashRegister[] }> {
    return apiClient.get<{ registers: CashRegister[] }>(
      `/cash-registers${toQueryString(params as Record<string, unknown>)}`,
      { correlationId: apiClient.generateCorrelationId() }
    );
  }

  async getRegister(id: string): Promise<{ register: CashRegister }> {
    return apiClient.get<{ register: CashRegister }>(`/cash-registers/${id}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async createRegister(input: CreateRegisterInput): Promise<{ register: CashRegister }> {
    return apiClient.post<{ register: CashRegister }>("/cash-registers", input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async updateRegister(id: string, input: UpdateCashRegister): Promise<{ register: CashRegister }> {
    return apiClient.patch<{ register: CashRegister }>(`/cash-registers/${id}`, input, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async listEntries(
    registerId: string,
    params: EntryListInput = {}
  ): Promise<{ entries: CashEntry[] }> {
    return apiClient.get<{ entries: CashEntry[] }>(
      `/cash-registers/${registerId}/entries${toQueryString(params as Record<string, unknown>)}`,
      { correlationId: apiClient.generateCorrelationId() }
    );
  }

  async createEntry(registerId: string, input: CreateEntryInput): Promise<{ entry: CashEntry }> {
    return apiClient.post<{ entry: CashEntry }>(
      `/cash-registers/${registerId}/entries`,
      { ...input, registerId },
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async reverseEntry(entryId: string, input: ReverseEntryInput): Promise<{ entry: CashEntry }> {
    return apiClient.post<{ entry: CashEntry }>(`/cash-entries/${entryId}/reverse`, input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async listDayCloses(
    registerId: string,
    params: DayCloseListInput = {}
  ): Promise<{ closes: CashDayClose[] }> {
    return apiClient.get<{ closes: CashDayClose[] }>(
      `/cash-registers/${registerId}/day-closes${toQueryString(params as Record<string, unknown>)}`,
      { correlationId: apiClient.generateCorrelationId() }
    );
  }

  async getDayClose(registerId: string, dayKey: string): Promise<{ close: CashDayClose }> {
    return apiClient.get<{ close: CashDayClose }>(
      `/cash-registers/${registerId}/day-closes/${dayKey}`,
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async getDashboard(
    registerId: string,
    params: DashboardRequest = {}
  ): Promise<{ dashboard: CashDashboardResponse }> {
    return apiClient.get<{ dashboard: CashDashboardResponse }>(
      `/cash-registers/${registerId}/dashboard${toQueryString(params as Record<string, unknown>)}`,
      { correlationId: apiClient.generateCorrelationId() }
    );
  }

  async submitDayClose(
    registerId: string,
    dayKey: string,
    input: SubmitDayCloseInput
  ): Promise<{ close: CashDayClose }> {
    return apiClient.post<{ close: CashDayClose }>(
      `/cash-registers/${registerId}/day-closes/${dayKey}/submit`,
      { ...input, dayKey, registerId },
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async attachBeleg(
    entryId: string,
    input: AttachBelegRequest
  ): Promise<{ attachment: CashEntryAttachment }> {
    return apiClient.post<{ attachment: CashEntryAttachment }>(
      `/cash-entries/${entryId}/attachments`,
      input,
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async listAttachments(entryId: string): Promise<{ attachments: CashEntryAttachment[] }> {
    return apiClient.get<{ attachments: CashEntryAttachment[] }>(
      `/cash-entries/${entryId}/attachments`,
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async exportCashBook(
    registerId: string,
    input: ExportRequest
  ): Promise<{ export: ExportCashBookOutput }> {
    return apiClient.post<{ export: ExportCashBookOutput }>(
      `/cash-registers/${registerId}/exports`,
      { ...input, registerId },
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async downloadExport(fileToken: string): Promise<Blob> {
    return apiClient.getBlob(`/cash-exports/${fileToken}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async downloadDocument(documentId: string): Promise<Blob> {
    return apiClient.getBlob(`/documents/${documentId}/download`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async listWorkspaces(): Promise<{ items: any[] }> {
    return apiClient.get<{ items: any[] }>(`/cash-management/workspaces`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }
}

export const cashManagementApi = new CashManagementApi();
