import type { CoaTemplate, TemplateAccount } from "./accounting.types";

// Chart of Accounts Templates

export const COA_TEMPLATES: Record<CoaTemplate, TemplateAccount[]> = {
  minimal: [
    // Assets
    { code: "1000", name: "Cash", type: "Asset", systemAccountKey: "Cash" },
    { code: "1100", name: "Bank Account", type: "Asset", systemAccountKey: "Bank" },

    // Equity
    { code: "3000", name: "Owner's Equity", type: "Equity", systemAccountKey: "OwnersEquity" },

    // Income
    { code: "4000", name: "Revenue", type: "Income", systemAccountKey: "Revenue" },

    // Expenses
    { code: "5000", name: "General Expenses", type: "Expense" },
  ],

  freelancer: [
    // Assets
    { code: "1000", name: "Cash", type: "Asset", systemAccountKey: "Cash" },
    { code: "1100", name: "Business Bank Account", type: "Asset", systemAccountKey: "Bank" },
    { code: "1200", name: "Accounts Receivable", type: "Asset", systemAccountKey: "AR" },

    // Liabilities
    { code: "2000", name: "Credit Card", type: "Liability" },
    { code: "2100", name: "Accounts Payable", type: "Liability", systemAccountKey: "AP" },

    // Equity
    { code: "3000", name: "Owner's Equity", type: "Equity", systemAccountKey: "OwnersEquity" },
    {
      code: "3100",
      name: "Retained Earnings",
      type: "Equity",
      systemAccountKey: "RetainedEarnings",
    },

    // Income
    { code: "4000", name: "Service Revenue", type: "Income", systemAccountKey: "Revenue" },
    { code: "4100", name: "Project Revenue", type: "Income" },

    // Expenses
    { code: "5000", name: "Software & Tools", type: "Expense", description: "Adobe, Figma, etc." },
    { code: "5100", name: "Travel & Meals", type: "Expense" },
    { code: "5200", name: "Subcontractors", type: "Expense" },
    { code: "5300", name: "Marketing & Advertising", type: "Expense" },
    { code: "5400", name: "Office Supplies", type: "Expense" },
    { code: "5500", name: "Professional Fees", type: "Expense", description: "Legal, accounting" },
    { code: "5600", name: "Insurance", type: "Expense" },
    { code: "5900", name: "Miscellaneous Expenses", type: "Expense" },
  ],

  smallBusiness: [
    // Assets
    { code: "1000", name: "Petty Cash", type: "Asset", systemAccountKey: "Cash" },
    { code: "1100", name: "Business Checking", type: "Asset", systemAccountKey: "Bank" },
    { code: "1110", name: "Business Savings", type: "Asset" },
    { code: "1200", name: "Accounts Receivable", type: "Asset", systemAccountKey: "AR" },
    { code: "1500", name: "Inventory", type: "Asset" },
    { code: "1600", name: "Prepaid Expenses", type: "Asset" },
    { code: "1700", name: "Equipment", type: "Asset" },
    { code: "1750", name: "Accumulated Depreciation - Equipment", type: "Asset" },

    // Liabilities
    { code: "2000", name: "Accounts Payable", type: "Liability", systemAccountKey: "AP" },
    { code: "2100", name: "Credit Card Payable", type: "Liability" },
    { code: "2200", name: "Payroll Liabilities", type: "Liability" },
    { code: "2300", name: "Sales Tax Payable", type: "Liability" },
    { code: "2400", name: "Short-term Loans", type: "Liability" },
    { code: "2500", name: "Long-term Loans", type: "Liability" },

    // Equity
    { code: "3000", name: "Owner's Equity", type: "Equity", systemAccountKey: "OwnersEquity" },
    {
      code: "3100",
      name: "Retained Earnings",
      type: "Equity",
      systemAccountKey: "RetainedEarnings",
    },
    { code: "3200", name: "Owner Draws", type: "Equity" },

    // Income
    { code: "4000", name: "Sales Revenue", type: "Income", systemAccountKey: "Revenue" },
    { code: "4100", name: "Service Revenue", type: "Income" },
    { code: "4200", name: "Interest Income", type: "Income" },
    { code: "4900", name: "Other Income", type: "Income" },

    // Cost of Goods Sold
    { code: "5000", name: "Cost of Goods Sold", type: "Expense", systemAccountKey: "COGS" },
    { code: "5100", name: "Purchases", type: "Expense" },
    { code: "5200", name: "Freight & Shipping", type: "Expense" },

    // Expenses
    { code: "6000", name: "Salaries & Wages", type: "Expense" },
    { code: "6100", name: "Payroll Taxes", type: "Expense" },
    { code: "6200", name: "Rent", type: "Expense" },
    { code: "6300", name: "Utilities", type: "Expense" },
    { code: "6400", name: "Insurance", type: "Expense" },
    { code: "6500", name: "Office Supplies", type: "Expense" },
    { code: "6600", name: "Marketing & Advertising", type: "Expense" },
    { code: "6700", name: "Travel & Entertainment", type: "Expense" },
    { code: "6800", name: "Professional Fees", type: "Expense" },
    { code: "6900", name: "Software & Subscriptions", type: "Expense" },
    { code: "7000", name: "Depreciation Expense", type: "Expense" },
    { code: "7100", name: "Interest Expense", type: "Expense" },
    { code: "7200", name: "Bank Fees", type: "Expense" },
    { code: "7900", name: "Miscellaneous Expenses", type: "Expense" },
  ],

  standard: [
    // Current Assets
    { code: "1000", name: "Petty Cash", type: "Asset", systemAccountKey: "Cash" },
    { code: "1100", name: "Business Checking", type: "Asset", systemAccountKey: "Bank" },
    { code: "1110", name: "Business Savings", type: "Asset" },
    { code: "1200", name: "Accounts Receivable", type: "Asset", systemAccountKey: "AR" },
    { code: "1300", name: "Inventory - Finished Goods", type: "Asset" },
    { code: "1310", name: "Inventory - Raw Materials", type: "Asset" },
    { code: "1400", name: "Prepaid Insurance", type: "Asset" },
    { code: "1410", name: "Prepaid Rent", type: "Asset" },
    { code: "1420", name: "Other Prepaid Expenses", type: "Asset" },

    // Fixed Assets
    { code: "1500", name: "Land", type: "Asset" },
    { code: "1600", name: "Buildings", type: "Asset" },
    { code: "1610", name: "Accumulated Depreciation - Buildings", type: "Asset" },
    { code: "1700", name: "Equipment", type: "Asset" },
    { code: "1710", name: "Accumulated Depreciation - Equipment", type: "Asset" },
    { code: "1800", name: "Vehicles", type: "Asset" },
    { code: "1810", name: "Accumulated Depreciation - Vehicles", type: "Asset" },
    { code: "1900", name: "Furniture & Fixtures", type: "Asset" },
    { code: "1910", name: "Accumulated Depreciation - Furniture", type: "Asset" },

    // Current Liabilities
    { code: "2000", name: "Accounts Payable", type: "Liability", systemAccountKey: "AP" },
    { code: "2100", name: "Credit Card Payable", type: "Liability" },
    { code: "2200", name: "Payroll Liabilities", type: "Liability" },
    { code: "2210", name: "Federal Income Tax Payable", type: "Liability" },
    { code: "2220", name: "State Income Tax Payable", type: "Liability" },
    { code: "2300", name: "Sales Tax Payable", type: "Liability" },
    { code: "2400", name: "Accrued Expenses", type: "Liability" },
    { code: "2500", name: "Short-term Notes Payable", type: "Liability" },
    { code: "2600", name: "Current Portion of Long-term Debt", type: "Liability" },

    // Long-term Liabilities
    { code: "2700", name: "Long-term Notes Payable", type: "Liability" },
    { code: "2800", name: "Mortgage Payable", type: "Liability" },

    // Equity
    { code: "3000", name: "Owner's Capital", type: "Equity", systemAccountKey: "OwnersEquity" },
    {
      code: "3100",
      name: "Retained Earnings",
      type: "Equity",
      systemAccountKey: "RetainedEarnings",
    },
    { code: "3200", name: "Owner Draws", type: "Equity" },

    // Revenue
    { code: "4000", name: "Sales Revenue", type: "Income", systemAccountKey: "Revenue" },
    { code: "4100", name: "Service Revenue", type: "Income" },
    { code: "4200", name: "Rental Income", type: "Income" },
    { code: "4300", name: "Interest Income", type: "Income" },
    { code: "4400", name: "Dividend Income", type: "Income" },
    { code: "4500", name: "Gain on Sale of Assets", type: "Income" },
    { code: "4900", name: "Other Income", type: "Income" },

    // Cost of Goods Sold
    { code: "5000", name: "Cost of Goods Sold", type: "Expense", systemAccountKey: "COGS" },
    { code: "5100", name: "Purchases", type: "Expense" },
    { code: "5200", name: "Freight In", type: "Expense" },
    { code: "5300", name: "Direct Labor", type: "Expense" },
    { code: "5400", name: "Manufacturing Overhead", type: "Expense" },

    // Operating Expenses
    { code: "6000", name: "Salaries & Wages", type: "Expense" },
    { code: "6010", name: "Payroll Taxes", type: "Expense" },
    { code: "6020", name: "Employee Benefits", type: "Expense" },
    { code: "6100", name: "Rent Expense", type: "Expense" },
    { code: "6200", name: "Utilities", type: "Expense" },
    { code: "6210", name: "Telephone & Internet", type: "Expense" },
    { code: "6300", name: "Insurance Expense", type: "Expense" },
    { code: "6400", name: "Office Supplies", type: "Expense" },
    { code: "6500", name: "Marketing & Advertising", type: "Expense" },
    { code: "6600", name: "Travel & Entertainment", type: "Expense" },
    { code: "6700", name: "Professional Fees", type: "Expense" },
    { code: "6800", name: "Software & Subscriptions", type: "Expense" },
    { code: "6900", name: "Repairs & Maintenance", type: "Expense" },
    { code: "7000", name: "Depreciation Expense", type: "Expense" },
    { code: "7100", name: "Amortization Expense", type: "Expense" },
    { code: "7200", name: "Interest Expense", type: "Expense" },
    { code: "7300", name: "Bank Fees & Charges", type: "Expense" },
    { code: "7400", name: "Bad Debt Expense", type: "Expense" },
    { code: "7500", name: "Loss on Sale of Assets", type: "Expense" },
    { code: "7900", name: "Miscellaneous Expenses", type: "Expense" },
  ],
};

export function getCoaTemplate(template: CoaTemplate): TemplateAccount[] {
  return COA_TEMPLATES[template] || COA_TEMPLATES.standard;
}
