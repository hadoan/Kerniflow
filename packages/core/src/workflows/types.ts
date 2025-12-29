import type {
  WorkflowActionSpec,
  WorkflowEventInput,
  WorkflowSpec,
  WorkflowTaskCreateSpec,
} from "@kerniflow/contracts";

export type { WorkflowActionSpec, WorkflowEventInput, WorkflowSpec, WorkflowTaskCreateSpec };

export type WorkflowStateValue = string | Record<string, string>;

export interface WorkflowSnapshot {
  value: WorkflowStateValue;
  context: Record<string, unknown>;
}

export interface WorkflowTransition {
  event: WorkflowEventInput;
  from: WorkflowStateValue;
  to: WorkflowStateValue;
}

export interface WorkflowTransitionResult {
  snapshot: WorkflowSnapshot;
  tasks: WorkflowTaskCreateSpec[];
  transitions: WorkflowTransition[];
  actions: WorkflowActionSpec[];
}
