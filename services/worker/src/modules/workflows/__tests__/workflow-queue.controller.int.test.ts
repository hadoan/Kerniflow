import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { WorkflowQueueController } from "../workflow-queue.controller";

describe("WorkflowQueueController (Cloud Tasks)", () => {
  it("rejects requests without the shared secret", async () => {
    const env = { WORKFLOW_QUEUE_SECRET: "secret" } as any;
    const controller = new WorkflowQueueController(
      env,
      { handleJob: vi.fn() },
      {
        handleJob: vi.fn(),
      }
    );

    await expect(
      controller.handleOrchestrator(
        {
          data: { tenantId: "t1", instanceId: "i1", events: [] },
          jobId: "job-1",
          maxAttempts: 1,
        },
        { "x-queue-secret": "wrong" }
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("maps Cloud Tasks headers into a queue job payload", async () => {
    const env = { WORKFLOW_QUEUE_SECRET: "secret" } as any;
    const orchestrator = { handleJob: vi.fn().mockResolvedValue(undefined) };
    const controller = new WorkflowQueueController(env, orchestrator as any, {
      handleJob: vi.fn(),
    });

    await controller.handleOrchestrator(
      {
        data: { tenantId: "t1", instanceId: "i1", events: [{ type: "WORKFLOW_START" }] },
        jobId: "job-123",
        enqueuedAt: 1_700_000_000_000,
        maxAttempts: 3,
      },
      {
        "x-queue-secret": "secret",
        "x-cloudtasks-taskretrycount": "1",
      }
    );

    expect(orchestrator.handleJob).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "job-123",
        timestamp: 1_700_000_000_000,
        attemptsMade: 1,
        maxAttempts: 3,
      })
    );
  });

  it("skips processing when attempts are exhausted", async () => {
    const env = { WORKFLOW_QUEUE_SECRET: "secret" } as any;
    const orchestrator = { handleJob: vi.fn().mockResolvedValue(undefined) };
    const controller = new WorkflowQueueController(env, orchestrator as any, {
      handleJob: vi.fn(),
    });

    await controller.handleOrchestrator(
      {
        data: { tenantId: "t1", instanceId: "i1", events: [] },
        jobId: "job-2",
        maxAttempts: 2,
      },
      {
        "x-queue-secret": "secret",
        "x-cloudtasks-taskretrycount": "2",
      }
    );

    expect(orchestrator.handleJob).not.toHaveBeenCalled();
  });

  it("rejects empty payloads", async () => {
    const env = { WORKFLOW_QUEUE_SECRET: undefined } as any;
    const controller = new WorkflowQueueController(
      env,
      { handleJob: vi.fn() },
      {
        handleJob: vi.fn(),
      }
    );

    await expect(
      controller.handleOrchestrator(
        {
          jobId: "job-3",
        },
        {}
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
