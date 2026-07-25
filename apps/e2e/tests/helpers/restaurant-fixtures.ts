import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { type APIRequestContext, expect, type APIResponse, type TestInfo } from "@playwright/test";
import { config as loadDotEnv } from "dotenv";
import {
  CloseRestaurantTableOutputSchema,
  CreateRegisterOutputSchema,
  DecideRestaurantApprovalInputSchema,
  GetActiveRestaurantOrderOutputSchema,
  GetCurrentShiftOutputSchema,
  GetRestaurantFloorPlanOutputSchema,
  isProblemDetails,
  ListRegistersOutputSchema,
  ListRestaurantModifierGroupsOutputSchema,
  MergeRestaurantChecksOutputSchema,
  type ProblemDetails,
  ListKitchenTicketsOutputSchema,
  LoginInputSchema,
  OpenRestaurantTableOutputSchema,
  OpenShiftOutputSchema,
  PutRestaurantDraftOrderOutputSchema,
  RestaurantApprovalMutationOutputSchema,
  SendRestaurantOrderToKitchenOutputSchema,
  UpdateKitchenTicketStatusOutputSchema,
  UpsertDiningRoomOutputSchema,
  UpsertKitchenStationOutputSchema,
  UpsertRestaurantModifierGroupOutputSchema,
  UpsertRestaurantTableOutputSchema,
  type ApprovalPolicyInput,
  type CloseRestaurantTableOutput,
  type CloseShiftOutput,
  type CreateRegisterOutput,
  type GetActiveRestaurantOrderOutput,
  type GetCurrentShiftOutput,
  type GetRestaurantFloorPlanOutput,
  type ListKitchenTicketsOutput,
  type ListRegistersOutput,
  type ListRestaurantModifierGroupsOutput,
  type MergeRestaurantChecksOutput,
  type OpenRestaurantTableOutput,
  type OpenShiftOutput,
  type PutRestaurantDraftOrderOutput,
  type RestaurantApprovalMutationOutput,
  type SendRestaurantOrderToKitchenOutput,
  type UpdateKitchenTicketStatusOutput,
  type UpsertDiningRoomOutput,
  type UpsertKitchenStationOutput,
  type UpsertRestaurantModifierGroupOutput,
  type UpsertRestaurantTableOutput,
} from "@corely/contracts";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import type { AuthContext, SeededTestData } from "./auth.ts";
import { buildAuthHeaders } from "./auth.ts";
import { type HttpClient } from "./http-client.ts";
import { expectZod } from "./zod-assert.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../../../..");
const API_BASE_URL = process.env.API_URL ?? "http://localhost:3000";
let envLoaded = false;
let prismaSingleton: PrismaClient | null = null;
let poolSingleton: Pool | null = null;

function loadRestaurantE2eEnv(): void {
  if (envLoaded) {
    return;
  }

  loadDotEnv({ path: path.join(REPO_ROOT, ".env.e2e"), quiet: true });
  loadDotEnv({ path: path.join(REPO_ROOT, ".env.test"), quiet: true });
  loadDotEnv({ path: path.join(REPO_ROOT, ".env.local"), quiet: true });
  loadDotEnv({ path: path.join(REPO_ROOT, ".env"), quiet: true });

  envLoaded = true;
}

loadRestaurantE2eEnv();

function getRestaurantDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("DATABASE_URL is required for restaurant e2e fixtures");
  }

  const parsed = new URL(raw);
  if (parsed.hostname === "postgres") {
    parsed.hostname = "127.0.0.1";
  }
  return parsed.toString();
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function sanitize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/gu, "-");
}

export function restaurantIdempotencyKey(testInfo: TestInfo, suffix: string): string {
  const path = testInfo.titlePath.join("-");
  const safeSuffix = sanitize(suffix).slice(0, 48);
  const digest = createHash("sha256")
    .update(`${path}:${suffix}:${testInfo.retry}`)
    .digest("hex")
    .slice(0, 24);
  return `e2e-restaurant-${safeSuffix}-r${testInfo.retry}-${digest}`;
}

