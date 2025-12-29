import type { TaskHandler, TaskHandlerResult, WorkflowTaskPayload } from "./task-handler.interface";
import type { WorkflowPorts } from "../ports/workflow-ports";

export class EmailTaskHandler implements TaskHandler {
  canHandle(type: string): boolean {
    return type === "EMAIL";
  }

  async execute(task: WorkflowTaskPayload, ports: WorkflowPorts): Promise<TaskHandlerResult> {
    const input = task.input ?? {};
    const result = await ports.email.send({
      to: (input.to as string | string[]) ?? "",
      subject: String(input.subject ?? ""),
      html: input.html as string | undefined,
      text: input.text as string | undefined,
      from: input.from as string | undefined,
      replyTo: input.replyTo as string | undefined,
    });

    return {
      status: "SUCCEEDED",
      output: { messageId: result.messageId },
    };
  }
}
