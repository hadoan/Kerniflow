// Core entity types for Bizflow

export type Currency = "EUR" | "USD";
export type VatRate = 0 | 7 | 19;

export interface Tenant {
  id: string;
  name: string;
  country: string;
  currency: Currency;
  locale: string;
  vatId?: string;
  address?: string;
  city?: string;
  invoicePrefix: string;
  paymentTermsDays: number;
}

export interface User {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "member";
  avatarUrl?: string;
}

export interface Client {
  id: string;
  tenantId: string;
  name: string;
  company?: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  country: string;
  vatId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  tenantId: string;
  clientId: string;
  name: string;
  description?: string;
  hourlyRate?: number;
  status: "active" | "completed" | "archived";
  createdAt: string;
  updatedAt: string;
}

export type ExpenseCategory =
  | "office_supplies"
  | "software"
  | "travel"
  | "meals"
  | "home_office"
  | "education"
  | "hardware"
  | "phone_internet"
  | "other";

export interface Expense {
  id: string;
  tenantId: string;
  merchant: string;
  date: string;
  amountCents: number;
  vatRate: VatRate;
  vatAmountCents: number;
  netAmountCents: number;
  category: ExpenseCategory;
  projectId?: string;
  receiptUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type InvoiceStatus = "draft" | "issued" | "sent" | "paid" | "overdue";

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  vatRate: VatRate;
  totalCents: number;
}

export interface Invoice {
  id: string;
  tenantId: string;
  clientId: string;
  projectId?: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  items: InvoiceLineItem[];
  subtotalCents: number;
  vatAmountCents: number;
  totalCents: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Chat/Assistant types
export type MessageRole = "user" | "assistant" | "system";

export interface ChatAttachment {
  id: string;
  type: "receipt" | "document" | "image";
  url: string;
  name: string;
}

export interface ToolCall {
  id: string;
  name: string;
  status: "pending" | "running" | "completed" | "error";
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  attachments?: ChatAttachment[];
  toolCalls?: ToolCall[];
  createdAt: string;
}

export interface Conversation {
  id: string;
  tenantId: string;
  title?: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

// Tool schemas
export interface ExtractReceiptResult {
  merchant: string;
  date: string;
  totalCents: number;
  vatRate: VatRate;
  suggestedCategory: ExpenseCategory;
  confidence: number;
}

export interface CreateExpenseInput {
  merchant: string;
  date: string;
  amountCents: number;
  vatRate: VatRate;
  category: ExpenseCategory;
  projectId?: string;
  receiptUrl?: string;
  notes?: string;
}

export interface GenerateInvoiceDraftInput {
  clientId: string;
  projectId?: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPriceCents: number;
    vatRate: VatRate;
  }>;
  notes?: string;
}
