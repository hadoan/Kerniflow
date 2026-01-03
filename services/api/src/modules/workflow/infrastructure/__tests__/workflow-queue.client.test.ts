import { describe, beforeEach, it, expect, vi } from "vitest";
import { Test } from "@nestjs/testing";
import { EnvModule } from "@corely/config";
import { WorkflowQueueClient } from "../workflow-queue.client";

// Use hoisted mock to avoid temporal dead zone issues
const { MockQueue, mockQueueInstances } = vi.hoisted(() => {
  const instances: Array<{ connection: any }> = [];
  class MockQueue {
    static get instances() {
      return instances;
    }
    constructor(_name: string, options: { connection: unknown }) {
      instances.push({ connection: options.connection });
    }
    async add() {}
    async close() {}
  }
  return { MockQueue, mockQueueInstances: instances };
});

vi.mock("bullmq", () => ({ Queue: MockQueue }));

describe("WorkflowQueueClient (Env injection)", () => {
  beforeEach(() => {
    mockQueueInstances.length = 0;
  });

  it("uses EnvService.REDIS_URL when constructing the queue connection", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        EnvModule.forTest({
          REDIS_URL: "redis://redis.example:6380/3",
        }),
      ],
      providers: [WorkflowQueueClient],
    }).compile();

    const client = moduleRef.get(WorkflowQueueClient);
    expect(client).toBeInstanceOf(WorkflowQueueClient);

    const connection = mockQueueInstances[0]?.connection;
    expect(connection).toEqual({
      host: "redis.example",
      port: 6380,
      username: undefined,
      password: undefined,
      db: 3,
    });

    await moduleRef.close();
  });
});
