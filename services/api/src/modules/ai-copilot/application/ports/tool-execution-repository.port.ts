import { type ToolExecution } from "../../domain/entities/tool-execution.entity";

export interface ToolExecutionRepositoryPort {
  create(execution: {
    id: string;
    tenantId: string;
    runId: string;
    toolCallId: string;
    toolName: string;
    inputJson: string;
    status: string;
    traceId?: string;
  }): Promise<ToolExecution>;

  complete(
    tenantId: string,
    runId: string,
    toolCallId: string,
    data: { status: string; outputJson?: string; errorJson?: string }
  ): Promise<void>;
}
