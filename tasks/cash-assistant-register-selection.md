# Cash Assistant register binding and one-time selection

## Status

Proposed implementation task.

## Summary

Prevent the Cash Assistant from asking users to enter the internal cash-register ID
(`registerId`, “Mã quỹ”, or “Kassen-ID”) through `collect_inputs`.

For a new Cash Assistant conversation:

- If the workspace has exactly one cash register, bind it silently to the conversation.
- If the workspace has multiple cash registers, show a one-time UI selector with register name
  and location, then bind the selected register to the conversation.
- In both cases, show the bound register name at the beginning of the chat.
- Do not implement a zero-register onboarding flow in this task.

The selected register is trusted application context. It must not be generated, collected, or
changed by the language model.

## Goals

- Never render `registerId` as a user-entered `collect_inputs` field.
- Automatically select the sole cash register.
- Require an explicit UI selection when multiple registers exist.
- Persist the selected register at conversation level.
- Reuse the persisted selection for every register-scoped cash tool call.
- Preserve the selection after reload and when reopening a conversation.
- Clearly show the bound register name when the chat opens, including for silent auto-binding.
- Identify registers to users by name and optional location, never by UUID.
- Keep existing daily and monthly cash-assistant workspace behavior working.

## Non-goals

- Building onboarding when no cash register exists.
- Introducing a default-register setting.
- Automatically choosing the newest or first item when multiple registers exist.
- Allowing the model to switch registers in an existing conversation.
- Changing POS register or POS cash-drawer selection.
- Redesigning daily/monthly workspace navigation beyond what is required for register binding.

## Current behavior and problems

### Tool-side fallback

`resolveRegister` in
`services/api/src/modules/cash-management/adapters/tools/cash-management.tools.ts` currently:

1. Attempts to use `workspaceCtx.registerId`.
2. Attempts to use the model-provided `inputRegisterId`.
3. Lists all cash registers.
4. Returns the sole register when exactly one exists.
5. Returns a validation error when multiple registers exist.

This is a good fallback policy, but the register stored in `workspaceCtx` is not currently passed
to `resolveRegister` by its call sites.

### Model-visible internal field

Most register-scoped cash tools expose an optional `registerId` in their input schema. Even though
it is optional, the model can interpret it as a missing business field and generate a
`collect_inputs` question such as “Mã quỹ hợp lệ”.

Prompt instructions alone do not create a reliable trust boundary.

### Multiple registers are supported

Cash Management allows multiple registers. `listRegisters` orders them by `createdAt desc`, so
`registers[0]` means the newest register, not a business-approved default. The assistant must not
silently choose this item when more than one register exists.

### Conversation workspace support is incomplete

`CashAssistantWorkspace` can persist a `registerId` for a conversation, and
`POST /cash-management/workspaces/resolve` already creates cash-specific conversations. However:

- The web client only exposes `listWorkspaces`; it does not call the resolve endpoint.
- The tool wrapper loads workspace context but drops it before register resolution.
- The endpoint and web client use unshared/local schemas and `any`.
- A general Cash Assistant conversation needs to carry register context without being blocked
  from daily/monthly tools merely because its initial type is `GENERAL_HELP`.
- `locationId` must not be populated from `CashRegister.location`; the latter is display text, not
  an internal location ID.

## Product behavior

### New conversation state machine

Use the following state for the Cash Assistant surface:

```text
loading-registers
  -> one register -> binding-register -> ready
  -> multiple registers -> needs-register-selection -> binding-register -> ready
  -> zero registers -> preserve current behavior (out of scope)
  -> request failure -> register-context-error
```

The composer and cash-assistant action buttons must remain disabled while register context is
loading, waiting for selection, or being bound.

### Exactly one register

When opening a new Cash Assistant conversation:

1. Load cash registers for the current tenant/workspace.
2. If exactly one exists, resolve a Cash Assistant workspace with that register.
3. Navigate to the returned `conversationId`.
4. Show the register name and optional location at the beginning of the chat.
5. Enable the composer.
6. Do not show a selector, confirmation dialog, toast, or `collect_inputs` field.

This is a silent application-level binding, not a value guessed by the model.

“Silent” only means that the user is not asked to choose or confirm. The active register must still
be visible, for example:

```text
Cash register
Front Desk · Berlin
```

Render this as application context UI above the conversation or in its context header. Do not add
it as a synthetic assistant message to the persisted chat history.

### Multiple registers

When more than one register exists:

