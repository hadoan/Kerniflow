# Implement Cash Locations and Internal Transfers in Corely Cash

## Objective

Extend the existing Cash Management module so that one logical `CashRegister` can contain multiple physical cash locations, such as:

* Cash drawer
* Business safe
* Cash bag
* Other storage location

A transfer between locations must change the physical distribution of cash without changing:

* the register’s total balance
* revenue
* expenses
* owner deposits or withdrawals
* bank balances
* VAT
* the Kassenbericht result

The primary business model must become:

```text
CashRegister: Main Cash Fund
├── CashLocation: Cash Drawer
└── CashLocation: Business Safe
```

Do not model a cash drawer and business safe as two separate registers by default.

A second `CashRegister` is appropriate only when it represents an independently operated and reconciled till with its own opening balance, entries, physical count, Z-Bon or shift, and daily close.

---

# Architectural Constraints

Follow the Corely architecture defined in `architect.md`.

## Module boundaries

Implement this inside the existing Cash Management bounded context.

Follow the existing module structure:

```text
domain
application
  ports
  use-cases
infrastructure
  prisma
  repositories
adapters
  http
  tools
testkit
```

Rules:

1. Domain logic must not import NestJS, Prisma, React, or infrastructure code.
2. Only repository adapters may access Prisma.
3. Use cases depend on repository ports.
4. All writes must use the existing Unit of Work.
5. All write endpoints must support idempotency.
6. All confirmed mutations must produce immutable audit records.
7. Publish stable domain events through the existing outbox.
8. Use RFC 7807 Problem Details and stable Cash Management error codes.
9. Shared request/response schemas must live in:

```text
packages/contracts/src/cash-management/schema.ts
```

10. The frontend must consume contracts and API clients, never backend internals.
11. AI tools may propose actions but must not perform mutations before explicit user confirmation.
12. Preserve tenant and workspace isolation on every table, query, unique constraint, and index.

Inspect the repository first and reuse existing naming, ports, transaction patterns, audit adapters, idempotency infrastructure, controller conventions, tool-card patterns, and test utilities.

Do not create parallel infrastructure when an existing Corely primitive already exists.

---

# Domain Decision

Keep the existing `CashRegister` entity as the logical accounting cash fund.

Do not rename the database table or public API in this implementation unless the existing code makes the rename trivial and fully backward compatible.

Update its domain description:

> A Cash Register is a logical, continuously reconciled cash fund. Physical cash may be distributed across one or more Cash Locations.

The existing:

```ts
CashRegister.currentBalanceCents
```

continues to represent the total cash owned by that register across all active cash locations.

Add `CashLocation` to represent physical custody.

---

# Domain Model

## 1. CashLocation

Add a domain entity and Prisma model similar to:

```ts
type CashLocationType =
  | "DRAWER"
  | "SAFE"
  | "CASH_BAG"
  | "OTHER";

type CashLocation = {
  id: string;
  tenantId: string;
  workspaceId: string;
  registerId: string;

  name: string;
  type: CashLocationType;

  currentBalanceCents: number;

  isDefault: boolean;
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
};
```

Required invariants:

* A location belongs to exactly one register.
* The register and location must belong to the same tenant and workspace.
* Every register must have exactly one active default location.
* New registers automatically receive a default `DRAWER` location.
* Location names must be unique within a register.
* A location with a non-zero balance cannot be archived.
* The default location cannot be archived until another active default is assigned.
* Location balances use integer cents only.
* Location balances must not become negative when negative balances are disallowed.
* Do not automatically classify locations based on names such as `"Safe"` or `"Kasse"`.

Suggested unique constraints and indexes:

```text
unique tenantId + workspaceId + registerId + normalizedName
index tenantId + workspaceId + registerId
index tenantId + workspaceId + registerId + isActive
```

Use the project’s current ID, normalization, timestamp, and optimistic-concurrency conventions.

---

## 2. CashEntry location

Add a location reference to `CashEntry`:

```ts
cashLocationId: string
```

A normal cash entry affects both:

```text
CashRegister.currentBalanceCents
CashLocation.currentBalanceCents
```

For an `IN` entry:

```text
register balance += amount
location balance += amount
```

For an `OUT` entry:

```text
register balance -= amount
location balance -= amount
```

The location must belong to the selected register.