export async function expectProblem(
  response: APIResponse,
  status: number,
  code?: string
): Promise<ProblemDetails> {
  expect(response.status()).toBe(status);
  const payload = await response.json();
  expect(isProblemDetails(payload)).toBe(true);
  const problem = payload as ProblemDetails;
  expect(problem.status).toBe(status);
  if (code) {
    expect(problem.code).toBe(code);
  }
  expect(typeof problem.type).toBe("string");
  expect(typeof problem.title).toBe("string");
  expect(typeof problem.detail).toBe("string");
  expect(typeof problem.traceId).toBe("string");
  return problem;
}

export function createRestaurantPrisma(): PrismaClient {
  if (!poolSingleton) {
    poolSingleton = new Pool({ connectionString: getRestaurantDatabaseUrl() });
  }
  if (!prismaSingleton) {
    prismaSingleton = new PrismaClient({
      adapter: new PrismaPg(poolSingleton),
    });
  }
  return prismaSingleton;
}

export async function closeRestaurantPrisma(): Promise<void> {
  if (prismaSingleton) {
    await prismaSingleton.$disconnect();
    prismaSingleton = null;
  }
  if (poolSingleton) {
    await poolSingleton.end();
    poolSingleton = null;
  }
}

export async function loginAsCredentials(
  request: APIRequestContext,
  input: {
    email: string;
    password: string;
    tenantId: string;
    workspaceId: string;
  }
): Promise<AuthContext> {
  const payload = LoginInputSchema.parse({
    email: input.email,
    password: input.password,
    tenantId: input.tenantId,
  });

  const response = await request.post(`${API_BASE_URL}/auth/login`, {
    headers: {
      "Content-Type": "application/json",
    },
    data: payload,
  });

  expect(response.status()).toBe(201);
  const body = asRecord(await response.json()) as { accessToken?: unknown };
  expect(typeof body.accessToken).toBe("string");

  return {
    accessToken: String(body.accessToken),
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
  };
}

export async function createPosRegister(
  client: HttpClient,
  input: {
    name: string;
  },
  idempotencyKey: string
): Promise<{ response: APIResponse; register: CreateRegisterOutput }> {
  const { response, body } = await client.postJson("/pos/registers", input, idempotencyKey);
  const register = expectZod(CreateRegisterOutputSchema, body);
  return { response, register };
}

export async function listPosRegisters(
  client: HttpClient,
  input?: {
    status?: "ACTIVE" | "INACTIVE";
  }
): Promise<{ response: APIResponse; output: ListRegistersOutput }> {
  const { response, body } = await client.getJson("/pos/registers", {
    query: input,
  });
  const output = expectZod(ListRegistersOutputSchema, body) as ListRegistersOutput;
  return { response, output };
}

export async function openShift(
  client: HttpClient,
  input: {
    sessionId: string;
    registerId: string;
    openedByEmployeePartyId: string;
    startingCashCents: number | null;
    notes?: string;
  },
  idempotencyKey: string
): Promise<{ response: APIResponse; shift: OpenShiftOutput }> {
  const { response, body } = await client.postJson("/pos/shifts/open", input, idempotencyKey);
  const shift = expectZod(OpenShiftOutputSchema, body);
  return { response, shift };
}

export async function getCurrentShift(client: HttpClient, registerId: string) {
  const { response, body } = await client.getJson("/pos/shifts/current", {
    query: { registerId },
  });
  const output = expectZod(GetCurrentShiftOutputSchema, body) as GetCurrentShiftOutput;
  return { response, output };
}

export async function closeShift(
  client: HttpClient,
  input: {
    sessionId: string;
    closingCashCents: number | null;
    notes?: string;
  },
  idempotencyKey: string
): Promise<{ response: APIResponse; shift: CloseShiftOutput }> {
  const { response, body } = await client.postJson("/pos/shifts/close", input, idempotencyKey);
  return { response, shift: body as CloseShiftOutput };
}

