import type { WorkflowEventInput } from "./workflow.types";

export type WorkflowOrchestratorQueuePayload = {
  tenantId: string;
  instanceId: string;
  events: WorkflowEventInput[];
};

export type WorkflowTaskQueuePayload = {
  tenantId: string;
  taskId: string;
  instanceId: string;
};