Do not permit an entry for a location belonging to another register, tenant, or workspace.

### Backward compatibility

Use an expand-and-contract migration:

1. Add nullable `cashLocationId`.
2. Create one default legacy location for every existing register.
3. Backfill all existing entries to that location.
4. Set the location balance equal to the register’s existing current balance.
5. Update API clients and use cases.
6. Make `cashLocationId` required after backfill.
7. Keep a temporary compatibility path in request schemas if required:

   * when an older client omits `cashLocationId`, resolve the register’s default location
   * always return the resolved location in responses
8. Remove compatibility behavior only after all active clients have migrated.

For existing registers named `"Safe"`, do not automatically merge or convert them. They may represent real independent cashbooks. Preserve them and document that conversion into a location requires an explicit future migration workflow.

---

## 3. CashLocationTransfer

Add a separate immutable aggregate or domain entity:

```ts
type CashLocationTransferReason =
  | "SAFE_DROP"
  | "CHANGE_FLOAT"
  | "REORGANIZATION"
  | "OTHER";

type CashLocationTransfer = {
  id: string;
  tenantId: string;
  workspaceId: string;
  registerId: string;

  fromLocationId: string;
  toLocationId: string;

  amountCents: number;
  reason: CashLocationTransferReason;
  note?: string;

  businessDate: string;
  occurredAt: Date;

  createdByUserId: string;
  createdAt: Date;

  reversalOfTransferId?: string;
  reversedByTransferId?: string;
};
```

Do not represent a location transfer as two ordinary `CashEntry` records.

Doing so would pollute:

* Kassenbericht calculations
* cash income and expense totals
* DATEV exports
* tax reports
* monthly cashbook summaries

A location transfer belongs in a dedicated transfer ledger.

### Transfer invariants

A transfer must satisfy all of the following:

* Amount is greater than zero.
* Source and destination differ.
* Source and destination belong to the same register.
* Source and destination belong to the same tenant and workspace.
* Both locations are active.
* The source location has sufficient cash when negative balances are disallowed.
* The transfer does not change `CashRegister.currentBalanceCents`.
* The source location decreases by the amount.
* The destination location increases by the amount.
* No tax code, VAT amount, income category, or expense category is attached.
* Confirmed transfers are immutable.
* Incorrect transfers are reversed, never edited or deleted.

Transfer effect:

```text
Source location      -= amount
Destination location += amount
Register total        = unchanged
```

After every write, enforce:

```text
sum(active and archived location balances for register)
==
CashRegister.currentBalanceCents
```

Archived locations with historical balances must remain included in historical reconciliation. A location may only be archived at zero balance.

---

# Transaction and Concurrency Requirements

Implement location changes transactionally.

For a location transfer:

1. Start Unit of Work.
2. Load and lock the register.
3. Load and lock source and destination locations.
4. Lock locations in deterministic ID order to avoid deadlocks.
5. Validate tenant, workspace, register, status, and amount.
6. Validate the source location balance.
7. Decrease source location balance.
8. Increase destination location balance.
9. Leave register total unchanged.
10. Insert immutable transfer record.
11. Insert audit record.
12. Insert outbox event.
13. Commit.

Use the repository’s established row-locking approach.

The implementation must be safe against:

* duplicate requests
* retries
* two concurrent transfers from the same source
* concurrent entry creation and location transfer
* concurrent day-close submission
* cross-tenant IDs
* stale frontend balances

Every write endpoint must use the existing idempotency mechanism. Repeating the same idempotency key must return the original deterministic result without applying the transfer twice.

---

# Application Use Cases

Add or extend use cases following the existing `BaseUseCase` and `Result` patterns.

Suggested use cases:

```text
CreateCashLocationUseCase
UpdateCashLocationUseCase
ArchiveCashLocationUseCase
SetDefaultCashLocationUseCase
ListCashLocationsUseCase
GetRegisterCashPositionUseCase
TransferCashBetweenLocationsUseCase
ReverseCashLocationTransferUseCase
ListCashLocationTransfersUseCase
```

Update existing use cases:

```text
CreateCashRegisterUseCase
CreateCashEntryUseCase
ReverseCashEntryUseCase
GetCashRegisterUseCase
GetCashRegisterBalanceUseCase
PreviewCashDayCloseUseCase
SubmitCashDayCloseUseCase
GenerateCashbookExportUseCase
GenerateKassenberichtUseCase
GenerateMonthlyCashReportUseCase
```

