import type { WorkflowPorts } from "../ports/workflow-ports";

export interface WorkflowTaskPayload {
  id: string;
  tenantId: string;
  instanceId: string;
  type: string;
  input: Record<string, unknown>;
}

export interface TaskHandlerResult {
  status: "SUCCEEDED" | "FAILED";
  output?: Record<string, unknown>;
  error?: Record<string, unknown>;
  emittedEvent?: string;
  suggestedEvent?: string;
}

export interface TaskHandler {
  canHandle(type: string): boolean;
  execute(task: WorkflowTaskPayload, ports: WorkflowPorts): Promise<TaskHandlerResult>;
}
