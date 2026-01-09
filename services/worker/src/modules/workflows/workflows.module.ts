import { Module } from "@nestjs/common";
import { EnvService } from "@corely/config";
import {
  WORKFLOW_ORCHESTRATOR_QUEUE,
  WORKFLOW_ORCHESTRATOR_QUEUE_PORT,
  WORKFLOW_ORCHESTRATOR_QUEUE_ROUTE,
  WORKFLOW_TASK_QUEUE,
  WORKFLOW_TASK_QUEUE_PORT,
  WORKFLOW_TASK_QUEUE_ROUTE,
  type WorkflowOrchestratorQueuePayload,
  type WorkflowTaskQueuePayload,
} from "@corely/contracts";
import { WorkflowMetricsService } from "./workflow-metrics.service";
import { WorkflowOrchestratorProcessor } from "./orchestrator.processor";
import { WorkflowTaskRunnerProcessor } from "./task-runner.processor";
import { TaskHandlerRegistry } from "./handlers/task-handler.registry";
import { HumanTaskHandler } from "./handlers/human-task.handler";
import { TimerTaskHandler } from "./handlers/timer-task.handler";
import { HttpTaskHandler } from "./handlers/http-task.handler";
import { EmailTaskHandler } from "./handlers/email-task.handler";
import { AiTaskHandler } from "./handlers/ai-task.handler";
import { SystemTaskHandler } from "./handlers/system-task.handler";
import { createWorkflowQueueAdapter } from "./workflow-queue.provider";
import { WorkflowQueueLifecycle } from "./workflow-queue.lifecycle";
import { WorkflowQueueController } from "./workflow-queue.controller";

@Module({
  controllers: [WorkflowQueueController],
  providers: [
    WorkflowMetricsService,
    WorkflowOrchestratorProcessor,
    WorkflowTaskRunnerProcessor,
    WorkflowQueueLifecycle,
    HumanTaskHandler,
    TimerTaskHandler,
    HttpTaskHandler,
    EmailTaskHandler,
    AiTaskHandler,
    SystemTaskHandler,
    {
      provide: TaskHandlerRegistry,
      useFactory: (
        human: HumanTaskHandler,
        timer: TimerTaskHandler,
        http: HttpTaskHandler,
        email: EmailTaskHandler,
        ai: AiTaskHandler,
        system: SystemTaskHandler
      ) => new TaskHandlerRegistry([human, timer, http, email, ai, system]),
      inject: [
        HumanTaskHandler,
        TimerTaskHandler,
        HttpTaskHandler,
        EmailTaskHandler,
        AiTaskHandler,
        SystemTaskHandler,
      ],
    },
    {
      provide: WORKFLOW_ORCHESTRATOR_QUEUE_PORT,
      useFactory: (env: EnvService) =>
        createWorkflowQueueAdapter<WorkflowOrchestratorQueuePayload>(
          WORKFLOW_ORCHESTRATOR_QUEUE,
          env,
          WORKFLOW_ORCHESTRATOR_QUEUE_ROUTE
        ),
      inject: [EnvService],
    },
    {
      provide: WORKFLOW_TASK_QUEUE_PORT,
      useFactory: (env: EnvService) =>
        createWorkflowQueueAdapter<WorkflowTaskQueuePayload>(
          WORKFLOW_TASK_QUEUE,
          env,
          WORKFLOW_TASK_QUEUE_ROUTE
        ),
      inject: [EnvService],
    },
  ],
})
export class WorkflowsModule {}
