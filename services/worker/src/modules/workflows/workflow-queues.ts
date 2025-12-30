import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { Queue, QueueScheduler } from "bullmq";
import { EnvService } from "@corely/config";
import { WORKFLOW_ORCHESTRATOR_QUEUE, WORKFLOW_TASK_QUEUE } from "@corely/contracts";

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
export class WorkflowQueues implements OnModuleDestroy {
  readonly connection: ReturnType<typeof buildRedisConnection>;
  readonly orchestratorQueue: Queue;
  readonly taskQueue: Queue;
  private readonly orchestratorScheduler: QueueScheduler;
  private readonly taskScheduler: QueueScheduler;
  private readonly logger = new Logger(WorkflowQueues.name);

  constructor(env: EnvService) {
    const connection = buildRedisConnection(env.REDIS_URL);
    this.connection = connection;

    this.orchestratorQueue = new Queue(WORKFLOW_ORCHESTRATOR_QUEUE, {
      connection,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: 1000,
      },
    });

    this.taskQueue = new Queue(WORKFLOW_TASK_QUEUE, {
      connection,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: 1000,
      },
    });

    this.orchestratorScheduler = new QueueScheduler(WORKFLOW_ORCHESTRATOR_QUEUE, { connection });
    this.taskScheduler = new QueueScheduler(WORKFLOW_TASK_QUEUE, { connection });

    this.logger.log(
      JSON.stringify({
        message: "workflow.queues.ready",
        orchestratorQueue: WORKFLOW_ORCHESTRATOR_QUEUE,
        taskQueue: WORKFLOW_TASK_QUEUE,
      })
    );
  }

  async onModuleDestroy() {
    await this.orchestratorQueue.close();
    await this.taskQueue.close();
    await this.orchestratorScheduler.close();
    await this.taskScheduler.close();
  }
}
