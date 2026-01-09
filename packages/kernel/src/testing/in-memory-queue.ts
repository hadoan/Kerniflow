import type {
  QueueBackoff,
  QueueEnqueueOptions,
  QueueHandler,
  QueueJob,
  QueuePort,
  QueueSubscribeOptions,
  QueueSubscription,
} from "../ports/queue.port";

type InternalJob<T> = {
  id?: string;
  timestamp: number;
  data: T;
  attemptsMade: number;
  maxAttempts: number;
  backoff?: QueueBackoff;
};

const sharedQueues = new Map<string, InMemoryQueue<unknown>>();

export function getInMemoryQueue<T>(name: string): InMemoryQueue<T> {
  if (!sharedQueues.has(name)) {
    sharedQueues.set(name, new InMemoryQueue(name));
  }
  return sharedQueues.get(name) as InMemoryQueue<T>;
}

export class InMemoryQueue<T> implements QueuePort<T> {
  private readonly name: string;
  private handler: QueueHandler<T> | undefined;
  private concurrency = 1;
  private activeCount = 0;
  private closed = false;
  private readonly pending: Array<InternalJob<T>> = [];
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();

  constructor(name: string) {
    this.name = name;
  }

  async enqueue(data: T, options: QueueEnqueueOptions = {}): Promise<void> {
    if (this.closed) {
      return;
    }

    const maxAttempts = Math.max(1, options.attempts ?? 1);
    const job: InternalJob<T> = {
      id: options.jobId,
      timestamp: Date.now(),
      data,
      attemptsMade: 0,
      maxAttempts,
      backoff: options.backoff,
    };

    const delayMs = options.delayMs ?? 0;
    if (delayMs > 0) {
      this.schedule(job, delayMs);
      return;
    }

    this.pending.push(job);
    this.drain();
  }

  async subscribe(
    handler: QueueHandler<T>,
    options: QueueSubscribeOptions = {}
  ): Promise<QueueSubscription> {
    this.handler = handler;
    this.concurrency = options.concurrency ?? 1;
    this.drain();

    return {
      close: async () => {
        if (this.handler === handler) {
          this.handler = undefined;
        }
      },
    };
  }

  async close(): Promise<void> {
    this.closed = true;
    this.handler = undefined;
    this.pending.length = 0;
    for (const timer of this.timers) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }

  private schedule(job: InternalJob<T>, delayMs: number) {
    const handle = setTimeout(() => {
      this.timers.delete(handle);
      if (this.closed) {
        return;
      }
      this.pending.push(job);
      this.drain();
    }, delayMs);

    this.timers.add(handle);
  }

  private drain() {
    if (!this.handler || this.closed) {
      return;
    }

    while (this.activeCount < this.concurrency && this.pending.length > 0) {
      const job = this.pending.shift();
      if (!job) {
        break;
      }
      this.activeCount += 1;
      void this.runJob(job);
    }
  }

  private async runJob(job: InternalJob<T>) {
    try {
      await this.handler?.(this.toQueueJob(job));
    } catch {
      if (job.attemptsMade + 1 < job.maxAttempts) {
        job.attemptsMade += 1;
        const delay = this.computeBackoff(job);
        this.schedule(job, delay);
      }
    } finally {
      this.activeCount = Math.max(0, this.activeCount - 1);
      this.drain();
    }
  }

  private computeBackoff(job: InternalJob<T>): number {
    if (!job.backoff) {
      return 0;
    }

    if (job.backoff.type === "exponential") {
      return job.backoff.delayMs * Math.pow(2, Math.max(0, job.attemptsMade - 1));
    }

    return job.backoff.delayMs;
  }

  private toQueueJob(job: InternalJob<T>): QueueJob<T> {
    return {
      id: job.id,
      timestamp: job.timestamp,
      data: job.data,
      attemptsMade: job.attemptsMade,
      maxAttempts: job.maxAttempts,
    };
  }
}
