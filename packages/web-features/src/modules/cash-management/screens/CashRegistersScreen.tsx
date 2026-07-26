import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button, Input } from "@corely/ui";
import { Filter, Plus, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { cashManagementApi } from "@corely/web-shared/lib/cash-management-api";
import { CrudListPageLayout, CrudRowActions } from "@corely/web-shared/shared/crud";
import { formatMoney } from "@corely/web-shared/shared/lib/formatters";
import { useCashPermissions } from "../access";
import { cashKeys } from "../queries";

type RegisterFilters = {
  q: string;
  location: string;
  currency: string;
};

const defaultFilters: RegisterFilters = {
  q: "",
  location: "",
  currency: "",
};

export function CashRegistersScreen() {
  const { t } = useTranslation();
  const { canManageCash } = useCashPermissions();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<RegisterFilters>(defaultFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const hasFilters = Boolean(filters.q || filters.location || filters.currency);

  const queryParams = useMemo(
    () => ({
      q: filters.q || undefined,
      location: filters.location || undefined,
      currency: filters.currency || undefined,
    }),
    [filters]
  );

  const registersQuery = useQuery({
    queryKey: cashKeys.registers.list(queryParams),
    queryFn: () => cashManagementApi.listRegisters(queryParams),
  });

  const registers = registersQuery.data?.registers ?? [];

  return (
    <CrudListPageLayout
      title={t("cash.ui.registers.title")}
      subtitle={t("cash.ui.registers.subtitle")}
      primaryAction={
        canManageCash ? (
          <Button asChild className="cash-mobile-primary-action">
            <Link to="/cash/registers/new">
              <Plus className="mr-2 h-4 w-4" />
              {t("cash.ui.registers.newRegister")}
            </Link>
          </Button>
        ) : undefined
      }
      filters={
        <div className="w-full space-y-3">
          <Input
            value={filters.q}
            onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value }))}
            placeholder={t("cash.ui.registers.searchPlaceholder")}
            className="w-full sm:w-60"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 sm:hidden"
              onClick={() => setFiltersOpen((open) => !open)}
              aria-expanded={filtersOpen}
            >
              <Filter className="h-4 w-4" />
              {t("common.filters", "Filters")}
            </Button>
            {hasFilters ? (
              <Button
                type="button"
                variant="ghost"
                className="min-h-11"
                onClick={() => setFilters(defaultFilters)}
              >
                <RotateCcw className="h-4 w-4" />
                {t("common.clear", "Clear")}
              </Button>
            ) : null}
          </div>
          <div className={`${filtersOpen ? "grid" : "hidden"} gap-3 sm:grid sm:grid-cols-2`}>
            <Input
              value={filters.location}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, location: event.target.value }))
              }
              placeholder={t("cash.ui.registers.locationPlaceholder")}
              className="w-full"
            />
            <Input
              value={filters.currency}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, currency: event.target.value.toUpperCase() }))
              }
              placeholder={t("cash.ui.registers.currencyPlaceholder")}
              className="w-full"
              maxLength={3}
            />
          </div>
        </div>
      }
    >
      {registersQuery.isLoading ? (
        <div className="p-6 text-sm text-muted-foreground">{t("cash.ui.registers.loading")}</div>
      ) : registersQuery.isError ? (
        <div className="p-6 text-sm text-destructive">{t("cash.ui.registers.loadFailed")}</div>
      ) : registers.length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground">{t("cash.ui.registers.empty")}</div>
      ) : (
        <>
          <div className="space-y-3 p-3 sm:hidden">
            {registers.map((register) => (
              <article
                key={register.id}
                className="rounded-lg border border-border/70 bg-background p-4"
              >
                <div className="min-w-0">
                  <h2 className="break-words font-semibold">{register.name}</h2>
                  <p className="mt-1 break-words text-sm text-muted-foreground">
                    {register.location ?? t("cash.ui.common.noLocation")}
                  </p>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">
                      {t("cash.ui.registers.table.currency")}
                    </dt>
                    <dd className="mt-1 font-medium">{register.currency}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">
                      {t("cash.ui.registers.table.currentBalance")}
                    </dt>
                    <dd className="mt-1 break-words font-semibold">
                      {formatMoney(register.currentBalanceCents, undefined, register.currency)}
                    </dd>
                  </div>
                </dl>
                <Button asChild className="mt-4 w-full">
                  <Link to={`/cash/registers/${register.id}`}>{t("cash.ui.registers.open")}</Link>
                </Button>
              </article>
            ))}
          </div>
          <div className="hidden overflow-x-auto sm:block">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/30 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("cash.ui.registers.table.name")}</th>
                  <th className="px-4 py-3 font-medium">{t("cash.ui.registers.table.location")}</th>
                  <th className="px-4 py-3 font-medium">{t("cash.ui.registers.table.currency")}</th>
                  <th className="px-4 py-3 font-medium text-right">
                    {t("cash.ui.registers.table.currentBalance")}
                  </th>
                  <th className="px-4 py-3 font-medium text-right">
                    {t("cash.ui.registers.table.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {registers.map((register) => (
                  <tr
                    key={register.id}
                    className="cursor-pointer border-t transition-colors hover:bg-muted/20 focus-visible:bg-muted/20"
                    onClick={() => navigate(`/cash/registers/${register.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigate(`/cash/registers/${register.id}`);
                      }
                    }}
                    tabIndex={0}
                  >
                    <td className="px-4 py-3 font-medium">{register.name}</td>
                    <td className="px-4 py-3">{register.location ?? "-"}</td>
                    <td className="px-4 py-3">{register.currency}</td>
                    <td className="px-4 py-3 text-right">
                      {formatMoney(register.currentBalanceCents, undefined, register.currency)}
                    </td>
                    <td
                      className="px-4 py-3 text-right"
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      <CrudRowActions
                        primaryAction={{
                          label: t("cash.ui.registers.open"),
                          href: `/cash/registers/${register.id}`,
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </CrudListPageLayout>
  );
}
