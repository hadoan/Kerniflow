import { z } from "zod";
import { type WorkflowTaskTypeSchema } from "./workflow-spec.schema";

export const WorkflowDefinitionStatusSchema = z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]);

export const WorkflowInstanceStatusSchema = z.enum([
  "PENDING",
  "RUNNING",
  "WAITING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
]);

export const WorkflowTaskStatusSchema = z.enum([
  "PENDING",
  "RUNNING",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
  "SKIPPED",
]);

export const WorkflowEventInputSchema = z.object({
  type: z.string(),
  payload: z.unknown().optional(),
});

export type WorkflowDefinitionStatus = z.infer<typeof WorkflowDefinitionStatusSchema>;
export type WorkflowInstanceStatus = z.infer<typeof WorkflowInstanceStatusSchema>;
export type WorkflowTaskStatus = z.infer<typeof WorkflowTaskStatusSchema>;
export type WorkflowEventInput = z.infer<typeof WorkflowEventInputSchema>;
export type WorkflowTaskType = z.infer<typeof WorkflowTaskTypeSchema>;
