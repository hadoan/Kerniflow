import { type IdGeneratorPort } from "@shared/ports/id-generator.port";

export class FakeIdGenerator implements IdGeneratorPort {
  private counter = 0;
  newId(): string {
    this.counter += 1;
    return `id-${this.counter}`;
  }
}