export async function upsertDiningRoom(
  client: HttpClient,
  input: {
    id?: string;
    name: string;
    sortOrder?: number;
  },
  idempotencyKey: string
): Promise<{ response: APIResponse; room: UpsertDiningRoomOutput["room"] }> {
  const { response, body } = await client.postJson(
    "/restaurant/dining-rooms",
    input,
    idempotencyKey
  );
  const output = expectZod(UpsertDiningRoomOutputSchema, body) as UpsertDiningRoomOutput;
  return { response, room: output.room };
}

export async function upsertRestaurantTable(
  client: HttpClient,
  input: {
    id?: string;
    diningRoomId: string;
    name: string;
    capacity?: number | null;
    posX?: number | null;
    posY?: number | null;
    shape?: "SQUARE" | "ROUND" | "RECTANGLE";
    availabilityStatus?: "AVAILABLE" | "OCCUPIED" | "DIRTY" | "OUT_OF_SERVICE";
  },
  idempotencyKey: string
): Promise<{ response: APIResponse; table: UpsertRestaurantTableOutput["table"] }> {
  const { response, body } = await client.postJson("/restaurant/tables", input, idempotencyKey);
  const output = expectZod(UpsertRestaurantTableOutputSchema, body) as UpsertRestaurantTableOutput;
  return { response, table: output.table };
}

export async function upsertModifierGroup(
  client: HttpClient,
  input: {
    id?: string;
    name: string;
    selectionMode?: "SINGLE" | "MULTI";
    isRequired?: boolean;
    sortOrder?: number;
    linkedCatalogItemIds?: string[];
    options: Array<{
      id?: string;
      name: string;
      priceDeltaCents?: number;
      sortOrder?: number;
    }>;
  },
  idempotencyKey: string
): Promise<{
  response: APIResponse;
  modifierGroup: UpsertRestaurantModifierGroupOutput["modifierGroup"];
}> {
  const { response, body } = await client.postJson(
    "/restaurant/modifier-groups",
    input,
    idempotencyKey
  );
  const output = expectZod(
    UpsertRestaurantModifierGroupOutputSchema,
    body
  ) as UpsertRestaurantModifierGroupOutput;
  return { response, modifierGroup: output.modifierGroup };
}

export async function listRestaurantModifierGroups(
  client: HttpClient,
  query?: Record<string, string | number>
): Promise<{ response: APIResponse; output: ListRestaurantModifierGroupsOutput }> {
  const { response, body } = await client.getJson("/restaurant/modifier-groups", { query });
  const output = expectZod(
    ListRestaurantModifierGroupsOutputSchema,
    body
  ) as ListRestaurantModifierGroupsOutput;
  return { response, output };
}

export async function upsertKitchenStation(
  client: HttpClient,
  input: {
    id?: string;
    name: string;
    code: string;
  },
  idempotencyKey: string
): Promise<{ response: APIResponse; station: UpsertKitchenStationOutput["station"] }> {
  const { response, body } = await client.postJson(
    "/restaurant/kitchen-stations",
    input,
    idempotencyKey
  );
  const output = expectZod(UpsertKitchenStationOutputSchema, body) as UpsertKitchenStationOutput;
  return { response, station: output.station };
}

export async function getRestaurantFloorPlan(client: HttpClient) {
  const { response, body } = await client.getJson("/restaurant/floor-plan");
  const output = expectZod(
    GetRestaurantFloorPlanOutputSchema,
    body
  ) as GetRestaurantFloorPlanOutput;
  return { response, output };
}

export async function openRestaurantTable(
  client: HttpClient,
  input: {
    tableSessionId: string;
    orderId: string;
    tableId: string;
    registerId?: string | null;
    shiftSessionId?: string | null;
    openedAt?: string;
    notes?: string | null;
  },
  idempotencyKey: string
): Promise<{ response: APIResponse; output: OpenRestaurantTableOutput }> {
  const { response, body } = await client.postJson(
    "/restaurant/tables/open",
    { ...input, idempotencyKey },
    idempotencyKey
  );
  const output = expectZod(OpenRestaurantTableOutputSchema, body) as OpenRestaurantTableOutput;
  return { response, output };
}

