# Bizflow Foundation
## A scalable architecture for an AI-native modular ERP

**Version:** 1.0  
**Date:** 15 Dec 2025  
**Scope:** Kernel + module domains (finance, ops, HR, vertical packs) with clean boundaries for a growing team.

---

## Design intent
Start as a **modular monolith** (single platform) but keep boundaries so you can later split parts into services. Optimize for:
- fast product iteration today
- safe multi-tenant isolation
- team scalability (clear ownership) tomorrow

**Recommended stack:** Next.js (web + POS UI) + NestJS (API) + Worker (jobs/outbox) in a monorepo; PostgreSQL + Prisma; Redis for queues/caching; object storage for files; SSE/realtime provider for live POS.

---

# Executive summary
Bizflow is an AI-native ERP platform designed to support multiple business types (restaurant, hotel, factory, services) **without forking code**. The foundation is a **kernel** of universal business primitives plus **module packs** that add domain-specific workflows, UI, and integrations.

**Enterprise pattern:** Modular monolith + DDD bounded contexts + Hexagonal (ports/adapters) + Event-driven automation (outbox + process managers) + CQRS-lite reads.

## Principles
| Principle | What it means in practice |
|---|---|
| Clear ownership boundaries | Each module has domain + use-cases + infra adapters; no cross-module DB access. |
| Stable kernel primitives | Core models stay small; vertical packs compose kernel instead of rewriting it. |
| Events over tight coupling | Modules publish domain events; automation/integrations subscribe (outbox). |
| Configuration before code forks | Custom fields/statuses/workflows cover most customization; packs only for real code. |
| Security and audit as defaults | Tenant scoping, RBAC/ABAC, immutable audit trail, idempotency for commands/tools. |

---

# System overview
The platform is organized into three runtime surfaces that share the same domain packages:
- **Web/POS (Next.js):** UI, POS screens, SSR/RSC
- **API (NestJS):** RBAC, tools, workflows, domain use-cases
- **Worker (NestJS):** outbox, queues, automations, integrations

**Storage & infra:** PostgreSQL + Prisma • Redis (queues/cache) • Object Storage (files) • Realtime (SSE/provider)

## Key boundary rules
1. **Domain logic** lives in shared packages (no framework imports).
2. Only **repositories** in the data layer talk to Prisma.
3. Modules communicate via **domain events** and stable contracts.
4. API enforces **authorization, validation, and idempotency** for every command and tool call.

---

# Architecture patterns
| Pattern | Why it matters | How to implement |
|---|---|---|
| DDD bounded contexts | Stops the ERP from becoming one giant model. | Each module owns entities, use-cases, migrations, and APIs. |
| Hexagonal (ports/adapters) | Swap DB/queue/LLM providers without rewriting business rules. | Use interfaces (ports) in application layer; Nest providers implement them. |
| Outbox pattern | Reliable event publication and integration delivery. | Write events into outbox table in same transaction; worker publishes. |
| Process managers (sagas) | Long workflows: approvals, multi-step ops, retries. | WorkflowInstance + state machine; subscribe to events; emit commands. |
| CQRS-lite reads | Fast dashboards/reports without polluting write model. | Read services/materialized views; keep writes strict in use-cases. |
| Idempotent commands | Safe retries for POS and AI tool executions. | Idempotency key per command; unique constraint + replay return. |

---

# Multi-tenancy, security, and customization
**Tenant isolation:** every row is scoped by `tenantId`; uniqueness and indexes include `tenantId`. Sensitive actions require immutable audit logs.

**Authorization:** RBAC by default, optional ABAC policies for high-precision rules (e.g., amount thresholds).

**Customization strategy:** configuration first (custom fields, statuses, numbering, templates) + workflow definitions; only use code-level packs when you must add screens, integrations, or specialized data structures.

## Customization levels
| Level | Examples | Storage |
|---|---|---|
| Config-only (no-code) | Custom fields, labels, numbering, tax rules, roles | TenantSetting + CustomFieldDefinition/Value |
| Workflow (low-code) | Approvals, kitchen routing, reorder points, scheduled tasks | WorkflowDefinition JSON + instances + tasks |
| Extension pack (code) | POS modifiers, hotel room allocation, factory BOM/QA | Module pack with migrations + tools + UI |

---

# ERP domain module catalog
Treat each row as a bounded context with its own code ownership, migrations, and APIs.

