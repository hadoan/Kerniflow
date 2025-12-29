import { type OutboxCommand } from "../outbox/outboxTypes";

export type SerializedCommand = Omit<OutboxCommand, "createdAt" | "nextAttemptAt"> & {
  createdAt: string;
  nextAttemptAt?: string | null | undefined;
};

export function serializeCommand(command: OutboxCommand): SerializedCommand {
  return {
    ...command,
    createdAt: command.createdAt.toISOString(),
    nextAttemptAt: command.nextAttemptAt ? command.nextAttemptAt.toISOString() : null,
  };
}

export function deserializeCommand(serialized: SerializedCommand): OutboxCommand {
  return {
    ...serialized,
    createdAt: new Date(serialized.createdAt),
    nextAttemptAt: serialized.nextAttemptAt ? new Date(serialized.nextAttemptAt) : null,
  };
}
