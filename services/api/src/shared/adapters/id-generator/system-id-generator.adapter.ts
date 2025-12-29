import { randomUUID } from "crypto";
import { type IdGeneratorPort } from "@kerniflow/kernel";

export class SystemIdGeneratorAdapter implements IdGeneratorPort {
  newId(): string {
    return randomUUID();
  }
}
