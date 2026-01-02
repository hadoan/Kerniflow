import { type MessageRepositoryPort } from "../ports/message-repository.port";

export class ListMessagesUseCase {
  constructor(private readonly messages: MessageRepositoryPort) {}

  async execute(params: { tenantId: string; runId: string }) {
    return this.messages.listByRun(params);
  }
}
