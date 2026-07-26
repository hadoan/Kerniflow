import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
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
  occurredAt: getCurrentDateTimeInputValue(),
  attachmentFile: null,
});

type LabelFn = (value: string) => string;

type TaxCodeOption = {
  id: string;
  label: string;
};

const DOCUMENT_ACCEPT = "image/*,.pdf,application/pdf";

type ReceiptPickerProps = {
  active: boolean;
  label: string;
  inputId: string;
  file: File | null;
  setFile: (file: File | null) => void;
  chooseLabel: string;
  replaceLabel: string;
  takePictureLabel: string;
  noFileLabel: string;
  cameraTitle: string;
  cameraDescription: string;
  captureLabel: string;
  switchCameraLabel: string;
  cameraUnavailableLabel: string;
  cameraPermissionDeniedLabel: string;
  disabled: boolean;
};

function ReceiptPicker(props: ReceiptPickerProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const {
    active,
    label,
    inputId,
    file,
    setFile,
    chooseLabel,
    replaceLabel,
    takePictureLabel,
    noFileLabel,
    cameraTitle,
    cameraDescription,
    captureLabel,
    switchCameraLabel,
    cameraUnavailableLabel,
    cameraPermissionDeniedLabel,
    disabled,
  } = props;

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      const stream = streamRef.current;
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(cameraUnavailableLabel);
      return;
    }
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraError(null);
    } catch {
      setCameraError(cameraPermissionDeniedLabel);
      setCameraOpen(false);
    }
  }, [cameraPermissionDeniedLabel, cameraUnavailableLabel, facingMode, stopCamera]);

  useEffect(() => {
    if (!active) {
      setCameraError(null);
      setCameraOpen(false);
    }
  }, [active]);

  useEffect(() => {
    if (cameraOpen) {
      void startCamera();
    } else {
      stopCamera();
    }
    return stopCamera;
  }, [cameraOpen, startCamera, stopCamera]);

  useEffect(() => {
    if (cameraOpen) {
      void startCamera();
    }
  }, [cameraOpen, facingMode, startCamera]);

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          return;
        }
        setFile(new File([blob], `receipt-${Date.now()}.jpg`, { type: "image/jpeg" }));
        stopCamera();
        setCameraOpen(false);
      },
      "image/jpeg",
      0.92
    );
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{label}</Label>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
        >
          {file ? replaceLabel : chooseLabel}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setCameraOpen(true)}
          disabled={disabled}
        >
          {takePictureLabel}
        </Button>
        <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
          {file?.name ?? noFileLabel}
        </span>
      </div>
      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept={DOCUMENT_ACCEPT}
        className="hidden"
        onChange={(event) => {
          const nextFile = event.target.files?.[0] ?? null;
          setFile(nextFile);
          event.currentTarget.value = "";
        }}
      />
      {cameraError ? <p className="text-xs text-destructive">{cameraError}</p> : null}
      {cameraOpen ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{cameraTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">{cameraDescription}</p>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full rounded-md bg-black"
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={capturePhoto} disabled={disabled}>
                {captureLabel}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFacingMode((prev) => (prev === "user" ? "environment" : "user"))}
                disabled={disabled}
              >
                {switchCameraLabel}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setCameraOpen(false)}>
                {t("cash.ui.common.cancel")}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

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
  isTaxProfileSetupPending: boolean;
  onUseStandardVat: () => void;
  onUseSmallBusiness: () => void;
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
    isTaxProfileSetupPending,
    onUseStandardVat,
    onUseSmallBusiness,
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
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={onUseStandardVat}
                    disabled={isPending || isTaxProfileSetupPending}
                  >
                    {t("cash.ui.entries.createDialog.setupStandardVat")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={onUseSmallBusiness}
                    disabled={isPending || isTaxProfileSetupPending}
                  >
                    {t("cash.ui.entries.createDialog.setupSmallBusiness")}
                  </Button>
                </div>
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
