import { randomUUID } from "crypto";
import { IdGeneratorPort } from "@kerniflow/kernel";

export class SystemIdGenerator implements IdGeneratorPort {
  newId(): string {
    return randomUUID();
  }
}
