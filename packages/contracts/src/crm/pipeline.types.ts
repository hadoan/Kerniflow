import { z } from "zod";

export const PipelineStageSchema = z.object({
  id: z.string(),
  name: z.string(),
  orderIndex: z.number().int(),
  isClosedStage: z.boolean(),
});

export type PipelineStage = z.infer<typeof PipelineStageSchema>;

export const PipelineConfigSchema = z.object({
  stages: z.array(PipelineStageSchema),
});

export type PipelineConfig = z.infer<typeof PipelineConfigSchema>;

// Default pipeline stages for new tenants
export const DEFAULT_PIPELINE_STAGES: PipelineStage[] = [
  { id: "lead", name: "Lead", orderIndex: 0, isClosedStage: false },
  { id: "qualified", name: "Qualified", orderIndex: 1, isClosedStage: false },
  { id: "proposal", name: "Proposal", orderIndex: 2, isClosedStage: false },
  { id: "negotiation", name: "Negotiation", orderIndex: 3, isClosedStage: false },
  { id: "won", name: "Won", orderIndex: 4, isClosedStage: true },
  { id: "lost", name: "Lost", orderIndex: 5, isClosedStage: true },
];
