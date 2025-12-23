import type {
  Tenant,
  User,
  Client,
  Project,
  Expense,
  Invoice,
  Conversation,
  ChatMessage,
  ExpenseCategory,
  VatRate,
  InvoiceStatus,
} from "../types";

// Storage key
const STORAGE_KEY = "bizflow-mock-db";

// Initial seed data
const seedTenant: Tenant = {
  id: "tenant-1",
  name: "Ha Consulting",
  country: "Germany",
  currency: "EUR",
  locale: "de-DE",
  vatId: "DE123456789",
  address: "Musterstraße 42",
  city: "Berlin",
  invoicePrefix: "RE",
  paymentTermsDays: 14,
};

const seedUser: User = {
  id: "user-1",
  tenantId: "tenant-1",
  name: "Ha Doan",
  email: "ha@haconsulting.de",
  role: "owner",
};

const seedClients: Client[] = [
  {
    id: "client-1",
    tenantId: "tenant-1",
    name: "Thomas Müller",
    company: "Müller GmbH",
    email: "thomas@mueller-gmbh.de",
    phone: "+49 30 12345678",
    address: "Hauptstraße 100",
    city: "Berlin",
    country: "Germany",
    vatId: "DE987654321",
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "client-2",
    tenantId: "tenant-1",
    name: "Sarah Schmidt",
    company: "Kraftwerk Studio UG",
    email: "sarah@kraftwerk-studio.de",
    phone: "+49 40 87654321",
    address: "Hafenstraße 22",
    city: "Hamburg",
    country: "Germany",
    vatId: "DE456789123",
    createdAt: "2024-02-20T14:30:00Z",
    updatedAt: "2024-02-20T14:30:00Z",
  },
  {
    id: "client-3",
    tenantId: "tenant-1",
    name: "Max Weber",
    company: "Nordlicht Media",
    email: "max@nordlicht-media.de",
    phone: "+49 89 11223344",
    address: "Leopoldstraße 55",
    city: "Munich",
    country: "Germany",
    createdAt: "2024-03-10T09:15:00Z",
    updatedAt: "2024-03-10T09:15:00Z",
  },
];

const seedProjects: Project[] = [
  {
    id: "project-1",
    tenantId: "tenant-1",
    clientId: "client-1",
    name: "Website Redesign",
    description: "Complete redesign of corporate website",
    hourlyRate: 9500, // 95 EUR
    status: "active",
    createdAt: "2024-06-01T10:00:00Z",
    updatedAt: "2024-06-01T10:00:00Z",
  },
  {
    id: "project-2",
    tenantId: "tenant-1",
    clientId: "client-2",
    name: "Brand Identity",
    description: "Logo and brand guidelines development",
    hourlyRate: 12000, // 120 EUR
    status: "active",
    createdAt: "2024-08-15T14:00:00Z",
    updatedAt: "2024-08-15T14:00:00Z",
  },
  {
    id: "project-3",
    tenantId: "tenant-1",
    clientId: "client-3",
    name: "Social Media Strategy",
    description: "Monthly social media content and strategy",
    hourlyRate: 8500,
    status: "active",
    createdAt: "2024-09-01T08:00:00Z",
    updatedAt: "2024-09-01T08:00:00Z",
  },
];

