import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { CashEntryType } from "@corely/contracts";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
} from "@corely/ui";
import { formatMoney } from "@corely/web-shared/shared/lib/formatters";

export type CreateEntryForm = {
  type: CashEntryType;
  grossAmountInput: string;
  taxCodeId: string;
  description: string;
  documentReference: string;
  dailyZReport: boolean;
  occurredAt: string;
  attachmentFile: File | null;
};

export type AttachBelegForm = {
  attachmentFile: File | null;
};

function getCurrentDateTimeInputValue(): string {
  const now = new Date();
  const timezoneOffsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
}

export const defaultCreateForm = (): CreateEntryForm => ({
  type: "SALE_CASH",
  grossAmountInput: "",
  taxCodeId: "",
  description: "",
  documentReference: "",
  dailyZReport: false,
  occurredAt: getCurrentDateTimeInputValue(),
  attachmentFile: null,
});

type LabelFn = (value: string) => string;

import { ReceiptPicker } from "../components/receipt-picker";

export type TaxCodeOption = {
  id: string;
  label: string;
};

type CreateEntryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: CreateEntryForm;
  setForm: Dispatch<SetStateAction<CreateEntryForm>>;
  entryTypes: readonly string[];
  entryTypeLabel: LabelFn;
  taxCodeOptions: TaxCodeOption[];
  taxRelevant: boolean;
  requiresTaxProfileSetup: boolean;
  taxSettingsState?: { returnTo: string };
  taxCodeRequired: boolean;
  taxCodeLabel: string;
  taxHint?: string | null;
  taxSummary?: {
    grossAmountCents: number;
    netAmountCents: number;
    taxAmountCents: number;
  } | null;
  registerCurrency: string;
  projectedBalance: number;
  isPending: boolean;
  isError: boolean;
  canSave: boolean;
  onSave: () => void;
};

