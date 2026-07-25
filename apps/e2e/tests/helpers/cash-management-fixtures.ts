import {
  AttachBelegInputSchema,
  type CashDayClose,
  CashDayCloseSchema,
  type CashEntry,
  type CashEntryAttachment,
  CashEntryAttachmentSchema,
  CashEntrySchema,
  type CashRegister,
  CashRegisterSchema,
  CreateCashEntryInputSchema,
  CreateCashRegisterSchema,
  type ExportCashBookOutput,
  ExportCashBookInputSchema,
  ExportCashBookOutputSchema,
  ReverseCashEntryInputSchema,
  SubmitCashDayCloseInputSchema,
  UpdateCashRegisterSchema,
  UploadFileBase64InputSchema,
  UploadFileOutputSchema,
} from "@corely/contracts";
import { expect } from "@playwright/test";
import { type HttpClient } from "./http-client.ts";
import { expectZod } from "./zod-assert.ts";

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export async function createCashRegister(
  client: HttpClient,
  input: {
    name: string;
    location?: string | null;
    currency?: string;
    disallowNegativeBalance?: boolean;
    idempotencyKey?: string;
  },
  idempotency: string
): Promise<{ response: { status: () => number }; register: CashRegister }> {
  const payload = CreateCashRegisterSchema.parse(input);
  const { response, body } = await client.postJson("/cash-registers", payload, idempotency);
  expect(response.status(), `API returned ${response.status()}: ${JSON.stringify(body)}`).toBe(201);
  console.log("BODY IS:", JSON.stringify(body, null, 2)); const record = asRecord(body);
  const register = expectZod(CashRegisterSchema, record.register) as CashRegister;
  return { response, register };
}

export async function listCashRegisters(
  client: HttpClient,
  query?: Record<string, string | number | boolean | undefined>
) {
  const { response, body } = query
    ? await client.getJson("/cash-registers", { query })
    : await client.getJson("/cash-registers");
  console.log("BODY IS:", JSON.stringify(body, null, 2)); const record = asRecord(body);
  const registers = asArray(record.registers).map(
    (row) => expectZod(CashRegisterSchema, row) as CashRegister
  );
  return { response, registers };
}

export async function getCashRegister(client: HttpClient, registerId: string) {
  const { response, body } = await client.getJson(
    `/cash-registers/${encodeURIComponent(registerId)}`
  );
  console.log("BODY IS:", JSON.stringify(body, null, 2)); const record = asRecord(body);
  const register = expectZod(CashRegisterSchema, record.register) as CashRegister;
  return { response, register };
}

export async function updateCashRegister(
  client: HttpClient,
  registerId: string,
  patch: {
    name?: string;
    location?: string | null;
    disallowNegativeBalance?: boolean;
  },
  idempotency: string
) {
  const payload = UpdateCashRegisterSchema.parse(patch);
  const { response, body } = await client.patchJson(
    `/cash-registers/${encodeURIComponent(registerId)}`,
    payload,
    idempotency
  );
  console.log("BODY IS:", JSON.stringify(body, null, 2)); const record = asRecord(body);
  const register = expectZod(CashRegisterSchema, record.register) as CashRegister;
  return { response, register };
}

export async function createCashEntry(
  client: HttpClient,
  registerId: string,
  input: {
    type?: string;
    direction?: "IN" | "OUT";
    source?: string;
    sourceType?: string;
    description: string;
    paymentMethod?: string;
    amount?: number;
    amountCents?: number;
    currency?: string;
    occurredAt?: string;
    dayKey?: string;
    businessDate?: string;
    referenceId?: string | null;
    reversalOfEntryId?: string | null;
    idempotencyKey?: string;
    tax?: any;
  },
  idempotency: string
): Promise<{ response: { status: () => number }; entry: CashEntry }> {
  const payload = CreateCashEntryInputSchema.parse({ ...input, registerId });
  console.log("createCashEntry payload:", JSON.stringify(payload, null, 2));
  const { response, body } = await client.postJson(
    `/cash-registers/${encodeURIComponent(registerId)}/entries`,
    payload,
    idempotency
  );
  if (!response.ok()) {
    throw new Error(`createCashEntry failed with status ${response.status()}: ${JSON.stringify(body)}`);
  }
  console.log("BODY IS:", JSON.stringify(body, null, 2)); const record = asRecord(body);
  const entry = expectZod(CashEntrySchema, record.entry) as CashEntry;
  return { response, entry };
}

export async function listCashEntries(
  client: HttpClient,
  registerId: string,
  query?: Record<string, string | number | boolean | undefined>
) {
  const { response, body } = query
    ? await client.getJson(`/cash-registers/${encodeURIComponent(registerId)}/entries`, { query })
    : await client.getJson(`/cash-registers/${encodeURIComponent(registerId)}/entries`);
  console.log("BODY IS:", JSON.stringify(body, null, 2)); const record = asRecord(body);
  const entries = asArray(record.entries).map(
    (row) => expectZod(CashEntrySchema, row) as CashEntry
  );
  return { response, entries };
}

export async function reverseCashEntry(
  client: HttpClient,
  entryId: string,
  input: { reason: string; dayKey?: string; occurredAt?: string; idempotencyKey?: string },
  idempotency: string
): Promise<{ response: { status: () => number }; entry: CashEntry }> {
  const payload = ReverseCashEntryInputSchema.parse(input);
  const { response, body } = await client.postJson(
    `/cash-entries/${encodeURIComponent(entryId)}/reverse`,
    payload,
    idempotency
  );
  console.log("BODY IS:", JSON.stringify(body, null, 2)); const record = asRecord(body);
  const entry = expectZod(CashEntrySchema, record.entry) as CashEntry;
  return { response, entry };
}