const seedExpenses: Expense[] = [
  {
    id: "expense-1",
    tenantId: "tenant-1",
    merchant: "Adobe",
    date: "2024-11-01T00:00:00Z",
    amountCents: 5999,
    vatRate: 19,
    vatAmountCents: 958,
    netAmountCents: 5041,
    category: "software",
    notes: "Creative Cloud subscription",
    createdAt: "2024-11-01T10:00:00Z",
    updatedAt: "2024-11-01T10:00:00Z",
  },
  {
    id: "expense-2",
    tenantId: "tenant-1",
    merchant: "IKEA",
    date: "2024-11-05T00:00:00Z",
    amountCents: 14999,
    vatRate: 19,
    vatAmountCents: 2395,
    netAmountCents: 12604,
    category: "home_office",
    notes: "Standing desk",
    createdAt: "2024-11-05T14:30:00Z",
    updatedAt: "2024-11-05T14:30:00Z",
  },
  {
    id: "expense-3",
    tenantId: "tenant-1",
    merchant: "Deutsche Bahn",
    date: "2024-11-08T00:00:00Z",
    amountCents: 12900,
    vatRate: 7,
    vatAmountCents: 844,
    netAmountCents: 12056,
    category: "travel",
    notes: "Berlin-Hamburg client meeting",
    projectId: "project-2",
    createdAt: "2024-11-08T08:00:00Z",
    updatedAt: "2024-11-08T08:00:00Z",
  },
  {
    id: "expense-4",
    tenantId: "tenant-1",
    merchant: "Apple Store",
    date: "2024-11-10T00:00:00Z",
    amountCents: 99900,
    vatRate: 19,
    vatAmountCents: 15958,
    netAmountCents: 83942,
    category: "hardware",
    notes: "MacBook Pro charger",
    createdAt: "2024-11-10T16:00:00Z",
    updatedAt: "2024-11-10T16:00:00Z",
  },
  {
    id: "expense-5",
    tenantId: "tenant-1",
    merchant: "Udemy",
    date: "2024-11-12T00:00:00Z",
    amountCents: 1499,
    vatRate: 0,
    vatAmountCents: 0,
    netAmountCents: 1499,
    category: "education",
    notes: "Advanced TypeScript course",
    createdAt: "2024-11-12T20:00:00Z",
    updatedAt: "2024-11-12T20:00:00Z",
  },
  {
    id: "expense-6",
    tenantId: "tenant-1",
    merchant: "Telekom",
    date: "2024-11-15T00:00:00Z",
    amountCents: 4999,
    vatRate: 19,
    vatAmountCents: 798,
    netAmountCents: 4201,
    category: "phone_internet",
    notes: "Mobile phone contract",
    createdAt: "2024-11-15T10:00:00Z",
    updatedAt: "2024-11-15T10:00:00Z",
  },
  {
    id: "expense-7",
    tenantId: "tenant-1",
    merchant: "Restaurant Katz",
    date: "2024-11-18T00:00:00Z",
    amountCents: 4520,
    vatRate: 19,
    vatAmountCents: 722,
    netAmountCents: 3798,
    category: "meals",
    notes: "Client lunch - Müller GmbH",
    projectId: "project-1",
    createdAt: "2024-11-18T14:00:00Z",
    updatedAt: "2024-11-18T14:00:00Z",
  },
  {
    id: "expense-8",
    tenantId: "tenant-1",
    merchant: "Staples",
    date: "2024-11-20T00:00:00Z",
    amountCents: 3499,
    vatRate: 19,
    vatAmountCents: 559,
    netAmountCents: 2940,
    category: "office_supplies",
    notes: "Printer paper and ink",
    createdAt: "2024-11-20T11:30:00Z",
    updatedAt: "2024-11-20T11:30:00Z",
  },
  {
    id: "expense-9",
    tenantId: "tenant-1",
    merchant: "Notion",
    date: "2024-11-22T00:00:00Z",
    amountCents: 1000,
    vatRate: 0,
    vatAmountCents: 0,
    netAmountCents: 1000,
    category: "software",
    notes: "Notion Plus subscription",
    createdAt: "2024-11-22T09:00:00Z",
    updatedAt: "2024-11-22T09:00:00Z",
  },
  {
    id: "expense-10",
    tenantId: "tenant-1",
    merchant: "FlixBus",
    date: "2024-11-25T00:00:00Z",
    amountCents: 2999,
    vatRate: 7,
    vatAmountCents: 196,
    netAmountCents: 2803,
    category: "travel",
    notes: "Berlin-Munich conference",
    createdAt: "2024-11-25T06:00:00Z",
    updatedAt: "2024-11-25T06:00:00Z",
  },
  {
    id: "expense-11",
    tenantId: "tenant-1",
    merchant: "Amazon",
    date: "2024-11-28T00:00:00Z",
    amountCents: 7999,
    vatRate: 19,
    vatAmountCents: 1277,
    netAmountCents: 6722,
    category: "hardware",
    notes: "Wireless keyboard and mouse",
    createdAt: "2024-11-28T15:00:00Z",
    updatedAt: "2024-11-28T15:00:00Z",
  },
  {
    id: "expense-12",
    tenantId: "tenant-1",
    merchant: "Café Einstein",
    date: "2024-12-02T00:00:00Z",
    amountCents: 1890,
    vatRate: 19,
    vatAmountCents: 302,
    netAmountCents: 1588,
    category: "meals",
    notes: "Working breakfast",
    createdAt: "2024-12-02T08:30:00Z",
    updatedAt: "2024-12-02T08:30:00Z",
  },
];

