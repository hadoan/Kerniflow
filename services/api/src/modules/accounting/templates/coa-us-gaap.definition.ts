import type { TemplateDefinition } from "@corely/contracts";
import { z } from "zod";

/**
 * Chart of Accounts (US GAAP) Template Definition
 * Provides a standard US GAAP chart of accounts for small businesses
 */

// Template parameters schema
export const CoaUsGaapParamsSchema = z.object({
  currency: z.string().default("USD").describe("Base currency code"),
  includeSubAccounts: z.boolean().default(true).describe("Include detailed sub-accounts"),
});

export type CoaUsGaapParams = z.infer<typeof CoaUsGaapParamsSchema>;

// Template definition
export const coaUsGaapTemplate: TemplateDefinition = {
  templateId: "coa-us-gaap",
  name: "Chart of Accounts (US GAAP)",
  category: "accounting",
  version: "1.0.0",
  description:
    "Standard US GAAP chart of accounts with common account categories for small to medium businesses",
  requiresApps: ["accounting"],
  paramsSchema: CoaUsGaapParamsSchema,
  upgradePolicy: {
    skipCustomized: true,
    additiveOnly: false,
  },
};

/**
 * Chart of Account Record
 * This represents the structure of a chart of account record
 */
export interface ChartOfAccountRecord {
  code: string; // Stable key for idempotency
  name: string;
  type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
  parentCode: string | null;
  currency: string;
  isActive: boolean;
}

/**
 * Standard US GAAP Chart of Accounts
 * Basic account structure following US GAAP conventions
 */
