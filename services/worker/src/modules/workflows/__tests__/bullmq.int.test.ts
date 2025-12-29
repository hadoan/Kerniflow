import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Queue, QueueEvents, Worker } from "bullmq";
import { RedisTestServer } from "@kerniflow/testkit";

function buildRedisConnection(redisUrl: string) {
  const url = new URL(redisUrl);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
  };
}

describe("Workflow queues (BullMQ)", () => {
  let redis: RedisTestServer;

  beforeAll(async () => {
    redis = new RedisTestServer();
    await redis.up();
  });

  afterAll(async () => {
    await redis.down(true);
  });

  it("retries with backoff until success", async () => {
    const queueName = "workflow-test-retry";
    const connection = buildRedisConnection(redis.url);
    const queue = new Queue(queueName, { connection });
    const events = new QueueEvents(queueName, { connection });

    let attempts = 0;
    const timestamps: number[] = [];

    const worker = new Worker(
      queueName,
      async () => {
        attempts += 1;
        timestamps.push(Date.now());
        if (attempts < 3) {
          throw new Error("fail");
        }
      },
      { connection }
    );

    const completion = new Promise<void>((resolve, reject) => {
      events.on("completed", () => resolve());
      events.on("failed", (event) => {
        if (event.failedReason && event.attemptsMade >= 3) {
          reject(new Error(event.failedReason));
        }
      });
    });

    await queue.add("retry-job", {}, { attempts: 3, backoff: { type: "exponential", delay: 50 } });
    await completion;

    expect(attempts).toBe(3);
    expect(timestamps[1] - timestamps[0]).toBeGreaterThanOrEqual(50);

    await worker.close();
    await events.close();
    await queue.close();
  });
});
