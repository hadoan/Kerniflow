# PROMPT: Implement “Engagement: Check-In (Kiosk Mode) + Loyalty v1” inside the React Native POS app (`apps/pos`) — AI-Native first, offline-first, reuse current infra

You are an AI engineering agent working inside the **Kerniflow** pnpm monorepo. Your task is to implement **Customer Engagement: Check-In (Kiosk Mode) + Loyalty v1** as a **mode inside the existing React Native POS app** (`apps/pos`), NOT a separate app.

This feature must be:

- **AI-native first** (embedded copilot, tool cards, explicit apply actions)
- **Offline-first** using existing `packages/offline-rn`
- Built on existing **DDD + Clean Architecture** patterns:
  - shared contracts in `packages/contracts`
  - shared clients/use-case orchestration in shared packages (where they exist)
  - NestJS modular backend
  - multi-tenancy, idempotency, audit logging conventions
- Built on the unified **Party** model with roles:
  `PartyRoleType { CUSTOMER, SUPPLIER, EMPLOYEE, CONTACT }`

You must **carefully review the current infra first**, then reuse or refactor to avoid duplication between:

- Web backoffice (Vite+React)
- POS (React Native)
- Future modules (Sales, Inventory, CRM, Accounting)

Do not write code. Write detailed **plain English** instructions using **domain language** (entities, aggregates, use cases, ports/adapters, bounded contexts, contracts, commands). Be very detailed about screens, buttons, flows, offline behavior, sync rules, and AI behaviors.

---

## 0) Mandatory preflight: inspect & align with current infra (do first)

Before designing anything, inspect repo and document:

1. Existing `apps/pos` structure:
   - navigation, auth flow, tenant selection, register selection, shift open/close
   - UI component patterns used in RN
2. Existing `packages/offline-rn`:
   - queue model, command schema, retry/backoff, storage, sync triggers
   - how conflicts/errors are represented to UI
3. Existing Party/CRM/Sales/POS APIs and contracts:
   - how Party is created/searched
   - any existing Activity/Timeline entities (for check-in events)
4. Existing ai-copilot module:
   - tool calling pattern (ai-sdk.dev)
   - tool-card schemas and rendering
   - “Apply” action conventions and auditing of AI interactions
5. Existing idempotency conventions (headers, keys) used across services

Output of this step:

- A short “Reuse Plan” listing what you will reuse as-is and what you will refactor into shared packages (if needed).

Hard rules:

- Do not create a new parallel client stack.
- Do not duplicate contracts or business workflows in multiple apps.
- Extend existing ai-copilot patterns; do not invent a new AI UX.

---

## 1) Product definition (v1): what Check-In + Loyalty must ship

This module adds a **Kiosk Mode** inside POS for repeat-visit SMBs.

### Must-have outcomes

- A customer can **check in** quickly (QR code or phone number/name).
- Check-in creates a **Visit / CheckInEvent** and can optionally:
  - attach a note or “reason for visit”
  - assign a staff member (employee) if applicable
- The system can award **loyalty points** based on:
  - “per visit” rule (v1)
  - optionally “per spend” later (v1.1)
- Staff can view:
  - today’s check-ins
  - customer visit history
  - loyalty balance and rewards

### What is explicitly out of scope (do not block v1)

- Full appointment booking
- Full reputation/review automation
- Complex reward catalogs
- CRM marketing automation
- Printer integration

---

## 2) Domain framing (DDD)

Introduce a bounded context: **Engagement**
Subdomains:

- Check-In (Visits)
- Loyalty (Points ledger)

Engagement integrates with:

- **Party** (customers, employees)
- **POS** (optional: attach check-in customer to current sale)
- **CRM Activities** (optional: timeline events)
- **Sales** (future: points on spend)

---

## 3) Core domain model (conceptual)

### 3.1 Entity: CheckInEvent (Visit)

Fields (conceptual):

- tenantId
- checkInEventId
- customerPartyId (PartyRoleType.CUSTOMER)
- kioskDeviceId / registerId (from POS)
- checkedInAt (timestamp)
- checkedInBy:
  - “self-service kiosk” or employeePartyId (if staff-assisted)
