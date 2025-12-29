import { z } from "zod";

export const WorkflowTaskTypeSchema = z.enum(["HUMAN", "TIMER", "HTTP", "EMAIL", "AI", "SYSTEM"]);

export const WorkflowTaskCreateSchema = z.object({
  type: WorkflowTaskTypeSchema,
  name: z.string().optional(),
  input: z.record(z.unknown()).optional(),
  runAt: z.string().datetime().optional(),
  maxAttempts: z.number().int().positive().optional(),
  idempotencyKey: z.string().optional(),
  completionEvent: z.string().optional(),
});

export const WorkflowActionSchema = z.union([
  z.object({
    type: z.literal("createTask"),
    task: WorkflowTaskCreateSchema,
  }),
  z.object({
    type: z.literal("assign"),
    path: z.string(),
    value: z.unknown(),
  }),
]);

export const WorkflowGuardSchema = z.union([
  z.object({
    type: z.literal("always"),
  }),
  z.object({
    type: z.literal("contextEquals"),
    path: z.string(),
    value: z.unknown(),
  }),
  z.object({
    type: z.literal("eventEquals"),
    path: z.string(),
    value: z.unknown(),
  }),
]);

export const WorkflowTransitionSchema = z.object({
  target: z.string().optional(),
  actions: z.array(WorkflowActionSchema).optional(),
  guard: z.union([z.string(), WorkflowGuardSchema]).optional(),
});

export const WorkflowStateSchema = z.object({
  type: z.literal("final").optional(),
  on: z.record(z.string(), WorkflowTransitionSchema).optional(),
});

export const WorkflowSpecSchema = z.object({
  id: z.string().optional(),
  version: z.number().int().optional(),
  initial: z.string(),
  context: z.record(z.unknown()).optional(),
  states: z.record(z.string(), WorkflowStateSchema),
  guards: z.record(z.string(), WorkflowGuardSchema).optional(),
});

export type WorkflowTaskCreateSpec = z.infer<typeof WorkflowTaskCreateSchema>;
export type WorkflowActionSpec = z.infer<typeof WorkflowActionSchema>;
export type WorkflowGuardSpec = z.infer<typeof WorkflowGuardSchema>;
export type WorkflowSpec = z.infer<typeof WorkflowSpecSchema>;
