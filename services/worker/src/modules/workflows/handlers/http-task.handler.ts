import type { TaskHandler, TaskHandlerResult, WorkflowTaskPayload } from "./task-handler.interface";
import type { WorkflowPorts } from "../ports/workflow-ports";

export class HttpTaskHandler implements TaskHandler {
  canHandle(type: string): boolean {
    return type === "HTTP";
  }

  async execute(task: WorkflowTaskPayload, ports: WorkflowPorts): Promise<TaskHandlerResult> {
    const input = task.input ?? {};
    const result = await ports.http.request({
      method: String(input.method ?? "GET"),
      url: String(input.url ?? ""),
      headers: (input.headers as Record<string, string>) ?? undefined,
      body: input.body,
      timeoutMs: typeof input.timeoutMs === "number" ? input.timeoutMs : undefined,
    });

    return {
      status: result.status >= 200 && result.status < 400 ? "SUCCEEDED" : "FAILED",
      output: {
        status: result.status,
        body: result.body,
      },
      error:
        result.status >= 200 && result.status < 400
          ? undefined
          : { status: result.status, body: result.body },
    };
  }
}
