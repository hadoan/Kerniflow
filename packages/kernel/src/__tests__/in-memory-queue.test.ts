import { describe, expect, it, vi } from "vitest";
import { getInMemoryQueue } from "../testing/in-memory-queue";

function uniqueQueueName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

describe("InMemoryQueue", () => {
  it("processes enqueued jobs", async () => {
    const queue = getInMemoryQueue<{ id: number }>(uniqueQueueName("queue"));
    const received: number[] = [];

    const subscription = await queue.subscribe(async (job) => {
      received.push(job.data.id);
    });

    await queue.enqueue({ id: 1 });
    await queue.enqueue({ id: 2 });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(received).toEqual([1, 2]);

    await subscription.close();
    await queue.close();
  });

  it("retries with exponential backoff", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));

    const queue = getInMemoryQueue<{ id: string }>(uniqueQueueName("retry"));
    const timestamps: number[] = [];
    let attempts = 0;

    try {
      const subscription = await queue.subscribe(async () => {
        attempts += 1;
        timestamps.push(Date.now());
        if (attempts < 3) {
          throw new Error("fail");
        }
      });

      await queue.enqueue(
        { id: "job-1" },
        { attempts: 3, backoff: { type: "exponential", delayMs: 50 } }
      );

      await vi.runAllTimersAsync();

      expect(attempts).toBe(3);
      expect(timestamps[1] - timestamps[0]).toBeGreaterThanOrEqual(50);
      expect(timestamps[2] - timestamps[1]).toBeGreaterThanOrEqual(100);

      await subscription.close();
      await queue.close();
    } finally {
      vi.useRealTimers();
    }
  });
});
