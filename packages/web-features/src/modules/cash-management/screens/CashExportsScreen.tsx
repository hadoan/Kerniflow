import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
} from "@corely/ui";
import type { ExportCashBookOutput } from "@corely/contracts";
import { cashManagementApi } from "@corely/web-shared/lib/cash-management-api";
import { cashKeys } from "../queries";

const currentMonth = () => new Date().toISOString().slice(0, 7);

export function CashExportsScreen() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [month, setMonth] = useState(currentMonth);
  const [format, setFormat] = useState<"CSV" | "PDF" | "DATEV" | "AUDIT_PACK">("CSV");
  const [includeAttachmentFiles, setIncludeAttachmentFiles] = useState(false);
  const [result, setResult] = useState<ExportCashBookOutput | null>(null);

  const registerQuery = useQuery({
    queryKey: id ? cashKeys.registers.detail(id) : ["cash-registers", "missing-id"],
    queryFn: () => cashManagementApi.getRegister(id as string),
    enabled: Boolean(id),
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      if (!id) {
        throw new Error("Missing register id");
      }
      const response = await cashManagementApi.exportCashBook(id, {
        month,
        format,
        includeAttachmentFiles,
      });
      setResult(response.export as ExportCashBookOutput);
    },
  });

  const handleDownload = async () => {
    if (!result?.fileToken) {
      return;
    }
    const blob = await cashManagementApi.downloadExport(result.fileToken);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = result.fileName ?? `cash-export-${result.fileToken}`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

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

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-5 sm:px-5 sm:py-6 lg:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {t("cash.ui.exports.title", { register: registerQuery.data.register.name })}
        </h1>
        <Button variant="outline" asChild>
          <Link to={`/cash/registers/${id}`}>{t("cash.ui.exports.backToRegister")}</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("cash.ui.exports.generateTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="export-month">{t("cash.ui.exports.month")}</Label>
            <Input
              id="export-month"
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="export-format">{t("cash.ui.exports.format")}</Label>
            <select
              id="export-format"
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={format}
              onChange={(event) =>
                setFormat(event.target.value as "CSV" | "PDF" | "DATEV" | "AUDIT_PACK")
              }
            >
              <option value="CSV">{t("cash.ui.exports.formatOptions.CSV")}</option>
              <option value="PDF">{t("cash.ui.exports.formatOptions.PDF")}</option>
              <option value="DATEV">{t("cash.ui.exports.formatOptions.DATEV")}</option>
              <option value="AUDIT_PACK">{t("cash.ui.exports.formatOptions.AUDIT_PACK")}</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={includeAttachmentFiles}
              onCheckedChange={(value) => setIncludeAttachmentFiles(value === true)}
            />
            {t("cash.ui.exports.includeAttachmentFiles")}
          </label>
          <Button onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending}>
            {exportMutation.isPending
              ? t("cash.ui.exports.generating")
              : t("cash.ui.exports.generate")}
          </Button>
          {exportMutation.isError ? (
            <p className="text-sm text-destructive">{t("cash.ui.exports.failed")}</p>
          ) : null}
        </CardContent>
      </Card>

      {result ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("cash.ui.exports.latestTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              {t("cash.ui.exports.file")}: {result.fileName ?? "-"}
            </p>
            <p>
              {t("cash.ui.exports.type")}: {result.contentType ?? "-"}
            </p>
            <p>
              {t("cash.ui.exports.size")}: {result.sizeBytes ?? 0} {t("cash.ui.exports.bytes")}
            </p>
            <Button onClick={handleDownload}>{t("cash.ui.exports.download")}</Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