- status: Active | Completed | Canceled
- optional context:
  - visitReason (free text)
  - assignedEmployeePartyId (PartyRoleType.EMPLOYEE) (optional)
  - tags (optional)
- linkage:
  - posTicketId / posSaleId (optional)
  - notes

Rules:

- Create is idempotent (avoid double check-in).
- Customers can have multiple check-ins per day but system should detect duplicates and ask for confirmation.

### 3.2 Entity: LoyaltyAccount

- tenantId
- loyaltyAccountId
- customerPartyId
- status: Active | Suspended
- currentPointsBalance (derived from ledger; may also be cached)
- createdAt, updatedAt

### 3.3 Entity: LoyaltyLedgerEntry (immutable)

Fields:

- tenantId
- entryId
- customerPartyId
- entryType: Earn | Redeem | Adjust | Expire
- pointsDelta (+ / -)
- reasonCode:
  - VisitCheckIn
  - ManualAdjustment
  - RewardRedemption
- sourceType/sourceId (e.g., CheckInEventId)
- createdAt/by (employee or system)

Rules:

- Ledger is append-only.
- Balance is computed from sum(pointsDelta).
- Redemptions cannot exceed available balance (policy for v1: disallow).

### 3.4 Entity: Reward (v1 minimal)

For v1 keep it simple:

- either fixed “Redeem N points for X” options
- or single “$X discount at checkout for N points” placeholder (applied in POS later)
  This can be a stub config initially.

### 3.5 Entity: EngagementSettings

- tenantId
- checkInModeEnabled (bool)
- checkInDuplicateWindowMinutes (e.g., 10)
- loyaltyEnabled (bool)
- pointsPerVisit (integer)
- rewardRules (optional)
- aiEnabled (bool)
- kioskBranding (logo, welcome message) (optional)

---

## 4) Offline-first behavior (RN kiosk must work offline)

### 4.1 What must work offline

- Customer lookup by:
  - QR payload (customer ID)
  - phone number
  - name search (limited)
- Create check-in (queued)
- Show “checked-in success” UI
- Award points (queued as ledger entry creation)
- Show cached loyalty balance (mark as “estimated offline”)

### 4.2 Local cache requirements

Using `packages/offline-rn`, define local cached datasets:

- Customers subset:
  - customerPartyId, displayName, phone/email, QR token, tags
- Loyalty summary:
  - last known points balance
- Recent check-ins:
  - local list for today (pending sync + synced)

### 4.3 Offline command queue items

Define business commands enqueued when offline:

- CreateCheckInEventCommand
- CreateLoyaltyEarnEntryCommand (source: check-in)
- (optional) CreateCustomerPartyCommand (if kiosk allows new customer registration)

Each command includes:

- tenantId, registerId/deviceId
- idempotencyKey
- payload
- createdAt, attempts, lastError

Sync rules:

- Commands must be replayed in order:
  - create customer (if any) → create check-in → create points entry
- If a command fails, mark it Failed and show in “Sync Status” UI with resolution options.

---

## 5) AI-Native requirements (embedded copilot + tool cards)

This feature must be AI-native first but safe:

- AI never creates check-ins silently.
- AI proposes structured results in tool cards, user explicitly applies.

### 5.1 AI entry points in kiosk

- “Search customer by description”:
  - “Find John who visited last week, phone ends 123”
- “Detect duplicate check-in”:
  - if same customer checks in again within X minutes, AI suggests what to do
- “Suggest next action”:
  - “Customer is VIP; offer reward redemption”
- “Auto-tag visit reason” (optional):
  - classify short note into tags (“repair”, “consultation”)

### 5.2 Required AI tools (ai-sdk tool definitions)

Tool A: `engagement_findCustomer`
Input:

- free text (name/phone/context)
  Output card: CustomerMatchCard
- top matches with confidence, rationale, provenance
  Actions:
- Select customer (apply)

Tool B: `engagement_checkInAssistant`
Input:

- customerId + recent check-ins + kiosk context
  Output: CheckInDecisionCard
- suggests “Proceed”, “Possible duplicate”, “Ask confirmation”
  Actions:
