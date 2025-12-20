import { randomUUID } from "crypto";
import { IdGeneratorPort } from "@kerniflow/kernel";

export class SystemIdGeneratorAdapter implements IdGeneratorPort {
  newId(): string {
    return randomUUID();
  }
}
