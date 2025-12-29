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

## AI Tasks

AI task handler enforces policy guardrails:

- `policy.allowedEvents` allowlists events the AI can emit
- `policy.allowDirectEmit` must be true for the worker to emit those events
- decisions are always stored in task output for auditability

## Redis Configuration

Queues use `REDIS_URL` if provided; otherwise they default to `redis://127.0.0.1:6379`.

## Fixtures

A hello-world fixture spec is provided for tests:

- `packages/core/src/workflows/fixtures/hello-workflow.ts`