1. Show a blocking selector before enabling the composer.
2. Render each option with:
   - Register name.
   - Location when present.
   - Currency only when useful for distinguishing otherwise identical options.
3. Keep the internal ID out of visible copy.
4. After selection, resolve the conversation workspace and navigate to its `conversationId`.
5. Do not ask again in the same conversation.

Suggested option layout:

```text
Front Desk
Berlin

Back Office
Hamburg
```

The selector should be a normal application UI control, not a `collect_inputs` tool result.

### Existing conversations

- If the conversation already has a `CashAssistantWorkspace.registerId`, restore it without
  showing the selector.
- If a legacy conversation has no cash workspace:
  - Bind automatically when exactly one register exists.
  - Show the selector when multiple registers exist.
  - Bind to the existing `conversationId` rather than silently moving the user to a different
    conversation.
- If the bound register no longer exists, return a visible recoverable error. Do not silently
  choose another register.

### Switching registers

Register binding is immutable after it has been established for a conversation.

To work with another register, the user starts a new Cash Assistant conversation. A future task
may add an explicit “New chat for another register” action.

## Backend implementation

### 1. Add shared contracts

Add typed schemas under `packages/contracts/src/copilot` or
`packages/contracts/src/cash-management`:

```ts
CashAssistantWorkspaceSchema;
ResolveCashAssistantWorkspaceInputSchema;
ResolveCashAssistantWorkspaceOutputSchema;
```

The resolve input should support:

```ts
{
  type: "GENERAL_HELP" | "DAILY_CASH_DAY" | "MONTHLY_REVIEW";
  conversationId?: string;
  registerId?: string;
  businessDate?: string;
  businessMonth?: string;
  locationId?: string;
}
```

Rules:

- `registerId` is required for a register-bound `GENERAL_HELP`, `DAILY_CASH_DAY`, or
  `MONTHLY_REVIEW` workspace created by the UI.
- `conversationId` is optional:
  - Missing: create an `AgentRun` and the cash workspace together.
  - Present: validate and bind the existing conversation.
- Keep existing date/month requirements for specialized daily/monthly workspaces.
- Do not require `locationId` for general register binding.
- Do not treat `CashRegister.location` as `locationId`.

Replace controller-local Zod schemas and web-client `any` results with these contracts.

### 2. Make workspace resolution idempotent

Extend `ResolveCashWorkspaceUseCase` to support binding an existing conversation.

Validation:

- The conversation must belong to the authenticated tenant.
- The acting user must be allowed to access the conversation.
- The register must belong to the current tenant and workspace.
- If a workspace already exists with the same register, return it.
- If a workspace already exists with a different register, return `CONFLICT`.
- Never overwrite an established register binding.

Creation must remain transactional:

- For a new conversation, create `AgentRun` and `CashAssistantWorkspace` in one transaction.
- For an existing conversation, create only the missing `CashAssistantWorkspace`.
- Handle concurrent duplicate resolution idempotently.

Avoid adding a second persistence table; `CashAssistantWorkspace` is already the conversation-level
cash context.

### 3. Allow register-bound general conversations to use cash tools

`GENERAL_HELP` currently represents an unclassified/general conversation. A register-bound general
conversation must be able to call cash tools until a future workflow specializes it.

Adjust `withWorkspaceContext` so:

- `DAILY_CASH_DAY` and `MONTHLY_REVIEW` continue enforcing their allowed-tool restrictions.
- `GENERAL_HELP` does not reject a cash tool solely based on `allowedTypes`.
- The persisted `registerId` is still passed to every tool.

Document this behavior in the helper to prevent a later refactor from reintroducing the block.

### 4. Fix trusted register resolution

Refactor the repeated tool context construction so `workspaceCtx` cannot be accidentally omitted.
For example:

```ts
const toCashToolCtx = (params: {
  tenantId: string;
  workspaceId?: string;
  userId: string;
  toolCallId?: string;
  runId?: string;
  workspaceCtx: CashAssistantExecutionContext | null;
}): ToolCtx => params;
```

Every `resolveRegister` call must receive the loaded `workspaceCtx`.

Resolution order:

1. Persisted conversation register.
2. Sole-register fallback for legacy/unbound conversations.
3. `REGISTER_SELECTION_REQUIRED` when multiple registers exist.
4. `NOT_FOUND` when none exist.

Do not accept a model-provided register override. If compatibility requires temporarily accepting
one, reject it when it differs from the persisted conversation register.

