import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { cashManagementApi } from "@corely/web-shared/lib/cash-management-api";

export function CashRegisterNewScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [disallowNegativeBalance, setDisallowNegativeBalance] = useState(false);

  const createMutation = useMutation({
    mutationFn: () =>
      cashManagementApi.createRegister({
        name: name.trim(),
        location: location.trim() || null,
        currency: currency.trim().toUpperCase(),
        disallowNegativeBalance,
      }),
    onSuccess: (result) => {
      navigate(`/cash/registers/${result.register.id}`);
    },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-5 sm:px-5 sm:py-6 lg:p-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("cash.ui.registerForm.newTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="register-name">{t("cash.ui.registerForm.name")}</Label>
            <Input
              id="register-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("cash.ui.registerForm.namePlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="register-location">{t("cash.ui.registerForm.location")}</Label>
            <Input
              id="register-location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder={t("cash.ui.registerForm.locationPlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="register-currency">{t("cash.ui.registerForm.currency")}</Label>
            <Input
              id="register-currency"
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
              maxLength={3}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={disallowNegativeBalance}
              onCheckedChange={(value) => setDisallowNegativeBalance(value === true)}
            />
            {t("cash.ui.registerForm.disallowNegativeBalance")}
          </label>
          {createMutation.isError ? (
            <p className="text-sm text-destructive">{t("cash.ui.registerForm.createFailed")}</p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => navigate("/cash/registers")}>
              {t("cash.ui.common.cancel")}
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !name.trim()}
            >
              {t("cash.ui.registerForm.create")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
