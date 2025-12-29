import { type IdGeneratorPort } from "../ports/id-generator.port";

export class FakeIdGenerator implements IdGeneratorPort {
  private index = 0;

  constructor(private readonly ids: string[]) {}

  newId(): string {
    if (this.index >= this.ids.length) {
      throw new Error("No more fake ids available");
    }

    const id = this.ids[this.index];
    this.index += 1;
    return id;
  }
}
