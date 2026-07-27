import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { cashManagementFeature } from "@corely/web-features";
import { AssistantPage } from "@corely/web-features/modules/assistant";
import { TaxSettingsPage } from "@corely/web-features/modules/tax";
import { PaymentMethodsSettings } from "@corely/web-shared/settings";
import NotFound from "@corely/web-shared/shared/components/NotFound";
import { CashManagementShell } from "./CashManagementShell";
import { RequireAuth } from "./require-auth";
import { LoginPage } from "../routes/auth/login";
import SignupPage from "../routes/auth/signup";
import ForgotPasswordPage from "../routes/auth/forgot-password";
import { SettingsPage } from "../screens/SettingsPage";
import { CashManagementOnboardingRoute } from "../routes/onboarding";

export const Router = () => (
  <BrowserRouter
    future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    }}
  >
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/auth/signup" element={<SignupPage />} />
      <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/auth/reset-password" element={<Navigate to="/auth/login" replace />} />

      <Route element={<RequireAuth />}>
        {/* Onboarding Shell (no nav sidebar) */}
        <Route path="/onboarding/cash-management" element={<CashManagementOnboardingRoute />} />
        <Route
          path="/onboarding/cash-management/resume"
          element={<CashManagementOnboardingRoute />}
        />
        <Route path="/onboarding" element={<Navigate to="/onboarding/cash-management" replace />} />

        {/* Main App Shell */}
        <Route element={<CashManagementShell />}>
          <Route path="/assistant" element={<AssistantPage activeModule="cash-management" />} />
          <Route
            path="/assistant/t/:threadId"
            element={<AssistantPage activeModule="cash-management" />}
          />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/tax" element={<TaxSettingsPage />} />
          <Route path="/settings/payment-methods" element={<PaymentMethodsSettings />} />
          {cashManagementFeature.cashManagementRoutes().map((route) => (
            <Route key={route.path} path={route.path} element={route.element} />
          ))}
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);
