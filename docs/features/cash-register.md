# Cash Register (Cash Management)

The **Cash Register** is the central entity in the Corely Cash Management module (`apps/cash-management`). It models a physical or logical till (e.g., "Front Desk Register", "Safe") used to record and reconcile cash movements in strict compliance with accounting standards (e.g., GoBD and KassenSichV in Germany).

## Core Concepts

### 1. Cash Register
A register represents a continuous ledger of cash movements.
- **Scoped by**: `tenantId` and `workspaceId`.
- **Properties**: Name, location, currency (defaults to `EUR`), and `currentBalanceCents`.
- **Constraints**: Registers can enforce `disallowNegativeBalance` to prevent erroneous payouts that exceed the available physical cash.

### 2. Cash Entries
All cash movements are recorded as strictly sequential, immutable **Cash Entries**.
- **Direction**: `IN` (income, deposits) or `OUT` (expenses, withdrawals).
- **Types**: 
  - Business: `SALE_CASH`, `REFUND_CASH`, `EXPENSE_CASH`
  - Internal: `OWNER_DEPOSIT`, `OWNER_WITHDRAWAL`, `BANK_DEPOSIT`, `BANK_WITHDRAWAL`
  - Operations: `OPENING_FLOAT`, `CLOSING_ADJUSTMENT`, `CORRECTION`
- **Taxation**: Entries capture gross, net, and tax amounts, alongside the tax rate and tax code (e.g., `INPUT_VAT`, `OUTPUT_VAT`).
- **Attachments (Belege)**: Entries (especially expenses) can be linked to uploaded documents or receipts to ensure the accounting principle of "no booking without a receipt" (Keine Buchung ohne Beleg).

### 3. Corrections and Immutability
To maintain strict auditability, cash entries are **immutable**.
- Mistakes cannot be silently deleted or edited.
- Instead, an incorrect entry must be **reversed**, which generates an explicit reversal entry and links it back to the original (`reversalOfEntryId` / `reversedByEntryId`).
- After a day is closed, only explicit `CORRECTION` type entries are permitted for that day.

### 4. Day Close (Kassensturz)
The **Day Close** process represents the physical counting of cash at the end of a business day (or shift).
- Records the `expectedBalance` (calculated from entries) against the `countedBalance` (physical cash).
- Allows entering a detailed breakdown of denominations (`denominationCounts` - e.g., 5 x €50, 10 x €10).
- Explicitly calculates and records any `difference` between expected and actual cash.
- Once submitted, the day's status transitions to `SUBMITTED`, and the day is **locked**. Regular entries can no longer be backdated to a locked day without performing an explicit post-close correction.

### 5. Cashbook Exports
At the end of a month (or any accounting period), a register's activity must be exported for accounting and audit purposes.
- **Formats supported**: `CSV`, `PDF`, `DATEV` (accounting standard format), and `AUDIT_PACK`.
- **Audit Pack**: A comprehensive ZIP archive containing a manifest, the full cashbook CSV, day closes, audit logs, and all linked attachment files.

## Technical Architecture

- **Domain Schema**: All data contracts and validations are located in `packages/contracts/src/cash-management/schema.ts`.
- **Application Surface**: The dedicated Vite + React frontend at `apps/cash-management` provides specialized screens (Registers, Day Close, Dashboard) for operational users.
- **AI Integration**: The module includes an embedded **Cash Assistant** (`CashAssistantWorkspace`) that helps users perform daily day-close reviews, monthly reviews, and answers general operational queries regarding their cashbooks.
