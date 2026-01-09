import { describe, it, expect, vi } from "vitest";
import type { QueuePort } from "@corely/kernel";
import type { WorkflowOrchestratorQueuePayload } from "@corely/contracts";
import { WorkflowQueueClient } from "../workflow-queue.client";

describe("WorkflowQueueClient", () => {
  it("enqueues orchestrator jobs with retry settings", async () => {
    const enqueue = vi.fn().mockResolvedValue(undefined);
    const queue: QueuePort<WorkflowOrchestratorQueuePayload> = {
      enqueue,
      subscribe: vi.fn().mockResolvedValue({ close: vi.fn().mockResolvedValue(undefined) }),
      close: vi.fn().mockResolvedValue(undefined),
    };

    const client = new WorkflowQueueClient(queue);
    await client.enqueueOrchestrator({
      tenantId: "tenant-1",
      instanceId: "instance-1",
      events: [],
    });

    expect(enqueue).toHaveBeenCalledTimes(1);
    const [payload, options] = enqueue.mock.calls[0] ?? [];
    expect(payload).toEqual({
      tenantId: "tenant-1",
      instanceId: "instance-1",
      events: [],
    });
    expect(options).toEqual(
      expect.objectContaining({
        jobName: "orchestrate:instance-1",
        attempts: 5,
        backoff: { type: "exponential", delayMs: 2000 },
      })
    );
    expect(options.jobId).toMatch(/^instance-1:/);
  });
});