export async function submitCashDayClose(
  client: HttpClient,
  registerId: string,
  dayKey: string,
  input: {
    countedBalance?: number;
    countedBalanceCents?: number;
    denominationCounts?: Array<{ denomination: number; count: number; subtotal: number }>;
    note?: string;
    notes?: string;
    idempotencyKey?: string;
  },
  idempotency: string
): Promise<{ response: { status: () => number }; dayClose: CashDayClose }> {
  const payload = SubmitCashDayCloseInputSchema.parse({ ...input, registerId, dayKey });
  const { response, body } = await client.postJson(
    `/cash-registers/${encodeURIComponent(registerId)}/day-closes/${encodeURIComponent(dayKey)}/submit`,
    payload,
    idempotency
  );
  if (!response.ok()) {
    throw new Error("submitCashDayClose failed: " + JSON.stringify(body));
  }
  console.log("BODY IS:", JSON.stringify(body, null, 2)); const record = asRecord(body);
  const dayClose = expectZod(CashDayCloseSchema, record.dayClose) as CashDayClose;
  return { response, dayClose };
}

export async function getCashDayClose(client: HttpClient, registerId: string, dayKey: string) {
  const { response, body } = await client.getJson(
    `/cash-registers/${encodeURIComponent(registerId)}/day-closes/${encodeURIComponent(dayKey)}`
  );
  console.log("BODY IS:", JSON.stringify(body, null, 2)); const record = asRecord(body);
  const dayClose = expectZod(CashDayCloseSchema, record.dayClose) as CashDayClose;
  return { response, dayClose };
}

export async function listCashDayCloses(
  client: HttpClient,
  registerId: string,
  query?: Record<string, string | number | boolean | undefined>
) {
  const { response, body } = query
    ? await client.getJson(`/cash-registers/${encodeURIComponent(registerId)}/day-closes`, {
        query,
      })
    : await client.getJson(`/cash-registers/${encodeURIComponent(registerId)}/day-closes`);
  console.log("BODY IS:", JSON.stringify(body, null, 2)); const record = asRecord(body);
  const closes = asArray(record.closes).map(
    (row) => expectZod(CashDayCloseSchema, row) as CashDayClose
  );
  return { response, closes };
}

export async function uploadBase64Document(
  client: HttpClient,
  input: {
    filename: string;
    contentType: string;
    base64: string;
    category?: string;
    purpose?: string;
  },
  idempotency: string
) {
  const payload = UploadFileBase64InputSchema.parse(input);
  const { response, body } = await client.postJson(
    "/documents/upload-base64",
    payload,
    idempotency
  );
  const parsed = expectZod(UploadFileOutputSchema, body);
  return { response, upload: parsed };
}

export async function attachBelegToEntry(
  client: HttpClient,
  entryId: string,
  documentId: string,
  idempotency: string
): Promise<{ response: { status: () => number }; attachment: CashEntryAttachment }> {
  const payload = AttachBelegInputSchema.parse({ entryId, documentId });
  const { response, body } = await client.postJson(
    `/cash-entries/${encodeURIComponent(entryId)}/attachments`,
    payload,
    idempotency
  );
  console.log("BODY IS:", JSON.stringify(body, null, 2)); const record = asRecord(body);
  const attachment = expectZod(CashEntryAttachmentSchema, record.attachment) as CashEntryAttachment;
  return { response, attachment };
}

export async function listEntryAttachments(client: HttpClient, entryId: string) {
  const { response, body } = await client.getJson(
    `/cash-entries/${encodeURIComponent(entryId)}/attachments`
  );
  console.log("BODY IS:", JSON.stringify(body, null, 2)); const record = asRecord(body);
  const attachments = asArray(record.attachments).map(
    (row) => expectZod(CashEntryAttachmentSchema, row) as CashEntryAttachment
  );
  return { response, attachments };
}

export async function exportCashBook(
  client: HttpClient,
  input: {
    registerId: string;
    month: string;
    format: "CSV" | "PDF" | "DATEV" | "AUDIT_PACK";
    includeAttachmentFiles?: boolean;
  },
  idempotency: string
): Promise<{ response: { status: () => number }; artifact: ExportCashBookOutput }> {
  const payload = ExportCashBookInputSchema.parse(input);
  const { response, body } = await client.postJson(
    `/cash-registers/${encodeURIComponent(input.registerId)}/exports`,
    payload,
    idempotency
  );
  console.log("BODY IS:", JSON.stringify(body, null, 2)); const record = asRecord(body);
  const artifact = expectZod(ExportCashBookOutputSchema, record.export) as ExportCashBookOutput;
  return { response, artifact };
}

export async function downloadCashExport(client: HttpClient, fileToken: string) {
  const { response, body } = await client.getBytes(
    `/cash-exports/${encodeURIComponent(fileToken)}`
  );
  expect(response.ok()).toBeTruthy();
  return { response, body };
}

export function monthKeyFromDayKey(dayKey: string): string {
  expect(dayKey.length).toBeGreaterThanOrEqual(7);
  return dayKey.slice(0, 7);
}