const seedInvoices: Invoice[] = [
  {
    id: "invoice-1",
    tenantId: "tenant-1",
    clientId: "client-1",
    projectId: "project-1",
    invoiceNumber: "RE-2024-0001",
    status: "paid",
    issueDate: "2024-09-01T00:00:00Z",
    dueDate: "2024-09-15T00:00:00Z",
    paidDate: "2024-09-12T00:00:00Z",
    items: [
      {
        id: "item-1",
        description: "Website design consulting",
        quantity: 20,
        unitPriceCents: 9500,
        vatRate: 19,
        totalCents: 190000,
      },
      {
        id: "item-2",
        description: "UI/UX wireframes",
        quantity: 1,
        unitPriceCents: 150000,
        vatRate: 19,
        totalCents: 150000,
      },
    ],
    subtotalCents: 340000,
    vatAmountCents: 64600,
    totalCents: 404600,
    createdAt: "2024-09-01T10:00:00Z",
    updatedAt: "2024-09-12T14:00:00Z",
  },
  {
    id: "invoice-2",
    tenantId: "tenant-1",
    clientId: "client-2",
    projectId: "project-2",
    invoiceNumber: "RE-2024-0002",
    status: "paid",
    issueDate: "2024-09-15T00:00:00Z",
    dueDate: "2024-09-29T00:00:00Z",
    paidDate: "2024-09-28T00:00:00Z",
    items: [
      {
        id: "item-3",
        description: "Brand strategy workshop",
        quantity: 8,
        unitPriceCents: 12000,
        vatRate: 19,
        totalCents: 96000,
      },
      {
        id: "item-4",
        description: "Logo design (3 concepts)",
        quantity: 1,
        unitPriceCents: 250000,
        vatRate: 19,
        totalCents: 250000,
      },
    ],
    subtotalCents: 346000,
    vatAmountCents: 65740,
    totalCents: 411740,
    createdAt: "2024-09-15T11:00:00Z",
    updatedAt: "2024-09-28T16:00:00Z",
  },
  {
    id: "invoice-3",
    tenantId: "tenant-1",
    clientId: "client-3",
    projectId: "project-3",
    invoiceNumber: "RE-2024-0003",
    status: "sent",
    issueDate: "2024-10-01T00:00:00Z",
    dueDate: "2024-10-15T00:00:00Z",
    items: [
      {
        id: "item-5",
        description: "Social media strategy - October",
        quantity: 1,
        unitPriceCents: 200000,
        vatRate: 19,
        totalCents: 200000,
      },
    ],
    subtotalCents: 200000,
    vatAmountCents: 38000,
    totalCents: 238000,
    createdAt: "2024-10-01T09:00:00Z",
    updatedAt: "2024-10-02T10:00:00Z",
  },
  {
    id: "invoice-4",
    tenantId: "tenant-1",
    clientId: "client-1",
    projectId: "project-1",
    invoiceNumber: "RE-2024-0004",
    status: "overdue",
    issueDate: "2024-10-15T00:00:00Z",
    dueDate: "2024-10-29T00:00:00Z",
    items: [
      {
        id: "item-6",
        description: "Website development - Phase 1",
        quantity: 40,
        unitPriceCents: 9500,
        vatRate: 19,
        totalCents: 380000,
      },
    ],
    subtotalCents: 380000,
    vatAmountCents: 72200,
    totalCents: 452200,
    createdAt: "2024-10-15T10:00:00Z",
    updatedAt: "2024-10-15T10:00:00Z",
  },
  {
    id: "invoice-5",
    tenantId: "tenant-1",
    clientId: "client-2",
    invoiceNumber: "RE-2024-0005",
    status: "issued",
    issueDate: "2024-11-01T00:00:00Z",
    dueDate: "2024-11-15T00:00:00Z",
    items: [
      {
        id: "item-7",
        description: "Brand guidelines document",
        quantity: 1,
        unitPriceCents: 180000,
        vatRate: 19,
        totalCents: 180000,
      },
      {
        id: "item-8",
        description: "Asset library creation",
        quantity: 1,
        unitPriceCents: 120000,
        vatRate: 19,
        totalCents: 120000,
      },
    ],
    subtotalCents: 300000,
    vatAmountCents: 57000,
    totalCents: 357000,
    createdAt: "2024-11-01T11:00:00Z",
    updatedAt: "2024-11-01T11:00:00Z",
  },
  {
    id: "invoice-6",
    tenantId: "tenant-1",
    clientId: "client-3",
    projectId: "project-3",
    invoiceNumber: "RE-2024-0006",
    status: "draft",
    issueDate: "2024-11-15T00:00:00Z",
    dueDate: "2024-11-29T00:00:00Z",
    items: [
      {
        id: "item-9",
        description: "Social media strategy - November",
        quantity: 1,
        unitPriceCents: 200000,
        vatRate: 19,
        totalCents: 200000,
      },
      {
        id: "item-10",
        description: "Content creation (10 posts)",
        quantity: 10,
        unitPriceCents: 15000,
        vatRate: 19,
        totalCents: 150000,
      },
    ],
    subtotalCents: 350000,
    vatAmountCents: 66500,
    totalCents: 416500,
    createdAt: "2024-11-15T09:00:00Z",
    updatedAt: "2024-11-15T09:00:00Z",
  },
];

export interface MockDatabase {
  tenant: Tenant;
  user: User;
  clients: Client[];
  projects: Project[];
  expenses: Expense[];
  invoices: Invoice[];
  conversations: Conversation[];
  invoiceSequence: number;
}

function createInitialDb(): MockDatabase {
  return {
    tenant: seedTenant,
    user: seedUser,
    clients: seedClients,
    projects: seedProjects,
    expenses: seedExpenses,
    invoices: seedInvoices,
    conversations: [],
    invoiceSequence: 7,
  };
}

export function loadDb(): MockDatabase {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to load mock DB:", e);
  }
  return createInitialDb();
}

export function saveDb(db: MockDatabase): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (e) {
    console.error("Failed to save mock DB:", e);
  }
}

export function resetDb(): MockDatabase {
  const db = createInitialDb();
  saveDb(db);
  return db;
}

// Export singleton instance
let dbInstance: MockDatabase | null = null;

export function getDb(): MockDatabase {
  if (!dbInstance) {
    dbInstance = loadDb();
  }
  return dbInstance;
}

export function updateDb(updater: (db: MockDatabase) => MockDatabase): MockDatabase {
  const db = getDb();
  const updated = updater(db);
  dbInstance = updated;
  saveDb(updated);
  return updated;
}
