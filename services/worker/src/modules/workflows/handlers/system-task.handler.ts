import type { TaskHandler, TaskHandlerResult, WorkflowTaskPayload } from "./task-handler.interface";
import type { WorkflowPorts } from "../ports/workflow-ports";

export class SystemTaskHandler implements TaskHandler {
  canHandle(type: string): boolean {
    return type === "SYSTEM";
  }

  async execute(task: WorkflowTaskPayload, ports: WorkflowPorts): Promise<TaskHandlerResult> {
    return {
      status: "SUCCEEDED",
      output: { completedAt: ports.clock.now().toISOString(), taskId: task.id },
    };
  }
}
