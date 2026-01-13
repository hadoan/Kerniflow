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
import { SettingsPage, RolesPage, RolePermissionsPage } from "../../modules/settings";
import { RequirePermission } from "../../modules/settings/components/RequirePermission";
import { TaxSettingsPage, TaxesOverviewPage, TaxReportsPage } from "../../modules/tax";
import {
  PlatformPage,
  AppsManagementPage,
  TemplatesPage,
  MenuCustomizerPage,
} from "../../modules/platform";
import NotFound from "../../shared/components/NotFound";
import { LoginPage } from "../../routes/auth/login";
import SignupPage from "../../routes/auth/signup";
import { RequireAuth } from "./require-auth";
import { CopilotPage } from "../../routes/copilot";
import { RequireCapability } from "../../shared/workspaces/RequireCapability";
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
          <Route path="/expenses/:id/edit" element={<NewExpensePage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/invoices/new" element={<NewInvoicePage />} />
          <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
          <Route
            path="/sales/quotes"
            element={
              <RequireCapability capability="sales.quotes">
                <SalesQuotesPage />
              </RequireCapability>
            }
          />
          <Route
            path="/sales/quotes/new"
            element={
              <RequireCapability capability="sales.quotes">
                <NewQuotePage />
              </RequireCapability>
            }
          />
          <Route
            path="/sales/quotes/:quoteId"
            element={
              <RequireCapability capability="sales.quotes">
                <QuoteDetailPage />
              </RequireCapability>
            }
          />
          <Route
            path="/sales/orders"
            element={
              <RequireCapability capability="sales.quotes">
                <SalesOrdersPage />
              </RequireCapability>
            }
          />
          <Route
            path="/sales/orders/new"
            element={
              <RequireCapability capability="sales.quotes">
                <NewOrderPage />
              </RequireCapability>
            }
          />
          <Route
            path="/sales/orders/:orderId"
            element={
              <RequireCapability capability="sales.quotes">
                <OrderDetailPage />
              </RequireCapability>
            }
          />
          <Route
            path="/sales/invoices"
            element={
              <RequireCapability capability="sales.quotes">
                <SalesInvoicesPage />
              </RequireCapability>
            }
          />
          <Route
            path="/sales/invoices/new"
            element={
              <RequireCapability capability="sales.quotes">
                <SalesNewInvoicePage />
              </RequireCapability>
            }
          />
          <Route
            path="/sales/invoices/:invoiceId"
            element={
              <RequireCapability capability="sales.quotes">
                <SalesInvoiceDetailPage />
              </RequireCapability>
            }
          />
          <Route
            path="/sales/settings"
            element={
              <RequireCapability capability="sales.quotes">
                <SalesSettingsPage />
              </RequireCapability>
            }
          />
          <Route
            path="/sales/copilot"
            element={
              <RequireCapability capability="sales.quotes">
                <SalesCopilotPage />
              </RequireCapability>
            }
          />
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
          <Route
            path="/purchasing/purchase-orders"
            element={
              <RequireCapability capability="purchasing.purchaseOrders">
                <PurchaseOrdersPage />
              </RequireCapability>
            }
          />
          <Route
            path="/purchasing/purchase-orders/new"
            element={
              <RequireCapability capability="purchasing.purchaseOrders">
                <NewPurchaseOrderPage />
              </RequireCapability>
            }
          />
          <Route
            path="/purchasing/purchase-orders/:id"
            element={
              <RequireCapability capability="purchasing.purchaseOrders">
                <PurchaseOrderDetailPage />
              </RequireCapability>
            }
          />
          <Route
            path="/purchasing/vendor-bills"
            element={
              <RequireCapability capability="purchasing.purchaseOrders">
                <VendorBillsPage />
              </RequireCapability>
            }
          />
          <Route
            path="/purchasing/vendor-bills/new"
            element={
              <RequireCapability capability="purchasing.purchaseOrders">
                <NewVendorBillPage />
              </RequireCapability>
            }
          />
          <Route
            path="/purchasing/vendor-bills/:id"
            element={
              <RequireCapability capability="purchasing.purchaseOrders">
                <VendorBillDetailPage />
              </RequireCapability>
            }
          />
          <Route
            path="/purchasing/vendor-bills/:id/pay"
            element={
              <RequireCapability capability="purchasing.purchaseOrders">
                <RecordBillPaymentPage />
              </RequireCapability>
            }
          />
          <Route
            path="/purchasing/settings"
            element={
              <RequireCapability capability="purchasing.purchaseOrders">
                <PurchasingSettingsPage />
              </RequireCapability>
            }
          />
          <Route
            path="/purchasing/copilot"
            element={
              <RequireCapability capability="purchasing.purchaseOrders">
                <PurchasingCopilotPage />
              </RequireCapability>
            }
          />
          <Route
            path="/inventory/products"
            element={
              <RequireCapability capability="inventory.basic">
                <ProductsPage />
              </RequireCapability>
            }
          />
          <Route
            path="/inventory/products/:id"
            element={
              <RequireCapability capability="inventory.basic">
                <ProductDetailPage />
              </RequireCapability>
            }
          />
          <Route
            path="/inventory/warehouses"
            element={
              <RequireCapability capability="inventory.basic">
                <WarehousesPage />
              </RequireCapability>
            }
          />
          <Route
            path="/inventory/stock"
            element={
              <RequireCapability capability="inventory.basic">
                <StockOverviewPage />
              </RequireCapability>
            }
          />
          <Route
            path="/inventory/documents"
            element={
              <RequireCapability capability="inventory.basic">
                <DocumentsPage />
              </RequireCapability>
            }
          />
          <Route
            path="/inventory/documents/:id"
            element={
              <RequireCapability capability="inventory.basic">
                <DocumentDetailPage />
              </RequireCapability>
            }
          />
          <Route
            path="/inventory/reorder"
            element={
              <RequireCapability capability="inventory.basic">
                <ReorderDashboardPage />
              </RequireCapability>
            }
          />
          <Route
            path="/inventory/copilot"
            element={
              <RequireCapability capability="inventory.basic">
                <InventoryCopilotPage />
              </RequireCapability>
            }
          />
          <Route path="/copilot" element={<CopilotPage />} />
          <Route path="/taxes" element={<TaxesOverviewPage />} />
          <Route path="/tax/reports" element={<TaxReportsPage />} />
          <Route path="/tax/settings" element={<TaxSettingsPage />} />
          {/* <Route path="/tax" element={<Navigate to="/taxes" replace />} /> */}
          <Route path="/tax/reports" element={<Navigate to="/taxes/reports" replace />} />
          <Route path="/tax/settings" element={<Navigate to="/taxes/settings" replace />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/workspace" element={<WorkspaceSettingsPage />} />
          <Route
            path="/settings/members"
            element={
              <RequireCapability capability="workspace.multiUser">
                <WorkspaceMembersPage />
              </RequireCapability>
            }
          />
          <Route path="/settings/tax" element={<TaxSettingsPage />} />
          <Route
            path="/settings/roles"
            element={
              <RequireCapability capability="workspace.rbac">
                <RequirePermission permission="settings.roles.manage">
                  <RolesPage />
                </RequirePermission>
              </RequireCapability>
            }
          />
          <Route
            path="/settings/roles/:roleId/permissions"
            element={
              <RequireCapability capability="workspace.rbac">
                <RequirePermission permission="settings.roles.manage">
                  <RolePermissionsPage />
                </RequirePermission>
              </RequireCapability>
            }
          />
          <Route
            path="/settings/platform"
            element={
              <RequirePermission permission="platform.apps.manage">
                <PlatformPage />
              </RequirePermission>
            }
          />
          <Route
            path="/settings/platform/apps"
            element={
              <RequirePermission permission="platform.apps.manage">
                <AppsManagementPage />
              </RequirePermission>
            }
          />
          <Route
            path="/settings/platform/templates"
            element={
              <RequirePermission permission="platform.templates.apply">
                <TemplatesPage />
              </RequirePermission>
            }
          />
          <Route
            path="/settings/platform/menu"
            element={
              <RequirePermission permission="platform.menu.customize">
                <MenuCustomizerPage />
              </RequirePermission>
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);
