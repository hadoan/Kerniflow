import { type z } from "zod";
import { type CommandDefinition } from "./command";

export class CommandRegistry {
  private readonly definitions = new Map<string, CommandDefinition<unknown>>();

  register<TPayload>(definition: CommandDefinition<TPayload>): void {
    if (this.definitions.has(definition.type)) {
      throw new Error(`Command type already registered: ${definition.type}`);
    }
    this.definitions.set(definition.type, definition as CommandDefinition<unknown>);
  }

  get(type: string): CommandDefinition<unknown> | undefined {
    return this.definitions.get(type);
  }

  validate<TPayload>(type: string, payload: unknown): TPayload {
    const definition = this.definitions.get(type) as CommandDefinition<TPayload> | undefined;
    if (!definition) {
      throw new Error(`Unknown command type: ${type}`);
    }
    const parsed = (definition.schema as z.ZodType<TPayload>).parse(payload);
    return definition.normalize ? definition.normalize(parsed) : parsed;
  }

  list(): CommandDefinition<unknown>[] {
    return Array.from(this.definitions.values());
  }
}