export async function getActiveRestaurantOrder(client: HttpClient, tableId: string) {
  const { response, body } = await client.getJson(
    `/restaurant/tables/${encodeURIComponent(tableId)}/current`
  );
  const output = expectZod(
    GetActiveRestaurantOrderOutputSchema,
    body
  ) as GetActiveRestaurantOrderOutput;
  return { response, output };
}

export async function putRestaurantDraftOrder(
  client: HttpClient,
  input: {
    orderId: string;
    items: unknown[];
    discountCents?: number;
  },
  idempotencyKey: string
): Promise<{ response: APIResponse; output: PutRestaurantDraftOrderOutput }> {
  const { response, body } = await client.putJson(
    `/restaurant/orders/${encodeURIComponent(input.orderId)}/draft`,
    { ...input, idempotencyKey },
    idempotencyKey
  );
  const output = expectZod(
    PutRestaurantDraftOrderOutputSchema,
    body
  ) as PutRestaurantDraftOrderOutput;
  return { response, output };
}

export async function sendRestaurantOrderToKitchen(
  client: HttpClient,
  orderId: string,
  idempotencyKey: string
): Promise<{ response: APIResponse; output: SendRestaurantOrderToKitchenOutput }> {
  const { response, body } = await client.postJson(
    `/restaurant/orders/${encodeURIComponent(orderId)}/send`,
    { orderId, idempotencyKey },
    idempotencyKey
  );
  const output = expectZod(
    SendRestaurantOrderToKitchenOutputSchema,
    body
  ) as SendRestaurantOrderToKitchenOutput;
  return { response, output };
}

export async function transferRestaurantTable(
  client: HttpClient,
  input: {
    tableSessionId: string;
    orderId: string;
    toTableId: string;
  },
  idempotencyKey: string
) {
  return client.postJson(
    `/restaurant/orders/${encodeURIComponent(input.orderId)}/transfer`,
    { ...input, idempotencyKey },
    idempotencyKey
  );
}

export async function mergeRestaurantChecks(
  client: HttpClient,
  input: {
    targetOrderId: string;
    targetTableSessionId: string;
    sourceOrderId: string;
    sourceTableSessionId: string;
  },
  idempotencyKey: string
): Promise<{ response: APIResponse; output: MergeRestaurantChecksOutput }> {
  const { response, body } = await client.postJson(
    `/restaurant/orders/${encodeURIComponent(input.targetOrderId)}/merge`,
    { ...input, idempotencyKey },
    idempotencyKey
  );
  const output = expectZod(MergeRestaurantChecksOutputSchema, body) as MergeRestaurantChecksOutput;
  return { response, output };
}

export async function listKitchenTickets(client: HttpClient, query?: Record<string, string>) {
  const { response, body } = await client.getJson("/restaurant/kitchen/tickets", { query });
  const output = expectZod(ListKitchenTicketsOutputSchema, body) as ListKitchenTicketsOutput;
  return { response, output };
}

export async function updateKitchenTicketStatus(
  client: HttpClient,
  input: {
    ticketId: string;
    status: "NEW" | "IN_PROGRESS" | "DONE" | "BUMPED";
  },
  idempotencyKey: string
): Promise<{ response: APIResponse; output: UpdateKitchenTicketStatusOutput }> {
  const { response, body } = await client.postJson(
    `/restaurant/kitchen/tickets/${encodeURIComponent(input.ticketId)}/status`,
    { ...input, idempotencyKey },
    idempotencyKey
  );
  const output = expectZod(
    UpdateKitchenTicketStatusOutputSchema,
    body
  ) as UpdateKitchenTicketStatusOutput;
  return { response, output };
}

