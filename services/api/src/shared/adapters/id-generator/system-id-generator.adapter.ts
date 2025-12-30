import { randomUUID } from "crypto";
import { type IdGeneratorPort } from "@corely/kernel";

export class SystemIdGeneratorAdapter implements IdGeneratorPort {
  newId(): string {
    return randomUUID();
  }
}
