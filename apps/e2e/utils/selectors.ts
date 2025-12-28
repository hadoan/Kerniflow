/**
 * Centralized test selectors to avoid brittle CSS selectors
 * All selectors should use data-testid attributes
 */

export const selectors = {
  auth: {
    loginEmailInput: 'input[data-testid="login-email"]',
    loginPasswordInput: 'input[data-testid="login-password"]',
    loginSubmitButton: 'button[data-testid="login-submit"]',
    signupEmailInput: 'input[id="email"]',
    signupPasswordInput: 'input[id="password"]',
    signupNameInput: 'input[id="userName"]',
    signupWorkspaceInput: 'input[id="tenantName"]',
    signupSubmitButton: 'button[type="submit"]',
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
    customerSelect: '[data-testid="invoice-customer-select"]',
    customerOption: (id: string) => `[data-testid="invoice-customer-option-${id}"]`,
    invoiceNumberInput: 'input[data-testid="invoice-number-input"]',
    lineDescriptionInput: (index = 0) => `input[data-testid="invoice-line-description-${index}"]`,
    lineQtyInput: (index = 0) => `input[data-testid="invoice-line-qty-${index}"]`,
    lineRateInput: (index = 0) => `input[data-testid="invoice-line-rate-${index}"]`,
    submitButton: 'button[data-testid="submit-invoice-button"]',
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

  workspace: {
    switcherTrigger: 'button[data-testid="workspace-switcher-trigger"]',
    switcherMenu: 'div[data-testid="workspace-switcher-menu"]',
    option: (id: string) => `div[data-testid="workspace-option-${id}"]`,
    onboardingName: 'input[data-testid="onboarding-name"]',
    onboardingLegalName: 'input[data-testid="onboarding-legal-name"]',
    onboardingAddress: 'input[data-testid="onboarding-address-line1"]',
    onboardingCity: 'input[data-testid="onboarding-city"]',
    onboardingPostal: 'input[data-testid="onboarding-postal"]',
    onboardingNext: 'button[data-testid="onboarding-next"]',
    onboardingSubmit: 'button[data-testid="onboarding-submit"]',
    createShortcut: 'button[data-testid="workspace-create-shortcut"]',
  },

  customers: {
    listContainer: 'div[data-testid="customers-list"]',
    createButton: 'button[data-testid="add-customer-button"]',
    customerForm: 'form[data-testid="customer-form"]',
    displayNameInput: 'input[data-testid="customer-displayName-input"]',
    emailInput: 'input[data-testid="customer-email-input"]',
    phoneInput: 'input[data-testid="customer-phone-input"]',
    vatIdInput: 'input[data-testid="customer-vatId-input"]',
    addressLine1Input: 'input[data-testid="customer-address-line1-input"]',
    addressLine2Input: 'input[data-testid="customer-address-line2-input"]',
    addressCityInput: 'input[data-testid="customer-address-city-input"]',
    addressPostalCodeInput: 'input[data-testid="customer-address-postalCode-input"]',
    addressCountryInput: 'input[data-testid="customer-address-country-input"]',
    notesInput: 'textarea[data-testid="customer-notes-input"]',
    submitButton: 'button[data-testid="submit-customer-button"]',
  },
};
