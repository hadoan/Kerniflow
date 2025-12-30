import type { PackDefinition } from "@corely/contracts";

/**
 * Small Business Starter Pack
 * Complete setup for small businesses including:
 * - Core accounting capabilities
 * - Customer management
 * - Invoicing
 * - Basic expense tracking
 * - Standard chart of accounts (US GAAP)
 */
export const smallBusinessStarterPack: PackDefinition = {
  packId: "small-business-starter",
  name: "Small Business Starter",
  version: "1.0.0",
  description:
    "Complete business management setup with accounting, customers, invoicing, and expenses. Includes standard US GAAP chart of accounts.",

  // Apps to enable (in dependency order)
  appsToEnable: [
    "party", // Base party module
    "customers", // Customer management (depends on party)
    "accounting", // Accounting module
    "invoices", // Invoicing (depends on customers, accounting)
    "expenses", // Expense tracking
  ],

  // Templates to apply (in order)
  templatesToApply: [
    {
      templateId: "coa-us-gaap",
      versionRange: "^1.0.0",
      defaultParams: {
        currency: "USD",
        includeSubAccounts: true,
      },
    },
    // Future templates can be added here:
    // - Tax rates template
    // - Invoice template presets
    // - Expense categories
  ],

  // Feature flags (optional)
  featureFlags: {
    enableRecurringInvoices: true,
    enableMultiCurrency: false,
    enableAdvancedReporting: false,
  },

  // Post-install validation checks
  postInstallChecks: [
    "verify-chart-of-accounts-created",
    "verify-apps-enabled",
    "verify-user-has-access",
  ],
};
