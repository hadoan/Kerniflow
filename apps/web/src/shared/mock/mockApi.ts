// Mock API layer with simulated latency and optimistic updates

import { getDb, updateDb } from "./mockDb";
import type {
  Customer,
  Expense,
  Invoice,
  InvoiceLineItem,
  CreateExpenseInput,
  GenerateInvoiceDraftInput,
  ExtractReceiptResult,
  ExpenseCategory,
  VatRate,
  Project,
} from "../types";
import { generateInvoiceNumber, calculateVat } from "../lib/formatters";

// Simulated network delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const randomDelay = () => delay(300 + Math.random() * 500);

// Idempotency cache (in-memory for demo)
const idempotencyCache = new Map<string, unknown>();

function checkIdempotency<T>(key: string, result: T): T {
  if (idempotencyCache.has(key)) {
    return idempotencyCache.get(key) as T;
  }
  idempotencyCache.set(key, result);
  return result;
}

// Generate unique IDs
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Dashboard
export interface DashboardData {
  revenueThisMonthCents: number;
  outstandingInvoicesCents: number;
  outstandingInvoicesCount: number;
  expensesThisMonthCents: number;
  recentExpenses: Expense[];
  recentInvoices: Invoice[];
}

export async function getDashboard(): Promise<DashboardData> {
  await randomDelay();
  const db = getDb();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Calculate revenue this month (paid invoices)
  const revenueThisMonth = db.invoices
    .filter(
      (inv) => inv.status === "paid" && inv.paidDate && new Date(inv.paidDate) >= startOfMonth
    )
    .reduce((sum, inv) => sum + inv.totalCents, 0);

  // Outstanding invoices
  const outstandingInvoices = db.invoices.filter((inv) =>
    ["issued", "sent", "overdue"].includes(inv.status)
  );
  const outstandingTotal = outstandingInvoices.reduce((sum, inv) => sum + inv.totalCents, 0);

  // Expenses this month
  const expensesThisMonth = db.expenses
    .filter((exp) => new Date(exp.date) >= startOfMonth)
    .reduce((sum, exp) => sum + exp.amountCents, 0);

  return {
    revenueThisMonthCents: revenueThisMonth,
    outstandingInvoicesCents: outstandingTotal,
    outstandingInvoicesCount: outstandingInvoices.length,
    expensesThisMonthCents: expensesThisMonth,
    recentExpenses: db.expenses.slice(-5).reverse(),
    recentInvoices: db.invoices.slice(-5).reverse(),
  };
}

// Expenses
export interface ExpenseFilters {
  month?: string; // YYYY-MM
  category?: ExpenseCategory;
  projectId?: string;
  vatRate?: VatRate;
}

