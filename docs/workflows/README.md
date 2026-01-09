# Workflow Engine (Infrastructure)

This module provides workflow infrastructure for long-running, auditable, AI-native workflows.
It is domain-agnostic and designed for multi-tenant usage with BullMQ, XState, and Prisma.

## Overview

- Definitions live in `WorkflowDefinition` (versioned, tenant-scoped, JSON spec)
- Instances track state and context snapshots (`WorkflowInstance`)
- Tasks represent executable steps (`Task`)
- Audit events are appended in `WorkflowEvent`

Workers run two queues:

- `workflow-orchestrator` advances instances using XState
- `workflow-task-runner` executes tasks via handler registry

## Workflow Spec

The `spec` field is a JSON object compatible with a minimal XState-like structure.

Example:

```json
{
  "id": "hello-workflow",
  "initial": "start",
  "context": {
    "greeted": false
  },
  "states": {
    "start": {
      "on": {
        "WORKFLOW_START": {
          "target": "notify",
          "actions": [
            {
              "type": "createTask",
              "task": {
                "type": "EMAIL",
                "name": "send-hello",
                "input": {
                  "to": "user@example.com",
                  "subject": "Hello"
                },
                "completionEvent": "HELLO_SENT"
              }
            }
          ]
        }
      }
    },
    "notify": {
      "on": {
        "HELLO_SENT": { "target": "done" }
      }
    },
    "done": { "type": "final" }
  }
}
```

Supported action types:

- `createTask`: schedule a task with optional `runAt`, `idempotencyKey`, and `completionEvent`
- `assign`: update context fields (`path`, `value`)

Guards can be defined in the spec under `guards` and referenced by name.

## Execution Model

1. API starts an instance and enqueues a `WORKFLOW_START` event.
2. Orchestrator loads the definition + snapshot, applies events, and creates tasks.
3. Task runner claims runnable tasks, executes handlers, and enqueues follow-up events.
4. Each transition writes history events and updates instance snapshots transactionally.

## Queue Delivery Paths

Workflow execution logic is shared across queue drivers; only the delivery
mechanism changes.

- BullMQ: workers subscribe to Redis queues in `onModuleInit()` and BullMQ
  invokes `handleJob` for each job.
- Cloud Tasks: Cloud Tasks pushes HTTP requests to the worker, the controller
  builds a `QueueJob`, and calls `handleJob` directly.

## AI Tasks

AI task handler enforces policy guardrails:

- `policy.allowedEvents` allowlists events the AI can emit
- `policy.allowDirectEmit` must be true for the worker to emit those events
- decisions are always stored in task output for auditability

## Queue Drivers

Workflows use a queue port that supports multiple drivers. Pick one based on your environment.

### BullMQ (Redis)

BullMQ requires Redis. Set:

- `WORKFLOW_QUEUE_DRIVER=bullmq`
- `REDIS_URL=redis://<host>:<port>/<db>`

If `WORKFLOW_QUEUE_DRIVER` is not set, BullMQ is selected by default when
`REDIS_URL` is set or when running in production.

### In-memory (dev/tests)

In-memory queues do not require Redis and are process-local. This is best for
unit tests and single-process runs.

- `WORKFLOW_QUEUE_DRIVER=memory`

Do not use this when API and worker run in separate processes; they will not
share queues.

### GCP Cloud Tasks

Cloud Tasks removes the Redis dependency and provides durable scheduling.
It delivers jobs over HTTP to the worker service.

Set:

- `WORKFLOW_QUEUE_DRIVER=cloudtasks`
- `GOOGLE_CLOUD_PROJECT=<project-id>`
- `WORKFLOW_CLOUDTASKS_LOCATION=<region>` (e.g. `us-central1`)
- `WORKFLOW_CLOUDTASKS_TARGET_BASE_URL=https://<worker-host>`
- Optional: `WORKFLOW_CLOUDTASKS_QUEUE_PREFIX=<prefix>` (defaults to `${APP_ENV}-`)
- Optional: `WORKFLOW_CLOUDTASKS_SERVICE_ACCOUNT=<service-account-email>` (for OIDC auth)
- Optional: `WORKFLOW_QUEUE_SECRET=<shared-secret>` (sent as `X-Queue-Secret`)

Note: Cloud Tasks requires the worker to run an HTTP server and expose the
workflow queue routes under `internal/queues/*`.

## Fixtures

A hello-world fixture spec is provided for tests:

- `packages/core/src/workflows/fixtures/hello-workflow.ts`
