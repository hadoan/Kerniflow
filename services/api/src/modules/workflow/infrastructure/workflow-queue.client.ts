import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";
import { EnvService } from "@kerniflow/config";
import { WORKFLOW_ORCHESTRATOR_QUEUE } from "@kerniflow/contracts";

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

@Injectable()
export class WorkflowQueueClient implements OnModuleDestroy {
  private readonly queue: Queue;
  private readonly logger = new Logger(WorkflowQueueClient.name);

  constructor(private readonly env: EnvService) {
    this.queue = new Queue(WORKFLOW_ORCHESTRATOR_QUEUE, {
      connection: buildRedisConnection(this.env.REDIS_URL),
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: 1000,
      },
    });
  }

  async enqueueOrchestrator(payload: {
    tenantId: string;
    instanceId: string;
    events: Array<{ type: string; payload?: unknown }>;
  }) {
    await this.queue.add(`orchestrate:${payload.instanceId}`, payload, {
      jobId: `${payload.instanceId}:${Date.now()}`,
      attempts: 5,
      backoff: { type: "exponential", delay: 2000 },
    });

    this.logger.debug(
      JSON.stringify({
        message: "workflow.orchestrator.enqueued",
        tenantId: payload.tenantId,
        instanceId: payload.instanceId,
        eventCount: payload.events.length,
      })
    );
  }

  async onModuleDestroy() {
    await this.queue.close();
  }
}
