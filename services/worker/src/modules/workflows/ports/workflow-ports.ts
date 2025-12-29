import type { ClockPort } from "@kerniflow/kernel";
import type { EmailPort, HttpPort, LlmPort, ObjectStoragePort } from "@kerniflow/core";

export interface WorkflowPorts {
  clock: ClockPort;
  http: HttpPort;
  email: EmailPort;
  llm: LlmPort;
  objectStorage?: ObjectStoragePort;
}
