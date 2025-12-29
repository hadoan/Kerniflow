import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "../AppShell";
import { DashboardPage } from "../../modules/core";
import { AssistantPage } from "../../modules/assistant";
import { ExpensesPage, NewExpensePage } from "../../modules/expenses";
import { InvoicesPage, NewInvoicePage, InvoiceDetailPage } from "../../modules/invoices";
import { CustomersPage, NewCustomerPage, EditCustomerPage } from "../../modules/customers";
import { DealsPage, DealDetailPage, ActivitiesPage } from "../../modules/crm";
import {
  QuotesPage as SalesQuotesPage,
  NewQuotePage,
  QuoteDetailPage,
  OrdersPage as SalesOrdersPage,
  NewOrderPage,
  OrderDetailPage,
  InvoicesPage as SalesInvoicesPage,
  NewInvoicePage as SalesNewInvoicePage,
  InvoiceDetailPage as SalesInvoiceDetailPage,
  SalesSettingsPage,
  SalesCopilotPage,
} from "../../modules/sales";
import {
  AccountingDashboard,
  SetupWizard,
  ChartOfAccountsList,
  JournalEntriesList,
  ReportsHub,
} from "../../modules/accounting/screens";
import {
  PurchaseOrdersPage,
  PurchaseOrderDetailPage,
  NewPurchaseOrderPage,
  VendorBillsPage,
  VendorBillDetailPage,
  NewVendorBillPage,
  RecordBillPaymentPage,
  PurchasingSettingsPage,
  PurchasingCopilotPage,
} from "../../modules/purchasing";
import {
  ProductsPage,
  ProductDetailPage,
  WarehousesPage,
  StockOverviewPage,
  DocumentsPage,
  DocumentDetailPage,
  ReorderDashboardPage,
  InventoryCopilotPage,
} from "../../modules/inventory";
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
          <Route path="/sales/quotes" element={<SalesQuotesPage />} />
          <Route path="/sales/quotes/new" element={<NewQuotePage />} />
          <Route path="/sales/quotes/:quoteId" element={<QuoteDetailPage />} />
          <Route path="/sales/orders" element={<SalesOrdersPage />} />
          <Route path="/sales/orders/new" element={<NewOrderPage />} />
          <Route path="/sales/orders/:orderId" element={<OrderDetailPage />} />
          <Route path="/sales/invoices" element={<SalesInvoicesPage />} />
          <Route path="/sales/invoices/new" element={<SalesNewInvoicePage />} />
          <Route path="/sales/invoices/:invoiceId" element={<SalesInvoiceDetailPage />} />
          <Route path="/sales/settings" element={<SalesSettingsPage />} />
          <Route path="/sales/copilot" element={<SalesCopilotPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/customers/new" element={<NewCustomerPage />} />
          <Route path="/customers/:id" element={<EditCustomerPage />} />
          <Route path="/crm/deals" element={<DealsPage />} />
          <Route path="/crm/deals/:id" element={<DealDetailPage />} />
          <Route path="/crm/activities" element={<ActivitiesPage />} />
          <Route path="/accounting" element={<AccountingDashboard />} />
          <Route path="/accounting/setup" element={<SetupWizard />} />
          <Route path="/accounting/accounts" element={<ChartOfAccountsList />} />
          <Route path="/accounting/journal-entries" element={<JournalEntriesList />} />
          <Route path="/accounting/reports" element={<ReportsHub />} />
          <Route path="/purchasing/purchase-orders" element={<PurchaseOrdersPage />} />
          <Route path="/purchasing/purchase-orders/new" element={<NewPurchaseOrderPage />} />
          <Route path="/purchasing/purchase-orders/:id" element={<PurchaseOrderDetailPage />} />
          <Route path="/purchasing/vendor-bills" element={<VendorBillsPage />} />
          <Route path="/purchasing/vendor-bills/new" element={<NewVendorBillPage />} />
          <Route path="/purchasing/vendor-bills/:id" element={<VendorBillDetailPage />} />
          <Route path="/purchasing/vendor-bills/:id/pay" element={<RecordBillPaymentPage />} />
          <Route path="/purchasing/settings" element={<PurchasingSettingsPage />} />
          <Route path="/purchasing/copilot" element={<PurchasingCopilotPage />} />
          <Route path="/inventory/products" element={<ProductsPage />} />
          <Route path="/inventory/products/:id" element={<ProductDetailPage />} />
          <Route path="/inventory/warehouses" element={<WarehousesPage />} />
          <Route path="/inventory/stock" element={<StockOverviewPage />} />
          <Route path="/inventory/documents" element={<DocumentsPage />} />
          <Route path="/inventory/documents/:id" element={<DocumentDetailPage />} />
          <Route path="/inventory/reorder" element={<ReorderDashboardPage />} />
          <Route path="/inventory/copilot" element={<InventoryCopilotPage />} />
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
