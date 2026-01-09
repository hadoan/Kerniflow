import { describe, expect, it } from "vitest";
import { WorkflowOrchestratorProcessor } from "../orchestrator.processor";

function createProcessor() {
  const env = { WORKFLOW_QUEUE_DRIVER: "memory" };
  const prisma = { $transaction: async (fn: any) => fn({}) };
  const noopRepo = {};
  const metrics = { recordQueueLatency: () => undefined };
  const queue = {
    subscribe: async () => ({ close: async () => undefined }),
    enqueue: async () => undefined,
    close: async () => undefined,
  };

  return new WorkflowOrchestratorProcessor(
    env as any,
    prisma as any,
    noopRepo as any,
    noopRepo as any,
    noopRepo as any,
    noopRepo as any,
    metrics as any,
    queue as any,
    queue as any
  );
}

describe("WorkflowOrchestratorProcessor", () => {
  it("derives FAILED when task failed event arrives", () => {
    const processor = createProcessor();
    const status = (processor as any).deriveStatus(
      [{ type: "TASK_FAILED", payload: {} }],
      [],
      false
    );

    expect(status).toBe("FAILED");
  });

  it("derives COMPLETED for final state", () => {
    const processor = createProcessor();
    const status = (processor as any).deriveStatus([], [], true);

    expect(status).toBe("COMPLETED");
  });

  it("derives WAITING when human task is created", () => {
    const processor = createProcessor();
    const status = (processor as any).deriveStatus(
      [],
      [{ type: "HUMAN", name: "approval" }],
      false
    );

    expect(status).toBe("WAITING");
  });

  it("derives WAITING when delayed timer task is created", () => {
    const processor = createProcessor();
    const status = (processor as any).deriveStatus(
      [],
      [{ type: "TIMER", name: "delay", runAt: new Date().toISOString() }],
      false
    );

    expect(status).toBe("WAITING");
  });

  it("derives RUNNING when no waiting tasks exist", () => {
    const processor = createProcessor();
    const status = (processor as any).deriveStatus([], [{ type: "SYSTEM", name: "work" }], false);

    expect(status).toBe("RUNNING");
  });

  it("detects final state from spec", () => {
    const processor = createProcessor();
    const isFinal = (processor as any).isFinalState(
      { states: { done: { type: "final" } } },
      "done"
    );

    expect(isFinal).toBe(true);
  });

  it("ignores non-final states", () => {
    const processor = createProcessor();
    const isFinal = (processor as any).isFinalState({ states: { active: {} } }, "active");

    expect(isFinal).toBe(false);
  });
});
