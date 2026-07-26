import { z } from "zod";

export const CopilotTextPartSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
  state: z.enum(["streaming", "done"]).optional(),
  providerMetadata: z.record(z.any()).optional(),
});

export const CopilotReasoningPartSchema = z.object({
  type: z.literal("reasoning"),
  text: z.string(),
  state: z.enum(["streaming", "done"]).optional(),
  providerMetadata: z.record(z.any()).optional(),
});

export const CopilotFilePartSchema = z.object({
  type: z.literal("file"),
  mediaType: z.string().min(1),
  filename: z.string().optional(),
  url: z.string().min(1),
  providerMetadata: z.record(z.any()).optional(),
});

const ToolInvocationStateSchema = z.enum([
  "input-streaming",
  "input-available",
  "approval-requested",
  "approval-responded",
  "output-available",
  "output-error",
  "output-denied",
]);

export const CopilotToolInvocationSchema = z.object({
  type: z.string().min(1),
  toolCallId: z.string(),
  // AI SDK static tools encode the tool name in `type` (for example,
  // `tool-collect_inputs`) and do not include a separate `toolName`.
  // Dynamic tools still provide `toolName`, so support both persisted shapes.
  toolName: z.string().optional(),
  state: ToolInvocationStateSchema.optional(),
  args: z.any().optional(),
  result: z.any().optional(),
  input: z.any().optional(),
  rawInput: z.any().optional(),
  output: z.any().optional(),
  errorText: z.string().optional(),
  preliminary: z.boolean().optional(),
  providerExecuted: z.boolean().optional(),
  title: z.string().optional(),
  approval: z
    .object({
      id: z.string(),
      approved: z.boolean().optional(),
      reason: z.string().optional(),
    })
    .optional(),
  callProviderMetadata: z.record(z.any()).optional(),
});

export const CopilotDataRunSchema = z.object({
  runId: z.string(),
  threadId: z.string().optional(),
});

export const CopilotDataMessageIdSchema = z.object({
  messageId: z.string(),
  provisionalId: z.string().optional(),
  runId: z.string().optional(),
});

export const CopilotDataPartSchemas = {
  run: CopilotDataRunSchema,
  "message-id": CopilotDataMessageIdSchema,
} as const;

export type CopilotDataTypes = {
  run: z.infer<typeof CopilotDataRunSchema>;
  "message-id": z.infer<typeof CopilotDataMessageIdSchema>;
};

export const CopilotDataPartSchema = z.union([
  z.object({
    type: z.literal("data-run"),
    id: z.string().optional(),
    data: CopilotDataRunSchema,
    transient: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("data-message-id"),
    id: z.string().optional(),
    data: CopilotDataMessageIdSchema,
    transient: z.boolean().optional(),
  }),
]);

export const CopilotStepStartSchema = z.object({
  type: z.literal("step-start"),
});

export const CopilotUIPartSchema = z.union([
  CopilotTextPartSchema,
  CopilotReasoningPartSchema,
  CopilotFilePartSchema,
  CopilotToolInvocationSchema,
  CopilotDataPartSchema,
  CopilotStepStartSchema,
]);

export const CopilotUIMessageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(["user", "assistant", "system", "tool"]),
  content: z.any().optional(),
  metadata: z.record(z.any()).optional(),
  parts: z.array(CopilotUIPartSchema).optional(),
});

export type CopilotUIMessage = z.infer<typeof CopilotUIMessageSchema>;

export const CopilotChatRequestSchema = z.object({
  id: z.string().optional(),
  threadId: z.string().optional(),
  message: CopilotUIMessageSchema.optional(),
  messages: z.array(CopilotUIMessageSchema).optional(),
  metadata: z.record(z.any()).optional(),
  requestData: z
    .object({
      tenantId: z.string().optional(),
      locale: z.string().optional(),
      activeModule: z.string().optional(),
      modelHint: z.string().optional(),
    })
    .optional(),
  trigger: z.enum(["submit-message", "regenerate-message", "resume-stream"]).optional(),
  messageId: z.string().optional(),
});

export type CopilotChatRequest = z.infer<typeof CopilotChatRequestSchema>;

export const CopilotToolApprovalResponseSchema = z.object({
  toolCallId: z.string(),
  approvalId: z.string(),
  approved: z.boolean(),
  reason: z.string().optional(),
});

export type CopilotToolApprovalResponse = z.infer<typeof CopilotToolApprovalResponseSchema>;
