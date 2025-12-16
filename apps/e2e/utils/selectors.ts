/**
 * Centralized test selectors to avoid brittle CSS selectors
 * All selectors should use data-testid attributes
 */

export const selectors = {
  auth: {
    loginEmailInput: 'input[data-testid="login-email"]',
    loginPasswordInput: 'input[data-testid="login-password"]',
    loginSubmitButton: 'button[data-testid="login-submit"]',
    logoutButton: 'button[data-testid="logout"]',
    userMenu: 'div[data-testid="user-menu"]',
    userMenuButton: 'button[data-testid="user-menu-trigger"]',
  },

  navigation: {
    sidebarNav: 'nav[data-testid="sidebar-nav"]',
    expensesNavLink: 'a[data-testid="nav-expenses"]',
    invoicesNavLink: 'a[data-testid="nav-invoices"]',
    assistantNavLink: 'a[data-testid="nav-assistant"]',
    settingsNavLink: 'a[data-testid="nav-settings"]',
  },

  dashboard: {
    pageTitle: 'h1[data-testid="dashboard-title"]',
    expenseCard: 'div[data-testid="expense-summary-card"]',
    invoiceCard: 'div[data-testid="invoice-summary-card"]',
  },

  expenses: {
    listContainer: 'div[data-testid="expenses-list"]',
    expenseRow: 'tr[data-testid^="expense-row-"]',
    createButton: 'button[data-testid="create-expense-button"]',
    expenseForm: 'form[data-testid="expense-form"]',
    amountInput: 'input[data-testid="expense-amount"]',
    descriptionInput: 'textarea[data-testid="expense-description"]',
    categorySelect: 'select[data-testid="expense-category"]',
    submitButton: 'button[data-testid="expense-submit"]',
    successMessage: 'div[data-testid="expense-success"]',
  },

  invoices: {
    listContainer: 'div[data-testid="invoices-list"]',
    invoiceRow: 'tr[data-testid^="invoice-row-"]',
    createButton: 'button[data-testid="create-invoice-button"]',
    invoiceForm: 'form[data-testid="invoice-form"]',
    statusChip: 'span[data-testid^="invoice-status-"]',
    issueButton: 'button[data-testid="issue-invoice"]',
    draftBadge: 'span[data-testid="invoice-status-draft"]',
    issuedBadge: 'span[data-testid="invoice-status-issued"]',
  },

  assistant: {
    chatContainer: 'div[data-testid="assistant-chat"]',
    messageList: 'div[data-testid="assistant-messages"]',
    inputField: 'input[data-testid="assistant-input"]',
    submitButton: 'button[data-testid="assistant-submit"]',
    toolCard: 'div[data-testid^="assistant-tool-"]',
    confirmButton: 'button[data-testid="assistant-confirm"]',
    addExpenseSuccess: 'div[data-testid="assistant-add-expense-success"]',
  },

  common: {
    loader: 'div[data-testid="loader"]',
    errorMessage: 'div[data-testid="error-message"]',
    successMessage: 'div[data-testid="success-message"]',
  },
};
