# Corely — Domain Event Catalog

This catalog lists outbox events that are treated as public API.

## Identity

- `identity.user.created`
  - Producer: `services/api` identity module
  - Consumers: none yet (candidate for CRM onboarding)
  - Payload: `services/api/src/modules/identity/domain/events/identity.events.ts`
- `identity.tenant.created`
  - Producer: identity module
  - Consumers: none yet
  - Payload: `services/api/src/modules/identity/domain/events/identity.events.ts`
- `identity.membership.created`
  - Producer: identity module
  - Consumers: none yet
  - Payload: `services/api/src/modules/identity/domain/events/identity.events.ts`
- `identity.user.logged_in`
  - Producer: identity module
  - Consumers: none yet
  - Payload: `services/api/src/modules/identity/domain/events/identity.events.ts`
- `identity.user.logged_out`
  - Producer: identity module
  - Consumers: none yet
  - Payload: `services/api/src/modules/identity/domain/events/identity.events.ts`
- `identity.tenant.switched`
  - Producer: identity module
  - Consumers: none yet
  - Payload: `services/api/src/modules/identity/domain/events/identity.events.ts`

## Expenses

- `expense.created`
  - Producer: expenses module
  - Consumers: none yet (candidate for reporting/automation)
  - Payload: `services/api/src/modules/expenses/application/use-cases/create-expense.usecase.ts`

## Documents

- `invoice.pdf.render.requested`
  - Producer: documents module
  - Consumers: `services/api` documents worker
  - Payload: `services/api/src/modules/documents/application/use-cases/request-invoice-pdf/request-invoice-pdf.usecase.ts`

## Invoices

- `invoice.email.requested`
  - Producer: invoices module
  - Consumers: `services/worker` invoice email handler
  - Payload: `services/api/src/modules/invoices/application/use-cases/send-invoice/send-invoice.usecase.ts`

## Privacy

- `privacy.requested`
  - Producer: privacy module
  - Consumers: `services/api` privacy worker
  - Payload: `services/api/src/modules/privacy/application/use-cases/request-personal-data-export/request-personal-data-export.usecase.ts`

## AI Copilot

- `copilot.tool.completed`
  - Producer: ai-copilot module
  - Consumers: none yet (telemetry/integrations)
  - Payload: `services/api/src/modules/ai-copilot/infrastructure/tools/tools.factory.ts`