## Create register

When a register is created, automatically create:

```text
Cash Drawer
type: DRAWER
isDefault: true
opening balance: same opening balance as register
```

Do not create a safe automatically.

The UI may offer an optional next step:

```text
Do you also keep business cash in a safe?
```

If selected, create:

```text
Business Safe
type: SAFE
isDefault: false
opening balance: 0
```

## Create cash entry

Require or resolve a destination/source location.

Examples:

```text
Cash sale:
IN to Cash Drawer

Cash expense:
OUT from selected location

Owner deposit:
IN to selected location

Owner withdrawal:
OUT from selected location

Bank deposit:
OUT from selected location

Bank withdrawal:
IN to selected location
```

Important classification:

```text
Safe → Drawer
```

is an internal location transfer, not:

* `OPENING_FLOAT`
* `OWNER_DEPOSIT`
* `BANK_WITHDRAWAL`

```text
Personal wallet → Drawer
```

is an owner deposit.

```text
Business bank account → Drawer
```

is a bank withdrawal into cash.

`OPENING_FLOAT` should be reserved for the register’s initial setup or the existing clearly defined semantics. Do not use it for daily safe-to-drawer replenishment.

---

# Reversal Rules

Location transfers are immutable.

To correct a transfer, create a new opposite transfer:

```text
Original:
Drawer → Safe, €94.40

Reversal:
Safe → Drawer, €94.40
reversalOfTransferId = original.id
```

Set the original transfer’s:

```text
reversedByTransferId
```

through the repository’s approved immutable-linking pattern.

A transfer can be reversed only once.

A reversal must:

* use the same register
* swap source and destination
* use the same amount
* preserve the original business date unless post-close correction rules require the current correction date
* include a correction reason
* pass all balance validations
* produce audit and outbox records

After a day is closed, follow the same post-close correction rules as cash entries. Do not silently alter a closed day.

---

# Day Close and Kassensturz

Extend the day-close model so the user counts each active physical location.

Add a model similar to:

```ts
type CashDayCloseLocationCount = {
  id: string;
  tenantId: string;
  workspaceId: string;
  dayCloseId: string;
  registerId: string;
  locationId: string;

  expectedBalanceCents: number;
  countedBalanceCents: number;
  differenceCents: number;

  denominationCounts?: unknown;
};
```

Required constraint:

```text
unique dayCloseId + locationId
```

## Preview calculation

For each location:

```text
expected location balance
counted location balance
location difference
```

At register level:

```text
expected register balance
  = sum(expected location balances)

counted register balance
  = sum(counted location balances)

register difference
  = counted register balance - expected register balance
```

Internal transfers must not affect register-level revenue or expense totals.

They affect only expected balances by location.

## Submission

The day-close confirmation UI must show:

```text
Cash Drawer
Expected: €30.00
Counted:  €30.00
Difference: €0.00

Business Safe
Expected: €224.00
Counted:  €224.00
Difference: €0.00

Total business cash
Expected: €254.00
Counted:  €254.00
Difference: €0.00
```

All active locations must be accounted for in the close.

Denomination counting remains optional unless existing business rules require it.

If the existing day-close process creates `CLOSING_ADJUSTMENT` entries:

* require explicit user confirmation
* create location-specific adjustment entries
* create one adjustment for each non-zero location difference
* use no VAT
* link adjustments to the day close
* ensure the sum of location adjustments equals the register-level difference
* ensure the next day starts from the counted balances

If the existing implementation only records a difference without changing balances, preserve that policy and extend it by location. Do not introduce silent automatic adjustments.

---

# Kassenbericht and Reporting Rules

The Kassenbericht must use the register’s total cash, not only the drawer.

For one register with drawer and safe:

```text
Closing cash balance
=
Counted drawer cash
+
Counted safe cash
+
Counted cash in any other location
```

Internal transfers must be excluded from:

* cash revenue
* cash expenses
* private deposits
* private withdrawals
* bank deposits
* bank withdrawals
* VAT totals
* DATEV accounting lines
* Kassenbericht inflow/outflow arithmetic

Internal transfers may appear in:

* audit packs
* operational transfer reports
* location ledgers
* day-close reconciliation detail
* user activity timelines

Example:

