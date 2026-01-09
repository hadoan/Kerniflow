import { CloudTasksClient } from "@google-cloud/tasks";
import type {
  QueueEnqueueOptions,
  QueueHandler,
  QueuePort,
  QueueSubscribeOptions,
  QueueSubscription,
} from "@corely/kernel";

type CloudTasksQueueOptions = {
  projectId: string;
  location: string;
  queuePrefix?: string;
  targetBaseUrl: string;
  queueRoute: string;
  serviceAccountEmail?: string;
  secret?: string;
};

export class CloudTasksQueueAdapter<T> implements QueuePort<T> {
  private readonly client: CloudTasksClient;
  private readonly queuePath: string;
  private readonly locationPath: string;
  private readonly targetUrl: string;
  private readonly serviceAccountEmail?: string;
  private readonly secret?: string;
  private ensureQueuePromise: Promise<void> | undefined;

  constructor(name: string, options: CloudTasksQueueOptions) {
    this.client = new CloudTasksClient();
    const queueName = `${options.queuePrefix ?? ""}${name}`;
    this.queuePath = this.client.queuePath(options.projectId, options.location, queueName);
    this.locationPath = this.client.locationPath(options.projectId, options.location);
    this.targetUrl = new URL(options.queueRoute, options.targetBaseUrl).toString();
    this.serviceAccountEmail = options.serviceAccountEmail;
    this.secret = options.secret;
  }

  async enqueue(data: T, options: QueueEnqueueOptions = {}): Promise<void> {
    await this.ensureQueue();
    const payload = Buffer.from(
      JSON.stringify({
        data,
        jobId: options.jobId,
        enqueuedAt: Date.now(),
        maxAttempts: options.attempts ?? 1,
      })
    );

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.secret) {
      headers["X-Queue-Secret"] = this.secret;
    }

    const task: {
      httpRequest: {
        httpMethod: "POST";
        url: string;
        headers: Record<string, string>;
        body: Buffer;
        oidcToken?: { serviceAccountEmail: string; audience?: string };
      };
      scheduleTime?: { seconds: number; nanos?: number };
    } = {
      httpRequest: {
        httpMethod: "POST",
        url: this.targetUrl,
        headers,
        body: payload,
        ...(this.serviceAccountEmail
          ? {
              oidcToken: {
                serviceAccountEmail: this.serviceAccountEmail,
                audience: new URL(this.targetUrl).origin,
              },
            }
          : {}),
      },
    };

    if (options.delayMs && options.delayMs > 0) {
      const nowMs = Date.now() + options.delayMs;
      task.scheduleTime = {
        seconds: Math.floor(nowMs / 1000),
        nanos: (nowMs % 1000) * 1_000_000,
      };
    }

    await this.client.createTask({
      parent: this.queuePath,
      task,
    });
  }

  async subscribe(
    _handler: QueueHandler<T>,
    _options: QueueSubscribeOptions = {}
  ): Promise<QueueSubscription> {
    throw new Error("Cloud Tasks uses push delivery; subscribe is not supported.");
  }

  async close(): Promise<void> {
    await this.client.close();
  }

  private async ensureQueue(): Promise<void> {
    if (!this.ensureQueuePromise) {
      this.ensureQueuePromise = this.initQueue();
    }
    await this.ensureQueuePromise;
  }

  private async initQueue(): Promise<void> {
    try {
      await this.client.getQueue({ name: this.queuePath });
    } catch (error: any) {
      if (error?.code !== 5) {
        throw error;
      }
      await this.client.createQueue({
        parent: this.locationPath,
        queue: { name: this.queuePath },
      });
    }
  }
}
