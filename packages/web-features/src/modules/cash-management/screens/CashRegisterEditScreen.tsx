import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@corely/ui";
import { cashManagementApi } from "@corely/web-shared/lib/cash-management-api";
import { cashKeys } from "../queries";
import { useQueryClient } from "@tanstack/react-query";

export function CashRegisterEditScreen() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");

  const registerQuery = useQuery({
    queryKey: id ? cashKeys.registers.detail(id) : ["cash-registers", "missing-id"],
    queryFn: () => cashManagementApi.getRegister(id as string),
    enabled: Boolean(id),
  });

  const register = registerQuery.data?.register;

  const updateMutation = useMutation({
    mutationFn: () =>
      cashManagementApi.updateRegister(id as string, {
        name: name.trim() || undefined,
        location: location.trim() || null,
      }),
    onSuccess: async () => {
      if (!id) {
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: cashKeys.registers.detail(id),
      });
      await queryClient.invalidateQueries({
        queryKey: cashKeys.registers.list(),
      });
      navigate(`/cash/registers/${id}`);
    },
  });

  useEffect(() => {
    if (!register) {
      return;
    }
    setName(register.name);
    setLocation(register.location ?? "");
  }, [register]);

  if (!id) {
    return null;
  }

  if (registerQuery.isLoading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">{t("cash.ui.common.loadingRegister")}</div>
    );
  }

  if (!register) {
    return (
      <div className="p-6 text-sm text-destructive">{t("cash.ui.common.registerNotFound")}</div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-5 sm:px-5 sm:py-6 lg:p-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("cash.ui.registerForm.editTitle")}</CardTitle>
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
          {updateMutation.isError ? (
            <p className="text-sm text-destructive">{t("cash.ui.registerForm.updateFailed")}</p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => navigate(`/cash/registers/${id}`)}>
              {t("cash.ui.common.cancel")}
            </Button>
            <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
              {t("cash.ui.registerForm.saveChanges")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
