import type { TaskHandler, TaskHandlerResult, WorkflowTaskPayload } from "./task-handler.interface";
import type { WorkflowPorts } from "../ports/workflow-ports";

export class TimerTaskHandler implements TaskHandler {
  canHandle(type: string): boolean {
    return type === "TIMER";
  }

  async execute(_task: WorkflowTaskPayload, ports: WorkflowPorts): Promise<TaskHandlerResult> {
    return {
      status: "SUCCEEDED",
      output: { firedAt: ports.clock.now().toISOString() },
    };
  }
}
