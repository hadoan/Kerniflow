import type {
  AttachBelegInput,
  CashDashboardResponse,
  CashDayClose,
  CashEntry,
  CashEntryAttachment,
  CashRegister,
  CreateCashEntryInput,
  CreateClosedDayCorrectionInput,
  CashDayCloseRevision,
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
  CashAssistantWorkspace,
  CashReportPreviewDto,
  CashReconciliationReportDto,
  ResolveCashAssistantWorkspaceInput,
} from "@corely/contracts";
import {
  CashAssistantWorkspaceSchema,
  ResolveCashAssistantWorkspaceOutputSchema,
  type CashWorkspaceHandoffDto,
} from "@corely/contracts";
import { apiClient } from "./api-client";

type RegisterListInput = Partial<ListCashRegistersQuery>;
type EntryListInput = Omit<Partial<ListCashEntriesQuery>, "registerId">;
type DayCloseListInput = Omit<Partial<ListCashDayClosesQuery>, "registerId">;
type CreateRegisterInput = Omit<CreateCashRegister, "tenantId" | "workspaceId">;
type CreateEntryInput = Omit<CreateCashEntryInput, "tenantId" | "workspaceId" | "registerId">;
type CreateClosedDayCorrectionRequest = Omit<
  CreateClosedDayCorrectionInput,
  "registerId" | "dayKey"
>;
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
        idempotencyKey: input.idempotencyKey ?? apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async createClosedDayCorrection(
    registerId: string,
    dayKey: string,
    input: CreateClosedDayCorrectionRequest
  ): Promise<{ entry: CashEntry; revision: CashDayCloseRevision }> {
    return apiClient.post<{ entry: CashEntry; revision: CashDayCloseRevision }>(
      `/cash-registers/${registerId}/closed-days/${dayKey}/corrections`,
      { ...input, registerId, dayKey },
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async listClosedDayRevisions(
    registerId: string,
    dayKey: string
  ): Promise<{ revisions: CashDayCloseRevision[] }> {
    return apiClient.get<{ revisions: CashDayCloseRevision[] }>(
      `/cash-registers/${registerId}/closed-days/${dayKey}/revisions`,
      { correlationId: apiClient.generateCorrelationId() }
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

  async getKassenbericht(
    registerId: string,
    dayKey: string
  ): Promise<{ preview: CashReportPreviewDto }> {
    return apiClient.get<{ preview: CashReportPreviewDto }>(
      `/cash-registers/${registerId}/kassenbericht/${dayKey}`,
      { correlationId: apiClient.generateCorrelationId() }
    );
  }

  async getKassenabrechnung(
    registerId: string,
    fromDate: string,
    toDate: string
  ): Promise<{ report: CashReconciliationReportDto }> {
    return apiClient.get<{ report: CashReconciliationReportDto }>(
      `/cash-registers/${registerId}/kassenabrechnung${toQueryString({ fromDate, toDate })}`,
      { correlationId: apiClient.generateCorrelationId() }
    );
  }

  async translateKassenabrechnung(
    registerId: string,
    fromDate: string,
    toDate: string
  ): Promise<{ translations: Record<string, string> }> {
    return apiClient.post(
      `/cash-registers/${registerId}/kassenabrechnung/translate`,
      { fromDate, toDate },
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async downloadKassenberichtPdf(registerId: string, dayKey: string): Promise<Blob> {
    return apiClient.getBlob(`/cash-registers/${registerId}/kassenbericht/${dayKey}/pdf`, {
      correlationId: apiClient.generateCorrelationId(),
    });
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

  async listWorkspaces(): Promise<{ items: CashAssistantWorkspace[] }> {
    const response = await apiClient.get<{ items: unknown[] }>(`/cash-management/workspaces`, {
      correlationId: apiClient.generateCorrelationId(),
    });
    return {
      items: response.items.map((workspace) => CashAssistantWorkspaceSchema.parse(workspace)),
    };
  }

  async resolveWorkspace(
    input: ResolveCashAssistantWorkspaceInput
  ): Promise<CashAssistantWorkspace> {
    const response = await apiClient.post<unknown>(`/cash-management/workspaces/resolve`, input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
    return ResolveCashAssistantWorkspaceOutputSchema.parse(response);
  }

  async getHandoff(id: string): Promise<CashWorkspaceHandoffDto> {
    return apiClient.get<CashWorkspaceHandoffDto>(`/cash-management/workspaces/handoff/${id}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async confirmHandoff(
    conversationId: string,
    handoffId: string,
    idempotencyKey: string
  ): Promise<{ entryId: string }> {
    return apiClient.post<{ entryId: string }>(
      `/cash-management/workspaces/conversations/${conversationId}/handoffs/${handoffId}/confirm`,
      {}, // Empty body
      {
        headers: { "idempotency-key": idempotencyKey },
        idempotencyKey, // For apiClient internals
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async confirmCashEntry(
    registerId: string,
    confirmationId: string,
    idempotencyKey: string
  ): Promise<{ entryId: string }> {
    return apiClient.post<{ entryId: string }>(
      `/cash-registers/${registerId}/confirm-entry/${confirmationId}`,
      {}, // Empty body
      {
        headers: { "idempotency-key": idempotencyKey },
        idempotencyKey,
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async cancelHandoff(conversationId: string, handoffId: string): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>(
      `/cash-management/workspaces/conversations/${conversationId}/handoffs/${handoffId}/cancel`,
      {},
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async markHandoffViewed(
    conversationId: string,
    handoffId: string
  ): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>(
      `/cash-management/workspaces/conversations/${conversationId}/handoffs/${handoffId}/view`,
      {},
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async answerCashMovementResolution(
    conversationId: string,
    resolutionId: string,
    expectedVersion: number,
    answer: { choiceId: string }
  ): Promise<unknown> {
    return apiClient.post<unknown>(
      `/cash-management/workspaces/conversations/${conversationId}/resolutions/${resolutionId}/answer`,
      { expectedVersion, answer },
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }
}

export const cashManagementApi = new CashManagementApi();
