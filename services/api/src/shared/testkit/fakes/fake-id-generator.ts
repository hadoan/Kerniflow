import { type IdGeneratorPort } from "../../ports/id-generator.port";

export class FakeIdGenerator implements IdGeneratorPort {
  private counter = 0;
  constructor(private readonly prefix: string = "id") {}

  newId(): string {
    this.counter += 1;
    return `${this.prefix}_${this.counter}`;
  }
}
