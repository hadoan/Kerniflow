import type { TaskHandler } from "./task-handler.interface";

export class TaskHandlerRegistry {
  constructor(private readonly handlers: TaskHandler[]) {}

  getHandler(type: string) {
    return this.handlers.find((handler) => handler.canHandle(type)) ?? null;
  }
}
