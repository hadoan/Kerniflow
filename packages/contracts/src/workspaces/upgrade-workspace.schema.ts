import { z } from "zod";
import { WorkspaceDtoSchema } from "./workspace.types";

export const UpgradeWorkspaceInputSchema = z.object({
  idempotencyKey: z.string().optional(),
});

export const UpgradeWorkspaceOutputSchema = z.object({
  workspace: WorkspaceDtoSchema,
});

export type UpgradeWorkspaceInput = z.infer<typeof UpgradeWorkspaceInputSchema>;
export type UpgradeWorkspaceOutput = z.infer<typeof UpgradeWorkspaceOutputSchema>;