```text
22.07

Opening register balance: €0.00
Cash sales:              +€129.60
Drawer → Safe:             €129.60
Closing register balance: €129.60

Locations:
Drawer: €0.00
Safe:   €129.60
```

The transfer does not reduce the Kassenbericht closing balance.

---

# Cashbook Export Changes

Update exports carefully.

## CSV and PDF cashbook

Normal cash entries remain accounting cashbook rows.

Internal transfers must not appear as income or expenses.

Provide either:

* a separate `"Internal cash transfers"` section, or
* a separate transfer CSV in the audit pack

Fields should include:

```text
Transfer ID
Business date
Occurred at
Register
Source location
Destination location
Amount
Reason
Note
Created by
Reversal status
Original transfer ID
```

## DATEV

Do not export drawer-to-safe transfers as revenue, expense, owner movement, or bank Geldtransit.

A true:

```text
Cash Register → Business Bank Account
```

remains a `BANK_DEPOSIT` accounting event and follows the existing DATEV mapping.

## Audit pack

Include:

```text
cash-locations.csv
cash-location-transfers.csv
cash-day-close-location-counts.csv
```

Also include relevant audit events in the existing audit log and manifest.

---

# API Contracts

Add Zod schemas and inferred types to:

```text
packages/contracts/src/cash-management/schema.ts
```

Suggested contracts:

```text
CashLocationDto
CashLocationTypeSchema
CreateCashLocationInput
UpdateCashLocationInput
SetDefaultCashLocationInput
CashLocationTransferDto
CashLocationTransferReasonSchema
CreateCashLocationTransferInput
ReverseCashLocationTransferInput
RegisterCashPositionDto
CashDayCloseLocationCountInput
CashDayCloseLocationCountDto
```

Example cash-position response:

```ts
{
  registerId: string;
  currentBalanceCents: number;
  locations: Array<{
    id: string;
    name: string;
    type: "DRAWER" | "SAFE" | "CASH_BAG" | "OTHER";
    currentBalanceCents: number;
    isDefault: boolean;
    isActive: boolean;
  }>;
}
```

Extend existing entry and day-close DTOs without creating client-specific wire formats.

Use additive contract changes wherever possible.

---

# HTTP API

Follow the current Cash Management controller conventions.

Suggested endpoints:

```text
GET    /cash-registers/:registerId/locations
POST   /cash-registers/:registerId/locations
PATCH  /cash-registers/:registerId/locations/:locationId
POST   /cash-registers/:registerId/locations/:locationId/archive
POST   /cash-registers/:registerId/locations/:locationId/set-default

GET    /cash-registers/:registerId/cash-position

GET    /cash-registers/:registerId/location-transfers
POST   /cash-registers/:registerId/location-transfers
POST   /cash-registers/:registerId/location-transfers/:transferId/reverse
```

Extend existing entry and day-close endpoints to accept location data.

Write endpoints must enforce:

* authentication
* authorization
* tenant scope
* workspace scope
* idempotency
* trace ID
* validation
* audit
* outbox

Suggested stable error codes:

```text
CashManagement:CashLocationNotFound
CashManagement:CashLocationInactive
CashManagement:CashLocationNameConflict
CashManagement:CashLocationHasBalance
CashManagement:DefaultCashLocationRequired
CashManagement:CashLocationRegisterMismatch
CashManagement:TransferSameLocation
CashManagement:TransferInsufficientLocationBalance
CashManagement:TransferAlreadyReversed
CashManagement:TransferLockedBusinessDate
CashManagement:CashPositionInvariantViolation
```

Map these to appropriate RFC 7807 responses.

---

# Authorization

Reuse current Cash Management permissions where possible.

Suggested policy:

## Employee

* view cash locations
* view cash position
* propose a transfer
* record a transfer within configured limits
* enter day-close counts

## Manager

* create and update locations
* approve transfers over a threshold
* reverse transfers
* submit day close
* acknowledge differences

## Owner/Admin

* archive locations
* change default location
* configure approval thresholds
* manage multiple registers
* export audit data

Use existing RBAC or ABAC infrastructure rather than building a new permission system.

---

# Domain Events

Publish additive, stable events through the outbox.

Suggested events:

```text
CashLocationCreated
CashLocationUpdated
CashLocationArchived
CashLocationDefaultChanged
CashLocationTransferRecorded
CashLocationTransferReversed
CashDayCloseLocationCountsSubmitted
```

