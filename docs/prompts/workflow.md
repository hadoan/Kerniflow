## Prompt: Implement AI-Native Workflow Infrastructure (BullMQ + XState + Prisma)

You are an expert TypeScript/NestJS architect working in a monorepo. Implement the **workflow infrastructure** as a scalable, AI-native workflow engine. This is **infrastructure only**: do not implement domain-specific workflows (invoice approval, onboarding, etc.). Those use cases will be added later using this engine.

### Goals

Build a workflow system that:

1. Supports **long-running processes** (human-in-the-loop, timers, integrations).
2. Is **reliable** (retries, idempotency, crash-safe processing).
3. Is **auditable** (history, states, outputs/errors).
4. Is **AI-native** (workflow steps can include AI decisions/tools, with guardrails).
5. Fits a **modular monolith** with a separate **worker** service.
6. Uses **Prisma** for persistence, **BullMQ** for execution, **XState** for state machines.

### Non-Goals

- Do not build specific workflow definitions for invoices/expenses/etc.
- Do not implement UI.
- Do not add external orchestration like Temporal.
- Do not over-engineer multi-region; do implement multi-tenant correctness.

---

# 1) Architecture & Patterns (Must Follow)

### 1.1 Core Pattern: Process Manager / Saga

Treat each `WorkflowInstance` as a **process manager** that evolves over time:

- It reacts to events (domain events, user actions, timers, external callbacks).
- It advances the workflow by creating/running tasks.
- It records every transition.

### 1.2 Hexagonal (Ports/Adapters)

Workflow runtime must not depend on concrete providers directly:

- Define ports like `ClockPort`, `EmailPort`, `LlmPort`, `HttpPort`, `ObjectStoragePort`
- Implement adapters elsewhere (reuse existing infra if present)
- Task handlers depend only on ports.

### 1.3 Multi-tenancy

Every query and mutation must be scoped by `tenantId`. Enforce:

- repository methods always require `tenantId`
- indexes support tenant/task queries
- worker processing is tenant-safe

### 1.4 Reliability: Outbox-friendly

Design workflow triggers to work with an outbox (even if outbox is already present elsewhere):

- allow “start workflow from event payload”
- ensure idempotency so replaying an event doesn’t create duplicates

---

# 2) Prisma Data Model (Extend Current Schema)

You already have `WorkflowDefinition`, `WorkflowInstance`, and `Task`. Evolve schema to support runtime safely.

### 2.1 WorkflowDefinition

Add fields:

- `key` (stable identifier for use cases, e.g. `"expense_approval"`)
- `version` (int)
- `status` (`active|inactive|archived`)
- `spec` (JSON) — definition for workflow graph/state machine
- `createdBy` optional
- uniqueness: `tenantId + key + version` or equivalent

### 2.2 WorkflowInstance

Add fields:

- `businessKey` (string) optional but recommended for idempotency (e.g. `expenseId`)
- `status` enum: `pending|running|waiting|completed|failed|cancelled`
- `currentState` (string) — XState state value snapshot
- `context` (JSON) — XState context snapshot
- `startedAt`, `completedAt`
- `lastError` JSON optional
- unique constraint to prevent duplicates: `tenantId + definitionId + businessKey` (when businessKey present)

### 2.3 Task

Tasks represent executable units. Add:

- `type` enum: `HUMAN|TIMER|HTTP|EMAIL|AI|SYSTEM`
- `status` enum: `pending|running|succeeded|failed|cancelled|skipped`
- `runAt` DateTime optional (for timers)
- `attempts`, `maxAttempts`
- `lockedAt`, `lockedBy` (for safe claiming)
- `idempotencyKey` optional
- `input` JSON, `output` JSON, `error` JSON
- `traceId` optional for observability
- Indexes:
  - `(tenantId, status, runAt)`
  - `(instanceId, status)`
  - `(tenantId, idempotencyKey)` when relevant

### 2.4 WorkflowEvent / WorkflowHistory (New Table)

Create an append-only table to audit everything:

- `WorkflowEvent` (or `WorkflowHistory`)
  - `id`, `tenantId`, `instanceId`
  - `type` (`INSTANCE_STARTED`, `TASK_CREATED`, `TASK_STARTED`, `TASK_COMPLETED`, `STATE_TRANSITION`, `ERROR`, etc.)
  - `payload` JSON
  - `createdAt`
    Indexes: `(tenantId, instanceId, createdAt)`

---

# 3) Workflow Definition Format (spec JSON)

Define a minimal but extensible `spec` structure to drive execution.
Requirements:

- Use XState concepts: `states`, `on`, `guards`, `actions`.
- Allow mapping of XState “actions” to task creation.
- Support versioning and safe upgrades: instances always reference a specific definition version.

Example conceptual capabilities (don’t hardcode this example):

- `initial: "draft"`
- state transitions on events: `APPROVED`, `REJECTED`, `TIMEOUT`
- actions that schedule tasks: `createTask({ type: "EMAIL", ... })`

---

# 4) Runtime Execution Model

### 4.1 XState Interpreter in Worker

- Worker loads instance snapshot (`currentState`, `context`) and definition spec
- Rehydrates XState machine
- Applies incoming events or task completions
- Produces next actions (task creation, state transitions)
- Persists snapshot after each transition (transactionally)

### 4.2 BullMQ Queues

Implement queues:

