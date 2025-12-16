import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "./app/AppShell";
import DashboardPage from "./modules/core/DashboardPage";
import AssistantPage from "./modules/assistant/AssistantPage";
import ExpensesPage from "./modules/expenses/ExpensesPage";
import InvoicesPage from "./modules/invoices/InvoicesPage";
import ClientsPage from "./modules/clients/ClientsPage";
import SettingsPage from "./modules/settings/SettingsPage";
import NotFound from "./pages/NotFound";
import "./shared/i18n";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
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
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