Event payloads must include:

```text
eventId
eventVersion
tenantId
workspaceId
registerId
occurredAt
traceId
actorUserId
```

Transfer events should include location IDs, amount, business date, reason, and reversal linkage.

Do not rename or remove event fields after publication.

---

# Frontend Implementation

Implement in:

```text
apps/cash-management
```

Reuse:

```text
@corely/web-shared
@corely/web-features
@corely/api-client
@corely/contracts
```

The UI must be mobile-first because the main users operate Corely from phones.

## Register overview

Change the register screen from showing only one balance to:

```text
Total business cash
€254.00

Cash locations
Cash Drawer      €30.00
Business Safe   €224.00
```

The total remains visually primary.

Locations are a breakdown, not separate accounting registers.

## Progressive disclosure

When a register has only its default drawer:

* show the normal simple register interface
* do not force the user to understand locations
* offer `"Add a safe or another cash location"` under settings

When a register has multiple locations:

* show the location breakdown
* show a `"Move cash"` action
* count all locations during day close

## Move cash flow

Create a mobile-friendly bottom sheet or page:

```text
Move cash

From
Cash Drawer

To
Business Safe

Amount
€94.40

Reason
Store today's cash securely

Note
Optional
```

Confirmation screen:

```text
Move €94.40
Cash Drawer → Business Safe

Cash remains owned by the business.
Total business cash will not change.
```

Require explicit confirmation.

After success show:

```text
Transfer recorded

Cash Drawer: €30.00
Business Safe: €224.00
Total business cash: €254.00
```

## User terminology

Use plain language in the primary UI.

English:

```text
Cash location
Move cash
Cash drawer
Business safe
Cash remains in the business
```

German:

```text
Aufbewahrungsort
Bargeld intern umlegen
Kassenlade
Geschäftstresor
Das Bargeld bleibt im Betrieb
```

Vietnamese:

```text
Nơi cất tiền
Chuyển nơi cất giữ
Máy Kasse / Ngăn kéo tiền
Két của quán
Tiền vẫn thuộc quán
```

Do not show `Geldtransit` as the primary label for drawer-to-safe transfers.

Reserve bank-related language for actual cash-to-bank movements.

## Register creation

Default flow:

```text
Create register
→ automatically create Cash Drawer
```

Optional step:

```text
Do you also store business cash in a safe?

[Not now]
[Add business safe]
```

Do not ask the normal small-business user to create a second register for the safe.

## Day-close UI

Replace the single counted-balance input with location count cards when multiple locations exist.

Example:

```text
Count the cash

Cash Drawer
Expected €30.00
Counted [________]

Business Safe
Expected €224.00
Counted [________]

Total counted €254.00
Difference €0.00
```

On smaller screens:

* one location card per section
* large numeric input
* numeric keyboard
* sticky total and confirm action
* no wide tables
* clear warning for uncounted locations

---

# Cash Assistant Integration

Extend the existing Cash Assistant using structured tools and explicit confirmation.

## Required behavior

When a user says:

```text
I removed €94.40 from the register.
```

the assistant must not create an entry immediately.

It must clarify the purpose:

```text
Where did the cash go?

- Business safe
- Business bank account
- Business purchase or expense
- Personal use
- It is still in the drawer
- Other
```

Classification:

```text
Business safe
→ CashLocationTransfer

Business bank account
→ BANK_DEPOSIT cash entry

Business purchase or expense
→ EXPENSE_CASH

Personal use
→ OWNER_WITHDRAWAL

Still in drawer
→ no cash movement
```

When the user says:

```text
I put €30 into the drawer for change.
```

ask where it came from:

```text
- Business safe
- Personal money
- Business bank account
- Other
```

Classification:

```text
Business safe
→ internal location transfer

Personal money
→ OWNER_DEPOSIT

Business bank account
→ BANK_WITHDRAWAL
```

## Tool cards

Add a read-only proposal tool such as:

```text
propose_cash_location_transfer
```

It returns a structured card containing:

```text
register
source location
destination location
amount
business date
reason
resulting source balance
resulting destination balance
unchanged register total
warnings
confirmation token or handoff ID
```

Use the existing handoff/confirmation infrastructure.

The mutation must occur only through the confirmed action.