export async function getExpenses(filters?: ExpenseFilters): Promise<Expense[]> {
  await randomDelay();
  const db = getDb();

  let expenses = [...db.expenses];

  if (filters?.month) {
    const [year, month] = filters.month.split("-").map(Number);
    expenses = expenses.filter((exp) => {
      const date = new Date(exp.date);
      return date.getFullYear() === year && date.getMonth() + 1 === month;
    });
  }

  if (filters?.category) {
    expenses = expenses.filter((exp) => exp.category === filters.category);
  }

  if (filters?.projectId) {
    expenses = expenses.filter((exp) => exp.projectId === filters.projectId);
  }

  if (filters?.vatRate !== undefined) {
    expenses = expenses.filter((exp) => exp.vatRate === filters.vatRate);
  }

  return expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getExpense(id: string): Promise<Expense | null> {
  await randomDelay();
  const db = getDb();
  return db.expenses.find((exp) => exp.id === id) || null;
}

export async function createExpense(
  input: CreateExpenseInput,
  idempotencyKey?: string
): Promise<Expense> {
  await randomDelay();

  const vatAmountCents = calculateVat(input.amountCents, input.vatRate);
  const netAmountCents = input.amountCents - vatAmountCents;

  const expense: Expense = {
    id: generateId("expense"),
    tenantId: "tenant-1",
    merchant: input.merchant,
    date: input.date,
    amountCents: input.amountCents,
    vatRate: input.vatRate,
    vatAmountCents,
    netAmountCents,
    category: input.category,
    projectId: input.projectId,
    receiptUrl: input.receiptUrl,
    notes: input.notes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (idempotencyKey) {
    const cached = idempotencyCache.get(idempotencyKey);
    if (cached) {
      return cached as Expense;
    }
    idempotencyCache.set(idempotencyKey, expense);
  }

  updateDb((db) => ({
    ...db,
    expenses: [...db.expenses, expense],
  }));

  return expense;
}

export async function updateExpense(
  id: string,
  patch: Partial<CreateExpenseInput>
): Promise<Expense | null> {
  await randomDelay();

  let updatedExpense: Expense | null = null;

  updateDb((db) => {
    const index = db.expenses.findIndex((exp) => exp.id === id);
    if (index === -1) {
      return db;
    }

    const existing = db.expenses[index];
    const amountCents = patch.amountCents ?? existing.amountCents;
    const vatRate = patch.vatRate ?? existing.vatRate;
    const vatAmountCents = calculateVat(amountCents, vatRate);

    updatedExpense = {
      ...existing,
      ...patch,
      amountCents,
      vatRate,
      vatAmountCents,
      netAmountCents: amountCents - vatAmountCents,
      updatedAt: new Date().toISOString(),
    };

    const expenses = [...db.expenses];
    expenses[index] = updatedExpense;

    return { ...db, expenses };
  });

  return updatedExpense;
}

export async function deleteExpense(id: string): Promise<boolean> {
  await randomDelay();

  updateDb((db) => ({
    ...db,
    expenses: db.expenses.filter((exp) => exp.id !== id),
  }));

  return true;
}

// Invoices
export interface InvoiceFilters {
  status?: string;
  customerId?: string;
  projectId?: string;
}

export async function getInvoices(filters?: InvoiceFilters): Promise<Invoice[]> {
  await randomDelay();
  const db = getDb();

  let invoices = [...db.invoices];

  if (filters?.status) {
    invoices = invoices.filter((inv) => inv.status === filters.status);
  }

  if (filters?.customerId) {
    invoices = invoices.filter((inv) => inv.customerId === filters.customerId);
  }

  if (filters?.projectId) {
    invoices = invoices.filter((inv) => inv.projectId === filters.projectId);
  }

  return invoices.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  await randomDelay();
  const db = getDb();
  return db.invoices.find((inv) => inv.id === id) || null;
}

export async function createInvoiceDraft(input: GenerateInvoiceDraftInput): Promise<Invoice> {
  await randomDelay();
  const db = getDb();

  const items: InvoiceLineItem[] = input.items.map((item, index) => ({
    id: `item-${Date.now()}-${index}`,
    description: item.description,
    quantity: item.quantity,
    unitPriceCents: item.unitPriceCents,
    vatRate: item.vatRate,
    totalCents: item.quantity * item.unitPriceCents,
  }));

  const subtotalCents = items.reduce((sum, item) => sum + item.totalCents, 0);
  const vatAmountCents = items.reduce(
    (sum, item) => sum + calculateVat(item.totalCents, item.vatRate),
    0
  );

  const invoice: Invoice = {
    id: generateId("invoice"),
    tenantId: "tenant-1",
    customerId: input.customerId,
    projectId: input.projectId,
    invoiceNumber: generateInvoiceNumber(
      db.tenant.invoicePrefix,
      new Date().getFullYear(),
      db.invoiceSequence
    ),
    status: "draft",
    issueDate: new Date().toISOString(),
    dueDate: new Date(Date.now() + db.tenant.paymentTermsDays * 24 * 60 * 60 * 1000).toISOString(),
    items,
    subtotalCents,
    vatAmountCents,
    totalCents: subtotalCents + vatAmountCents,
    notes: input.notes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  updateDb((db) => ({
    ...db,
    invoices: [...db.invoices, invoice],
    invoiceSequence: db.invoiceSequence + 1,
  }));

  return invoice;
}

export async function issueInvoice(id: string, idempotencyKey?: string): Promise<Invoice | null> {
  await randomDelay();

  if (idempotencyKey && idempotencyCache.has(idempotencyKey)) {
    return idempotencyCache.get(idempotencyKey) as Invoice;
  }

  let updatedInvoice: Invoice | null = null;

  updateDb((db) => {
    const index = db.invoices.findIndex((inv) => inv.id === id);
    if (index === -1) {
      return db;
    }

    updatedInvoice = {
      ...db.invoices[index],
      status: "issued",
      issueDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const invoices = [...db.invoices];
    invoices[index] = updatedInvoice;

    return { ...db, invoices };
  });

  if (idempotencyKey && updatedInvoice) {
    idempotencyCache.set(idempotencyKey, updatedInvoice);
  }

  return updatedInvoice;
}

export async function markInvoicePaid(id: string, paidDate: string): Promise<Invoice | null> {
  await randomDelay();

  let updatedInvoice: Invoice | null = null;

  updateDb((db) => {
    const index = db.invoices.findIndex((inv) => inv.id === id);
    if (index === -1) {
      return db;
    }

    updatedInvoice = {
      ...db.invoices[index],
      status: "paid",
      paidDate,
      updatedAt: new Date().toISOString(),
    };

    const invoices = [...db.invoices];
    invoices[index] = updatedInvoice;

    return { ...db, invoices };
  });

  return updatedInvoice;
}

// Customers
export async function getCustomers(): Promise<Customer[]> {
  await randomDelay();
  const db = getDb();
  return [...db.customers].sort(
    (a, b) => a.company?.localeCompare(b.company || "") || a.name.localeCompare(b.name)
  );
}

export async function getCustomer(id: string): Promise<Customer | null> {
  await randomDelay();
  const db = getDb();
  return db.customers.find((c) => c.id === id) || null;
}

export async function createCustomer(
  input: Omit<Customer, "id" | "tenantId" | "createdAt" | "updatedAt">
): Promise<Customer> {
  await randomDelay();

  const customer: Customer = {
    ...input,
    id: generateId("customer"),
    tenantId: "tenant-1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  updateDb((db) => ({
    ...db,
    customers: [...db.customers, customer],
  }));

  return customer;
}

// Projects
export async function getProjects(): Promise<Project[]> {
  await randomDelay();
  const db = getDb();
  return [...db.projects];
}

// Tool functions for assistant
export async function extractReceiptData(fileId: string): Promise<ExtractReceiptResult> {
  // Simulate receipt extraction with AI
  await delay(1500 + Math.random() * 1000);

  // Return mock extracted data
  const merchants = ["Amazon", "REWE", "MediaMarkt", "Saturn", "Rossmann", "dm"];
  const categories: ExpenseCategory[] = [
    "office_supplies",
    "software",
    "hardware",
    "meals",
    "travel",
  ];
  const vatRates: VatRate[] = [0, 7, 19];

  return {
    merchant: merchants[Math.floor(Math.random() * merchants.length)],
    date: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    totalCents: Math.floor(1000 + Math.random() * 15000),
    vatRate: vatRates[Math.floor(Math.random() * vatRates.length)],
    suggestedCategory: categories[Math.floor(Math.random() * categories.length)],
    confidence: 0.85 + Math.random() * 0.14,
  };
}

export async function generateInvoiceDraftFromPrompt(
  customerId: string,
  period?: string
): Promise<Invoice> {
  await delay(2000 + Math.random() * 1000);
  const db = getDb();

  const customer = db.customers.find((c) => c.id === customerId);
  if (!customer) {
    throw new Error("Customer not found");
  }

  // Find projects for this customer
  const customerProjects = db.projects.filter((p) => p.customerId === customerId);
  const project = customerProjects[0];

  // Generate realistic items based on context
  const items = [
    {
      description: project ? `${project.name} - Consulting hours` : "Consulting services",
      quantity: Math.floor(10 + Math.random() * 30),
      unitPriceCents: project?.hourlyRate || 9500,
      vatRate: 19 as VatRate,
    },
  ];

  if (Math.random() > 0.5) {
    items.push({
      description: "Additional deliverables",
      quantity: 1,
      unitPriceCents: Math.floor(50000 + Math.random() * 150000),
      vatRate: 19 as VatRate,
    });
  }

  return createInvoiceDraft({
    customerId,
    projectId: project?.id,
    items,
    notes: period ? `Services for ${period}` : undefined,
  });
}
