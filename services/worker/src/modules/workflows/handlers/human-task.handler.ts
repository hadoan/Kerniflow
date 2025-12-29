import type { TaskHandler, TaskHandlerResult, WorkflowTaskPayload } from "./task-handler.interface";
import type { WorkflowPorts } from "../ports/workflow-ports";

export class HumanTaskHandler implements TaskHandler {
  canHandle(type: string): boolean {
    return type === "HUMAN";
  }

  async execute(_task: WorkflowTaskPayload, _ports: WorkflowPorts): Promise<TaskHandlerResult> {
    return {
      status: "FAILED",
      error: { message: "Human tasks must be completed via API" },
    };
  }
}