Do not write before explicit confirmation.

Log:

* model proposal
* tool arguments
* confidence
* clarification answers
* confirmation
* execution result
* dismissal or cancellation

Suggested assistant explanation:

```text
This is an internal cash transfer.

The money is moving from the cash drawer to the business safe.
It remains business cash, so it is not revenue, an expense, or a
private withdrawal. The total cash balance remains unchanged.
```

Add Vietnamese and German equivalents through the existing glossary/i18n mechanism.

---

# Migration Plan

Use an expand-and-contract migration.

## Database migration

1. Add `CashLocation`.
2. Add nullable `CashEntry.cashLocationId`.
3. Add `CashLocationTransfer`.
4. Add `CashDayCloseLocationCount`.
5. Create one default location for every existing register:

```text
name: Cash Drawer
type: DRAWER
isDefault: true
isActive: true
currentBalanceCents: existing register.currentBalanceCents
```

6. Backfill every existing entry to the generated default location.
7. Backfill day closes with one location count representing the existing register-level values.
8. Verify for every register:

```text
sum(location balances) == register current balance
```

9. Make required fields non-null after successful backfill.
10. Add indexes and uniqueness constraints.
11. Run Prisma validation and drift checks.

Do not infer a safe from register names.

Do not merge registers automatically.

## Application rollout

Keep older API requests working temporarily by resolving missing location IDs to the default location.

Responses should always include location information after deployment.

Update frontend clients before removing compatibility behavior.

---

# Read Models

Add or extend a read model for the register cash position:

```text
RegisterCashPosition
```

It should efficiently return:

* total register balance
* location balances
* expected balance by location
* latest location transfers
* current open day status
* unresolved difference warnings

Do not calculate dashboard aggregates through repeated N+1 queries.

Use indexes or a dedicated query adapter following existing reporting patterns.

---

# Required Tests

## Domain unit tests

Cover:

* creating a default drawer
* rejecting duplicate location names
* rejecting archive with non-zero balance
* changing the default location
* transfer between valid locations
* register total remains unchanged
* source decreases
* destination increases
* same-location transfer rejected
* zero amount rejected
* negative amount rejected
* insufficient source balance rejected
* different-register transfer rejected
* cross-tenant transfer rejected
* inactive location rejected
* reversal creates opposite transfer
* second reversal rejected
* register/location sum invariant

## Use-case tests

Cover:

* Unit of Work is used
* repository locks are obtained
* idempotency prevents duplicate transfers
* audit event is written
* outbox event is written
* domain errors map correctly
* closed-day restrictions are respected
* post-close correction behavior is explicit
* old clients default to the register’s default location

## Repository integration tests

Run against PostgreSQL.

Cover:

* migration backfill
* tenant isolation
* workspace isolation
* row locking
* concurrent transfers from one source
* concurrent cash entry and transfer
* deterministic lock ordering
* uniqueness constraints
* location balance updates
* rollback on any failure

Concurrency test:

```text
Source location balance: €100.00

Concurrent transfer A: €80.00
Concurrent transfer B: €80.00

Expected:
Exactly one succeeds.
Exactly one fails with insufficient location balance.
Register total remains €100.00.
No location becomes negative.
```

## Controller and contract tests

Cover:

* request validation
* response DTOs
* idempotency headers
* authorization
* Problem Details responses
* trace IDs
* pagination for transfer history

## Frontend tests

Cover:

* register total and location breakdown
* adding a safe
* transfer preview
* transfer confirmation
* mobile layout
* stale-balance error handling
* day-close count by location
* uncounted-location warning
* i18n for DE, EN, and VI

## Assistant tests

Cover:

* ambiguous withdrawal causes clarification
* no write before explicit confirmation
* `"business safe"` produces location transfer
* `"personal use"` produces owner withdrawal
* `"bank"` produces bank deposit
* `"€30 came from safe"` does not create owner deposit
* duplicate confirmation remains idempotent
* cancellation makes no write
* tool execution is audited

---

# Mandatory End-to-End Scenarios

## Scenario 1: 22.07 safe drop

Initial state:

```text
Register total: €0.00
Drawer: €0.00
Safe: €0.00
```

Actions:

```text
Cash sale into drawer: €129.60
Transfer drawer → safe: €129.60
```

Expected state:

```text
Register total: €129.60
Drawer: €0.00
Safe: €129.60
```