- Proceed check-in
- Cancel

Tool C: `engagement_loyaltyNextBestAction`
Input:

- customerId + points balance + last visits
  Output: NextBestActionCard
- “Offer reward”, “Invite to attach to sale”, “Welcome VIP”
  Actions:
- Add note to visit
- Show reward screen
- Attach customer to POS ticket (if sales mode active)

Tool D: `engagement_explainLoyalty`
Input:

- customerId
  Output: LoyaltyExplanationCard
- explains how points earned, what rewards available
  Actions:
- Open rewards

AI interaction logging:

- Use existing AI audit logging patterns (accepted/dismissed).

---

## 6) Backend requirements (NestJS): Engagement module

Implement a backend **EngagementModule** (or extend existing CRM if that is your convention).
It must support:

- Create/read check-ins
- Loyalty ledger operations
- Settings
- Kiosk QR token management (if needed)

### 6.1 Core endpoints (conceptual)

Check-in:

- POST /engagement/checkins (create)
- GET /engagement/checkins (filters: today, customer, status)
- POST /engagement/checkins/:id/complete (optional)
- POST /engagement/checkins/:id/cancel (optional)

Loyalty:

- GET /engagement/loyalty/:customerPartyId (summary)
- GET /engagement/loyalty/:customerPartyId/ledger (paged)
- POST /engagement/loyalty/earn (create earn entry)
- POST /engagement/loyalty/redeem (v1 optional stub)
- POST /engagement/loyalty/adjust (employee only)

Settings:

- GET /engagement/settings
- PATCH /engagement/settings

Customer search helpers (reuse Party module if exists):

- GET /party/customers/search?q=
- GET /party/customers/:id

### 6.2 Deterministic rules enforced server-side

- Duplicate check-in window:
  - If a check-in exists for same customer within X minutes, return a domain error that includes:
    - previous check-in reference
    - suggested resolution (“confirm override”)
- Loyalty points awarding:
  - If points-per-visit enabled, award exactly N points per successful check-in.
  - Use idempotency based on (customerId + checkInEventId) to avoid double-award.

### 6.3 Permissions

- engagement.checkin.create (kiosk/self-service)
- engagement.checkin.view (staff)
- engagement.loyalty.view (staff, maybe customer)
- engagement.loyalty.adjust (manager)
- engagement.settings.manage (admin)
- engagement.ai.use

---

## 7) Contracts (Zod) additions (shared)

Add contracts under `packages/contracts/src/engagement/*`:

- CheckInEvent schemas
- LoyaltyAccount + LoyaltyLedgerEntry schemas
- Settings schemas
- AI tool-card unions for engagement tools (extend existing copilot union)

Ensure RN app can import these contracts directly.

---

## 8) React Native POS app changes (`apps/pos`)

### 8.1 Add “Mode switch”: Sales vs Check-In

Add a top-level navigation entry:

- **Sales Mode**
- **Kiosk Check-In Mode**

Kiosk mode must support:

- “Lock to kiosk” toggle (optional):
  - hides admin nav
  - prevents leaving screen without PIN (optional v1.1)

### 8.2 Screens (detailed)

#### Screen 1: Kiosk Welcome

Components:

- Branding header (company name/logo optional)
- Big buttons:
  - “Check in with QR”
  - “Check in with phone”
  - “Staff login” (optional) / “Help”
- Offline banner + sync indicator

Actions:

- QR: opens scanner
- Phone: opens keypad input
- Staff login: unlocks staff-only functions (view today’s list, manual customer creation)

#### Screen 2: QR Scan

Behavior:

- Scan QR → parse payload → resolve to customerPartyId
- If offline: resolve from local cache
- If unknown:
  - show “Customer not found” → offer “Enter phone” or “Ask staff”

AI hook:

- If scan yields ambiguous match, AI can propose best match with confidence.

#### Screen 3: Phone / Name Lookup

Components:

- keypad for phone
- search box for name
- results list
  Actions:
- select customer → go to confirmation

AI hook:

- “Find customer” copilot button using `engagement_findCustomer`

#### Screen 4: Confirm Check-In

Components:

