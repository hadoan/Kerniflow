import type { EnvService } from "@corely/config";
import { getInMemoryQueue, type QueuePort } from "@corely/kernel";
import { BullmqQueueAdapter } from "./bullmq-queue.adapter";
import { CloudTasksQueueAdapter } from "./cloud-tasks-queue.adapter";

export function createWorkflowQueueAdapter<T>(
  name: string,
  env: EnvService,
  queueRoute: string
): QueuePort<T> {
  const driver = env.WORKFLOW_QUEUE_DRIVER ?? (env.isProd() || env.REDIS_URL ? "bullmq" : "memory");

  if (driver === "memory") {
    return getInMemoryQueue<T>(name);
  }

  if (driver === "cloudtasks") {
    if (!env.GOOGLE_CLOUD_PROJECT) {
      throw new Error("GOOGLE_CLOUD_PROJECT is required when WORKFLOW_QUEUE_DRIVER=cloudtasks");
    }
    if (!env.WORKFLOW_CLOUDTASKS_LOCATION) {
      throw new Error(
        "WORKFLOW_CLOUDTASKS_LOCATION is required when WORKFLOW_QUEUE_DRIVER=cloudtasks"
      );
    }
    if (!env.WORKFLOW_CLOUDTASKS_TARGET_BASE_URL) {
      throw new Error(
        "WORKFLOW_CLOUDTASKS_TARGET_BASE_URL is required when WORKFLOW_QUEUE_DRIVER=cloudtasks"
      );
    }
    return new CloudTasksQueueAdapter<T>(name, {
      projectId: env.GOOGLE_CLOUD_PROJECT,
      location: env.WORKFLOW_CLOUDTASKS_LOCATION,
      queuePrefix: env.WORKFLOW_CLOUDTASKS_QUEUE_PREFIX ?? `${env.APP_ENV}-`,
      targetBaseUrl: env.WORKFLOW_CLOUDTASKS_TARGET_BASE_URL,
      queueRoute,
      serviceAccountEmail: env.WORKFLOW_CLOUDTASKS_SERVICE_ACCOUNT,
      secret: env.WORKFLOW_QUEUE_SECRET,
    });
  }

  if (!env.REDIS_URL) {
    throw new Error("REDIS_URL is required when WORKFLOW_QUEUE_DRIVER=bullmq");
  }

  return new BullmqQueueAdapter<T>(name, env.REDIS_URL);
}