export async function requestRestaurantVoid(
  client: HttpClient,
  input: {
    orderItemId: string;
    reason: string;
  },
  idempotencyKey: string
): Promise<{ response: APIResponse; output: RestaurantApprovalMutationOutput }> {
  const { response, body } = await client.postJson(
    "/restaurant/approvals/void",
    { ...input, idempotencyKey },
    idempotencyKey
  );
  const output = expectZod(
    RestaurantApprovalMutationOutputSchema,
    body
  ) as RestaurantApprovalMutationOutput;
  return { response, output };
}

export async function requestRestaurantDiscount(
  client: HttpClient,
  input: {
    orderId: string;
    amountCents: number;
    reason: string;
  },
  idempotencyKey: string
): Promise<{ response: APIResponse; output: RestaurantApprovalMutationOutput }> {
  const { response, body } = await client.postJson(
    "/restaurant/approvals/discount",
    { ...input, idempotencyKey },
    idempotencyKey
  );
  const output = expectZod(
    RestaurantApprovalMutationOutputSchema,
    body
  ) as RestaurantApprovalMutationOutput;
  return { response, output };
}

export async function approveRestaurantApproval(
  client: HttpClient,
  approvalRequestId: string,
  input: {
    comment?: string;
  },
  idempotencyKey: string
): Promise<{ response: APIResponse; body: unknown }> {
  const payload = DecideRestaurantApprovalInputSchema.parse({
    approvalRequestId,
    comment: input.comment,
    idempotencyKey,
  });
  return client.postJson(
    `/restaurant/approvals/${encodeURIComponent(approvalRequestId)}/approve`,
    payload,
    idempotencyKey
  );
}

export async function closeRestaurantTable(
  client: HttpClient,
  input: {
    orderId: string;
    tableSessionId: string;
    payments: Array<{
      paymentId: string;
      method: "CASH" | "CARD" | "BANK_TRANSFER" | "OTHER";
      amountCents: number;
      reference?: string | null;
    }>;
  },
  idempotencyKey: string
): Promise<{ response: APIResponse; output: CloseRestaurantTableOutput }> {
  const { response, body } = await client.postJson(
    `/restaurant/orders/${encodeURIComponent(input.orderId)}/close`,
    { ...input, idempotencyKey },
    idempotencyKey
  );
  const output = expectZod(CloseRestaurantTableOutputSchema, body);
  return { response, output };
}

export async function createApprovalPolicy(
  request: APIRequestContext,
  auth: AuthContext,
  input: ApprovalPolicyInput
): Promise<{ response: APIResponse; body: Record<string, unknown> }> {
  const response = await request.post(`${API_BASE_URL}/approvals/policies`, {
    headers: {
      ...buildAuthHeaders(auth),
      "Content-Type": "application/json",
    },
    data: input,
  });
  const body = asRecord(await response.json());
  return { response, body };
}

