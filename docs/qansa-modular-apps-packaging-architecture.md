# Qansa Modular Apps Packaging Architecture

_A practical blueprint for packaging “Invoices, Expenses, Approvals, Files” as modular apps while keeping strict bounded-context boundaries._

## Goal

Deliver a Base-style “suite of apps” user experience:

- **Money** → Invoices, Expenses
- **Ops** → Approvals (Inbox / Tasks)
- **Documents** → Files (uploads + attachments)

…without turning the codebase into a tightly coupled monolith.

---

## Key Idea: Product Packages vs Technical Modules

### Product packages (what the user sees)

- **Money**
  - Invoices
  - Expenses
- **Ops**
  - Approvals (Tasks / Inbox)
- **Documents**
  - Files

### Technical modules (bounded contexts)

- `invoices` (Billing)
- `expenses`
- `workflow` (Approvals, tasks, state machines)
- `documents` (File storage + document metadata + linking)
- `clients` (Party/CRM) _(optional but often needed by invoices/expenses)_

**Hard rule:** `invoices`/`expenses` never access `workflow`/`documents` persistence directly. They integrate via **ports** (interfaces) and/or **events**.

---

## Architecture Overview (high-level)

```
Frontend (Vite + React)
  ├─ Module manifests (nav + routes + permissions)
  ├─ AppShell composes manifests into router + sidebar
  └─ Each module = self-contained "mini app"

Backend (NestJS modular monolith, DDD-ish)
  ├─ Each module = bounded context (domain/application/infra/api)
  ├─ Integration via ports (DIP) and/or events (outbox)
  └─ Shared platform primitives = Workflow + Documents
```

---

## Frontend: Module Manifests + AppShell Composition

### 1) Define a shared `ModuleManifest` type

**File:** `apps/webs/src/shared/lib/moduleManifest.ts`

```ts
import type { RouteObject } from "react-router-dom";

export type NavGroup = "Money" | "Ops" | "Documents" | "Settings";

export interface ModuleManifest {
  id: string;
  navGroup: NavGroup;
  navLabel: string;
  navIcon?: React.ComponentType<any>;
  basePath: string;
  routes: RouteObject[];
  requiredPermissions?: string[];
}
```

### 2) Each module exports its manifest

**File:** `apps/webs/src/modules/invoices/index.ts`

```ts
import { invoiceRoutes } from "./routes";
import type { ModuleManifest } from "@/shared/lib/moduleManifest";

export const invoicesManifest: ModuleManifest = {
  id: "invoices",
  navGroup: "Money",
  navLabel: "Invoices",
  basePath: "/invoices",
  routes: invoiceRoutes,
  requiredPermissions: ["invoices:read"],
};
```

Create similar exports for:

- `apps/webs/src/modules/expenses/index.ts`
- `apps/webs/src/modules/workflow/index.ts` (Approvals UI)
- `apps/webs/src/modules/documents/index.ts` (Files UI)

### 3) Router composes all module routes automatically

**File:** `apps/webs/src/app/router/index.ts`

```ts
import { createBrowserRouter } from "react-router-dom";
import { invoicesManifest } from "@/modules/invoices";
import { expensesManifest } from "@/modules/expenses";
import { workflowManifest } from "@/modules/workflow";
import { documentsManifest } from "@/modules/documents";

const manifests = [invoicesManifest, expensesManifest, workflowManifest, documentsManifest];

export const router = createBrowserRouter([
  {
    path: "/",
    children: manifests.flatMap((m) => m.routes),
  },
]);
```

### 4) Sidebar uses manifests too

Sidebar navigation reads manifests and groups items by `navGroup` (“Money”, “Ops”, “Documents”).  
This gives the “many apps / suites” experience without manual wiring.

---

## Backend: Bounded Context Layout + Ports (DIP)

Keep modules split and consistent:

```
services/api/src/modules/
  invoices/
  expenses/
  workflow/
  documents/
  clients/
```

Inside each module:

```
modules/<module>/
  domain/
    entities/
    events/
    value-objects/
  application/
    usecases/
    ports/
  infra/
    prisma/
    adapters/
  api/
    controllers/
    dtos/
  <module>.module.ts
```

### Invoices depends on ports, not other modules

**File:** `modules/invoices/application/ports/ApprovalPort.ts`

```ts
export interface ApprovalPort {
  requestApproval(input: {
    tenantId: string;
    requestedByUserId: string;
    subject: { type: "invoice"; id: string };
    policyKey: string; // e.g. "invoice.default"
  }): Promise<{ approvalRequestId: string }>;
}
```

