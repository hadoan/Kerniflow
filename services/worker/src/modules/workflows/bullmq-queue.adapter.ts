import { Queue, QueueScheduler, Worker, type Job, type JobsOptions } from "bullmq";
import type {
  QueueEnqueueOptions,
  QueueHandler,
  QueueJob,
  QueuePort,
  QueueSubscribeOptions,
  QueueSubscription,
} from "@corely/kernel";

function buildRedisConnection(redisUrl?: string) {
  if (!redisUrl) {
    return { host: "127.0.0.1", port: 6379 };
  }

  const url = new URL(redisUrl);
  const db = url.pathname ? Number(url.pathname.replace("/", "")) : undefined;

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 6379,
    username: url.username || undefined,
    password: url.password || undefined,
    db: Number.isNaN(db) ? undefined : db,
  };
}

export class BullmqQueueAdapter<T> implements QueuePort<T> {
  private readonly queue: Queue<T>;
  private readonly scheduler: QueueScheduler;
  private readonly name: string;
  private readonly connection: ReturnType<typeof buildRedisConnection>;
  private readonly workers = new Set<Worker<T>>();

  constructor(name: string, redisUrl?: string) {
    this.name = name;
    this.connection = buildRedisConnection(redisUrl);
    this.queue = new Queue<T>(name, {
      connection: this.connection,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: 1000,
      },
    });
    this.scheduler = new QueueScheduler(name, { connection: this.connection });
  }

  async enqueue(data: T, options: QueueEnqueueOptions = {}): Promise<void> {
    const jobName = options.jobName ?? options.jobId ?? "job";
    const jobOptions: JobsOptions = {
      jobId: options.jobId,
      delay: options.delayMs,
      attempts: options.attempts,
      backoff: options.backoff
        ? {
            type: options.backoff.type,
            delay: options.backoff.delayMs,
          }
        : undefined,
    };

    await this.queue.add(jobName, data, jobOptions);
  }

  async subscribe(
    handler: QueueHandler<T>,
    options: QueueSubscribeOptions = {}
  ): Promise<QueueSubscription> {
    const worker = new Worker<T>(this.name, async (job) => handler(this.toQueueJob(job)), {
      connection: this.connection,
      concurrency: options.concurrency ?? 1,
    });

    this.workers.add(worker);

    return {
      close: async () => {
        this.workers.delete(worker);
        await worker.close();
      },
    };
  }

  async close(): Promise<void> {
    for (const worker of this.workers) {
      await worker.close();
    }
    this.workers.clear();
    await this.scheduler.close();
    await this.queue.close();
  }

  private toQueueJob(job: Job<T>) {
    return {
      id: job.id ? String(job.id) : undefined,
      timestamp: job.timestamp,
      data: job.data,
      attemptsMade: job.attemptsMade ?? 0,
      maxAttempts: job.opts.attempts ?? 1,
    } satisfies QueueJob<T>;
  }
}
