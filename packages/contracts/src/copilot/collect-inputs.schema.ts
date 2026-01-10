import { z } from "zod";

export const CollectInputFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z
    .enum(["text", "number", "select", "textarea", "date", "datetime", "boolean"])
    .describe(
      "Field type. Use date for YYYY-MM-DD, datetime for date+time, boolean for yes/no, " +
        "select for fixed choices, textarea for long text, number for numeric input, " +
        "text for short freeform."
    ),
  required: z.boolean().default(false),
  placeholder: z
    .string()
    .optional()
    .describe("Optional hint text. For dates use YYYY-MM-DD; for datetimes use YYYY-MM-DDTHH:mm."),
  helpText: z.string().optional(),
  patternLabel: z.string().optional(),
  defaultValue: z.any().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().positive().optional(),
  minLength: z.number().int().optional(),
  maxLength: z.number().int().optional(),
  pattern: z
    .string()
    .optional()
    .describe("Regex for text/textarea only. Do not use for date/datetime fields."),
  options: z
    .array(
      z.object({
        value: z.any(),
        label: z.string(),
        disabled: z.boolean().optional(),
        group: z.string().optional(),
      })
    )
    .optional(),
  optionsSource: z
    .object({
      kind: z.string(),
      searchQuery: z.string().optional(),
      params: z.record(z.string(), z.any()).optional(),
      debounceMs: z.number().int().positive().optional(),
    })
    .optional(),
  unit: z.string().optional(),
  suffix: z.string().optional(),
});

export type CollectInputField = z.infer<typeof CollectInputFieldSchema>;

export const CollectInputsToolInputSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  fields: z.array(CollectInputFieldSchema),
  submitLabel: z.string().optional(),
  cancelLabel: z.string().optional(),
  allowCancel: z.boolean().default(true),
  context: z.record(z.string(), z.any()).optional(),
});

export type CollectInputsToolInput = z.infer<typeof CollectInputsToolInputSchema>;

export const CollectInputsToolOutputSchema = z.object({
  values: z.record(z.string(), z.any()),
  meta: z
    .object({
      filledAt: z.string().optional(),
      cancelled: z.boolean().optional(),
      editedKeys: z.array(z.string()).optional(),
    })
    .optional(),
});

export type CollectInputsToolOutput = z.infer<typeof CollectInputsToolOutputSchema>;
