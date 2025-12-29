import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class WorkflowMetricsService {
  private readonly logger = new Logger(WorkflowMetricsService.name);

  recordTaskResult(input: {
    tenantId: string;
    taskId: string;
    type: string;
    status: "SUCCEEDED" | "FAILED";
  }) {
    this.logger.log(
      JSON.stringify({
        message: "workflow.task.result",
        tenantId: input.tenantId,
        taskId: input.taskId,
        type: input.type,
        status: input.status,
      })
    );
  }

  recordQueueLatency(input: {
    queue: string;
    jobId: string | number | undefined;
    latencyMs: number;
  }) {
    this.logger.log(
      JSON.stringify({
        message: "workflow.queue.latency",
        queue: input.queue,
        jobId: input.jobId,
        latencyMs: input.latencyMs,
      })
    );
  }
}