export function getUsGaapAccounts(params: CoaUsGaapParams): ChartOfAccountRecord[] {
  const { currency, includeSubAccounts } = params;

  const baseAccounts: ChartOfAccountRecord[] = [
    // Assets (1000-1999)
    { code: "1000", name: "Assets", type: "ASSET", parentCode: null, currency, isActive: true },
    {
      code: "1100",
      name: "Current Assets",
      type: "ASSET",
      parentCode: "1000",
      currency,
      isActive: true,
    },
    {
      code: "1110",
      name: "Cash and Cash Equivalents",
      type: "ASSET",
      parentCode: "1100",
      currency,
      isActive: true,
    },
    {
      code: "1120",
      name: "Accounts Receivable",
      type: "ASSET",
      parentCode: "1100",
      currency,
      isActive: true,
    },
    {
      code: "1130",
      name: "Inventory",
      type: "ASSET",
      parentCode: "1100",
      currency,
      isActive: true,
    },
    {
      code: "1140",
      name: "Prepaid Expenses",
      type: "ASSET",
      parentCode: "1100",
      currency,
      isActive: true,
    },

    {
      code: "1500",
      name: "Fixed Assets",
      type: "ASSET",
      parentCode: "1000",
      currency,
      isActive: true,
    },
    {
      code: "1510",
      name: "Property, Plant & Equipment",
      type: "ASSET",
      parentCode: "1500",
      currency,
      isActive: true,
    },
    {
      code: "1520",
      name: "Accumulated Depreciation",
      type: "ASSET",
      parentCode: "1500",
      currency,
      isActive: true,
    },

    // Liabilities (2000-2999)
    {
      code: "2000",
      name: "Liabilities",
      type: "LIABILITY",
      parentCode: null,
      currency,
      isActive: true,
    },
    {
      code: "2100",
      name: "Current Liabilities",
      type: "LIABILITY",
      parentCode: "2000",
      currency,
      isActive: true,
    },
    {
      code: "2110",
      name: "Accounts Payable",
      type: "LIABILITY",
      parentCode: "2100",
      currency,
      isActive: true,
    },
    {
      code: "2120",
      name: "Accrued Expenses",
      type: "LIABILITY",
      parentCode: "2100",
      currency,
      isActive: true,
    },
    {
      code: "2130",
      name: "Sales Tax Payable",
      type: "LIABILITY",
      parentCode: "2100",
      currency,
      isActive: true,
    },

    {
      code: "2500",
      name: "Long-term Liabilities",
      type: "LIABILITY",
      parentCode: "2000",
      currency,
      isActive: true,
    },
    {
      code: "2510",
      name: "Long-term Debt",
      type: "LIABILITY",
      parentCode: "2500",
      currency,
      isActive: true,
    },

    // Equity (3000-3999)
    { code: "3000", name: "Equity", type: "EQUITY", parentCode: null, currency, isActive: true },
    {
      code: "3100",
      name: "Owner's Equity",
      type: "EQUITY",
      parentCode: "3000",
      currency,
      isActive: true,
    },
    {
      code: "3200",
      name: "Retained Earnings",
      type: "EQUITY",
      parentCode: "3000",
      currency,
      isActive: true,
    },

    // Revenue (4000-4999)
    { code: "4000", name: "Revenue", type: "REVENUE", parentCode: null, currency, isActive: true },
    {
      code: "4100",
      name: "Sales Revenue",
      type: "REVENUE",
      parentCode: "4000",
      currency,
      isActive: true,
    },
    {
      code: "4200",
      name: "Service Revenue",
      type: "REVENUE",
      parentCode: "4000",
      currency,
      isActive: true,
    },

    // Expenses (5000-5999)
    { code: "5000", name: "Expenses", type: "EXPENSE", parentCode: null, currency, isActive: true },
    {
      code: "5100",
      name: "Cost of Goods Sold",
      type: "EXPENSE",
      parentCode: "5000",
      currency,
      isActive: true,
    },
    {
      code: "5200",
      name: "Operating Expenses",
      type: "EXPENSE",
      parentCode: "5000",
      currency,
      isActive: true,
    },
    {
      code: "5210",
      name: "Salaries and Wages",
      type: "EXPENSE",
      parentCode: "5200",
      currency,
      isActive: true,
    },
    {
      code: "5220",
      name: "Rent Expense",
      type: "EXPENSE",
      parentCode: "5200",
      currency,
      isActive: true,
    },
    {
      code: "5230",
      name: "Utilities",
      type: "EXPENSE",
      parentCode: "5200",
      currency,
      isActive: true,
    },
    {
      code: "5240",
      name: "Office Supplies",
      type: "EXPENSE",
      parentCode: "5200",
      currency,
      isActive: true,
    },
  ];

  // Add detailed sub-accounts if requested
  if (includeSubAccounts) {
    baseAccounts.push(
      // Cash sub-accounts
      {
        code: "1111",
        name: "Checking Account",
        type: "ASSET",
        parentCode: "1110",
        currency,
        isActive: true,
      },
      {
        code: "1112",
        name: "Savings Account",
        type: "ASSET",
        parentCode: "1110",
        currency,
        isActive: true,
      },
      {
        code: "1113",
        name: "Petty Cash",
        type: "ASSET",
        parentCode: "1110",
        currency,
        isActive: true,
      },

      // PPE sub-accounts
      {
        code: "1511",
        name: "Land",
        type: "ASSET",
        parentCode: "1510",
        currency,
        isActive: true,
      },
      {
        code: "1512",
        name: "Buildings",
        type: "ASSET",
        parentCode: "1510",
        currency,
        isActive: true,
      },
      {
        code: "1513",
        name: "Equipment",
        type: "ASSET",
        parentCode: "1510",
        currency,
        isActive: true,
      },
      {
        code: "1514",
        name: "Vehicles",
        type: "ASSET",
        parentCode: "1510",
        currency,
        isActive: true,
      },

      // Operating expense sub-accounts
      {
        code: "5250",
        name: "Marketing and Advertising",
        type: "EXPENSE",
        parentCode: "5200",
        currency,
        isActive: true,
      },
      {
        code: "5260",
        name: "Professional Fees",
        type: "EXPENSE",
        parentCode: "5200",
        currency,
        isActive: true,
      },
      {
        code: "5270",
        name: "Insurance",
        type: "EXPENSE",
        parentCode: "5200",
        currency,
        isActive: true,
      },
      {
        code: "5280",
        name: "Depreciation Expense",
        type: "EXPENSE",
        parentCode: "5200",
        currency,
        isActive: true,
      }
    );
  }

  return baseAccounts;
}
