export type QueueBackoff = {
  type: "fixed" | "exponential";
  delayMs: number;
};

export type QueueEnqueueOptions = {
  jobId?: string;
  jobName?: string;
  delayMs?: number;
  attempts?: number;
  backoff?: QueueBackoff;
};

export type QueueJob<T> = {
  id?: string;
  timestamp: number;
  data: T;
  attemptsMade: number;
  maxAttempts: number;
};

export type QueueHandler<T> = (job: QueueJob<T>) => Promise<void>;

export type QueueSubscription = {
  close(): Promise<void>;
};

export type QueueSubscribeOptions = {
  concurrency?: number;
};

export interface QueuePort<T> {
  enqueue(data: T, options?: QueueEnqueueOptions): Promise<void>;
  subscribe(handler: QueueHandler<T>, options?: QueueSubscribeOptions): Promise<QueueSubscription>;
  close(): Promise<void>;
}
