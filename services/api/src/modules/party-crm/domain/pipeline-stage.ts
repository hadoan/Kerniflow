export type PipelineStage = {
  id: string;
  name: string;
  orderIndex: number;
  isClosedStage: boolean;
};

export const DEFAULT_PIPELINE_STAGES: PipelineStage[] = [
  { id: "lead", name: "Lead", orderIndex: 0, isClosedStage: false },
  { id: "qualified", name: "Qualified", orderIndex: 1, isClosedStage: false },
  { id: "proposal", name: "Proposal", orderIndex: 2, isClosedStage: false },
  { id: "negotiation", name: "Negotiation", orderIndex: 3, isClosedStage: false },
  { id: "won", name: "Won", orderIndex: 4, isClosedStage: true },
  { id: "lost", name: "Lost", orderIndex: 5, isClosedStage: true },
];

export function validateStageId(stageId: string, stages: PipelineStage[]): boolean {
  return stages.some((stage) => stage.id === stageId);
}

export function isClosedStage(stageId: string, stages: PipelineStage[]): boolean {
  const stage = stages.find((s) => s.id === stageId);
  return stage?.isClosedStage ?? false;
}

export function getStageByOrder(orderIndex: number, stages: PipelineStage[]): PipelineStage | null {
  return stages.find((s) => s.orderIndex === orderIndex) ?? null;
}
