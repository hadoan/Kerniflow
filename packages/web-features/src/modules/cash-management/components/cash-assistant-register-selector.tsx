import React from "react";
import { type CashRegister } from "@corely/contracts";
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription } from "@corely/ui";
import { useTranslation } from "react-i18next";
import { MonitorSmartphone, MapPin, Loader2 } from "lucide-react";

export interface CashAssistantRegisterSelectorProps {
  registers: CashRegister[];
  onSelectRegister: (register: CashRegister) => void;
  isBinding?: boolean;
}

export function CashAssistantRegisterSelector({
  registers,
  onSelectRegister,
  isBinding = false,
}: CashAssistantRegisterSelectorProps) {
  const { t } = useTranslation();

  // Determine if currency display is needed to distinguish registers with identical name and location
  const showCurrency = React.useMemo(() => {
    const keys = new Set<string>();
    for (const r of registers) {
      const key = `${r.name.trim().toLowerCase()}-${(r.location ?? "").trim().toLowerCase()}`;
      if (keys.has(key)) {
        return true;
      }
      keys.add(key);
    }
    return false;
  }, [registers]);

  return (
    <div className="flex h-full min-h-[300px] flex-col items-center justify-center p-6 text-center">
      <Card className="w-full max-w-lg border border-border bg-card shadow-sm">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MonitorSmartphone className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-semibold">
            {t("cashDashboard.registerSelector.title", "Choose a cash register")}
          </CardTitle>
          <CardDescription className="mt-1 text-sm text-muted-foreground">
            {t(
              "cashDashboard.registerSelector.description",
              "This conversation will use the selected register."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3" data-testid="cash-register-selector">
            {registers.map((reg, index) => (
              <Button
                key={reg.id}
                type="button"
                variant="outline"
                disabled={isBinding}
                data-testid={`select-register-item-${index}`}
                onClick={() => onSelectRegister(reg)}
                className="flex h-auto w-full items-center justify-between p-4 text-left transition-all hover:border-primary hover:bg-accent/10"
              >
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="truncate font-semibold text-foreground text-base">
                    {reg.name}
                  </span>
                  {reg.location ? (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{reg.location}</span>
                    </span>
                  ) : null}
                </div>
                {showCurrency && reg.currency ? (
                  <span className="text-xs font-mono font-medium text-muted-foreground uppercase px-2 py-1 bg-muted rounded">
                    {reg.currency}
                  </span>
                ) : null}
              </Button>
            ))}
          </div>

          {isBinding ? (
            <div className="flex items-center justify-center gap-2 pt-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>{t("cashDashboard.registerSelector.binding", "Selecting register...")}</span>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