| Module domain | Purpose | Core entities (examples) |
|---|---|---|
| Identity & Access | Tenants, users, roles, policies, API keys. | Tenant, User, Membership, Role, Permission, ApiKey |
| Party & CRM | Customers, suppliers, employees, contacts. | Party, PartyRole, ContactPoint, Address |
| Catalog | Products/services, pricing, tax, units. | Item, Variant, PriceList, TaxCode, Unit |
| Documents | Receipts, contracts, attachments, OCR metadata. | Document, File, DocumentLink |
| Sales Orders | Quote-to-cash pipeline. | Order, OrderLine, Fulfillment, Shipment |
| Purchasing | Procure-to-pay pipeline. | PurchaseOrder, POLine, SupplierTerms |
| Billing & Payments | Invoices, payments, refunds, allocations. | Invoice, InvoiceLine, Payment, Allocation, Refund |
| Accounting Core | Chart of accounts and journal postings. | LedgerAccount, JournalEntry, JournalLine |
| Expenses | Employee/vendor expenses and approvals. | Expense, ExpenseLine, ReceiptLink, Approval |
| Inventory | Stock, movements, reorder rules. | Location, InventoryItem, StockMovement |
| Assets & Maintenance | Equipment lifecycle and servicing. | Asset, MaintenanceTask, WorkOrder |
| Projects & Jobs | Job costing and time/material tracking. | Project, Job, TimeEntry, CostAllocation |
| HR (light) | Profiles, time off, shifts (optional). | EmployeeProfile, LeaveRequest, Shift |
| Workflows | State machines, approvals, tasks. | WorkflowDefinition, WorkflowInstance, Task |
| Automation & Integrations | Webhooks, connectors, outbox, retries. | Integration, Webhook, OutboxEvent, Delivery |
| AI Copilot | Tool registry, runs, messages, tool execution logs. | AgentRun, Message, ToolExecution, Attachment |
| Reporting | Dashboards, analytics, exports. | ReadModels, Snapshots, MaterializedViews |

---

# Vertical packs (restaurant, hotel, factory)
Vertical packs extend the kernel and baseline modules with specialized workflows, UI, and data structures. They should be **additive and isolated**: new tables live in the pack, while shared primitives remain in the kernel.

| Pack | Adds (examples) | Composes kernel primitives |
|---|---|---|
| Restaurant POS | Floor plan, table checks, modifiers, kitchen tickets, cash drawer. | Location(TABLE), Order, Item, Payment, Workflow |
| Hotel Ops | Room inventory, reservations, check-in/out, folio billing. | Location(ROOM), Party, Order/Invoice, Workflow |
| Factory / Manufacturing | BOM, work orders, routing, QA, batch tracking. | Item, Inventory, Asset, Workflow, Domain Events |

## POS minimum build (restaurant pack)
- Screens: floor plan, table order entry, payment/close, optional kitchen display
- Realtime: broadcast `OrderOpened/Updated/SentToKitchen/Paid` events to connected devices
- Safety: manager approvals for voids/discounts; idempotency on pay/close

---

# Operational readiness
**Observability:** structured logs with correlation IDs (`tenantId`, `requestId`, `traceId`), metrics (latency, error rate), and tracing across API/worker. Persist tool execution logs for Copilot runs.

**Data safety:** backups + PITR, migration discipline (expand/contract), and strict CI checks (`prisma validate`, drift checks).

**Deployments:** keep infra simple: one Postgres, one Redis, one object store. Deploy web separately from API/worker so you can scale POS traffic independently from automation workloads.

| Area | Baseline |
|---|---|
| CI/CD | Lint + tests + `prisma validate`; migration PR checks; seed scripts for packs. |
| Security | RBAC/ABAC, audit log, secrets management, encrypted storage for files. |
| Performance | Read models for dashboards; caching for menus/POS; indexes include `tenantId`. |
| Reliability | Outbox + retries; idempotency; dead-letter queue; incident playbooks. |

---

# Appendix: governance rules for a growing team
1) **Module ownership:** every module has an owner; only owners approve cross-cutting changes.  
2) **No shared DB writes:** a module writes only its own tables; other modules integrate via API/events.  
3) **Contracts are versioned:** breaking changes require a deprecation window.  
4) **Events are stable:** treat domain events as public APIs; add fields, do not rename/remove lightly.  
5) **Keep the kernel small:** promote something into kernel only when at least two packs need it.

> This foundation is intentionally practical: strong enough for enterprise needs, while avoiding early microservice overhead. When parts grow (integrations, reporting, POS realtime), these boundaries let you extract services safely.
