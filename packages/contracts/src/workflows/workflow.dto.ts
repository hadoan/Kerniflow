import { z } from "zod";
import { WorkflowSpecSchema } from "./workflow-spec.schema";
import {
  WorkflowDefinitionStatusSchema,
  WorkflowEventInputSchema,
  WorkflowInstanceStatusSchema,
} from "./workflow.types";

export const CreateWorkflowDefinitionInputSchema = z.object({
  key: z.string().min(1),
  version: z.number().int().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  status: WorkflowDefinitionStatusSchema.optional(),
  spec: WorkflowSpecSchema,
  createdBy: z.string().optional(),
});

export const ListWorkflowDefinitionsQuerySchema = z.object({
  key: z.string().optional(),
  status: WorkflowDefinitionStatusSchema.optional(),
});

export const StartWorkflowInstanceInputSchema = z
  .object({
    definitionId: z.string().optional(),
    definitionKey: z.string().optional(),
    definitionVersion: z.number().int().optional(),
    businessKey: z.string().optional(),
    context: z.record(z.unknown()).optional(),
    startEvent: WorkflowEventInputSchema.optional(),
  })
  .refine((data) => data.definitionId || data.definitionKey, {
    message: "definitionId or definitionKey is required",
  });

export const ListWorkflowInstancesQuerySchema = z.object({
  status: WorkflowInstanceStatusSchema.optional(),
  definitionKey: z.string().optional(),
  businessKey: z.string().optional(),
});

export const SendWorkflowEventInputSchema = z.object({
  event: WorkflowEventInputSchema,
});

export const CompleteWorkflowTaskInputSchema = z.object({
  output: z.record(z.unknown()).optional(),
  event: WorkflowEventInputSchema.optional(),
});

export const FailWorkflowTaskInputSchema = z.object({
  error: z.record(z.unknown()).optional(),
});

export type CreateWorkflowDefinitionInput = z.infer<typeof CreateWorkflowDefinitionInputSchema>;
export type ListWorkflowDefinitionsQuery = z.infer<typeof ListWorkflowDefinitionsQuerySchema>;
export type StartWorkflowInstanceInput = z.infer<typeof StartWorkflowInstanceInputSchema>;
export type ListWorkflowInstancesQuery = z.infer<typeof ListWorkflowInstancesQuerySchema>;
export type SendWorkflowEventInput = z.infer<typeof SendWorkflowEventInputSchema>;
export type CompleteWorkflowTaskInput = z.infer<typeof CompleteWorkflowTaskInputSchema>;
export type FailWorkflowTaskInput = z.infer<typeof FailWorkflowTaskInputSchema>;
