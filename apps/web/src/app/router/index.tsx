import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "../AppShell";
import { DashboardPage } from "../../modules/core";
import { AssistantPage } from "../../modules/assistant";
import { ExpensesPage } from "../../modules/expenses";
import { InvoicesPage } from "../../modules/invoices";
import { ClientsPage } from "../../modules/clients";
import { SettingsPage } from "../../modules/settings";
import NotFound from "../../shared/components/NotFound";

export const Router = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route element={<AppShell />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/assistant" element={<AssistantPage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/invoices" element={<InvoicesPage />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);