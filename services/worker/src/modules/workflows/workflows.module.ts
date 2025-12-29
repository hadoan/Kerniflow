import { Module } from "@nestjs/common";
import { WorkflowQueues } from "./workflow-queues";
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

@Module({
  providers: [
    WorkflowQueues,
    WorkflowMetricsService,
    WorkflowOrchestratorProcessor,
    WorkflowTaskRunnerProcessor,
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
  ],
})
export class WorkflowsModule {}
