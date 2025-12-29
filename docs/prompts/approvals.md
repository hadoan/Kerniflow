# PROMPT: Implement **AI-Native Approvals** on top of the existing Workflow Runtime (BullMQ + XState + Prisma) — reusable “gating” across Purchasing/Sales/Inventory/POS/Accounting + rich AI copilot support

You are an expert TypeScript/NestJS architect working in the Kerniflow monorepo. The **workflow infrastructure runtime already exists** (BullMQ + XState + Prisma), including:

- versioned `WorkflowDefinition` (key/version/spec/status)
- `WorkflowInstance` (businessKey/status/currentState/context snapshots)
- `Task` (typed tasks: HUMAN/TIMER/HTTP/EMAIL/AI/SYSTEM)
- `WorkflowEvent/History` append-only stream
- Worker orchestrator + task runner
- Existing `OutboxEvent`, `DomainEvent`, `AuditLog`, and `IdempotencyKey` tables and patterns
- Existing ai-copilot module using **ai-sdk.dev** with tool-cards + “Apply” actions

Your task is now to build a **domain capability**: **AI-Native Approvals** (maker-checker controls) using the workflow runtime. This is no longer “infra only”; this is a **core ERP feature** that:

- Gates sensitive actions across modules
- Creates and tracks approval requests and decisions
- Provides an approvals inbox and admin policy builder
- Writes robust audit trails and emits events
- Uses AI copilot to help configure policies, explain why approvals were required, and detect risk patterns — but **AI never approves**

---

## 1) Goals & Non-Goals

### Goals

1. Approval “policies” are **stored as WorkflowDefinitions** (type = APPROVAL).
2. Approval requests are **WorkflowInstances** created idempotently when a gated action is attempted.
3. Approval steps are **HUMAN Tasks** assigned to users/roles/permissions.
4. A shared **ApprovalGateService** integrates with Purchasing/Sales/Inventory/POS/Accounting to block actions until approved.
5. Rich auditability:
   - all attempts, requests, decisions, and executions recorded in `AuditLog`
   - workflow history remains the canonical process trace
   - `DomainEvent` + `OutboxEvent` are emitted for notifications and downstream reactions
6. AI-native:
   - copilot tools suggest policies and explain requirements
   - copilot surfaces risk scans and month-end controls checklists
   - AI outputs tool-cards with confidence/why/provenance and explicit Apply actions
   - AI never approves/rejects or executes gated actions

### Non-Goals (v1)

- Full BPMN/visual workflow designer beyond “policy builder”
- Auto-execute gated actions after approval (v1 uses “approve then requestor executes”)
- E-signature
- Advanced multi-branch workflows (keep to simple steps; multi-step sequential is allowed if easy)

---

## 2) Mandatory preflight: confirm what the workflow runtime already provides

Before building approvals, inspect and document:

1. How workflow definitions are stored (`key`, `version`, `spec`) and how the worker interprets XState spec.
2. How instances are started (API endpoint/service) and how `businessKey` is used for idempotency.
3. How HUMAN tasks are represented and completed (API completion -> orchestrator event).
4. How the history stream is appended and queried.
5. How `IdempotencyKey` is used in API commands.
6. How `AuditLog` is currently written and displayed.
7. Outbox usage: how the worker processes outbox events and how correlationId is propagated.
8. ai-copilot tool pattern: where tools are registered, how tool-cards are rendered, and how Apply actions invoke domain APIs.

Deliverable: a short “Integration Plan” that states:

- which existing workflow infra APIs you will call
- which small extensions (if any) are needed for approvals (e.g., task assignment fields, inbox query endpoints)
- how you’ll keep everything tenant-safe and idempotent

---

## 3) DDD modeling: Approvals as a specialization of Workflows

### 3.1 Canonical mapping (must be explicit)

- **Approval Policy** → `WorkflowDefinition` (key like `approval.vendorBill.post`, versioned)
- **Approval Request** → `WorkflowInstance`
- **Approval Step** → `Task` with `type=HUMAN` (approve/reject decision)
- **Process trace** → workflow `WorkflowEvent/
