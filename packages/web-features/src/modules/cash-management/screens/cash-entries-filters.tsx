import type { Dispatch, SetStateAction } from "react";
import { Input } from "@corely/ui";
import { useTranslation } from "react-i18next";

export type CashEntryFilters = {
  dayKeyFrom: string;
  dayKeyTo: string;
  type: string;
  source: string;
  q: string;
};

type CashEntriesFiltersProps = {
  filters: CashEntryFilters;
  setFilters: Dispatch<SetStateAction<CashEntryFilters>>;
  entryTypes: readonly string[];
  entrySources: readonly string[];
  entryTypeLabel: (value: string) => string;
  entrySourceLabel: (value: string) => string;
};

export function CashEntriesFilters({
  filters,
  setFilters,
  entryTypes,
  entrySources,
  entryTypeLabel,
  entrySourceLabel,
}: CashEntriesFiltersProps) {
  const { t } = useTranslation();

  return (
    <div className="grid w-full gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end">
      <Input
        value={filters.q}
        onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value }))}
        placeholder={t("cash.ui.entries.filters.searchDescription")}
        className="order-first w-full lg:order-none lg:w-48"
      />
      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:w-auto">
        <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-muted-foreground">
          <span>{t("cash.ui.entries.filters.dayFrom")}</span>
          <Input
            type="date"
            value={filters.dayKeyFrom}
            aria-label={t("cash.ui.entries.filters.dayFrom")}
            className="min-w-0"
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, dayKeyFrom: event.target.value }))
            }
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-muted-foreground">
          <span>{t("cash.ui.entries.filters.dayTo")}</span>
          <Input
            type="date"
            value={filters.dayKeyTo}
            aria-label={t("cash.ui.entries.filters.dayTo")}
            className="min-w-0"
            onChange={(event) => setFilters((prev) => ({ ...prev, dayKeyTo: event.target.value }))}
          />
        </label>
      </div>
      <select
        className="h-11 w-full rounded-md border bg-background px-3 text-base sm:text-sm lg:h-10 lg:w-auto"
        value={filters.type}
        onChange={(event) => setFilters((prev) => ({ ...prev, type: event.target.value }))}
      >
        <option value="">{t("cash.ui.entries.filters.allTypes")}</option>
        {entryTypes.map((value) => (
          <option key={value} value={value}>
            {entryTypeLabel(value)}
          </option>
        ))}
      </select>
      <select
        className="h-11 w-full rounded-md border bg-background px-3 text-base sm:text-sm lg:h-10 lg:w-auto"
        value={filters.source}
        onChange={(event) => setFilters((prev) => ({ ...prev, source: event.target.value }))}
      >
        <option value="">{t("cash.ui.entries.filters.allSources")}</option>
        {entrySources.map((value) => (
          <option key={value} value={value}>
            {entrySourceLabel(value)}
          </option>
        ))}
      </select>
    </div>
  );
}