export async function seedRestaurantActors(
  prisma: PrismaClient,
  input: {
    tenantId: string;
    workspaceId: string;
    ownerUserId: string;
    ownerEmail: string;
    password: string;
  }
): Promise<{
  manager: { userId: string; email: string; password: string; roleId: string };
  cashier: { userId: string; email: string; password: string; roleId: string };
}> {
  const owner = await prisma.user.findUniqueOrThrow({
    where: { id: input.ownerUserId },
    select: { passwordHash: true },
  });

  const seedUser = async (config: {
    email: string;
    name: string;
    roleName: string;
  }): Promise<{ userId: string; email: string; password: string; roleId: string }> => {
    const user = await prisma.user.create({
      data: {
        id: randomUUID(),
        email: config.email,
        name: config.name,
        passwordHash: owner.passwordHash,
        status: "ACTIVE",
      },
      select: { id: true, email: true },
    });

    const role = await prisma.role.upsert({
      where: {
        tenantId_name: {
          tenantId: input.tenantId,
          name: config.roleName,
        },
      },
      update: {
        description: `E2E role ${config.roleName}`,
        isSystem: false,
      },
      create: {
        tenantId: input.tenantId,
        name: config.roleName,
        scope: "TENANT",
        systemKey: null,
        description: `E2E role ${config.roleName}`,
        isSystem: false,
      },
      select: { id: true },
    });

    await prisma.membership.create({
      data: {
        tenantId: input.tenantId,
        userId: user.id,
        roleId: role.id,
      },
    });

    await prisma.workspaceMembership.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: input.workspaceId,
          userId: user.id,
        },
      },
      update: {
        role: "MEMBER",
        status: "ACTIVE",
      },
      create: {
        workspaceId: input.workspaceId,
        userId: user.id,
        role: "MEMBER",
        status: "ACTIVE",
      },
    });

    return {
      userId: user.id,
      email: user.email,
      password: input.password,
      roleId: role.id,
    };
  };

  const emailPrefix = input.ownerEmail.split("@")[0] ?? "e2e";
  const nonce = Date.now().toString(36);

  const manager = await seedUser({
    email: `${emailPrefix}+restaurant-manager-${nonce}@corely.local`,
    name: "Restaurant Manager",
    roleName: "Restaurant Manager",
  });
  const cashier = await seedUser({
    email: `${emailPrefix}+restaurant-cashier-${nonce}@corely.local`,
    name: "Restaurant Cashier",
    roleName: "Restaurant Cashier",
  });

  return { manager, cashier };
}

export async function seedShiftCloseCashMirror(
  prisma: PrismaClient,
  input: {
    tenantId: string;
    workspaceId: string;
    registerId: string;
    ownerUserId: string;
    openingCashCents: number;
    dayKey: string;
  }
): Promise<void> {
  await prisma.cashRegister.upsert({
    where: { id: input.registerId },
    update: {
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
      name: `POS Register ${input.registerId.slice(0, 8)}`,
      currency: "EUR",
      currentBalanceCents: input.openingCashCents,
      disallowNegativeBalance: false,
    },
    create: {
      id: input.registerId,
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
      name: `POS Register ${input.registerId.slice(0, 8)}`,
      currency: "EUR",
      currentBalanceCents: input.openingCashCents,
      disallowNegativeBalance: false,
    },
  });

  await prisma.cashEntryCounter.upsert({
    where: { registerId: input.registerId },
    update: {
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
      lastEntryNo: input.openingCashCents > 0 ? 1 : 0,
    },
    create: {
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
      registerId: input.registerId,
      lastEntryNo: input.openingCashCents > 0 ? 1 : 0,
    },
  });

  if (input.openingCashCents <= 0) {
    return;
  }

  const existing = await prisma.cashEntry.findFirst({
    where: {
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
      registerId: input.registerId,
      referenceId: `shift-open:${input.registerId}:${input.dayKey}`,
    },
    select: { id: true },
  });
  if (existing) {
    return;
  }

  await prisma.cashEntry.create({
    data: {
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
      registerId: input.registerId,
      entryNo: 1,
      direction: "IN",
      entryType: "OPENING_FLOAT",
      source: "MANUAL",
      paymentMethod: "CASH",
      amountCents: input.openingCashCents,
      grossAmountCents: input.openingCashCents,
      netAmountCents: input.openingCashCents,
      taxAmountCents: 0,
      taxMode: "NONE",
      taxCodeId: null,
      taxCode: null,
      taxRateBps: null,
      taxLabel: null,
      currency: "EUR",
      description: "POS shift opening float",
      sourceDocumentId: null,
      sourceDocumentRef: null,
      sourceDocumentKind: null,
      referenceId: `shift-open:${input.registerId}:${input.dayKey}`,
      occurredAt: new Date(`${input.dayKey}T08:00:00.000Z`),
      dayKey: input.dayKey,
      balanceAfterCents: input.openingCashCents,
      reversalOfEntryId: null,
      reversedByEntryId: null,
      lockedByDayCloseId: null,
      type: "OPENING_FLOAT",
      sourceType: "MANUAL",
      businessDate: input.dayKey,
      createdByUserId: input.ownerUserId,
    },
  });
}
