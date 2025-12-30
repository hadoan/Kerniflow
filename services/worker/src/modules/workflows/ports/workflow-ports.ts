import type { ClockPort } from "@corely/kernel";
import type { EmailPort, HttpPort, LlmPort, ObjectStoragePort } from "@corely/core";

export interface WorkflowPorts {
  clock: ClockPort;
  http: HttpPort;
  email: EmailPort;
  llm: LlmPort;
  objectStorage?: ObjectStoragePort;
}
