import React from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { useThemeStore } from "@/shared/theme/themeStore";
import { getDb } from "@/shared/mock/mockDb";
import { Moon, Sun, Monitor, Globe } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Link } from "react-router-dom";

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useThemeStore();
  const db = getDb();

  const changeLanguage = (lang: string) => {
    void i18n.changeLanguage(lang);
    localStorage.setItem("bizflow-language", lang);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in max-w-4xl">
      <h1 className="text-h1 text-foreground">{t("settings.title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>Platform Management</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            Manage apps, templates, and workspace customizations.
          </div>
          <Button variant="accent" asChild>
            <Link to="/settings/platform">Platform Settings</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Access control</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            Manage tenant roles and permission grants.
          </div>
          <Button variant="accent" asChild>
            <Link to="/settings/roles">Manage roles</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.profile")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("settings.name")}</Label>
              <Input defaultValue={db.user.name} />
            </div>
            <div>
              <Label>{t("settings.email")}</Label>
              <Input defaultValue={db.user.email} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.business")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("settings.businessName")}</Label>
              <Input defaultValue={db.tenant.name} />
            </div>
            <div>
              <Label>{t("settings.vatId")}</Label>
              <Input defaultValue={db.tenant.vatId} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.theme")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {[
              { value: "light", icon: Sun },
              { value: "dark", icon: Moon },
              { value: "system", icon: Monitor },
            ].map(({ value, icon: Icon }) => (
              <Button
                key={value}
                variant={theme === value ? "accent" : "outline"}
                onClick={() => setTheme(value as any)}
                className="flex-1"
              >
                <Icon className="h-4 w-4 mr-2" />
                {t(`settings.themes.${value}`)}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.language")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {[
              { code: "de", label: "🇩🇪 Deutsch" },
              { code: "en", label: "🇬🇧 English" },
            ].map(({ code, label }) => (
              <Button
                key={code}
                variant={i18n.language === code ? "accent" : "outline"}
                onClick={() => changeLanguage(code)}
                className="flex-1"
              >
                {label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
