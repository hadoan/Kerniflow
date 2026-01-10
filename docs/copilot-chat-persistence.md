# Copilot Chat Persistence Flow

## Current Flow (Before Refactor)

- Client sends full `messages[]` for some continuations (approvals/tool results) and only the latest message for others.
- Server trusts the client payload as the full context and passes it to the model.
- Tool results can lose the original user intent if the client sends only the latest message.

## New Flow (Server-Authoritative)

- Client sends only `{ id: chatId, message: latest UIMessage }` for every continuation.
- Server loads canonical `UIMessage[]` history from the chat store by `chatId`.
- Server appends the latest message, validates it, converts to model messages, and streams the response.
- Server persists the updated messages and task state on completion.

## Context Handling

- System prompt is resolved server-side via the prompt registry.
- Task state (e.g., `collect_inputs`) is tracked and added as a system summary message for continuity.
- Server decides how much history to include via the context builder (not the client).
