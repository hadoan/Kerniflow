import { type CopilotUIMessage } from "../../domain/types/ui-message";
import { type CopilotTaskState } from "../../domain/types/chat-task-state";

export interface CopilotChatMetadata {
  workspaceId?: string;
  userId?: string;
  taskState?: CopilotTaskState;
}

export interface ChatStorePort {
  load(params: {
    chatId: string;
    tenantId: string;
  }): Promise<{ messages: CopilotUIMessage[]; metadata?: CopilotChatMetadata }>;
  save(params: {
    chatId: string;
    tenantId: string;
    messages: CopilotUIMessage[];
    metadata?: CopilotChatMetadata;
    traceId?: string;
  }): Promise<void>;
}

export const CHAT_STORE_PORT = "ai-copilot/chat-store";
