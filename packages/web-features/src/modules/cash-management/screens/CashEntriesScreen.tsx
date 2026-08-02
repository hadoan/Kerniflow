import { useMemo, useRef, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@corely/ui";
import type { CashEntryAttachment, CashEntryType } from "@corely/contracts";
import { cashManagementApi } from "@corely/web-shared/lib/cash-management-api";
import { apiClient } from "@corely/web-shared/lib/api-client";
import { taxApi } from "@corely/web-shared/lib/tax-api";
import { CrudListPageLayout } from "@corely/web-shared/shared/crud";
import { cashKeys, invalidateCashRegisterQueries } from "../queries";
import { uploadBelegDocument } from "../upload-beleg-document";
import {
  calculateGrossFirstBreakdown,
  deriveDirectionFromType,
  deriveTaxModeFromType,
  entrySources,
  entryTypes,
  isTaxRelevantType,
  requiresSupportingDocument,
  requiresTaxCodeForType,
  requiresTaxProfileForType,
  resolveEffectiveRate,
} from "./cash-entry-helpers";
import { CashEntriesFilters, type CashEntryFilters } from "./cash-entries-filters";
import { CashEntriesTable } from "./cash-entries-table";
import { getClosedDayConflict } from "./closed-day-conflict";
import {
  AttachBelegDialog,
  type AttachBelegForm,
  CreateEntryDialog,
  defaultCreateForm,
  type CreateEntryForm,
  ReverseEntryDialog,
} from "./cash-entries-dialogs";
import { ClosedDayCorrectionDialog, type ClosedDayConflict } from "./closed-day-correction-dialog";

const defaultFilters: CashEntryFilters = {
  dayKeyFrom: "",
  dayKeyTo: "",
  type: "",
  source: "",
  q: "",
};

const defaultAttachBelegForm = (): AttachBelegForm => ({ attachmentFile: null });

export function CashEntriesScreen() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<CashEntryFilters>(defaultFilters);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateEntryForm>(defaultCreateForm);
  const createIdempotencyKey = useRef<string | null>(null);
  const [closedDayConflict, setClosedDayConflict] = useState<ClosedDayConflict | null>(null);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionReason, setCorrectionReason] = useState("");
  const [cashIsInRegister, setCashIsInRegister] = useState(false);
  const [correctionType, setCorrectionType] = useState<
    "MISSING_ENTRY" | "REVERSE_ENTRY" | "REPLACE_ENTRY" | "BALANCE_EXPLANATION"
  >("MISSING_ENTRY");
  const [reverseTargetId, setReverseTargetId] = useState<string | null>(null);
  const [reverseReason, setReverseReason] = useState("");
  const [belegEntryId, setBelegEntryId] = useState<string | null>(null);
  const [attachBelegForm, setAttachBelegForm] = useState<AttachBelegForm>(defaultAttachBelegForm);

  const registerQuery = useQuery({
    queryKey: id ? cashKeys.registers.detail(id) : ["cash-registers", "missing-id"],
    queryFn: () => cashManagementApi.getRegister(id as string),
    enabled: Boolean(id),
  });

  const queryParams = useMemo(
    () => ({
      registerId: id,
      dayKeyFrom: filters.dayKeyFrom || undefined,
      dayKeyTo: filters.dayKeyTo || undefined,
      type: (filters.type as CashEntryType | "") || undefined,
      source: filters.source || undefined,
      q: filters.q || undefined,
    }),
    [filters, id]
  );

  const entriesQuery = useQuery({
    queryKey: id ? cashKeys.entries.list(queryParams) : ["cash-entries", "missing-id"],
    queryFn: () =>
      cashManagementApi.listEntries(id as string, {
        dayKeyFrom: queryParams.dayKeyFrom,
        dayKeyTo: queryParams.dayKeyTo,
        type: queryParams.type,
        source: queryParams.source,
        q: queryParams.q,
      }),
    enabled: Boolean(id),
  });

  const taxProfileQuery = useQuery({
    queryKey: ["tax-profile"],
    queryFn: () => taxApi.getProfile(),
  });

  const taxCodesQuery = useQuery({
    queryKey: ["tax-codes"],
    queryFn: () => taxApi.listTaxCodes(),
    enabled: createOpen,
  });

  const selectedTaxRateQuery = useQuery({
    queryKey: ["tax-rates", createForm.taxCodeId],
    queryFn: () => taxApi.listTaxRates(createForm.taxCodeId),
    enabled: createOpen && createForm.taxCodeId.length > 0,
  });

  const entries = useMemo(() => entriesQuery.data?.entries ?? [], [entriesQuery.data?.entries]);

  const attachmentQueries = useQueries({
    queries: entries.slice(0, 50).map((entry) => ({
      queryKey: cashKeys.entries.attachments(entry.id),
      queryFn: () => cashManagementApi.listAttachments(entry.id),
      staleTime: 60_000,
    })),
  });

  const attachmentCountByEntryId = useMemo(() => {
    const counts = new Map<string, number>();
    entries.slice(0, 50).forEach((entry, index) => {
      counts.set(entry.id, attachmentQueries[index]?.data?.attachments.length ?? 0);
    });
    return counts;
  }, [attachmentQueries, entries]);

  const attachmentsByEntryId = useMemo(() => {
    const attachments = new Map<string, CashEntryAttachment[]>();
    entries.slice(0, 50).forEach((entry, index) => {
      attachments.set(entry.id, attachmentQueries[index]?.data?.attachments ?? []);
    });
    return attachments;
  }, [attachmentQueries, entries]);

  const createMutation = useMutation({
    mutationFn: async ({
      allowPossibleDuplicate = false,
    }: { allowPossibleDuplicate?: boolean } = {}) => {
      if (!id) {
        throw new Error("Missing register id");
      }
      const grossAmountCents = Math.round(Number(createForm.grossAmountInput) * 100);
      const occurredAt = createForm.occurredAt
        ? new Date(createForm.occurredAt).toISOString()
        : new Date().toISOString();
      const uploadedDocumentId = createForm.attachmentFile
        ? await uploadBelegDocument(createForm.attachmentFile)
        : null;
      const created = await cashManagementApi.createEntry(id, {
        type: createForm.type,
        direction: deriveDirectionFromType(createForm.type),
        source: "MANUAL",
        dailyZReport: createForm.dailyZReport,
        allowPossibleDuplicate,
        idempotencyKey:
          createIdempotencyKey.current ??
          (createIdempotencyKey.current = apiClient.generateIdempotencyKey()),
        description: createForm.description.trim(),
        grossAmountCents,
        occurredAt,
        tax: isTaxRelevantType(createForm.type)
          ? {
              mode: createForm.taxCodeId ? deriveTaxModeFromType(createForm.type) : "NONE",
              taxCodeId: createForm.taxCodeId || undefined,
            }
          : { mode: "NONE" },
        sourceDocument:
          uploadedDocumentId || createForm.documentReference.trim()
            ? {
                documentId: uploadedDocumentId ?? undefined,
                reference: createForm.documentReference.trim() || undefined,
                kind: uploadedDocumentId ? "ATTACHMENT" : "REFERENCE",
              }
            : undefined,
      });
      if (uploadedDocumentId) {
        await cashManagementApi.attachBeleg(created.entry.id, {
          documentId: uploadedDocumentId,
        });
      }
    },
    onSuccess: async () => {
      if (!id) {
        return;
      }
      await invalidateCashRegisterQueries(queryClient, id);
      setCreateOpen(false);
      setCreateForm(defaultCreateForm());
      createIdempotencyKey.current = null;
    },
    onError: (error) => {
      const conflict = getClosedDayConflict(error);
      if (conflict) {
        setClosedDayConflict(conflict);
        setCreateOpen(false);
        setCorrectionReason("");
        setCashIsInRegister(false);
        setCorrectionType("MISSING_ENTRY");
        setCorrectionOpen(true);
      }
    },
  });

  const correctionMutation = useMutation({
    mutationFn: async () => {
      if (!id || !closedDayConflict) {
        throw new Error("Missing closed-day correction context");
      }
      const uploadedDocumentId = createForm.attachmentFile
        ? await uploadBelegDocument(createForm.attachmentFile)
        : null;
      const occurredAt = createForm.occurredAt
        ? new Date(createForm.occurredAt).toISOString()
        : `${closedDayConflict.dayKey}T12:00:00.000Z`;
      await cashManagementApi.createClosedDayCorrection(id, closedDayConflict.dayKey, {
        correctionType,
        occurredAt,
        reason: correctionReason.trim(),
        entry: {
          type: createForm.type,
          description: createForm.description.trim(),
          grossAmountCents: Math.round(Number(createForm.grossAmountInput) * 100),
          tax: isTaxRelevantType(createForm.type)
            ? {
                mode: createForm.taxCodeId ? deriveTaxModeFromType(createForm.type) : "NONE",
                taxCodeId: createForm.taxCodeId || undefined,
              }
            : { mode: "NONE" },
        },
        attachmentIds: uploadedDocumentId ? [uploadedDocumentId] : [],
      });
    },
    onSuccess: async () => {
      if (!id) {
        return;
      }
      await invalidateCashRegisterQueries(queryClient, id);
      setCorrectionOpen(false);
      setClosedDayConflict(null);
      setCreateForm(defaultCreateForm());
    },
  });

  const reverseMutation = useMutation({
    mutationFn: async () => {
      if (!reverseTargetId) {
        throw new Error("Missing entry id");
      }
      await cashManagementApi.reverseEntry(reverseTargetId, {
        reason: reverseReason.trim(),
      });
    },
    onSuccess: async () => {
      if (!id) {
        return;
      }
      await invalidateCashRegisterQueries(queryClient, id);
      setReverseTargetId(null);
      setReverseReason("");
    },
  });

  const attachMutation = useMutation({
    mutationFn: async () => {
      if (!belegEntryId) {
        throw new Error("Missing entry id");
      }
      if (!attachBelegForm.attachmentFile) {
        throw new Error("Missing beleg file");
      }
      const documentId = await uploadBelegDocument(attachBelegForm.attachmentFile);
      await cashManagementApi.attachBeleg(belegEntryId, {
        documentId,
      });
    },
    onSuccess: async () => {
      if (!id || !belegEntryId) {
        return;
      }
      await invalidateCashRegisterQueries(queryClient, id);
      await queryClient.invalidateQueries({ queryKey: cashKeys.entries.attachments(belegEntryId) });
      setBelegEntryId(null);
      setAttachBelegForm(defaultAttachBelegForm());
    },
  });

  const downloadAttachmentsMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const attachments = attachmentsByEntryId.get(entryId) ?? [];
      for (const [index, attachment] of attachments.entries()) {
        const blob = await cashManagementApi.downloadDocument(attachment.documentId);
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download =
          attachments.length > 1 ? `cash-beleg-${entryId}-${index + 1}` : `cash-beleg-${entryId}`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
      }
    },
  });

  if (!id) {
    return null;
  }

  if (registerQuery.isLoading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">{t("cash.ui.common.loadingRegister")}</div>
    );
  }

  if (!registerQuery.data?.register) {
    return (
      <div className="p-6 text-sm text-destructive">{t("cash.ui.common.registerNotFound")}</div>
    );
  }

  const register = registerQuery.data.register;
  const entryTypeLabel = (value: string): string =>
    t(`cash.ui.enums.entryType.${value}`, { defaultValue: value });
  const entrySourceLabel = (value: string): string =>
    t(`cash.ui.enums.entrySource.${value}`, { defaultValue: value });
  const directionLabel = (value: string): string =>
    t(`cash.ui.enums.direction.${value}`, { defaultValue: value });

  const createAmount = Math.round(Number(createForm.grossAmountInput || 0) * 100);
  const createDirection = deriveDirectionFromType(createForm.type);
  const projectedBalance =
    register.currentBalanceCents + (createDirection === "OUT" ? -createAmount : createAmount);
  const hasBookingText = Boolean(createForm.description.trim());
  const hasSupportingDocument =
    createForm.attachmentFile !== null || Boolean(createForm.documentReference.trim());
  const taxProfileMissing = !taxProfileQuery.data;
  const requiresTaxProfileSetup = requiresTaxProfileForType(createForm.type) && taxProfileMissing;
  const taxCodeRequired = requiresTaxCodeForType(createForm.type, taxProfileQuery.data);
  const expenseTaxRequiresAttachment =
    createForm.type === "EXPENSE_CASH" && createForm.taxCodeId.length > 0 && !hasSupportingDocument;
  const canSaveCreateEntry =
    !Number.isNaN(createAmount) &&
    createAmount > 0 &&
    hasBookingText &&
    !requiresTaxProfileSetup &&
    (!requiresSupportingDocument(createForm.type) || hasSupportingDocument) &&
    (!taxCodeRequired || createForm.taxCodeId.length > 0) &&
    !expenseTaxRequiresAttachment;

  const createOccurredAt = createForm.occurredAt ? new Date(createForm.occurredAt) : new Date();
  const selectedRateBps = resolveEffectiveRate(selectedTaxRateQuery.data, createOccurredAt);
  const taxRelevant = isTaxRelevantType(createForm.type);
  const taxSummary =
    taxRelevant && !requiresTaxProfileSetup
      ? calculateGrossFirstBreakdown(createAmount > 0 ? createAmount : 0, selectedRateBps)
      : null;
  const taxCodeOptions = (taxCodesQuery.data ?? [])
    .filter((code) => code.isActive)
    .map((code) => ({
      id: code.id,
      label: `${code.code} - ${code.label}`,
    }));
  const taxCodeLabel =
    createForm.type === "EXPENSE_CASH"
      ? t("cash.ui.entries.createDialog.inputVat")
      : t("cash.ui.entries.createDialog.outputVat");
  const taxHint =
    createForm.type === "EXPENSE_CASH"
      ? t("cash.ui.entries.createDialog.expenseVatHint")
      : taxCodeRequired
        ? t("cash.ui.entries.createDialog.salesVatRequiredHint")
        : t("cash.ui.entries.createDialog.salesVatOptionalHint");

  return (
    <>
      <CrudListPageLayout
        title={t("cash.ui.entries.title", { register: register.name })}
        subtitle={t("cash.ui.entries.subtitle")}
        primaryAction={
          <Button
            onClick={() => {
              createIdempotencyKey.current = apiClient.generateIdempotencyKey();
              setCreateForm(defaultCreateForm());
              setCreateOpen(true);
            }}
          >
            {t("cash.ui.entries.newCashEntry")}
          </Button>
        }
        toolbar={
          <Button variant="outline" asChild>
            <Link to={`/cash/registers/${id}`}>{t("cash.ui.entries.backToRegister")}</Link>
          </Button>
        }
        filters={
          <CashEntriesFilters
            filters={filters}
            setFilters={setFilters}
            entryTypes={entryTypes}
            entrySources={entrySources}
            entryTypeLabel={entryTypeLabel}
            entrySourceLabel={entrySourceLabel}
          />
        }
      >
        {entriesQuery.isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">{t("cash.ui.entries.loading")}</div>
        ) : entriesQuery.isError ? (
          <div className="p-6 text-sm text-destructive">{t("cash.ui.entries.loadFailed")}</div>
        ) : entries.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">{t("cash.ui.entries.empty")}</div>
        ) : (
          <CashEntriesTable
            entries={entries}
            registerId={id}
            attachmentCountByEntryId={attachmentCountByEntryId}
            isDownloadingAttachments={downloadAttachmentsMutation.isPending}
            onDownloadAttachments={(entryId) => downloadAttachmentsMutation.mutate(entryId)}
            onReverseEntry={(entryId) => {
              setReverseTargetId(entryId);
              setReverseReason("");
            }}
            onAddBeleg={(entryId) => {
              setBelegEntryId(entryId);
              setAttachBelegForm(defaultAttachBelegForm());
            }}
            entryTypeLabel={entryTypeLabel}
            entrySourceLabel={entrySourceLabel}
            directionLabel={directionLabel}
          />
        )}
      </CrudListPageLayout>

      <CreateEntryDialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open && !createMutation.isPending) createIdempotencyKey.current = null;
        }}
        form={createForm}
        setForm={setCreateForm}
        entryTypes={entryTypes}
        entryTypeLabel={entryTypeLabel}
        taxCodeOptions={taxCodeOptions}
        taxRelevant={taxRelevant}
        requiresTaxProfileSetup={requiresTaxProfileSetup}
        taxSettingsState={{ returnTo: location.pathname }}
        taxCodeRequired={taxCodeRequired}
        taxCodeLabel={taxCodeLabel}
        taxHint={taxHint}
        taxSummary={taxSummary}
        registerCurrency={register.currency}
        projectedBalance={projectedBalance}
        isPending={createMutation.isPending}
        isError={createMutation.isError}
        canSave={canSaveCreateEntry}
        onSave={() => createMutation.mutate({})}
      />

      <ClosedDayCorrectionDialog
        open={correctionOpen}
        onOpenChange={(open) => {
          setCorrectionOpen(open);
          if (!open) {
            setClosedDayConflict(null);
          }
        }}
        conflict={closedDayConflict}
        reason={correctionReason}
        setReason={setCorrectionReason}
        correctionType={correctionType}
        setCorrectionType={setCorrectionType}
        registerCurrency={register.currency}
        cashIsInRegister={cashIsInRegister}
        setCashIsInRegister={setCashIsInRegister}
        isPending={correctionMutation.isPending}
        isError={correctionMutation.isError}
        onConfirm={() => correctionMutation.mutate()}
      />

      <ReverseEntryDialog
        open={Boolean(reverseTargetId)}
        onOpenChange={(open) => {
          if (!open) {
            setReverseTargetId(null);
          }
        }}
        reason={reverseReason}
        setReason={setReverseReason}
        isPending={reverseMutation.isPending}
        isError={reverseMutation.isError}
        onConfirm={() => reverseMutation.mutate()}
      />

      <AttachBelegDialog
        open={Boolean(belegEntryId)}
        onOpenChange={(open) => {
          if (!open) {
            setBelegEntryId(null);
            setAttachBelegForm(defaultAttachBelegForm());
          }
        }}
        form={attachBelegForm}
        setForm={setAttachBelegForm}
        isPending={attachMutation.isPending}
        isError={attachMutation.isError}
        onAttach={() => attachMutation.mutate()}
      />
    </>
  );
}
