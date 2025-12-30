import { describe, beforeEach, it, expect, vi } from "vitest";
import { Test } from "@nestjs/testing";
import { EnvModule } from "@corely/config";
import { WorkflowQueueClient } from "../workflow-queue.client";

// Mock bullmq so we don't open real connections
class MockQueue {
  static instances: Array<{ connection: any }> = [];
  constructor(_name: string, options: { connection: unknown }) {
    MockQueue.instances.push({ connection: options.connection });
  }
  async add() {}
  async close() {}
}

vi.mock("bullmq", () => ({ Queue: MockQueue }));

describe("WorkflowQueueClient (Env injection)", () => {
  beforeEach(() => {
    MockQueue.instances = [];
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

    const connection = MockQueue.instances[0]?.connection;
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