- `workflow-orchestrator` (advances instances)
- `workflow-task-runner` (executes runnable tasks)
- optional `workflow-timers` if you separate delayed scheduling

Use best practices:

- job names include instanceId/taskId
- retries handled by BullMQ plus your own attempts counters
- backoff strategies
- concurrency controls
- dead-letter behavior (failed permanently => mark instance failed and emit history)

### 4.3 Claiming / Locking

Prevent double execution:

- Use DB-level locking semantics (optimistic update or `lockedAt/lockedBy`)
- Task runner must atomically claim tasks before executing
- Instance orchestrator must avoid concurrent state transitions for same instance

### 4.4 Transactions

Use Prisma transactions to ensure:

- state snapshot update + history append + task creation are atomic
- task completion writes output/error and emits event atomically

### 4.5 Idempotency

Implement:

- idempotency key on task creation and/or per incoming trigger event
- if the same event arrives twice, do not create duplicate instance/tasks
- safe retry on worker crash (at-least-once execution)

---

# 5) API Surface (Infra Only)

Create REST endpoints (or NestJS controllers) for managing workflow infra.

### 5.1 Definitions

- `POST /workflow/definitions` create (tenant-scoped)
- `GET /workflow/definitions` list (filter by key/status)
- `GET /workflow/definitions/:id` get
- `POST /workflow/definitions/:id/activate` activate
- `POST /workflow/definitions/:id/deactivate` deactivate

### 5.2 Instances

- `POST /workflow/instances` start instance
  - input: `definitionKey|definitionId`, optional `businessKey`, initial `context`

- `GET /workflow/instances` list (filter by status, definitionKey, businessKey)
- `GET /workflow/instances/:id` details (include tasks + history)
- `POST /workflow/instances/:id/cancel`
- `POST /workflow/instances/:id/events` send event into workflow (for UI actions / callbacks)

### 5.3 Tasks

- `GET /workflow/instances/:id/tasks` list
- `POST /workflow/tasks/:taskId/complete` (for human tasks)
- `POST /workflow/tasks/:taskId/fail` (optional)
  All endpoints must enforce tenant scoping + RBAC placeholders.

---

# 6) Task Execution Handlers

Implement a handler registry:

- `TaskHandler` interface: `canHandle(type)` and `execute(task, ports)`
- Built-in handler skeletons:
  - `HumanTaskHandler` (no-op; completion happens via API)
  - `TimerTaskHandler` (schedules runAt -> requeue/orchestrate)
  - `HttpTaskHandler` (calls HttpPort)
  - `EmailTaskHandler` (calls EmailPort)
  - `AiTaskHandler` (calls LlmPort)

AI Task Handler requirements (AI-native guardrails):

- Always store prompts/inputs/outputs in task output (redacted if needed)
- Support “decision output” that emits workflow events (e.g., `APPROVE`, `REJECT`)
- Must be policy-driven: allowlist which AI actions can mutate state
- Add safety mechanism: AI tasks cannot directly perform destructive actions; they can only emit suggested events unless explicitly configured

---

# 7) Worker Behavior

### 7.1 Orchestrator Job

Given instanceId:

- Load instance + definition spec
- Rehydrate XState
- Apply queued events (if you model them), or proceed when a task completes
- Generate next tasks, update status (`running|waiting|completed|failed`)
- Append history events

### 7.2 Task Runner Job

Given taskId:

- Claim task
- Execute via handler
- Persist output/error, status changes
- Trigger orchestrator for the instance (enqueue next step)

### 7.3 Scheduling Timers

If task has `runAt`:

- Either use BullMQ delayed jobs or periodic polling
- Prefer delayed jobs for precision; fallback polling is acceptable

---

# 8) Code Organization (Monorepo)

Create a dedicated workflow module with clean boundaries:

- `packages/contracts/workflows` (DTOs, zod schemas, types)
- `services/api/src/modules/workflows` (controllers, services, repos)
- `services/worker/src/modules/workflows` (processors, handlers, runners)
- `packages/core/workflows` (engine: xstate machine builder, orchestration logic, pure functions)

Enforce:

- Domain-agnostic engine in `packages/core`
- API/worker only wire dependencies and ports

---

# 9) Observability & Ops

Add:

- structured logs (tenantId, instanceId, taskId, traceId)
- metrics counters (tasks succeeded/failed, queue latency)
- history table for audit
- admin-friendly errors with correlation IDs

---

# 10) Testing Requirements

Implement tests (do not skip):

- Unit tests for pure workflow engine functions (XState building, transition logic)
- Integration tests with Postgres:
  - task claiming prevents double-run
  - idempotency prevents duplicates
  - instance snapshot updates atomically with history + tasks

- Worker tests using BullMQ in test mode:
  - retries/backoff behave as expected

---

# 11) Delivery Checklist

When done, ensure:

- Prisma migrations created
- Module exported and wired into API + worker
- Queues configured with env-based redis settings
- Example “hello workflow” fixture definition exists for testing only (not a domain use case)
- README docs: how to define a workflow spec and how instances advance

---

### Output Format

Produce:

1. A short architecture summary (1–2 pages)
2. A list of created/modified files and modules
3. The implementation (code)
4. Migration files
5. Test plan + implemented tests

Keep the system scalable, maintainable, tenant-safe, and aligned with best practices for BullMQ + XState + Prisma.