**File:** `modules/invoices/application/ports/DocumentsPort.ts`

```ts
export interface DocumentsPort {
  linkDocument(input: {
    tenantId: string;
    documentId: string;
    target: { type: "invoice"; id: string };
  }): Promise<void>;
}
```

### Workflow implements `ApprovalPort` as an adapter

**File:** `modules/workflow/infra/adapters/WorkflowApprovalAdapter.ts`

```ts
import { ApprovalPort } from "@/modules/invoices/application/ports/ApprovalPort";

export class WorkflowApprovalAdapter implements ApprovalPort {
  async requestApproval(input) {
    // Create WorkflowInstance + Tasks (owned by workflow)
    return { approvalRequestId: "..." };
  }
}
```

### Documents implements `DocumentsPort` as an adapter

Same pattern for linking documents without leaking DB access.

---

## Documents/Files: the “DocumentLink” backbone

Model the documents context as:

- `Document` (metadata)
- `File` (storage pointer, size, mime)
- `DocumentLink` (tenantId, documentId, targetType, targetId)

**Important:** Invoices/Expenses do not write `DocumentLink` directly. They call a port or an API endpoint exposed by `documents`.

This scales to:

- invoice attachments
- expense receipts
- approval evidence
- contracts later

---

## Approvals: Workflow as a Process Manager (not embedded logic)

Treat approvals as a platform primitive owned by `workflow`:

- `WorkflowDefinition` (policyKey)
- `WorkflowInstance`
- `Task` (assignedTo, status)

Events (examples):

- `ApprovalRequested`
- `ApprovalApproved`
- `ApprovalRejected`

---

## Integration Options (choose one for v1)

### Option A — Direct port call (simpler inside modular monolith)

- `InvoiceSubmitUseCase` calls `ApprovalPort.requestApproval(...)`
- `workflow` creates tasks
- `workflow` emits `ApprovalApproved(subject=invoice,id=...)`
- `invoices` consumes the event and transitions status

**Pros:** straightforward, fewer moving parts  
**Cons:** tighter runtime coupling

### Option B — Event-driven via outbox (cleanest for scale)

- `invoices` emits `InvoiceSubmittedForApproval` into outbox
- subscriber/worker in `workflow` creates tasks/instance
- `workflow` emits `ApprovalApproved`
- `invoices` consumes and transitions state

**Pros:** best boundaries, easy future extraction to microservices  
**Cons:** more infrastructure + async complexity

Recommendation: **start with A but still publish events for audit**, migrate to B when needed.

---

## End-to-end Flows (how apps feel integrated)

### Flow 1: Invoice + attachments + approval

1. UI creates invoice → `POST /invoices`
2. UI uploads file → `POST /documents/upload` → returns `documentId`
3. UI links file → `POST /documents/link` with target `{type: "invoice", id}`
4. UI submits invoice → `POST /invoices/:id/submit`
5. Backend:
   - invoices updates status + emits outbox event(s)
   - workflow creates approval tasks (approval inbox)
6. Approver approves → workflow emits `ApprovalApproved`
7. invoices consumes → invoice transitions `Submitted → Approved → Sent`

### Flow 2: Expense receipt + approval

Same pattern; only target `{type: "expense", id}`.

---

## Shared Contracts (strongly recommended)

Put shared DTOs/schemas in a shared package (e.g. `packages/contracts`) to prevent drift:

- `DocumentDTO`, `UploadDocumentResponse`, `LinkDocumentRequest`
- `ApprovalRequestDTO`, `TaskDTO`
- `InvoiceDTO`, `ExpenseDTO`
- shared enums: `TargetType = "invoice" | "expense" | ...`

---

## “Platform primitives” checklist (build once, reuse everywhere)

To scale modules fast without coupling:

- **Forms** (schema-driven)
- **Workflow engine** (approvals/tasks/state)
- **Documents** (upload/link/versioning later)
- **Notifications** (email/in-app)
- **Audit trail**
- **Events/outbox** for integration + analytics

---

## Implementation Notes (pragmatic)

- Keep the **UI modular** via manifests (routes + nav + permissions).
- Keep the **backend modular** via ports/adapters + events.
- Make **Documents** and **Workflow** “platform primitives” that other modules consume.
- Treat everything attachable as a `targetType/targetId` (future-proof).

---

## Next steps (if you want this turned into an execution prompt)

I can produce a single “agent prompt” that includes:

- exact folder trees for all 4 modules
- endpoint list + request/response DTOs
- Prisma schema suggestions for `documents` + `workflow`
- outbox event names + payloads
- unit tests for core use-cases (submit → task created → approve → invoice transitions)
