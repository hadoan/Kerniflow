import { Badge, Button } from "@corely/ui";
import type { CashEntry } from "@corely/contracts";
import { CrudRowActions } from "@corely/web-shared/shared/crud";
import { formatDateTime, formatMoney } from "@corely/web-shared/shared/lib/formatters";
import { Paperclip } from "lucide-react";
import { useTranslation } from "react-i18next";

type CashEntriesTableProps = {
  entries: CashEntry[];
  registerId: string;
  attachmentCountByEntryId: Map<string, number>;
  isDownloadingAttachments: boolean;
  onDownloadAttachments: (entryId: string) => void;
  onReverseEntry: (entryId: string) => void;
  onAddBeleg: (entryId: string) => void;
  entryTypeLabel: (value: string) => string;
  entrySourceLabel: (value: string) => string;
  directionLabel: (value: string) => string;
};

export function CashEntriesTable({
  entries,
  registerId,
  attachmentCountByEntryId,
  isDownloadingAttachments,
  onDownloadAttachments,
  onReverseEntry,
  onAddBeleg,
  entryTypeLabel,
  entrySourceLabel,
  directionLabel,
}: CashEntriesTableProps) {
  const { t } = useTranslation();

  return (
    <>
      <div className="space-y-3 p-3 sm:hidden">
        {entries.map((entry) => {
          const attachmentCount = attachmentCountByEntryId.get(entry.id) ?? 0;
          return (
            <article
              key={entry.id}
              className="rounded-lg border border-border/70 bg-background p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words font-medium">{entry.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    #{entry.entryNo} · {formatDateTime(entry.occurredAt)}
                  </p>
                </div>
                <p
                  className={`shrink-0 text-right font-semibold ${entry.direction === "OUT" ? "text-red-600" : "text-green-600"}`}
                >
                  {entry.direction === "OUT" ? "-" : "+"}
                  {formatMoney(entry.grossAmountCents, undefined, entry.currency)}
                </p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="block text-muted-foreground">
                    {t("cash.ui.entries.table.type")}
                  </span>
                  <span className="mt-1 block break-words">{entryTypeLabel(entry.type)}</span>
                </div>
                <div>
                  <span className="block text-muted-foreground">
                    {t("cash.ui.entries.table.balanceAfter")}
                  </span>
                  <span className="mt-1 block font-medium">
                    {formatMoney(entry.balanceAfterCents, undefined, entry.currency)}
                  </span>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {attachmentCount > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11"
                    disabled={isDownloadingAttachments}
                    onClick={() => onDownloadAttachments(entry.id)}
                  >
                    <Paperclip className="h-4 w-4" />
                    {attachmentCount}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  onClick={() => onAddBeleg(entry.id)}
                >
                  {t("cash.ui.entries.rowActions.addBeleg")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-11"
                  disabled={Boolean(entry.reversedByEntryId)}
                  onClick={() => onReverseEntry(entry.id)}
                >
                  {t("cash.ui.entries.rowActions.reverse")}
                </Button>
              </div>
            </article>
          );
        })}
      </div>
      <div className="hidden overflow-x-auto sm:block">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/30 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">{t("cash.ui.entries.table.dateTime")}</th>
              <th className="px-4 py-3 font-medium">{t("cash.ui.entries.table.entryNo")}</th>
              <th className="px-4 py-3 font-medium">{t("cash.ui.entries.table.description")}</th>
              <th className="px-4 py-3 font-medium">{t("cash.ui.entries.table.type")}</th>
              <th className="px-4 py-3 font-medium">{t("cash.ui.entries.table.direction")}</th>
              <th className="px-4 py-3 text-right font-medium">
                {t("cash.ui.entries.table.amount")}
              </th>
              <th className="px-4 py-3 font-medium">{t("cash.ui.entries.table.tax")}</th>
              <th className="px-4 py-3 font-medium">{t("cash.ui.entries.table.source")}</th>
              <th className="px-4 py-3 text-right font-medium">
                {t("cash.ui.entries.table.balanceAfter")}
              </th>
              <th className="px-4 py-3 text-center font-medium">
                {t("cash.ui.entries.table.beleg")}
              </th>
              <th className="px-4 py-3 text-right font-medium">
                {t("cash.ui.entries.table.actions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const attachmentCount = attachmentCountByEntryId.get(entry.id) ?? 0;

              return (
                <tr key={entry.id} className="border-t border-border/40">
                  <td className="px-4 py-3">{formatDateTime(entry.occurredAt)}</td>
                  <td className="px-4 py-3">{entry.entryNo}</td>
                  <td className="px-4 py-3">{entry.description}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{entryTypeLabel(entry.type)}</Badge>
                  </td>
                  <td className="px-4 py-3">{directionLabel(entry.direction)}</td>
                  <td className="px-4 py-3 text-right">
                    {entry.direction === "OUT" ? "-" : "+"}
                    {formatMoney(entry.grossAmountCents, undefined, entry.currency)}
                  </td>
                  <td className="px-4 py-3">
                    {entry.taxMode && entry.taxMode !== "NONE"
                      ? `${entry.taxLabel ?? entry.taxCode ?? t("cash.ui.entries.table.tax")} (${formatMoney(
                          entry.taxAmountCents ?? 0,
                          undefined,
                          entry.currency
                        )})`
                      : t("cash.ui.entries.createDialog.noVat")}
                  </td>
                  <td className="px-4 py-3">{entrySourceLabel(entry.source)}</td>
                  <td className="px-4 py-3 text-right">
                    {formatMoney(entry.balanceAfterCents, undefined, entry.currency)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {attachmentCount > 0 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="mx-auto h-8 px-2"
                        aria-label={t("cash.ui.entries.rowActions.downloadBeleg")}
                        disabled={isDownloadingAttachments}
                        onClick={() => onDownloadAttachments(entry.id)}
                      >
                        <Paperclip className="h-4 w-4" />
                        <span className="ml-1">{attachmentCount}</span>
                      </Button>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <CrudRowActions
                      secondaryActions={[
                        {
                          label: t("cash.ui.entries.rowActions.viewRegister"),
                          href: `/cash/registers/${registerId}`,
                        },
                        {
                          label: t("cash.ui.entries.rowActions.reverse"),
                          onClick: () => onReverseEntry(entry.id),
                          disabled: Boolean(entry.reversedByEntryId),
                        },
                        {
                          label: t("cash.ui.entries.rowActions.addBeleg"),
                          onClick: () => onAddBeleg(entry.id),
                        },
                      ]}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