The multiple-register failure should contain machine-readable options for recovery:

```ts
{
  ok: false,
  code: "REGISTER_SELECTION_REQUIRED",
  message: "Select a cash register before continuing.",
  details: {
    availableRegisters: [
      { id: "...", name: "Front Desk", location: "Berlin" }
    ]
  }
}
```

The ID is allowed in the machine-readable response but must not be printed to the user.

### 5. Remove `registerId` from model-visible cash tool schemas

For register-scoped tools:

- Remove `registerId` from the schema sent to the model.
- Resolve it in the server adapter from conversation context.
- Inject the resolved ID only when invoking the application use case.

This includes, at minimum:

- `prepare_cash_day_confirmation`
- `list_cash_entries`
- `get_today_cash_status`
- `confirm_cash_day_draft`
- `close_cash_day`
- `list_unclosed_cash_days`
- `find_missing_cash_receipts`
- `generate_monthly_cash_export`
- dashboard/report/action-required tools
- workflow-help and preview tools that are register-scoped

Entry-ID-scoped tools such as updating an existing entry should continue deriving the register from
the fetched entry.

Application-layer commands may continue requiring `registerId`; only the model-facing tool schema
must omit it.

### 6. Update the cash system prompt

Keep register IDs in the “never fabricate” rule.

Use wording equivalent to:

```text
Never fabricate or ask the user to type internal cash-register IDs.
Never add registerId, Mã quỹ, or Kassen-ID to collect_inputs.
Omit registerId from cash tool arguments; the application supplies it from trusted conversation
context. If a tool reports REGISTER_SELECTION_REQUIRED, tell the client that register selection is
needed and refer to registers by name/location, never by internal ID.
```

The prompt is defense in depth. Correctness must come from UI binding and server-side schemas.

## Frontend implementation

### 1. Add typed Cash Assistant workspace API methods

In `packages/web-shared/src/lib/cash-management-api.ts`, add:

```ts
resolveWorkspace(input: ResolveCashAssistantWorkspaceInput):
  Promise<ResolveCashAssistantWorkspaceOutput>
```

Parse input/output with shared contract schemas.

Replace the current `listWorkspaces(): Promise<{ items: any[] }>` return type with a typed result.

### 2. Add a register-selection component

Create a dedicated component, for example:

```text
packages/web-features/src/modules/cash-management/components/
  cash-assistant-register-selector.tsx
```

Responsibilities:

- Receive typed `CashRegister[]`.
- Render name and optional location.
- Return the selected register object or ID to the parent.
- Disable repeated submission while binding.
- Provide accessible labels and keyboard navigation.
- Use localized copy.

Do not put register UUIDs in labels, descriptions, test snapshots, or analytics display values.

Suggested test IDs may use list indexes or opaque IDs internally, but user-facing text must not.

### 3. Orchestrate register context in `AssistantPage`

Only activate this flow when `activeModule === "cash-management"`.

For a new conversation:

- Query `cashManagementApi.listRegisters()`.
- Exactly one: call `resolveWorkspace({ type: "GENERAL_HELP", registerId })`.
- Multiple: render the selector and call the same API after selection.
- Navigate to `/assistant/t/:conversationId`.
- Invalidate thread and cash-workspace queries.

For an existing conversation:

- Load its typed cash workspace.
- If bound, render Chat immediately.
- If unbound, run the legacy-conversation binding flow with `conversationId`.

The generic Assistant module must continue using `createCopilotThread`.

The Cash Assistant “New chat” buttons should start the register-binding flow instead of calling
`createCopilotThread` directly.

### 4. Prevent messages before binding

Do not mount an enabled `Chat` composer until register resolution succeeds.

While binding:

- Show a compact loading state.
- Prevent suggestion/action clicks from sending prompts.
- Avoid creating a second run through Chat’s automatic run-ID resolution.

After resolution, pass the returned `conversationId` as the controlled `runId`.

### 5. Show the bound register at the beginning of the conversation

As soon as binding succeeds, the top of the chat should show:

```text
Cash register: Front Desk · Berlin
```

This is required for both silently auto-bound and manually selected registers. It should remain
visible in the conversation context header after messages are added. It must not show a generic
“Register” label without identifying which register is active.

The context display is informational only:

- Do not require acknowledgment.
- Do not render it as an assistant message.
- Do not trigger `collect_inputs`.
- Do not expose the internal register ID.

Either:

- Include `register: { id, name, location }` in the workspace response, or
- Resolve it from the already-loaded register list.