- customer summary card (name, last visit, points balance)
- optional “reason for visit” quick chips + free text
- (optional) staff assignment (employee picker) if staff logged in
  Buttons:
- “Confirm Check-In” (primary)
- “Cancel”

Behavior:

- On confirm:
  - if online: call POST /engagement/checkins (idempotent)
  - if offline: enqueue CreateCheckInEventCommand
- If duplicate detected:
  - show warning with prior check-in time
  - allow “Proceed anyway” (requires staff PIN optionally) or “Cancel”
- After success:
  - award points (server-side or queue Earn command):
    - show “+N points earned”

AI hook:

- call `engagement_checkInAssistant` when duplicate risk exists, render decision card.

#### Screen 5: Check-In Success

Components:

- big success message
- points earned and current balance (if available)
- optional reward highlight (“You can redeem X”)
- auto-return timer (5–10 seconds)

AI hook:

- `engagement_loyaltyNextBestAction` to suggest:
  - show reward
  - attach customer to sale
  - add a note for staff

#### Screen 6: Rewards (v1 simple)

Components:

- list of redeem options (if enabled)
- button “Redeem” (requires staff approval if monetary impact)
  Behavior:
- v1 can be view-only unless you’re ready to apply discounts in POS.

#### Screen 7: Today’s Check-Ins (staff view)

Components:

- list of today’s check-ins (synced + pending)
- filters: active/completed
- tap customer to open details

#### Screen 8: Customer Engagement Profile (staff view)

Tabs:

- Visits (check-in history)
- Loyalty (ledger + balance)
- Notes/tags (optional)

AI:

- “Summarize customer history”
- “Suggest retention action” (advisory)

#### Screen 9: Sync Status (reuse existing POS sync screen)

Show:

- pending check-ins
- failed check-ins
- retry actions

---

## 9) Integration with POS sales flow (optional but high value)

When kiosk check-in identifies a customer:

- If a sale is currently open (Sales Mode ticket):
  - allow “Attach customer to current ticket”
- If not:
  - do nothing; keep it a standalone visit record

This keeps Check-In useful even without immediate purchase.

---

## 10) Observability, audit, and safety

- Every check-in must be auditable:
  - who/what device created it, when, tenant
- Every loyalty ledger entry must link to:
  - check-in event or manual adjustment
- AI actions must be logged:
  - what was suggested, what was applied, by whom

---

## 11) Acceptance scenarios (must pass)

Scenario A: Offline check-in

- Device offline → lookup cached customer → confirm → queued
- Later online → sync → check-in + points created exactly once

Scenario B: Duplicate check-in

- Customer checks in twice within window
- System warns, AI proposes decision
- Staff overrides or cancels

Scenario C: New customer assisted (optional)

- Staff creates Party customer
- Check-in created and points awarded

Scenario D: Today list + details

- Staff views today’s check-ins and opens customer history

---

## 12) Definition of Done (DoD)

Feature is complete only if:

- Kiosk mode exists inside `apps/pos` with mode switch
- Check-in works online and offline (queued via `packages/offline-rn`)
- Loyalty points-per-visit ledger works and is idempotent
- RN UI includes welcome → identify → confirm → success loop
- Staff can view today’s check-ins and customer engagement profile
- AI copilot tools exist with structured tool cards and explicit apply actions
- Contracts are shared in `packages/contracts` and used by both client and server
- Multi-tenancy, permissions, idempotency, audit logging follow current infra patterns

---

## 13) Recommended implementation order

1. Repo review + reuse/refactor plan
2. Engagement contracts (check-in + loyalty + tool cards)
3. Backend EngagementModule endpoints + rules (duplicate window, points awarding)
4. RN kiosk screens + offline queue commands
5. Sync status + failure resolution UX
6. AI tools + tool cards integration
7. Polish: performance, caching, kiosk lock toggle

---

### Final deliverable

An AI-native, offline-first **Check-In (Kiosk Mode) + Loyalty v1** implemented inside the RN POS app (`apps/pos`), backed by a clean Engagement bounded context in the API, using shared contracts and existing ai-copilot/offline infrastructure without duplicating business logic across platforms.