Expected Kassenbericht:

```text
Opening cash: €0.00
Cash revenue: €129.60
Closing cash: €129.60
```

The internal transfer must not appear as an expense, owner withdrawal, or bank deposit.

## Scenario 2: 23.07 with private €30 float

Initial state:

```text
Register total: €129.60
Drawer: €0.00
Safe: €129.60
```

Actions:

```text
Owner deposit into drawer: €30.00
Cash sale into drawer: €94.40
Transfer drawer → safe: €94.40
```

Expected state:

```text
Register total: €254.00
Drawer: €30.00
Safe: €224.00
```

Expected Kassenbericht:

```text
Opening cash: €129.60
Owner deposit: €30.00
Cash revenue: €94.40
Closing cash: €254.00
```

## Scenario 3: 23.07 with €30 taken from safe

Initial state:

```text
Register total: €129.60
Drawer: €0.00
Safe: €129.60
```

Actions:

```text
Transfer safe → drawer: €30.00
Cash sale into drawer: €94.40
Transfer drawer → safe: €94.40
```

Expected state:

```text
Register total: €224.00
Drawer: €30.00
Safe: €194.00
```

Expected Kassenbericht:

```text
Opening cash: €129.60
Owner deposit: €0.00
Cash revenue: €94.40
Closing cash: €224.00
```

The safe-to-drawer transfer must not create `OWNER_DEPOSIT`.

## Scenario 4: Actual second register

Create:

```text
Front Desk Register
Bar Register
```

Each has:

* its own default drawer
* its own entries
* its own current balance
* its own day close
* its own Kassenbericht

A transfer across different registers must not use `CashLocationTransfer`.

Reject it with a register mismatch error until a dedicated register-to-register accounting workflow is implemented.

---

# Non-Goals

Do not implement the following in this change:

* TSE checkout processing
* DSFinV-K POS transaction generation
* customer payment capture
* POS sale finalization
* multi-cashier shift management
* automatic merging of existing registers
* register-to-register transfer accounting
* bank statement matching
* enterprise cash-deposit bag workflows
* silent AI mutations
* destructive edits to confirmed entries or transfers

Corely Cash remains a cashbook and guided cash-management product, not a full POS implementation.

---

# Documentation Updates

Update Cash Management documentation to explain:

```text
Cash Register
= the total logical business cash fund

Cash Location
= where some of that cash is physically stored

Internal Cash Transfer
= movement between locations in the same register
```

Replace examples that describe `"Safe"` as a normal register unless the example truly represents an independently reconciled cashbook.

Add DE, EN, and VI glossary entries.

Suggested Vietnamese documentation:

```text
Máy Kasse và két của quán không nhất thiết là hai sổ quỹ riêng.

Nếu tiền chỉ được chuyển từ ngăn kéo sang két nhưng vẫn thuộc cùng một
quỹ tiền mặt của quán, Corely ghi đây là “Chuyển nơi cất giữ”.

Giao dịch này không làm thay đổi tổng tiền mặt, doanh thu hoặc chi phí.
```

---

# Verification Commands

Discover and use the repository’s real commands rather than inventing alternatives.

At minimum, run the equivalents of:

```text
Prisma format
Prisma validate
Cash Management unit tests
Cash Management integration tests
Contract tests
Frontend tests
Assistant tool tests
E2E tests
Typecheck
Lint
Production build
Migration drift check
```

Do not report success unless the commands actually pass.

Document any pre-existing failures separately from failures introduced by this implementation.

---

# Required Final Deliverable

After implementation, provide:

1. Summary of the domain change.
2. List of changed files grouped by:

   * contracts
   * database
   * domain
   * application
   * infrastructure
   * HTTP
   * AI tools
   * frontend
   * tests
   * documentation
3. Migration and backward-compatibility explanation.
4. API changes.
5. Screens and user flows added.
6. Domain invariants enforced.
7. Test scenarios executed.
8. Exact command results.
9. Remaining risks or follow-up work.
10. Confirmation that:

    * drawer-to-safe transfers do not alter register total
    * internal transfers do not enter Kassenbericht income/expense calculations
    * existing entries were assigned to a default location
    * AI performs no write before confirmation
    * tenant and workspace isolation are covered by tests

Do not stop after producing a plan. Implement the feature end to end.