Prefer returning a typed lightweight register summary from the workspace API so reloads do not
depend on positional list matching.

### 6. Localization

Add copy for English, German, and Vietnamese:

- “Choose a cash register”
- “This conversation will use the selected register.”
- “Selecting register…”
- “Could not set the cash register.”
- Optional retry action

Vietnamese UI should use a natural display term such as “Chọn quỹ/két tiền mặt”; it must not ask
for “Mã quỹ hợp lệ”.

## Test plan

### Backend unit tests

Add tests to `cash-management.tools.test.ts`:

- A register-scoped tool called without `registerId` resolves the sole register.
- Multiple registers without workspace context return `REGISTER_SELECTION_REQUIRED`.
- A persisted workspace register is used even when multiple registers exist.
- `getRegister` is called with the workspace register.
- `listRegisters` is not called when a workspace register is available.
- A conflicting legacy/model register input cannot override workspace context.
- A missing/deleted bound register returns a recoverable error and does not fall back.
- `GENERAL_HELP` with a bound register can invoke daily/monthly-capable cash tools.

Add use-case/controller tests:

- Resolve creates a new conversation and binding atomically.
- Resolve binds an existing authorized conversation.
- Repeating the same request is idempotent.
- Rebinding to another register returns `CONFLICT`.
- Cross-tenant conversation/register IDs are rejected.
- General binding does not require `locationId`.

### Tool schema tests

Inspect every model-visible cash tool JSON schema and assert that it does not expose
`properties.registerId`.

This is the primary regression test preventing `collect_inputs` from asking for “Mã quỹ”.

### Frontend component tests

- One register triggers silent resolution and never renders the selector.
- One register shows its name at the beginning of the chat after silent resolution.
- Multiple registers render name/location options.
- Selecting an option calls resolve once and navigates to the returned conversation.
- A manually selected register name appears at the beginning of the chat.
- Existing bound conversation does not show the selector.
- Legacy unbound conversation is bound in place.
- Composer is disabled/unmounted until binding completes.
- Failed binding shows retry and does not enable Chat.
- New Cash Assistant chat repeats selection only when multiple registers exist.
- Generic Assistant new-chat behavior is unchanged.

### End-to-end scenarios

1. Workspace with one register:
   - Open Cash Assistant.
   - Send a close-day prompt.
   - Verify no “Mã quỹ” field appears.
   - Verify the tool uses the sole register.

2. Workspace with two registers:
   - Open Cash Assistant.
   - Verify selector appears once.
   - Select by name/location.
   - Send two register-scoped requests.
   - Verify both use the selected register and the selector does not reappear.

3. Reload selected conversation:
   - Verify the selected register is restored in the header.
   - Verify no selector or register input appears.

## Acceptance criteria

- [ ] With exactly one register, Cash Assistant opens with that register silently bound.
- [ ] With multiple registers, the user selects once through application UI.
- [ ] The bound register name and optional location are shown at the beginning of every chat.
- [ ] No cash tool schema exposed to the model contains `registerId`.
- [ ] `collect_inputs` never renders `registerId`, “Mã quỹ”, or “Kassen-ID”.
- [ ] Register IDs are never displayed or requested in user-facing copy.
- [ ] Every register-scoped cash tool uses the conversation-bound register.
- [ ] A model/tool argument cannot override the bound register.
- [ ] Reopening or reloading a conversation restores its register.
- [ ] Switching registers requires a new conversation.
- [ ] No zero-register onboarding is added.
- [ ] Cash tool unit tests, API tests, frontend tests, prompt checks, typecheck, and build pass.

## Suggested implementation order

1. Add shared workspace contracts.
2. Make workspace resolution support new and existing conversations.
3. Fix `workspaceCtx` propagation and general-workspace tool gating.
4. Remove `registerId` from model-visible cash tool schemas.
5. Add typed web API methods.
6. Implement the selector and AssistantPage state machine.
7. Update header copy and localization.
8. Update the cash prompt.
9. Add unit, component, schema, and end-to-end tests.

## Rollout notes

- Deploy backend compatibility first or together with the frontend.
- Keep the sole-register fallback for legacy conversations.
- Add structured logging for:
  - `cash_register_auto_bound`
  - `cash_register_selection_required`
  - `cash_register_selected`
  - `cash_register_binding_conflict`
- Do not log user-facing register names if existing privacy policy treats them as business-sensitive;
  the internal register ID may be logged only under existing structured-log redaction rules.
