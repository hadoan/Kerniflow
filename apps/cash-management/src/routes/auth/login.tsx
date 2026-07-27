import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { Button, Card, CardContent, Input, Label } from "@corely/ui";
import { ensureDefaultWorkspace } from "@corely/web-shared";
import { useAuth } from "@corely/web-shared/lib/auth-provider";
import { useTranslation } from "react-i18next";
import { normalizeError } from "@corely/api-client";
import { pingApi } from "../../lib/ping-api";
import { COPILOT_AUTH_RETURN_TO_KEY } from "@corely/web-shared/lib/copilot-auth-fetch";

export const LoginPage = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { signin, error: authError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const language =
    i18n.resolvedLanguage?.startsWith("de") || i18n.language?.startsWith("de")
      ? "de"
      : i18n.resolvedLanguage?.startsWith("vi") || i18n.language?.startsWith("vi")
        ? "vi"
        : "en";

  useEffect(() => {
    pingApi("login");
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await signin({ email, password });
      await ensureDefaultWorkspace(email);
      const returnTo = window.sessionStorage.getItem(COPILOT_AUTH_RETURN_TO_KEY);
      window.sessionStorage.removeItem(COPILOT_AUTH_RETURN_TO_KEY);
      navigate(returnTo?.startsWith("/") ? returnTo : "/cash/registers", { replace: true });
    } catch (err) {
      const apiError = normalizeError(err);
      const message = apiError.isNetworkError
        ? t("auth.errors.networkError")
        : apiError.detail || t("auth.errors.loginFailed");
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">{t("auth.signin.title")}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{t("auth.signin.subtitle")}</p>
            </div>
            <select
              value={language}
              onChange={(event) => i18n.changeLanguage(event.target.value)}
              className="h-9 rounded-md border border-border/60 bg-muted/30 px-2 text-xs text-foreground"
              aria-label="Select language"
            >
              <option value="en">English</option>
              <option value="de">Deutsch</option>
              <option value="vi">Tiếng Việt</option>
            </select>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            {error || authError ? (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error || authError}
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.fields.email")}</Label>
              <Input
                id="email"
                data-testid="login-email"
                type="email"
                autoComplete="email"
                placeholder={t("auth.placeholders.email")}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.fields.password")}</Label>
              <div className="relative">
                <Input
                  id="password"
                  data-testid="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder={t("auth.placeholders.password")}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="text-right text-sm">
                <Link to="/auth/forgot-password" className="text-accent">
                  {t("auth.signin.forgotPassword")}
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              className="mx-auto block w-full max-w-[220px]"
              disabled={isLoading}
              data-testid="login-submit"
            >
              {isLoading ? t("auth.signin.signingIn") : t("auth.signin.cta")}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              {t("auth.signin.noAccount")}{" "}
              <Link to="/auth/signup" className="text-accent">
                {t("auth.signup.cta")}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