export function CreateEntryDialog(props: CreateEntryDialogProps) {
  const { t } = useTranslation();
  const {
    open,
    onOpenChange,
    form,
    setForm,
    entryTypes,
    entryTypeLabel,
    taxCodeOptions,
    taxRelevant,
    requiresTaxProfileSetup,
    taxSettingsState,
    taxCodeRequired,
    taxCodeLabel,
    taxHint,
    taxSummary,
    registerCurrency,
    projectedBalance,
    isPending,
    isError,
    canSave,
    onSave,
  } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[100dvh] max-h-[100dvh] gap-0 overflow-hidden p-0 sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-[520px]">
        <DialogHeader className="sticky top-0 z-10 border-b bg-background px-4 py-4 pr-14 sm:px-6">
          <DialogTitle>{t("cash.ui.entries.createDialog.title")}</DialogTitle>
          <DialogDescription>{t("cash.ui.entries.createDialog.description")}</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 pb-28 sm:px-6 sm:pb-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="create-entry-type">{t("cash.ui.entries.createDialog.type")}</Label>
              <select
                id="create-entry-type"
                className="h-11 w-full rounded-md border bg-background px-3 text-base sm:h-10 sm:text-sm"
                value={form.type}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    type: event.target.value as CashEntryType,
                    taxCodeId: "",
                  }))
                }
              >
                {entryTypes.map((value) => (
                  <option key={value} value={value}>
                    {entryTypeLabel(value)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="create-entry-amount">
                {t("cash.ui.entries.createDialog.grossAmount")}
              </Label>
              <Input
                id="create-entry-amount"
                type="number"
                step="0.01"
                value={form.grossAmountInput}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, grossAmountInput: event.target.value }))
                }
              />
            </div>
          </div>
          {taxRelevant && requiresTaxProfileSetup ? (
            <Alert>
              <AlertTitle>{t("cash.ui.entries.createDialog.taxProfileRequiredTitle")}</AlertTitle>
              <AlertDescription className="space-y-3">
                <p>{t("cash.ui.entries.createDialog.taxProfileRequiredDescription")}</p>
                <Button type="button" variant="outline" asChild disabled={isPending}>
                  <Link to="/settings/tax" state={taxSettingsState}>
                    {t("cash.ui.entries.createDialog.configureTaxSettings")}
                  </Link>
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}
          {taxRelevant && !requiresTaxProfileSetup ? (
            <div className="space-y-1">
              <Label htmlFor="create-entry-tax-code">
                {taxCodeRequired
                  ? t("cash.ui.entries.createDialog.taxCodeRequired")
                  : t("cash.ui.entries.createDialog.taxCodeOptional")}
              </Label>
              <select
                id="create-entry-tax-code"
                className="h-11 w-full rounded-md border bg-background px-3 text-base sm:h-10 sm:text-sm"
                value={form.taxCodeId}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, taxCodeId: event.target.value }))
                }
              >
                <option value="">{t("cash.ui.entries.createDialog.noVat")}</option>
                {taxCodeOptions.map((value) => (
                  <option key={value.id} value={value.id}>
                    {value.label}
                  </option>
                ))}
              </select>
              {taxHint ? <p className="text-xs text-muted-foreground">{taxHint}</p> : null}
            </div>
          ) : null}
          <div className="space-y-1">
            <Label htmlFor="create-entry-description">
              {t("cash.ui.entries.createDialog.bookingText")}
            </Label>
            <Textarea
              id="create-entry-description"
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
            />
          </div>
          {form.type === "SALE_CASH" ? (
            <label className="flex gap-2 rounded-md border p-3 text-sm">
              <input
                type="checkbox"
                checked={form.dailyZReport}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, dailyZReport: event.target.checked }))
                }
              />
              <span>Đây là tổng doanh thu Z-Bon của ngày này</span>
            </label>
          ) : null}
          <div className="space-y-1">
            <Label htmlFor="create-entry-document-reference">
              {t("cash.ui.entries.createDialog.documentReference")}
            </Label>
            <Input
              id="create-entry-document-reference"
              value={form.documentReference}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, documentReference: event.target.value }))
              }
              placeholder={t("cash.ui.entries.createDialog.documentReferencePlaceholder")}
            />
            <p className="text-xs text-muted-foreground">
              {t("cash.ui.entries.createDialog.documentReferenceHint")}
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="create-entry-occurred-at">
              {t("cash.ui.entries.createDialog.occurredAt")}
            </Label>
            <Input
              id="create-entry-occurred-at"
              type="datetime-local"
              value={form.occurredAt}
              onChange={(event) => setForm((prev) => ({ ...prev, occurredAt: event.target.value }))}
            />
          </div>
          <ReceiptPicker
            active={open}
            label={t("cash.ui.entries.createDialog.attachBeleg")}
            inputId="create-entry-attachment"
            file={form.attachmentFile}
            setFile={(file) => setForm((prev) => ({ ...prev, attachmentFile: file }))}
            chooseLabel={t("cash.ui.entries.createDialog.chooseAttachment")}
            replaceLabel={t("cash.ui.entries.createDialog.replaceAttachment")}
            takePictureLabel={t("cash.ui.entries.createDialog.takePicture")}
            noFileLabel={t("cash.ui.entries.createDialog.noAttachment")}
            cameraTitle={t("cash.ui.entries.camera.title")}
            cameraDescription={t("cash.ui.entries.camera.description")}
            captureLabel={t("cash.ui.entries.camera.capture")}
            switchCameraLabel={t("cash.ui.entries.camera.switchCamera")}
            cameraUnavailableLabel={t("cash.ui.entries.camera.unavailable")}
            cameraPermissionDeniedLabel={t("cash.ui.entries.camera.permissionDenied")}
            disabled={isPending}
          />
          {taxRelevant && taxSummary ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  {t("cash.ui.entries.createDialog.taxSummary")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span>{t("cash.ui.entries.createDialog.grossAmount")}</span>
                  <span>
                    {formatMoney(taxSummary.grossAmountCents, undefined, registerCurrency)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{t("cash.ui.entries.createDialog.netAmount")}</span>
                  <span>{formatMoney(taxSummary.netAmountCents, undefined, registerCurrency)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{taxCodeLabel}</span>
                  <span>{formatMoney(taxSummary.taxAmountCents, undefined, registerCurrency)}</span>
                </div>
              </CardContent>
            </Card>
          ) : null}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {t("cash.ui.entries.createDialog.projectedBalance")}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm font-medium">
              {formatMoney(projectedBalance, undefined, registerCurrency)}
            </CardContent>
          </Card>
          {isError ? (
            <p className="text-sm text-destructive">{t("cash.ui.entries.createDialog.failed")}</p>
          ) : null}
        </div>
        <DialogFooter className="sticky bottom-0 z-10 grid grid-cols-2 gap-2 border-t bg-background px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex sm:px-6">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => onOpenChange(false)}
          >
            {t("cash.ui.common.cancel")}
          </Button>
          <Button className="w-full sm:w-auto" onClick={onSave} disabled={isPending || !canSave}>
            {isPending && form.attachmentFile
              ? t("cash.ui.entries.createDialog.uploading")
              : t("cash.ui.entries.createDialog.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type ClosedDayCorrectionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflict: ClosedDayConflict | null;
  reason: string;
  setReason: (reason: string) => void;
  correctionType: "MISSING_ENTRY" | "REVERSE_ENTRY" | "REPLACE_ENTRY" | "BALANCE_EXPLANATION";
  setCorrectionType: (
    type: "MISSING_ENTRY" | "REVERSE_ENTRY" | "REPLACE_ENTRY" | "BALANCE_EXPLANATION"
  ) => void;
  registerCurrency: string;
  cashIsInRegister: boolean;
  setCashIsInRegister: (value: boolean) => void;
  isPending: boolean;
  isError: boolean;
  onConfirm: () => void;
};

export function ClosedDayCorrectionDialog(props: ClosedDayCorrectionDialogProps) {
  const {
    open,
    onOpenChange,
    conflict,
    reason,
    setReason,
    correctionType,
    setCorrectionType,
    registerCurrency,
    cashIsInRegister,
    setCashIsInRegister,
    isPending,
    isError,
    onConfirm,
  } = props;
  const day = conflict?.dayKey
    ? new Date(`${conflict.dayKey}T00:00:00`).toLocaleDateString("vi-VN")
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[100dvh] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Điều chỉnh ngày đã chốt</DialogTitle>
          <DialogDescription>
            Ngày {day} đã được chốt. Bút toán gốc không bị sửa hoặc xóa.
          </DialogDescription>
        </DialogHeader>
        <Alert>
          <AlertTitle>Không có giao dịch nào được tạo</AlertTitle>
          <AlertDescription>
            Số dư hiện tại vẫn là{" "}
            {formatMoney(conflict?.currentBalanceCents ?? 0, undefined, registerCurrency)}.
          </AlertDescription>
        </Alert>
        <div className="space-y-3">
          <select
            className="h-11 w-full rounded-md border bg-background px-3 text-base sm:h-10 sm:text-sm"
            value={correctionType}
            onChange={(event) =>
              setCorrectionType(
                event.target.value as ClosedDayCorrectionDialogProps["correctionType"]
              )
            }
          >
            <option value="MISSING_ENTRY">Thiếu doanh thu / giao dịch</option>
            <option value="REVERSE_ENTRY">Giao dịch trùng hoặc cần đảo</option>
            <option value="REPLACE_ENTRY">Sai số tiền hoặc thông tin</option>
            <option value="BALANCE_EXPLANATION">Giải thích chênh lệch quỹ</option>
          </select>
          <Textarea value={reason} onChange={(event) => setReason(event.target.value)} />
          <label className="flex gap-2 rounded-md border p-3 text-sm">
            <input
              type="checkbox"
              checked={cashIsInRegister}
              onChange={(event) => setCashIsInRegister(event.target.checked)}
            />
            <span>Tôi xác nhận số tiền này hiện vẫn có trong quỹ.</span>
          </label>
          {isError ? (
            <p className="text-sm text-destructive">Không thể tạo bút toán điều chỉnh.</p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isPending || reason.trim().length < 3 || !cashIsInRegister}
          >
            {isPending ? "Đang lưu…" : "Tạo bút toán điều chỉnh"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type ReverseEntryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason: string;
  setReason: (value: string) => void;
  isPending: boolean;
  isError: boolean;
  onConfirm: () => void;
};

export function ReverseEntryDialog(props: ReverseEntryDialogProps) {
  const { t } = useTranslation();
  const { open, onOpenChange, reason, setReason, isPending, isError, onConfirm } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("cash.ui.entries.reverseDialog.title")}</DialogTitle>
          <DialogDescription>{t("cash.ui.entries.reverseDialog.description")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="reverse-reason">{t("cash.ui.entries.reverseDialog.reason")}</Label>
          <Textarea
            id="reverse-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          {isError ? (
            <p className="text-sm text-destructive">{t("cash.ui.entries.reverseDialog.failed")}</p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cash.ui.common.cancel")}
          </Button>
          <Button onClick={onConfirm} disabled={isPending || !reason.trim()}>
            {t("cash.ui.entries.reverseDialog.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type AttachBelegDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: AttachBelegForm;
  setForm: Dispatch<SetStateAction<AttachBelegForm>>;
  isPending: boolean;
  isError: boolean;
  onAttach: () => void;
};

export function AttachBelegDialog(props: AttachBelegDialogProps) {
  const { t } = useTranslation();
  const { open, onOpenChange, form, setForm, isPending, isError, onAttach } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("cash.ui.entries.attachmentDialog.title")}</DialogTitle>
          <DialogDescription>{t("cash.ui.entries.attachmentDialog.description")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <ReceiptPicker
            active={open}
            label={t("cash.ui.entries.attachmentDialog.file")}
            inputId="beleg-file-input"
            file={form.attachmentFile}
            setFile={(file) => setForm((prev) => ({ ...prev, attachmentFile: file }))}
            chooseLabel={t("cash.ui.entries.attachmentDialog.uploadFile")}
            replaceLabel={t("cash.ui.entries.attachmentDialog.replaceFile")}
            takePictureLabel={t("cash.ui.entries.attachmentDialog.takePicture")}
            noFileLabel={t("cash.ui.entries.attachmentDialog.noFile")}
            cameraTitle={t("cash.ui.entries.camera.title")}
            cameraDescription={t("cash.ui.entries.camera.description")}
            captureLabel={t("cash.ui.entries.camera.capture")}
            switchCameraLabel={t("cash.ui.entries.camera.switchCamera")}
            cameraUnavailableLabel={t("cash.ui.entries.camera.unavailable")}
            cameraPermissionDeniedLabel={t("cash.ui.entries.camera.permissionDenied")}
            disabled={isPending}
          />
          {isError ? (
            <p className="text-sm text-destructive">
              {t("cash.ui.entries.attachmentDialog.failed")}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cash.ui.common.cancel")}
          </Button>
          <Button onClick={onAttach} disabled={isPending || !form.attachmentFile}>
            {t("cash.ui.entries.attachmentDialog.attach")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
