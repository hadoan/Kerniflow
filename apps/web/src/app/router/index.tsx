import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "../AppShell";
import { DashboardPage } from "../../modules/core";
import { AssistantPage } from "../../modules/assistant";
import { ExpensesPage, NewExpensePage } from "../../modules/expenses";
import { InvoicesPage, NewInvoicePage, InvoiceDetailPage } from "../../modules/invoices";
import { CustomersPage, NewCustomerPage, EditCustomerPage } from "../../modules/customers";
import {
  AccountingDashboard,
  SetupWizard,
  ChartOfAccountsList,
  JournalEntriesList,
  ReportsHub,
} from "../../modules/accounting/screens";
import { SettingsPage } from "../../modules/settings";
import { TaxSettingsPage } from "../../modules/tax";
import NotFound from "../../shared/components/NotFound";
import { LoginPage } from "../../routes/auth/login";
import SignupPage from "../../routes/auth/signup";
import { RequireAuth } from "./require-auth";
import { CopilotPage } from "../../routes/copilot";
import {
  WorkspaceMembersPage,
  WorkspaceOnboardingPage,
  WorkspaceSettingsPage,
} from "../../modules/workspaces";

export const Router = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/auth/signup" element={<SignupPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/onboarding" element={<WorkspaceOnboardingPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/assistant" element={<AssistantPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/expenses/new" element={<NewExpensePage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/invoices/new" element={<NewInvoicePage />} />
          <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/customers/new" element={<NewCustomerPage />} />
          <Route path="/customers/:id" element={<EditCustomerPage />} />
          <Route path="/accounting" element={<AccountingDashboard />} />
          <Route path="/accounting/setup" element={<SetupWizard />} />
          <Route path="/accounting/accounts" element={<ChartOfAccountsList />} />
          <Route path="/accounting/journal-entries" element={<JournalEntriesList />} />
          <Route path="/accounting/reports" element={<ReportsHub />} />
          <Route path="/copilot" element={<CopilotPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/workspace" element={<WorkspaceSettingsPage />} />
          <Route path="/settings/members" element={<WorkspaceMembersPage />} />
          <Route path="/settings/tax" element={<TaxSettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);
