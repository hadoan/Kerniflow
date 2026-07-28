import React from "react";
import { Link, createSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { type ToolRendererProps } from "@corely/web-shared/shared/components/chat/ChatParts";
import { type ViewKassenberichtOutput } from "@corely/contracts/cash-management";
import { Button, Card, CardContent, Alert, AlertTitle, AlertDescription } from "@corely/ui";
import { FileText, ExternalLink, AlertCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { vi, de, enUS } from "date-fns/locale";

const locales: Record<string, Locale> = {
  vi,
  de,
  en: enUS,
};

export const ViewKassenberichtRenderer: React.FC<ToolRendererProps> = ({ state, output }) => {
  const { t, i18n } = useTranslation();

  if (state !== "output-available" || !output) {
    return null;
  }

  const out = output as any;

  if (out.ok !== true || !out.result || out.result.type !== "cash.view-kassenbericht") {
    const errorMsg =
      out?.error?.message ||
      t("cashAssistant.kassenbericht.invalidLink", "The Kassenbericht link could not be created.");
    return (
      <Alert variant="destructive" className="my-2">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{errorMsg}</AlertDescription>
      </Alert>
    );
  }

  const { registerId, day } = out.result as ViewKassenberichtOutput;

  const locale = locales[i18n.language.slice(0, 2)] || enUS;
  let formattedDate = day;
  try {
    const parsedDate = parseISO(day);
    // Format appropriately per locale, e.g. "dd.MM.yyyy" for de, "dd/MM/yyyy" for vi
    if (i18n.language.startsWith("de")) {
      formattedDate = format(parsedDate, "dd.MM.yyyy", { locale });
    } else if (i18n.language.startsWith("vi")) {
      formattedDate = format(parsedDate, "dd/MM/yyyy", { locale });
    } else {
      formattedDate = format(parsedDate, "MMM d, yyyy", { locale });
    }
  } catch (e) {
    // fallback if parse error
  }

  const search = createSearchParams({ day }).toString();
  const destination = {
    pathname: `/cash/registers/${encodeURIComponent(registerId)}/kassenbericht`,
    search: `?${search}`,
  };

  const title = t("cashAssistant.kassenbericht.title", "Kassenbericht");
  const openLabel = t("cashAssistant.kassenbericht.open", "Open Kassenbericht");
  const ariaLabel = t("cashAssistant.kassenbericht.openForDay", {
    day: formattedDate,
    defaultValue: `Open Kassenbericht for ${formattedDate}`,
  });

  return (
    <Card className="my-4 overflow-hidden max-w-sm">
      <CardContent className="p-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm">{title}</span>
            <span className="text-sm text-muted-foreground">{formattedDate}</span>
          </div>
        </div>
        <Button asChild variant="default" className="w-full justify-between" aria-label={ariaLabel}>
          <Link to={destination}>
            <span>{openLabel}</span>
            <ExternalLink className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};
