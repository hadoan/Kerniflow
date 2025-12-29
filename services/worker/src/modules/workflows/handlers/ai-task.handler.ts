import type { TaskHandler, TaskHandlerResult, WorkflowTaskPayload } from "./task-handler.interface";
import type { WorkflowPorts } from "../ports/workflow-ports";

interface AiTaskPolicy {
  allowedEvents?: string[];
  allowDirectEmit?: boolean;
}

export class AiTaskHandler implements TaskHandler {
  canHandle(type: string): boolean {
    return type === "AI";
  }

  async execute(task: WorkflowTaskPayload, ports: WorkflowPorts): Promise<TaskHandlerResult> {
    const input = task.input ?? {};
    const policy = (input.policy as AiTaskPolicy) ?? {};
    const allowedEvents = policy.allowedEvents ?? [];

    const response = await ports.llm.complete({
      prompt: String(input.prompt ?? ""),
      model: input.model as string | undefined,
      temperature: typeof input.temperature === "number" ? input.temperature : undefined,
      metadata: {
        tenantId: task.tenantId,
        instanceId: task.instanceId,
        taskId: task.id,
      },
    });

    const decisionEvent = response.decisionEvent;
    const canEmit =
      policy.allowDirectEmit === true && !!decisionEvent && allowedEvents.includes(decisionEvent);

    return {
      status: "SUCCEEDED",
      output: {
        prompt: input.prompt ?? null,
        response: response.output,
        decisionEvent: decisionEvent ?? null,
        policy: {
          allowedEvents,
          allowDirectEmit: policy.allowDirectEmit ?? false,
        },
      },
      emittedEvent: canEmit ? decisionEvent : undefined,
      suggestedEvent: !canEmit && decisionEvent ? decisionEvent : undefined,
    };
  }
}
