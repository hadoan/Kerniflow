export type CopilotTaskType = "collect_inputs";

export interface CopilotTaskState {
  taskType: CopilotTaskType;
  toolCallId: string;
  status: "pending" | "completed";
  title?: string;
  description?: string;
  originalUserText?: string;
  requiredFields?: string[];
  createdAt: string;
  completedAt?: string;
}
