import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { expect } from "@playwright/test";
import { test } from "../fixtures.ts";
import { buildAuthHeaders, loginAsSeededUser } from "../helpers/auth.ts";
import { startBillingTrial } from "../helpers/billing-fixtures.ts";
import { resetTenantDataForE2e, seedIsolatedTestData } from "../helpers/db-reset.ts";
import { HttpClient } from "../helpers/http-client.ts";
import {
  autoAcceptNativeDialogs,
  loginToLivePos,
  openShiftFromGuardAndSubmit,
  selectRegisterByName,
} from "../pos/helpers.ts";
import {
  approveRestaurantApproval,
  closeRestaurantTable,
  closeRestaurantPrisma,
  closeShift,
  createApprovalPolicy,
  createPosRegister,
  createRestaurantPrisma,
  expectProblem,
  getActiveRestaurantOrder,
  getCurrentShift,
  getRestaurantFloorPlan,
  listPosRegisters,
  listKitchenTickets,
  listRestaurantModifierGroups,
  loginAsCredentials,
  mergeRestaurantChecks,
  openRestaurantTable,
  openShift,
  putRestaurantDraftOrder,
  requestRestaurantDiscount,
  requestRestaurantVoid,
  restaurantIdempotencyKey,
  seedRestaurantActors,
  seedShiftCloseCashMirror,
  sendRestaurantOrderToKitchen,
  transferRestaurantTable,
  updateKitchenTicketStatus,
  upsertDiningRoom,
  upsertKitchenStation,
  upsertModifierGroup,
  upsertRestaurantTable,
} from "../helpers/restaurant-fixtures.ts";

const prisma = process.env.DATABASE_URL ? createRestaurantPrisma() : null;
const POS_BROWSER_BASE_URL = process.env.POS_BASE_URL ?? "http://pos.localhost:6080";
const POS_BROWSER_DEMO_EMAIL =
  process.env.CORELY_RESTAURANT_DEMO_CASHIER_EMAIL ?? "cashier.linh@corely.local";
const POS_BROWSER_DEMO_PASSWORD = process.env.CORELY_RESTAURANT_DEMO_PASSWORD ?? "Password123!";
const POS_BROWSER_DEMO_REGISTER_NAME = "POS Front Counter";
const POS_BROWSER_DEMO_TABLE_NAME = "Table 5";

function requirePrisma(): PrismaClient {
  if (!prisma) {
    throw new Error("DATABASE_URL is required for restaurant e2e tests");
  }
  return prisma;
}

async function seedRestaurantVenue(
  client: HttpClient,
  testName: string,
  catalogItemId: string
): Promise<{
  roomId: string;
  tableAId: string;
  tableBId: string;
}> {
  const room = await upsertDiningRoom(
    client,
    { name: `${testName} Room`, sortOrder: 0 },
    `room-${testName}`
  );
  const tableA = await upsertRestaurantTable(
    client,
    {
      diningRoomId: room.room.id,
      name: `${testName} T1`,
      capacity: 4,
      posX: 10,
      posY: 10,
      shape: "ROUND",
    },
    `table-a-${testName}`
  );
  const tableB = await upsertRestaurantTable(
    client,
    {
      diningRoomId: room.room.id,
      name: `${testName} T2`,
      capacity: 4,
      posX: 20,
      posY: 10,
      shape: "ROUND",
    },
    `table-b-${testName}`
  );

  await upsertModifierGroup(
    client,
    {
      name: `${testName} Modifiers`,
      selectionMode: "MULTI",
      isRequired: false,
      sortOrder: 0,
      linkedCatalogItemIds: [catalogItemId],
      options: [{ name: "Extra cheese", priceDeltaCents: 200, sortOrder: 0 }],
    },
    `modifier-${testName}`
  );

  await upsertKitchenStation(
    client,
    {
      name: `${testName} Kitchen`,
      code: `K-${testName}`.slice(0, 20),
    },
    `station-${testName}`
  );

  return {
    roomId: room.room.id,
    tableAId: tableA.table.id,
    tableBId: tableB.table.id,
  };
}

function draftOrderItems(catalogItemId: string) {
  return [
    {
      catalogItemId,
      itemName: "Margherita Pizza",
      sku: "PIZZA-MARG",
      quantity: 1,
      unitPriceCents: 1200,
      taxRateBps: 700,
      modifiers: [
        {
          modifierGroupId: "mod-extra-cheese",
          optionName: "Extra cheese",
          quantity: 1,
          priceDeltaCents: 200,
        },
      ],
    },
  ];
}

function draftMenuItems(catalogItemId: string) {
  return [
    {
      catalogItemId,
      itemName: "Margherita Pizza",
      sku: "PIZZA-MARG",
      quantity: 1,
      unitPriceCents: 1200,
      taxRateBps: 700,
      modifiers: [
        {
          modifierGroupId: "mod-extra-cheese",
          optionName: "Extra cheese",
          quantity: 1,
          priceDeltaCents: 200,
        },
      ],
    },
    {
      catalogItemId: `${catalogItemId}-drink`,
      itemName: "Lemonade",
      sku: "DRINK-LEMON",
      quantity: 2,
      unitPriceCents: 500,
      taxRateBps: 1000,
      modifiers: [],
    },
  ];
}

test.describe("Restaurant POS Phase 1 API E2E", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "API e2e runs once in chromium.");

  test.afterAll(async () => {
    if (prisma) {
      await closeRestaurantPrisma();
    }
  });

  test("opens a shift for an authorized cashier on an active register with opening cash", async ({
    request,
    testData,
  }, testInfo) => {
    const ownerAuth = await loginAsSeededUser(request, testData);
    const ownerClient = new HttpClient(request, ownerAuth);
    const actors = await seedRestaurantActors(requirePrisma(), {
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
      ownerUserId: testData.user.id,
      ownerEmail: testData.user.email,
      password: testData.user.password,
    });
    const cashierAuth = await loginAsCredentials(request, {
      email: actors.cashier.email,
      password: actors.cashier.password,
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
    });
    const cashierClient = new HttpClient(request, cashierAuth);
    const openingCashCents = 2_500;

    const register = await createPosRegister(
      ownerClient,
      { name: `Shift Open Register ${Date.now()}` },
      restaurantIdempotencyKey(testInfo, "shift-open-register")
    );
    expect(register.response.status()).toBe(201);

    const activeRegisters = await listPosRegisters(cashierClient, { status: "ACTIVE" });
    expect(activeRegisters.response.status()).toBe(200);
    expect(
      activeRegisters.output.registers.some(
        (candidate) => candidate.registerId === register.register.registerId
      )
    ).toBe(true);

    const openedAtWindowStart = Date.now();
    const shift = await openShift(
      cashierClient,
      {
        sessionId: randomUUID(),
        registerId: register.register.registerId,
        openedByEmployeePartyId: actors.cashier.userId,
        startingCashCents: openingCashCents,
        notes: "Focused shift-open e2e",
      },
      restaurantIdempotencyKey(testInfo, "shift-open-focused")
    );
    expect(shift.response.status()).toBe(201);
    expect(shift.shift.status).toBe("OPEN");

    const currentShift = await getCurrentShift(cashierClient, register.register.registerId);
    expect(currentShift.response.status()).toBe(200);
    expect(currentShift.output.session?.sessionId).toBe(shift.shift.sessionId);
    expect(currentShift.output.session?.registerId).toBe(register.register.registerId);
    expect(currentShift.output.session?.status).toBe("OPEN");
    expect(currentShift.output.session?.startingCashCents).toBe(openingCashCents);
    expect(currentShift.output.session?.openedByEmployeePartyId).toBe(actors.cashier.userId);

    const db = requirePrisma();
    const persistedShift = await db.shiftSession.findUnique({
      where: {
        id: shift.shift.sessionId,
        workspaceId: testData.workspace.id,
      },
    });
    expect(persistedShift).toBeTruthy();
    expect(persistedShift?.workspaceId).toBe(testData.workspace.id);
    expect(persistedShift?.registerId).toBe(register.register.registerId);
    expect(persistedShift?.openedByEmployeePartyId).toBe(actors.cashier.userId);
    expect(persistedShift?.startingCashCents).toBe(openingCashCents);
    expect(persistedShift?.status).toBe("OPEN");
    expect(persistedShift?.closedAt).toBeNull();
    expect(persistedShift?.openedAt.getTime()).toBeGreaterThanOrEqual(openedAtWindowStart - 1_000);

    const duplicateOpen = await cashierClient.postJson(
      "/pos/shifts/open",
      {
        sessionId: randomUUID(),
        registerId: register.register.registerId,
        openedByEmployeePartyId: actors.cashier.userId,
        startingCashCents: openingCashCents,
        notes: "duplicate shift open should fail",
      },
      restaurantIdempotencyKey(testInfo, "shift-open-duplicate")
    );
    await expectProblem(duplicateOpen.response, 409);
  });

  test("loads the floor plan with room and real-time table availability states", async ({
    request,
    testData,
  }, testInfo) => {
    const ownerAuth = await loginAsSeededUser(request, testData);
    const ownerClient = new HttpClient(request, ownerAuth);
    const actors = await seedRestaurantActors(requirePrisma(), {
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
      ownerUserId: testData.user.id,
      ownerEmail: testData.user.email,
      password: testData.user.password,
    });
    const cashierAuth = await loginAsCredentials(request, {
      email: actors.cashier.email,
      password: actors.cashier.password,
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
    });
    const cashierClient = new HttpClient(request, cashierAuth);
    const testName = `floor-plan-${Date.now()}`;
    const catalogItemId = `catalog-${randomUUID()}`;

    const room = await upsertDiningRoom(
      ownerClient,
      { name: `${testName} Room`, sortOrder: 0 },
      restaurantIdempotencyKey(testInfo, "floor-plan-room")
    );
    expect(room.response.status()).toBe(201);

    const availableTable = await upsertRestaurantTable(
      ownerClient,
      {
        diningRoomId: room.room.id,
        name: `${testName} Available`,
        capacity: 4,
        posX: 10,
        posY: 10,
        shape: "ROUND",
        availabilityStatus: "AVAILABLE",
      },
      restaurantIdempotencyKey(testInfo, "floor-plan-table-available")
    );
    const occupiedTable = await upsertRestaurantTable(
      ownerClient,
      {
        diningRoomId: room.room.id,
        name: `${testName} Occupied`,
        capacity: 4,
        posX: 20,
        posY: 10,
        shape: "ROUND",
        availabilityStatus: "AVAILABLE",
      },
      restaurantIdempotencyKey(testInfo, "floor-plan-table-occupied")
    );
    const dirtyTable = await upsertRestaurantTable(
      ownerClient,
      {
        diningRoomId: room.room.id,
        name: `${testName} Dirty`,
        capacity: 2,
        posX: 30,
        posY: 10,
        shape: "SQUARE",
        availabilityStatus: "DIRTY",
      },
      restaurantIdempotencyKey(testInfo, "floor-plan-table-dirty")
    );
    const blockedTable = await upsertRestaurantTable(
      ownerClient,
      {
        diningRoomId: room.room.id,
        name: `${testName} Blocked`,
        capacity: 6,
        posX: 40,
        posY: 10,
        shape: "RECTANGLE",
        availabilityStatus: "OUT_OF_SERVICE",
      },
      restaurantIdempotencyKey(testInfo, "floor-plan-table-blocked")
    );
    expect(availableTable.response.status()).toBe(201);
    expect(occupiedTable.response.status()).toBe(201);
    expect(dirtyTable.response.status()).toBe(201);
    expect(blockedTable.response.status()).toBe(201);

    const occupiedSession = await openRestaurantTable(
      cashierClient,
      {
        tableSessionId: randomUUID(),
        orderId: randomUUID(),
        tableId: occupiedTable.table.id,
        notes: "Occupied for floor plan visibility",
      },
      restaurantIdempotencyKey(testInfo, "floor-plan-open-occupied")
    );
    expect(occupiedSession.response.status()).toBe(201);

    const floorPlan = await getRestaurantFloorPlan(cashierClient);
    expect(floorPlan.response.status()).toBe(200);

    const roomView = floorPlan.output.rooms.find((candidate) => candidate.id === room.room.id);
    expect(roomView).toBeTruthy();
    expect(roomView?.tables).toHaveLength(4);

    const availableView = roomView?.tables.find((table) => table.id === availableTable.table.id);
    const occupiedView = roomView?.tables.find((table) => table.id === occupiedTable.table.id);
    const dirtyView = roomView?.tables.find((table) => table.id === dirtyTable.table.id);
    const blockedView = roomView?.tables.find((table) => table.id === blockedTable.table.id);

    expect(availableView?.availabilityStatus).toBe("AVAILABLE");
    expect(availableView?.activeOrderId).toBeNull();
    expect(availableView?.activeSessionId).toBeNull();

    expect(occupiedView?.availabilityStatus).toBe("OCCUPIED");
    expect(occupiedView?.activeOrderId).toBe(occupiedSession.output.order.id);
    expect(occupiedView?.activeSessionId).toBe(occupiedSession.output.session.id);

    expect(dirtyView?.availabilityStatus).toBe("DIRTY");
    expect(dirtyView?.activeOrderId).toBeNull();
    expect(dirtyView?.activeSessionId).toBeNull();

    expect(blockedView?.availabilityStatus).toBe("OUT_OF_SERVICE");
    expect(blockedView?.activeOrderId).toBeNull();
    expect(blockedView?.activeSessionId).toBeNull();

    const selectableTables = roomView?.tables.filter(
      (table) => table.availabilityStatus === "AVAILABLE"
    );
    expect(selectableTables?.map((table) => table.id)).toContain(availableTable.table.id);
  });

  test("opens an available table into an active session with a draft order during an open shift", async ({
    request,
    testData,
  }, testInfo) => {
    const ownerAuth = await loginAsSeededUser(request, testData);
    const ownerClient = new HttpClient(request, ownerAuth);
    const actors = await seedRestaurantActors(requirePrisma(), {
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
      ownerUserId: testData.user.id,
      ownerEmail: testData.user.email,
      password: testData.user.password,
    });
    const cashierAuth = await loginAsCredentials(request, {
      email: actors.cashier.email,
      password: actors.cashier.password,
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
    });
    const client = new HttpClient(request, cashierAuth);
    const openingCashCents = 3_000;
    const testName = `open-table-${Date.now()}`;

    const register = await createPosRegister(
      ownerClient,
      { name: `${testName} Register` },
      restaurantIdempotencyKey(testInfo, "open-table-register")
    );
    expect(register.response.status()).toBe(201);

    const shift = await openShift(
      client,
      {
        sessionId: randomUUID(),
        registerId: register.register.registerId,
        openedByEmployeePartyId: actors.cashier.userId,
        startingCashCents: openingCashCents,
        notes: "Open-table focused e2e shift",
      },
      restaurantIdempotencyKey(testInfo, "open-table-shift")
    );
    expect(shift.response.status()).toBe(201);

    const currentShift = await getCurrentShift(client, register.register.registerId);
    expect(currentShift.response.status()).toBe(200);
    expect(currentShift.output.session?.sessionId).toBe(shift.shift.sessionId);
    expect(currentShift.output.session?.status).toBe("OPEN");

    const room = await upsertDiningRoom(
      ownerClient,
      { name: `${testName} Room`, sortOrder: 0 },
      restaurantIdempotencyKey(testInfo, "open-table-room")
    );
    expect(room.response.status()).toBe(201);

    const table = await upsertRestaurantTable(
      ownerClient,
      {
        diningRoomId: room.room.id,
        name: `${testName} T1`,
        capacity: 4,
        posX: 12,
        posY: 18,
        shape: "ROUND",
        availabilityStatus: "AVAILABLE",
      },
      restaurantIdempotencyKey(testInfo, "open-table-table")
    );
    expect(table.response.status()).toBe(201);

    const floorBefore = await getRestaurantFloorPlan(client);
    expect(floorBefore.response.status()).toBe(200);
    const tableBefore = floorBefore.output.rooms
      .flatMap((candidateRoom) => candidateRoom.tables)
      .find((candidateTable) => candidateTable.id === table.table.id);
    expect(tableBefore?.availabilityStatus).toBe("AVAILABLE");
    expect(tableBefore?.activeSessionId).toBeNull();
    expect(tableBefore?.activeOrderId).toBeNull();

    const opened = await openRestaurantTable(
      client,
      {
        tableSessionId: randomUUID(),
        orderId: randomUUID(),
        tableId: table.table.id,
        registerId: register.register.registerId,
        shiftSessionId: shift.shift.sessionId,
        notes: "Guest seated for open-table focused e2e",
      },
      restaurantIdempotencyKey(testInfo, "open-table-command")
    );
    expect(opened.response.status()).toBe(201);
    expect(opened.output.session.id).toBeTruthy();
    expect(opened.output.session.tableId).toBe(table.table.id);
    expect(opened.output.session.registerId).toBe(register.register.registerId);
    expect(opened.output.session.shiftSessionId).toBe(shift.shift.sessionId);
    expect(opened.output.session.openedByUserId).toBe(actors.cashier.userId);
    expect(opened.output.session.status).toBe("OPEN");
    expect(opened.output.session.closedAt).toBeNull();
    expect(opened.output.order.id).toBeTruthy();
    expect(opened.output.order.tableId).toBe(table.table.id);
    expect(opened.output.order.tableSessionId).toBe(opened.output.session.id);
    expect(opened.output.order.status).toBe("DRAFT");
    expect(opened.output.order.items).toHaveLength(0);
    expect(opened.output.order.payments).toHaveLength(0);
    expect(opened.output.order.totalCents).toBe(0);
    expect(opened.output.order.closedAt).toBeNull();

    const floorAfter = await getRestaurantFloorPlan(client);
    expect(floorAfter.response.status()).toBe(200);
    const occupiedTable = floorAfter.output.rooms
      .flatMap((candidateRoom) => candidateRoom.tables)
      .find((candidateTable) => candidateTable.id === table.table.id);
    expect(occupiedTable?.availabilityStatus).toBe("OCCUPIED");
    expect(occupiedTable?.activeSessionId).toBe(opened.output.session.id);
    expect(occupiedTable?.activeOrderId).toBe(opened.output.order.id);

    const activeOrder = await getActiveRestaurantOrder(client, table.table.id);
    expect(activeOrder.response.status()).toBe(200);
    expect(activeOrder.output.session?.id).toBe(opened.output.session.id);
    expect(activeOrder.output.session?.status).toBe("OPEN");
    expect(activeOrder.output.order?.id).toBe(opened.output.order.id);
    expect(activeOrder.output.order?.status).toBe("DRAFT");
    expect(activeOrder.output.order?.tableSessionId).toBe(opened.output.session.id);

    const db = requirePrisma();
    const persistedSession = await db.restaurantTableSession.findUnique({
      where: { id: opened.output.session.id },
    });
    expect(persistedSession).toBeTruthy();
    expect(persistedSession?.tenantId).toBe(testData.tenant.id);
    expect(persistedSession?.workspaceId).toBe(testData.workspace.id);
    expect(persistedSession?.tableId).toBe(table.table.id);
    expect(persistedSession?.registerId).toBe(register.register.registerId);
    expect(persistedSession?.shiftSessionId).toBe(shift.shift.sessionId);
    expect(persistedSession?.openedByUserId).toBe(actors.cashier.userId);
    expect(persistedSession?.status).toBe("OPEN");
    expect(persistedSession?.closedAt).toBeNull();

    const persistedOrder = await db.restaurantOrder.findUnique({
      where: { id: opened.output.order.id },
    });
    expect(persistedOrder).toBeTruthy();
    expect(persistedOrder?.tenantId).toBe(testData.tenant.id);
    expect(persistedOrder?.workspaceId).toBe(testData.workspace.id);
    expect(persistedOrder?.tableId).toBe(table.table.id);
    expect(persistedOrder?.tableSessionId).toBe(opened.output.session.id);
    expect(persistedOrder?.status).toBe("DRAFT");
    expect(persistedOrder?.subtotalCents).toBe(0);
    expect(persistedOrder?.taxCents).toBe(0);
    expect(persistedOrder?.totalCents).toBe(0);
    expect(persistedOrder?.closedAt).toBeNull();
  });

  test("resumes an occupied table by loading the current open session, existing items, totals, and draft status", async ({
    request,
    testData,
  }, testInfo) => {
    const ownerAuth = await loginAsSeededUser(request, testData);
    const ownerClient = new HttpClient(request, ownerAuth);
    const actors = await seedRestaurantActors(requirePrisma(), {
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
      ownerUserId: testData.user.id,
      ownerEmail: testData.user.email,
      password: testData.user.password,
    });
    const cashierAuth = await loginAsCredentials(request, {
      email: actors.cashier.email,
      password: actors.cashier.password,
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
    });
    const client = new HttpClient(request, cashierAuth);
    const catalogItemId = `catalog-${randomUUID()}`;
    const testName = `resume-table-${Date.now()}`;

    const register = await createPosRegister(
      ownerClient,
      { name: `${testName} Register` },
      restaurantIdempotencyKey(testInfo, "resume-table-register")
    );
    expect(register.response.status()).toBe(201);

    const shift = await openShift(
      client,
      {
        sessionId: randomUUID(),
        registerId: register.register.registerId,
        openedByEmployeePartyId: actors.cashier.userId,
        startingCashCents: 2_500,
        notes: "Resume-table focused e2e shift",
      },
      restaurantIdempotencyKey(testInfo, "resume-table-shift")
    );
    expect(shift.response.status()).toBe(201);

    const venue = await seedRestaurantVenue(ownerClient, testName, catalogItemId);

    const opened = await openRestaurantTable(
      client,
      {
        tableSessionId: randomUUID(),
        orderId: randomUUID(),
        tableId: venue.tableAId,
        registerId: register.register.registerId,
        shiftSessionId: shift.shift.sessionId,
        notes: "Window table already in service",
      },
      restaurantIdempotencyKey(testInfo, "resume-table-open")
    );
    expect(opened.response.status()).toBe(201);
    expect(opened.output.session.status).toBe("OPEN");
    expect(opened.output.order.status).toBe("DRAFT");

    const draft = await putRestaurantDraftOrder(
      client,
      {
        orderId: opened.output.order.id,
        items: draftOrderItems(catalogItemId),
        discountCents: 0,
      },
      restaurantIdempotencyKey(testInfo, "resume-table-draft")
    );
    expect(draft.response.status()).toBe(200);
    expect(draft.output.order.id).toBe(opened.output.order.id);
    expect(draft.output.order.status).toBe("DRAFT");
    expect(draft.output.order.items).toHaveLength(1);
    expect(draft.output.order.items[0]?.itemName).toBe("Margherita Pizza");
    expect(draft.output.order.items[0]?.modifiers).toHaveLength(1);
    expect(draft.output.order.items[0]?.modifiers[0]?.optionName).toBe("Extra cheese");
    expect(draft.output.order.subtotalCents).toBe(1_400);
    expect(draft.output.order.taxCents).toBe(98);
    expect(draft.output.order.totalCents).toBe(1_498);

    const floorPlan = await getRestaurantFloorPlan(client);
    expect(floorPlan.response.status()).toBe(200);
    const occupiedTable = floorPlan.output.rooms
      .flatMap((room) => room.tables)
      .find((table) => table.id === venue.tableAId);
    expect(occupiedTable?.availabilityStatus).toBe("OCCUPIED");
    expect(occupiedTable?.activeSessionId).toBe(opened.output.session.id);
    expect(occupiedTable?.activeOrderId).toBe(opened.output.order.id);

    const resumed = await getActiveRestaurantOrder(client, venue.tableAId);
    expect(resumed.response.status()).toBe(200);
    expect(resumed.output.session?.id).toBe(opened.output.session.id);
    expect(resumed.output.session?.tableId).toBe(venue.tableAId);
    expect(resumed.output.session?.registerId).toBe(register.register.registerId);
    expect(resumed.output.session?.shiftSessionId).toBe(shift.shift.sessionId);
    expect(resumed.output.session?.status).toBe("OPEN");
    expect(resumed.output.order?.id).toBe(opened.output.order.id);
    expect(resumed.output.order?.tableSessionId).toBe(opened.output.session.id);
    expect(resumed.output.order?.status).toBe("DRAFT");
    expect(resumed.output.order?.items).toHaveLength(1);
    expect(resumed.output.order?.items[0]?.itemName).toBe("Margherita Pizza");
    expect(resumed.output.order?.items[0]?.quantity).toBe(1);
    expect(resumed.output.order?.items[0]?.modifiers).toHaveLength(1);
    expect(resumed.output.order?.items[0]?.modifiers[0]?.optionName).toBe("Extra cheese");
    expect(resumed.output.order?.subtotalCents).toBe(1_400);
    expect(resumed.output.order?.taxCents).toBe(98);
    expect(resumed.output.order?.totalCents).toBe(1_498);
    expect(resumed.output.order?.paidAt).toBeNull();
    expect(resumed.output.order?.closedAt).toBeNull();

    const db = requirePrisma();
    const persistedOrder = await db.restaurantOrder.findUnique({
      where: { id: opened.output.order.id },
      include: {
        items: {
          include: {
            modifiers: true,
          },
        },
      },
    });
    expect(persistedOrder).toBeTruthy();
    expect(persistedOrder?.status).toBe("DRAFT");
    expect(persistedOrder?.items).toHaveLength(1);
    expect(persistedOrder?.items[0]?.itemName).toBe("Margherita Pizza");
    expect(persistedOrder?.items[0]?.modifiers).toHaveLength(1);
    expect(persistedOrder?.subtotalCents).toBe(1_400);
    expect(persistedOrder?.taxCents).toBe(98);
    expect(persistedOrder?.totalCents).toBe(1_498);
  });

  test("adds menu items to an open table draft order and recalculates line totals, subtotal, tax, and total", async ({
    request,
    testData,
  }, testInfo) => {
    const ownerAuth = await loginAsSeededUser(request, testData);
    const ownerClient = new HttpClient(request, ownerAuth);
    const actors = await seedRestaurantActors(requirePrisma(), {
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
      ownerUserId: testData.user.id,
      ownerEmail: testData.user.email,
      password: testData.user.password,
    });
    const cashierAuth = await loginAsCredentials(request, {
      email: actors.cashier.email,
      password: actors.cashier.password,
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
    });
    const client = new HttpClient(request, cashierAuth);
    const catalogItemId = `catalog-${randomUUID()}`;
    const testName = `add-items-${Date.now()}`;

    const register = await createPosRegister(
      ownerClient,
      { name: `${testName} Register` },
      restaurantIdempotencyKey(testInfo, "add-items-register")
    );
    expect(register.response.status()).toBe(201);

    const shift = await openShift(
      client,
      {
        sessionId: randomUUID(),
        registerId: register.register.registerId,
        openedByEmployeePartyId: actors.cashier.userId,
        startingCashCents: 2_500,
        notes: "Add-items focused e2e shift",
      },
      restaurantIdempotencyKey(testInfo, "add-items-shift")
    );
    expect(shift.response.status()).toBe(201);

    const venue = await seedRestaurantVenue(ownerClient, testName, catalogItemId);

    const opened = await openRestaurantTable(
      client,
      {
        tableSessionId: randomUUID(),
        orderId: randomUUID(),
        tableId: venue.tableAId,
        registerId: register.register.registerId,
        shiftSessionId: shift.shift.sessionId,
        notes: "Guests ready to order",
      },
      restaurantIdempotencyKey(testInfo, "add-items-open-table")
    );
    expect(opened.response.status()).toBe(201);
    expect(opened.output.order.status).toBe("DRAFT");
    expect(opened.output.order.items).toHaveLength(0);

    const draft = await putRestaurantDraftOrder(
      client,
      {
        orderId: opened.output.order.id,
        items: draftMenuItems(catalogItemId),
        discountCents: 0,
      },
      restaurantIdempotencyKey(testInfo, "add-items-draft-order")
    );
    expect(draft.response.status()).toBe(200);
    expect(draft.output.order.status).toBe("DRAFT");
    expect(draft.output.order.items).toHaveLength(2);

    const pizza = draft.output.order.items.find((item) => item.sku === "PIZZA-MARG");
    const lemonade = draft.output.order.items.find((item) => item.sku === "DRINK-LEMON");
    expect(pizza).toBeTruthy();
    expect(pizza?.quantity).toBe(1);
    expect(pizza?.modifiers).toHaveLength(1);
    expect(pizza?.lineSubtotalCents).toBe(1_400);
    expect(pizza?.taxCents).toBe(98);
    expect(pizza?.lineTotalCents).toBe(1_498);

    expect(lemonade).toBeTruthy();
    expect(lemonade?.quantity).toBe(2);
    expect(lemonade?.modifiers).toHaveLength(0);
    expect(lemonade?.lineSubtotalCents).toBe(1_000);
    expect(lemonade?.taxCents).toBe(100);
    expect(lemonade?.lineTotalCents).toBe(1_100);

    expect(draft.output.order.subtotalCents).toBe(2_400);
    expect(draft.output.order.taxCents).toBe(198);
    expect(draft.output.order.totalCents).toBe(2_598);
    expect(draft.output.order.discountCents).toBe(0);

    const resumed = await getActiveRestaurantOrder(client, venue.tableAId);
    expect(resumed.response.status()).toBe(200);
    expect(resumed.output.session?.id).toBe(opened.output.session.id);
    expect(resumed.output.order?.id).toBe(opened.output.order.id);
    expect(resumed.output.order?.status).toBe("DRAFT");
    expect(resumed.output.order?.items).toHaveLength(2);
    expect(resumed.output.order?.subtotalCents).toBe(2_400);
    expect(resumed.output.order?.taxCents).toBe(198);
    expect(resumed.output.order?.totalCents).toBe(2_598);

    const db = requirePrisma();
    const persistedOrder = await db.restaurantOrder.findUnique({
      where: { id: opened.output.order.id },
      include: {
        items: {
          include: {
            modifiers: true,
          },
        },
      },
    });
    expect(persistedOrder).toBeTruthy();
    expect(persistedOrder?.status).toBe("DRAFT");
    expect(persistedOrder?.items).toHaveLength(2);
    expect(persistedOrder?.subtotalCents).toBe(2_400);
    expect(persistedOrder?.taxCents).toBe(198);
    expect(persistedOrder?.totalCents).toBe(2_598);
  });

  test("adds supported modifiers to an item, updates pricing, stores modifier snapshots, and sends the customization to kitchen and billing", async ({
    request,
    testData,
  }, testInfo) => {
    const ownerAuth = await loginAsSeededUser(request, testData);
    const ownerClient = new HttpClient(request, ownerAuth);
    const actors = await seedRestaurantActors(requirePrisma(), {
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
      ownerUserId: testData.user.id,
      ownerEmail: testData.user.email,
      password: testData.user.password,
    });
    const cashierAuth = await loginAsCredentials(request, {
      email: actors.cashier.email,
      password: actors.cashier.password,
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
    });
    const client = new HttpClient(request, cashierAuth);
    const catalogItemId = `catalog-${randomUUID()}`;
    const testName = `add-modifiers-${Date.now()}`;

    const register = await createPosRegister(
      ownerClient,
      { name: `${testName} Register` },
      restaurantIdempotencyKey(testInfo, "add-modifiers-register")
    );
    expect(register.response.status()).toBe(201);

    const shift = await openShift(
      client,
      {
        sessionId: randomUUID(),
        registerId: register.register.registerId,
        openedByEmployeePartyId: actors.cashier.userId,
        startingCashCents: 2_500,
        notes: "Add-modifiers focused e2e shift",
      },
      restaurantIdempotencyKey(testInfo, "add-modifiers-shift")
    );
    expect(shift.response.status()).toBe(201);

    const room = await upsertDiningRoom(
      ownerClient,
      { name: `${testName} Room`, sortOrder: 0 },
      restaurantIdempotencyKey(testInfo, "add-modifiers-room")
    );
    expect(room.response.status()).toBe(201);

    const table = await upsertRestaurantTable(
      ownerClient,
      {
        diningRoomId: room.room.id,
        name: `${testName} T1`,
        capacity: 4,
        posX: 10,
        posY: 10,
        shape: "ROUND",
      },
      restaurantIdempotencyKey(testInfo, "add-modifiers-table")
    );
    expect(table.response.status()).toBe(201);

    const cheeseGroup = await upsertModifierGroup(
      ownerClient,
      {
        name: `${testName} Cheese`,
        selectionMode: "MULTI",
        isRequired: false,
        sortOrder: 0,
        linkedCatalogItemIds: [catalogItemId],
        options: [
          { name: "Extra cheese", priceDeltaCents: 200, sortOrder: 0 },
          { name: "No onions", priceDeltaCents: 0, sortOrder: 1 },
        ],
      },
      restaurantIdempotencyKey(testInfo, "add-modifiers-group-cheese")
    );
    expect(cheeseGroup.response.status()).toBe(201);

    const donenessGroup = await upsertModifierGroup(
      ownerClient,
      {
        name: `${testName} Doneness`,
        selectionMode: "SINGLE",
        isRequired: false,
        sortOrder: 1,
        linkedCatalogItemIds: [catalogItemId],
        options: [{ name: "Medium rare", priceDeltaCents: 0, sortOrder: 0 }],
      },
      restaurantIdempotencyKey(testInfo, "add-modifiers-group-doneness")
    );
    expect(donenessGroup.response.status()).toBe(201);

    const sizeGroup = await upsertModifierGroup(
      ownerClient,
      {
        name: `${testName} Size`,
        selectionMode: "SINGLE",
        isRequired: false,
        sortOrder: 2,
        linkedCatalogItemIds: [catalogItemId],
        options: [{ name: "Large size", priceDeltaCents: 300, sortOrder: 0 }],
      },
      restaurantIdempotencyKey(testInfo, "add-modifiers-group-size")
    );
    expect(sizeGroup.response.status()).toBe(201);

    const kitchenStation = await upsertKitchenStation(
      ownerClient,
      {
        name: `${testName} Kitchen`,
        code: `K-${testName}`.slice(0, 20),
      },
      restaurantIdempotencyKey(testInfo, "add-modifiers-station")
    );
    expect(kitchenStation.response.status()).toBe(201);

    const modifierGroups = await listRestaurantModifierGroups(client, { page: 1, pageSize: 20 });
    expect(modifierGroups.response.status()).toBe(200);
    const groupsForItem = modifierGroups.output.items.filter((group) =>
      group.linkedCatalogItemIds.includes(catalogItemId)
    );
    expect(groupsForItem.map((group) => group.name)).toEqual(
      expect.arrayContaining([
        cheeseGroup.modifierGroup.name,
        donenessGroup.modifierGroup.name,
        sizeGroup.modifierGroup.name,
      ])
    );
    expect(
      groupsForItem
        .find((group) => group.id === cheeseGroup.modifierGroup.id)
        ?.options.map((option) => option.name)
    ).toEqual(expect.arrayContaining(["Extra cheese", "No onions"]));
    expect(
      groupsForItem
        .find((group) => group.id === donenessGroup.modifierGroup.id)
        ?.options.map((option) => option.name)
    ).toEqual(expect.arrayContaining(["Medium rare"]));
    expect(
      groupsForItem
        .find((group) => group.id === sizeGroup.modifierGroup.id)
        ?.options.map((option) => option.name)
    ).toEqual(expect.arrayContaining(["Large size"]));

    const opened = await openRestaurantTable(
      client,
      {
        tableSessionId: randomUUID(),
        orderId: randomUUID(),
        tableId: table.table.id,
        registerId: register.register.registerId,
        shiftSessionId: shift.shift.sessionId,
        notes: "Customized burger order",
      },
      restaurantIdempotencyKey(testInfo, "add-modifiers-open-table")
    );
    expect(opened.response.status()).toBe(201);

    const draft = await putRestaurantDraftOrder(
      client,
      {
        orderId: opened.output.order.id,
        items: [
          {
            catalogItemId,
            itemName: "House Burger",
            sku: "BURGER-HOUSE",
            quantity: 1,
            unitPriceCents: 1800,
            taxRateBps: 1000,
            modifiers: [
              {
                modifierGroupId: cheeseGroup.modifierGroup.id,
                optionName: "Extra cheese",
                quantity: 1,
                priceDeltaCents: 200,
              },
              {
                modifierGroupId: cheeseGroup.modifierGroup.id,
                optionName: "No onions",
                quantity: 1,
                priceDeltaCents: 0,
              },
              {
                modifierGroupId: donenessGroup.modifierGroup.id,
                optionName: "Medium rare",
                quantity: 1,
                priceDeltaCents: 0,
              },
              {
                modifierGroupId: sizeGroup.modifierGroup.id,
                optionName: "Large size",
                quantity: 1,
                priceDeltaCents: 300,
              },
            ],
          },
        ],
        discountCents: 0,
      },
      restaurantIdempotencyKey(testInfo, "add-modifiers-draft-order")
    );
    expect(draft.response.status()).toBe(200);
    expect(draft.output.order.status).toBe("DRAFT");
    expect(draft.output.order.items).toHaveLength(1);
    expect(draft.output.order.subtotalCents).toBe(2_300);
    expect(draft.output.order.taxCents).toBe(230);
    expect(draft.output.order.totalCents).toBe(2_530);

    const draftedItem = draft.output.order.items[0];
    expect(draftedItem?.itemName).toBe("House Burger");
    expect(draftedItem?.lineSubtotalCents).toBe(2_300);
    expect(draftedItem?.taxCents).toBe(230);
    expect(draftedItem?.lineTotalCents).toBe(2_530);
    expect(draftedItem?.modifiers).toHaveLength(4);
    expect(draftedItem?.modifiers.map((modifier) => modifier.optionName)).toEqual(
      expect.arrayContaining(["Extra cheese", "No onions", "Medium rare", "Large size"])
    );
    expect(
      draftedItem?.modifiers.find((modifier) => modifier.optionName === "Extra cheese")
        ?.priceDeltaCents
    ).toBe(200);
    expect(
      draftedItem?.modifiers.find((modifier) => modifier.optionName === "Large size")
        ?.priceDeltaCents
    ).toBe(300);

    const resumed = await getActiveRestaurantOrder(client, table.table.id);
    expect(resumed.response.status()).toBe(200);
    expect(resumed.output.order?.id).toBe(opened.output.order.id);
    expect(resumed.output.order?.status).toBe("DRAFT");
    expect(resumed.output.order?.items).toHaveLength(1);
    expect(
      resumed.output.order?.items[0]?.modifiers.map((modifier) => modifier.optionName)
    ).toEqual(expect.arrayContaining(["Extra cheese", "No onions", "Medium rare", "Large size"]));
    expect(resumed.output.order?.totalCents).toBe(2_530);

    const send = await sendRestaurantOrderToKitchen(
      client,
      opened.output.order.id,
      restaurantIdempotencyKey(testInfo, "add-modifiers-send")
    );
    expect(send.response.status()).toBe(201);
    expect(send.output.tickets).toHaveLength(1);
    expect(send.output.tickets[0]?.items).toHaveLength(1);
    expect(send.output.tickets[0]?.items[0]?.itemName).toBe("House Burger");
    expect(
      send.output.tickets[0]?.items[0]?.modifiers.map((modifier) => modifier.optionName)
    ).toEqual(expect.arrayContaining(["Extra cheese", "No onions", "Medium rare", "Large size"]));

    const tickets = await listKitchenTickets(client);
    expect(tickets.response.status()).toBe(200);
    const kitchenTicket = tickets.output.items.find(
      (ticket) => ticket.id === send.output.tickets[0]?.id
    );
    expect(kitchenTicket).toBeTruthy();
    expect(kitchenTicket?.items[0]?.modifiers.map((modifier) => modifier.optionName)).toEqual(
      expect.arrayContaining(["Extra cheese", "No onions", "Medium rare", "Large size"])
    );

    const db = requirePrisma();
    const persistedOrder = await db.restaurantOrder.findUnique({
      where: { id: opened.output.order.id },
      include: {
        items: {
          include: {
            modifiers: true,
          },
        },
      },
    });
    expect(persistedOrder).toBeTruthy();
    expect(persistedOrder?.status).toBe("SENT");
    expect(persistedOrder?.subtotalCents).toBe(2_300);
    expect(persistedOrder?.taxCents).toBe(230);
    expect(persistedOrder?.totalCents).toBe(2_530);
    expect(persistedOrder?.items).toHaveLength(1);
    expect(persistedOrder?.items[0]?.modifiers.map((modifier) => modifier.optionName)).toEqual(
      expect.arrayContaining(["Extra cheese", "No onions", "Medium rare", "Large size"])
    );
  });

  test("updates draft item quantity and modifiers or removes an item before send, recalculates totals, and records draft-update audit events", async ({
    request,
    testData,
  }, testInfo) => {
    const ownerAuth = await loginAsSeededUser(request, testData);
    const ownerClient = new HttpClient(request, ownerAuth);
    const actors = await seedRestaurantActors(requirePrisma(), {
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
      ownerUserId: testData.user.id,
      ownerEmail: testData.user.email,
      password: testData.user.password,
    });
    const cashierAuth = await loginAsCredentials(request, {
      email: actors.cashier.email,
      password: actors.cashier.password,
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
    });
    const client = new HttpClient(request, cashierAuth);
    const catalogItemId = `catalog-${randomUUID()}`;
    const testName = `edit-remove-items-${Date.now()}`;

    const register = await createPosRegister(
      ownerClient,
      { name: `${testName} Register` },
      restaurantIdempotencyKey(testInfo, "edit-remove-register")
    );
    expect(register.response.status()).toBe(201);

    const shift = await openShift(
      client,
      {
        sessionId: randomUUID(),
        registerId: register.register.registerId,
        openedByEmployeePartyId: actors.cashier.userId,
        startingCashCents: 2_500,
        notes: "Edit-remove focused e2e shift",
      },
      restaurantIdempotencyKey(testInfo, "edit-remove-shift")
    );
    expect(shift.response.status()).toBe(201);

    const room = await upsertDiningRoom(
      ownerClient,
      { name: `${testName} Room`, sortOrder: 0 },
      restaurantIdempotencyKey(testInfo, "edit-remove-room")
    );
    expect(room.response.status()).toBe(201);

    const table = await upsertRestaurantTable(
      ownerClient,
      {
        diningRoomId: room.room.id,
        name: `${testName} T1`,
        capacity: 4,
        posX: 10,
        posY: 10,
        shape: "ROUND",
      },
      restaurantIdempotencyKey(testInfo, "edit-remove-table")
    );
    expect(table.response.status()).toBe(201);

    const cheeseGroup = await upsertModifierGroup(
      ownerClient,
      {
        name: `${testName} Cheese`,
        selectionMode: "MULTI",
        isRequired: false,
        sortOrder: 0,
        linkedCatalogItemIds: [catalogItemId],
        options: [{ name: "Extra cheese", priceDeltaCents: 200, sortOrder: 0 }],
      },
      restaurantIdempotencyKey(testInfo, "edit-remove-group-cheese")
    );
    expect(cheeseGroup.response.status()).toBe(201);

    const sizeGroup = await upsertModifierGroup(
      ownerClient,
      {
        name: `${testName} Size`,
        selectionMode: "SINGLE",
        isRequired: false,
        sortOrder: 1,
        linkedCatalogItemIds: [catalogItemId],
        options: [{ name: "Large size", priceDeltaCents: 300, sortOrder: 0 }],
      },
      restaurantIdempotencyKey(testInfo, "edit-remove-group-size")
    );
    expect(sizeGroup.response.status()).toBe(201);

    const opened = await openRestaurantTable(
      client,
      {
        tableSessionId: randomUUID(),
        orderId: randomUUID(),
        tableId: table.table.id,
        registerId: register.register.registerId,
        shiftSessionId: shift.shift.sessionId,
        notes: "Draft corrections before send",
      },
      restaurantIdempotencyKey(testInfo, "edit-remove-open-table")
    );
    expect(opened.response.status()).toBe(201);

    const firstDraft = await putRestaurantDraftOrder(
      client,
      {
        orderId: opened.output.order.id,
        items: [
          {
            catalogItemId,
            itemName: "House Burger",
            sku: "BURGER-HOUSE",
            quantity: 1,
            unitPriceCents: 1800,
            taxRateBps: 1000,
            modifiers: [
              {
                modifierGroupId: cheeseGroup.modifierGroup.id,
                optionName: "Extra cheese",
                quantity: 1,
                priceDeltaCents: 200,
              },
            ],
          },
          {
            catalogItemId: `${catalogItemId}-fries`,
            itemName: "Fries",
            sku: "SIDE-FRIES",
            quantity: 1,
            unitPriceCents: 600,
            taxRateBps: 1000,
            modifiers: [],
          },
        ],
        discountCents: 0,
      },
      restaurantIdempotencyKey(testInfo, "edit-remove-first-draft")
    );
    expect(firstDraft.response.status()).toBe(200);
    expect(firstDraft.output.order.status).toBe("DRAFT");
    expect(firstDraft.output.order.items).toHaveLength(2);
    expect(firstDraft.output.order.subtotalCents).toBe(2_600);
    expect(firstDraft.output.order.taxCents).toBe(260);
    expect(firstDraft.output.order.totalCents).toBe(2_860);

    const burger = firstDraft.output.order.items.find((item) => item.sku === "BURGER-HOUSE");
    const fries = firstDraft.output.order.items.find((item) => item.sku === "SIDE-FRIES");
    expect(burger).toBeTruthy();
    expect(fries).toBeTruthy();

    const revisedDraft = await putRestaurantDraftOrder(
      client,
      {
        orderId: opened.output.order.id,
        items: [
          {
            id: burger?.id,
            catalogItemId,
            itemName: "House Burger",
            sku: "BURGER-HOUSE",
            quantity: 2,
            unitPriceCents: 1800,
            taxRateBps: 1000,
            modifiers: [
              {
                modifierGroupId: cheeseGroup.modifierGroup.id,
                optionName: "Extra cheese",
                quantity: 1,
                priceDeltaCents: 200,
              },
              {
                modifierGroupId: sizeGroup.modifierGroup.id,
                optionName: "Large size",
                quantity: 1,
                priceDeltaCents: 300,
              },
            ],
          },
        ],
        discountCents: 0,
      },
      restaurantIdempotencyKey(testInfo, "edit-remove-second-draft")
    );
    expect(revisedDraft.response.status()).toBe(200);
    expect(revisedDraft.output.order.status).toBe("DRAFT");
    expect(revisedDraft.output.order.items).toHaveLength(1);
    expect(revisedDraft.output.order.subtotalCents).toBe(4_100);
    expect(revisedDraft.output.order.taxCents).toBe(410);
    expect(revisedDraft.output.order.totalCents).toBe(4_510);

    const revisedBurger = revisedDraft.output.order.items[0];
    expect(revisedBurger?.id).toBe(burger?.id);
    expect(revisedBurger?.quantity).toBe(2);
    expect(revisedBurger?.modifiers).toHaveLength(2);
    expect(revisedBurger?.modifiers.map((modifier) => modifier.optionName)).toEqual(
      expect.arrayContaining(["Extra cheese", "Large size"])
    );
    expect(revisedBurger?.lineSubtotalCents).toBe(4_100);
    expect(revisedBurger?.taxCents).toBe(410);
    expect(revisedBurger?.lineTotalCents).toBe(4_510);

    const currentOrder = await getActiveRestaurantOrder(client, table.table.id);
    expect(currentOrder.response.status()).toBe(200);
    expect(currentOrder.output.order?.id).toBe(opened.output.order.id);
    expect(currentOrder.output.order?.status).toBe("DRAFT");
    expect(currentOrder.output.order?.items).toHaveLength(1);
    expect(currentOrder.output.order?.items[0]?.sku).toBe("BURGER-HOUSE");
    expect(currentOrder.output.order?.items[0]?.quantity).toBe(2);
    expect(currentOrder.output.order?.totalCents).toBe(4_510);

    const tickets = await listKitchenTickets(client);
    expect(tickets.response.status()).toBe(200);
    expect(tickets.output.items).toHaveLength(0);

    const db = requirePrisma();
    const persistedOrder = await db.restaurantOrder.findUnique({
      where: { id: opened.output.order.id },
      include: {
        items: {
          include: {
            modifiers: true,
          },
        },
      },
    });
    expect(persistedOrder).toBeTruthy();
    expect(persistedOrder?.status).toBe("DRAFT");
    expect(persistedOrder?.items).toHaveLength(1);
    expect(persistedOrder?.items[0]?.sku).toBe("BURGER-HOUSE");
    expect(persistedOrder?.items[0]?.quantity).toBe(2);
    expect(persistedOrder?.items[0]?.modifiers.map((modifier) => modifier.optionName)).toEqual(
      expect.arrayContaining(["Extra cheese", "Large size"])
    );
    expect(persistedOrder?.subtotalCents).toBe(4_100);
    expect(persistedOrder?.taxCents).toBe(410);
    expect(persistedOrder?.totalCents).toBe(4_510);

    const auditRows = await db.auditLog.findMany({
      where: {
        tenantId: testData.tenant.id,
        action: "restaurant.order.draft-updated",
        entityId: opened.output.order.id,
      },
      orderBy: { createdAt: "asc" },
    });
    expect(auditRows).toHaveLength(2);
    expect(auditRows.every((row) => row.actorUserId === actors.cashier.userId)).toBe(true);
    const auditDetails = auditRows.map((row) => JSON.parse(row.details ?? "{}")) as Array<{
      itemCount?: number;
      discountCents?: number;
    }>;
    expect(auditDetails[0]?.itemCount).toBe(2);
    expect(auditDetails[1]?.itemCount).toBe(1);
    expect(auditDetails[1]?.discountCents).toBe(0);

    const outboxRows = await db.outboxEvent.findMany({
      where: {
        tenantId: testData.tenant.id,
        eventType: "restaurant.order-draft-updated",
        correlationId: opened.output.order.id,
      },
      orderBy: { createdAt: "asc" },
    });
    expect(outboxRows).toHaveLength(2);
  });

  test("sends unsent order items to kitchen, marks them sent, routes the ticket to a configured station, and emits a kitchen event", async ({
    request,
    testData,
  }, testInfo) => {
    const ownerAuth = await loginAsSeededUser(request, testData);
    const ownerClient = new HttpClient(request, ownerAuth);
    const actors = await seedRestaurantActors(requirePrisma(), {
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
      ownerUserId: testData.user.id,
      ownerEmail: testData.user.email,
      password: testData.user.password,
    });
    const cashierAuth = await loginAsCredentials(request, {
      email: actors.cashier.email,
      password: actors.cashier.password,
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
    });
    const client = new HttpClient(request, cashierAuth);
    const catalogItemId = `catalog-${randomUUID()}`;
    const testName = `send-kitchen-${Date.now()}`;

    const register = await createPosRegister(
      ownerClient,
      { name: `${testName} Register` },
      restaurantIdempotencyKey(testInfo, "send-kitchen-register")
    );
    expect(register.response.status()).toBe(201);

    const shift = await openShift(
      client,
      {
        sessionId: randomUUID(),
        registerId: register.register.registerId,
        openedByEmployeePartyId: actors.cashier.userId,
        startingCashCents: 2_500,
        notes: "Send-kitchen focused e2e shift",
      },
      restaurantIdempotencyKey(testInfo, "send-kitchen-shift")
    );
    expect(shift.response.status()).toBe(201);

    const room = await upsertDiningRoom(
      ownerClient,
      { name: `${testName} Room`, sortOrder: 0 },
      restaurantIdempotencyKey(testInfo, "send-kitchen-room")
    );
    expect(room.response.status()).toBe(201);

    const table = await upsertRestaurantTable(
      ownerClient,
      {
        diningRoomId: room.room.id,
        name: `${testName} T1`,
        capacity: 4,
        posX: 10,
        posY: 10,
        shape: "ROUND",
      },
      restaurantIdempotencyKey(testInfo, "send-kitchen-table")
    );
    expect(table.response.status()).toBe(201);

    const modifierGroup = await upsertModifierGroup(
      ownerClient,
      {
        name: `${testName} Burger Mods`,
        selectionMode: "MULTI",
        isRequired: false,
        sortOrder: 0,
        linkedCatalogItemIds: [catalogItemId],
        options: [{ name: "Extra cheese", priceDeltaCents: 200, sortOrder: 0 }],
      },
      restaurantIdempotencyKey(testInfo, "send-kitchen-modifiers")
    );
    expect(modifierGroup.response.status()).toBe(201);

    const station = await upsertKitchenStation(
      ownerClient,
      {
        name: `${testName} Hot Line`,
        code: `K-${testName}`.slice(0, 20),
      },
      restaurantIdempotencyKey(testInfo, "send-kitchen-station")
    );
    expect(station.response.status()).toBe(201);

    const opened = await openRestaurantTable(
      client,
      {
        tableSessionId: randomUUID(),
        orderId: randomUUID(),
        tableId: table.table.id,
        registerId: register.register.registerId,
        shiftSessionId: shift.shift.sessionId,
        notes: "Order ready for kitchen send",
      },
      restaurantIdempotencyKey(testInfo, "send-kitchen-open-table")
    );
    expect(opened.response.status()).toBe(201);

    const draft = await putRestaurantDraftOrder(
      client,
      {
        orderId: opened.output.order.id,
        items: [
          {
            catalogItemId,
            itemName: "House Burger",
            sku: "BURGER-HOUSE",
            quantity: 2,
            unitPriceCents: 1800,
            taxRateBps: 1000,
            modifiers: [
              {
                modifierGroupId: modifierGroup.modifierGroup.id,
                optionName: "Extra cheese",
                quantity: 1,
                priceDeltaCents: 200,
              },
            ],
          },
        ],
        discountCents: 0,
      },
      restaurantIdempotencyKey(testInfo, "send-kitchen-draft")
    );
    expect(draft.response.status()).toBe(200);
    expect(draft.output.order.status).toBe("DRAFT");
    expect(draft.output.order.items).toHaveLength(1);
    expect(draft.output.order.items[0]?.sentQuantity).toBe(0);

    const sent = await sendRestaurantOrderToKitchen(
      client,
      opened.output.order.id,
      restaurantIdempotencyKey(testInfo, "send-kitchen-command")
    );
    expect(sent.response.status()).toBe(201);
    expect(sent.output.order.status).toBe("SENT");
    expect(sent.output.order.sentAt).toBeTruthy();
    expect(sent.output.order.items).toHaveLength(1);
    expect(sent.output.order.items[0]?.quantity).toBe(2);
    expect(sent.output.order.items[0]?.sentQuantity).toBe(2);
    expect(sent.output.order.items[0]?.modifiers.map((modifier) => modifier.optionName)).toEqual(
      expect.arrayContaining(["Extra cheese"])
    );

    expect(sent.output.tickets).toHaveLength(1);
    expect(sent.output.tickets[0]?.stationId).toBe(station.station.id);
    expect(sent.output.tickets[0]?.status).toBe("NEW");
    expect(sent.output.tickets[0]?.orderId).toBe(opened.output.order.id);
    expect(sent.output.tickets[0]?.tableSessionId).toBe(opened.output.session.id);
    expect(sent.output.tickets[0]?.items).toHaveLength(1);
    expect(sent.output.tickets[0]?.items[0]?.itemName).toBe("House Burger");
    expect(sent.output.tickets[0]?.items[0]?.quantity).toBe(2);
    expect(
      sent.output.tickets[0]?.items[0]?.modifiers.map((modifier) => modifier.optionName)
    ).toEqual(expect.arrayContaining(["Extra cheese"]));

    const currentOrder = await getActiveRestaurantOrder(client, table.table.id);
    expect(currentOrder.response.status()).toBe(200);
    expect(currentOrder.output.order?.id).toBe(opened.output.order.id);
    expect(currentOrder.output.order?.status).toBe("SENT");
    expect(currentOrder.output.order?.items[0]?.sentQuantity).toBe(2);

    const tickets = await listKitchenTickets(client);
    expect(tickets.response.status()).toBe(200);
    const kitchenTicket = tickets.output.items.find(
      (ticket) => ticket.id === sent.output.tickets[0]?.id
    );
    expect(kitchenTicket).toBeTruthy();
    expect(kitchenTicket?.stationId).toBe(station.station.id);
    expect(kitchenTicket?.status).toBe("NEW");
    expect(kitchenTicket?.items[0]?.quantity).toBe(2);

    const db = requirePrisma();
    const persistedOrder = await db.restaurantOrder.findUnique({
      where: { id: opened.output.order.id },
      include: {
        items: {
          include: {
            modifiers: true,
          },
        },
      },
    });
    expect(persistedOrder).toBeTruthy();
    expect(persistedOrder?.status).toBe("SENT");
    expect(persistedOrder?.sentAt).toBeTruthy();
    expect(persistedOrder?.items).toHaveLength(1);
    expect(persistedOrder?.items[0]?.sentQuantity).toBe(2);
    expect(persistedOrder?.items[0]?.modifiers.map((modifier) => modifier.optionName)).toEqual(
      expect.arrayContaining(["Extra cheese"])
    );

    const auditRows = await db.auditLog.findMany({
      where: {
        tenantId: testData.tenant.id,
        action: "restaurant.order.sent-to-kitchen",
        entityId: opened.output.order.id,
      },
      orderBy: { createdAt: "asc" },
    });
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0]?.actorUserId).toBe(actors.cashier.userId);
    expect(JSON.parse(auditRows[0]?.details ?? "{}")).toMatchObject({ ticketCount: 1 });

    const outboxRows = await db.outboxEvent.findMany({
      where: {
        tenantId: testData.tenant.id,
        eventType: "restaurant.order-sent-to-kitchen",
        correlationId: opened.output.order.id,
      },
      orderBy: { createdAt: "asc" },
    });
    expect(outboxRows).toHaveLength(1);
    expect(JSON.parse(outboxRows[0]?.payloadJson ?? "{}")).toMatchObject({
      orderId: opened.output.order.id,
      ticketIds: [sent.output.tickets[0]?.id],
    });
  });

  test("loads the kitchen queue with ticket visibility by status and station, including table references, items, and modifiers", async ({
    request,
    testData,
  }, testInfo) => {
    const ownerAuth = await loginAsSeededUser(request, testData);
    const ownerClient = new HttpClient(request, ownerAuth);
    const actors = await seedRestaurantActors(requirePrisma(), {
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
      ownerUserId: testData.user.id,
      ownerEmail: testData.user.email,
      password: testData.user.password,
    });
    const kitchenAuth = await loginAsCredentials(request, {
      email: actors.manager.email,
      password: actors.manager.password,
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
    });
    const kitchenClient = new HttpClient(request, kitchenAuth);
    const cashierAuth = await loginAsCredentials(request, {
      email: actors.cashier.email,
      password: actors.cashier.password,
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
    });
    const cashierClient = new HttpClient(request, cashierAuth);
    const catalogItemId = `catalog-${randomUUID()}`;
    const testName = `kitchen-queue-${Date.now()}`;

    const register = await createPosRegister(
      ownerClient,
      { name: `${testName} Register` },
      restaurantIdempotencyKey(testInfo, "kitchen-queue-register")
    );
    expect(register.response.status()).toBe(201);

    const shift = await openShift(
      cashierClient,
      {
        sessionId: randomUUID(),
        registerId: register.register.registerId,
        openedByEmployeePartyId: actors.cashier.userId,
        startingCashCents: 2_500,
        notes: "Kitchen-queue focused e2e shift",
      },
      restaurantIdempotencyKey(testInfo, "kitchen-queue-shift")
    );
    expect(shift.response.status()).toBe(201);

    const room = await upsertDiningRoom(
      ownerClient,
      { name: `${testName} Room`, sortOrder: 0 },
      restaurantIdempotencyKey(testInfo, "kitchen-queue-room")
    );
    expect(room.response.status()).toBe(201);

    const table = await upsertRestaurantTable(
      ownerClient,
      {
        diningRoomId: room.room.id,
        name: `${testName} T1`,
        capacity: 4,
        posX: 10,
        posY: 10,
        shape: "ROUND",
      },
      restaurantIdempotencyKey(testInfo, "kitchen-queue-table")
    );
    expect(table.response.status()).toBe(201);

    const modifierGroup = await upsertModifierGroup(
      ownerClient,
      {
        name: `${testName} Queue Mods`,
        selectionMode: "MULTI",
        isRequired: false,
        sortOrder: 0,
        linkedCatalogItemIds: [catalogItemId],
        options: [
          { name: "Extra cheese", priceDeltaCents: 200, sortOrder: 0 },
          { name: "No onions", priceDeltaCents: 0, sortOrder: 1 },
        ],
      },
      restaurantIdempotencyKey(testInfo, "kitchen-queue-modifiers")
    );
    expect(modifierGroup.response.status()).toBe(201);

    const station = await upsertKitchenStation(
      ownerClient,
      {
        name: `${testName} Pass`,
        code: `K-${testName}`.slice(0, 20),
      },
      restaurantIdempotencyKey(testInfo, "kitchen-queue-station")
    );
    expect(station.response.status()).toBe(201);

    const opened = await openRestaurantTable(
      cashierClient,
      {
        tableSessionId: randomUUID(),
        orderId: randomUUID(),
        tableId: table.table.id,
        registerId: register.register.registerId,
        shiftSessionId: shift.shift.sessionId,
        notes: "Kitchen queue ticket source",
      },
      restaurantIdempotencyKey(testInfo, "kitchen-queue-open-table")
    );
    expect(opened.response.status()).toBe(201);

    const draft = await putRestaurantDraftOrder(
      cashierClient,
      {
        orderId: opened.output.order.id,
        items: [
          {
            catalogItemId,
            itemName: "House Burger",
            sku: "BURGER-HOUSE",
            quantity: 1,
            unitPriceCents: 1800,
            taxRateBps: 1000,
            modifiers: [
              {
                modifierGroupId: modifierGroup.modifierGroup.id,
                optionName: "Extra cheese",
                quantity: 1,
                priceDeltaCents: 200,
              },
              {
                modifierGroupId: modifierGroup.modifierGroup.id,
                optionName: "No onions",
                quantity: 1,
                priceDeltaCents: 0,
              },
            ],
          },
        ],
        discountCents: 0,
      },
      restaurantIdempotencyKey(testInfo, "kitchen-queue-draft")
    );
    expect(draft.response.status()).toBe(200);

    const sent = await sendRestaurantOrderToKitchen(
      cashierClient,
      opened.output.order.id,
      restaurantIdempotencyKey(testInfo, "kitchen-queue-send")
    );
    expect(sent.response.status()).toBe(201);
    expect(sent.output.tickets).toHaveLength(1);

    const queue = await listKitchenTickets(kitchenClient);
    expect(queue.response.status()).toBe(200);
    expect(queue.output.pageInfo.total).toBeGreaterThanOrEqual(1);
    const queueTicket = queue.output.items.find(
      (ticket) => ticket.id === sent.output.tickets[0]?.id
    );
    expect(queueTicket).toBeTruthy();
    expect(queueTicket?.status).toBe("NEW");
    expect(queueTicket?.stationId).toBe(station.station.id);
    expect(queueTicket?.orderId).toBe(opened.output.order.id);
    expect(queueTicket?.tableId).toBe(table.table.id);
    expect(queueTicket?.tableSessionId).toBe(opened.output.session.id);
    expect(queueTicket?.items).toHaveLength(1);
    expect(queueTicket?.items[0]?.itemName).toBe("House Burger");
    expect(queueTicket?.items[0]?.quantity).toBe(1);
    expect(queueTicket?.items[0]?.modifiers.map((modifier) => modifier.optionName)).toEqual(
      expect.arrayContaining(["Extra cheese", "No onions"])
    );

    const byStatus = await listKitchenTickets(kitchenClient, { status: "NEW" });
    expect(byStatus.response.status()).toBe(200);
    expect(byStatus.output.items.some((ticket) => ticket.id === sent.output.tickets[0]?.id)).toBe(
      true
    );
    expect(byStatus.output.items.every((ticket) => ticket.status === "NEW")).toBe(true);

    const byStation = await listKitchenTickets(kitchenClient, { stationId: station.station.id });
    expect(byStation.response.status()).toBe(200);
    expect(byStation.output.items.some((ticket) => ticket.id === sent.output.tickets[0]?.id)).toBe(
      true
    );
    expect(byStation.output.items.every((ticket) => ticket.stationId === station.station.id)).toBe(
      true
    );

    const db = requirePrisma();
    const persistedTicket = await db.kitchenTicket.findUnique({
      where: { id: sent.output.tickets[0]!.id },
      include: {
        items: {
          include: {
            orderItem: {
              include: {
                modifiers: true,
              },
            },
          },
        },
      },
    });
    expect(persistedTicket).toBeTruthy();
    expect(persistedTicket?.status).toBe("NEW");
    expect(persistedTicket?.stationId).toBe(station.station.id);
    expect(persistedTicket?.orderId).toBe(opened.output.order.id);
    expect(persistedTicket?.tableSessionId).toBe(opened.output.session.id);
    expect(persistedTicket?.items).toHaveLength(1);
    expect(
      persistedTicket?.items[0]?.orderItem.modifiers.map((modifier) => modifier.optionName)
    ).toEqual(expect.arrayContaining(["Extra cheese", "No onions"]));
  });

  test("updates kitchen ticket status from new to in-progress to done to bumped, and exposes each change to front-of-house", async ({
    request,
    testData,
  }, testInfo) => {
    const ownerAuth = await loginAsSeededUser(request, testData);
    const ownerClient = new HttpClient(request, ownerAuth);
    const actors = await seedRestaurantActors(requirePrisma(), {
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
      ownerUserId: testData.user.id,
      ownerEmail: testData.user.email,
      password: testData.user.password,
    });
    const kitchenAuth = await loginAsCredentials(request, {
      email: actors.manager.email,
      password: actors.manager.password,
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
    });
    const kitchenClient = new HttpClient(request, kitchenAuth);
    const cashierAuth = await loginAsCredentials(request, {
      email: actors.cashier.email,
      password: actors.cashier.password,
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
    });
    const cashierClient = new HttpClient(request, cashierAuth);
    const catalogItemId = `catalog-${randomUUID()}`;
    const testName = `kitchen-status-${Date.now()}`;

    const register = await createPosRegister(
      ownerClient,
      { name: `${testName} Register` },
      restaurantIdempotencyKey(testInfo, "kitchen-status-register")
    );
    expect(register.response.status()).toBe(201);

    const shift = await openShift(
      cashierClient,
      {
        sessionId: randomUUID(),
        registerId: register.register.registerId,
        openedByEmployeePartyId: actors.cashier.userId,
        startingCashCents: 2_500,
        notes: "Kitchen-status focused e2e shift",
      },
      restaurantIdempotencyKey(testInfo, "kitchen-status-shift")
    );
    expect(shift.response.status()).toBe(201);

    const room = await upsertDiningRoom(
      ownerClient,
      { name: `${testName} Room`, sortOrder: 0 },
      restaurantIdempotencyKey(testInfo, "kitchen-status-room")
    );
    expect(room.response.status()).toBe(201);

    const table = await upsertRestaurantTable(
      ownerClient,
      {
        diningRoomId: room.room.id,
        name: `${testName} T1`,
        capacity: 4,
        posX: 10,
        posY: 10,
        shape: "ROUND",
      },
      restaurantIdempotencyKey(testInfo, "kitchen-status-table")
    );
    expect(table.response.status()).toBe(201);

    const station = await upsertKitchenStation(
      ownerClient,
      {
        name: `${testName} Pass`,
        code: `K-${testName}`.slice(0, 20),
      },
      restaurantIdempotencyKey(testInfo, "kitchen-status-station")
    );
    expect(station.response.status()).toBe(201);

    const opened = await openRestaurantTable(
      cashierClient,
      {
        tableSessionId: randomUUID(),
        orderId: randomUUID(),
        tableId: table.table.id,
        registerId: register.register.registerId,
        shiftSessionId: shift.shift.sessionId,
        notes: "Ticket status source order",
      },
      restaurantIdempotencyKey(testInfo, "kitchen-status-open-table")
    );
    expect(opened.response.status()).toBe(201);

    const draft = await putRestaurantDraftOrder(
      cashierClient,
      {
        orderId: opened.output.order.id,
        items: [
          {
            catalogItemId,
            itemName: "House Burger",
            sku: "BURGER-HOUSE",
            quantity: 1,
            unitPriceCents: 1800,
            taxRateBps: 1000,
            modifiers: [],
          },
        ],
        discountCents: 0,
      },
      restaurantIdempotencyKey(testInfo, "kitchen-status-draft")
    );
    expect(draft.response.status()).toBe(200);

    const sent = await sendRestaurantOrderToKitchen(
      cashierClient,
      opened.output.order.id,
      restaurantIdempotencyKey(testInfo, "kitchen-status-send")
    );
    expect(sent.response.status()).toBe(201);
    const ticketId = sent.output.tickets[0]?.id;
    expect(ticketId).toBeTruthy();
    expect(sent.output.tickets[0]?.status).toBe("NEW");

    const visibleNew = await listKitchenTickets(cashierClient, { status: "NEW" });
    expect(visibleNew.response.status()).toBe(200);
    expect(visibleNew.output.items.some((ticket) => ticket.id === ticketId)).toBe(true);

    const inProgress = await updateKitchenTicketStatus(
      kitchenClient,
      { ticketId: ticketId!, status: "IN_PROGRESS" },
      restaurantIdempotencyKey(testInfo, "kitchen-status-in-progress")
    );
    expect(inProgress.response.status()).toBe(201);
    expect(inProgress.output.ticket.status).toBe("IN_PROGRESS");

    const visibleInProgress = await listKitchenTickets(cashierClient, { status: "IN_PROGRESS" });
    expect(visibleInProgress.response.status()).toBe(200);
    const fohInProgress = visibleInProgress.output.items.find((ticket) => ticket.id === ticketId);
    expect(fohInProgress?.status).toBe("IN_PROGRESS");
    expect(fohInProgress?.stationId).toBe(station.station.id);
    expect(fohInProgress?.tableId).toBe(table.table.id);
    expect(fohInProgress?.orderId).toBe(opened.output.order.id);

    const done = await updateKitchenTicketStatus(
      kitchenClient,
      { ticketId: ticketId!, status: "DONE" },
      restaurantIdempotencyKey(testInfo, "kitchen-status-done")
    );
    expect(done.response.status()).toBe(201);
    expect(done.output.ticket.status).toBe("DONE");

    const visibleDone = await listKitchenTickets(cashierClient, { status: "DONE" });
    expect(visibleDone.response.status()).toBe(200);
    const fohDone = visibleDone.output.items.find((ticket) => ticket.id === ticketId);
    expect(fohDone?.status).toBe("DONE");
    expect(fohDone?.items[0]?.itemName).toBe("House Burger");

    const bumped = await updateKitchenTicketStatus(
      kitchenClient,
      { ticketId: ticketId!, status: "BUMPED" },
      restaurantIdempotencyKey(testInfo, "kitchen-status-bumped")
    );
    expect(bumped.response.status()).toBe(201);
    expect(bumped.output.ticket.status).toBe("BUMPED");

    const visibleBumped = await listKitchenTickets(cashierClient, { status: "BUMPED" });
    expect(visibleBumped.response.status()).toBe(200);
    const fohBumped = visibleBumped.output.items.find((ticket) => ticket.id === ticketId);
    expect(fohBumped?.status).toBe("BUMPED");
    expect(fohBumped?.items[0]?.quantity).toBe(1);

    const db = requirePrisma();
    const persistedTicket = await db.kitchenTicket.findUnique({
      where: { id: ticketId! },
    });
    expect(persistedTicket).toBeTruthy();
    expect(persistedTicket?.status).toBe("BUMPED");
    expect(persistedTicket?.stationId).toBe(station.station.id);
    expect(persistedTicket?.bumpedAt).toBeTruthy();

    const auditRows = await db.auditLog.findMany({
      where: {
        tenantId: testData.tenant.id,
        action: "restaurant.kitchen-ticket.status-updated",
        entityId: ticketId!,
      },
      orderBy: { createdAt: "asc" },
    });
    expect(auditRows).toHaveLength(3);
    expect(auditRows.every((row) => row.actorUserId === actors.manager.userId)).toBe(true);
    const statuses = auditRows.map((row) => JSON.parse(row.details ?? "{}").status);
    expect(statuses).toEqual(["IN_PROGRESS", "DONE", "BUMPED"]);

    const bumpedEvents = await db.outboxEvent.findMany({
      where: {
        tenantId: testData.tenant.id,
        eventType: "restaurant.kitchen-ticket-bumped",
        correlationId: ticketId!,
      },
      orderBy: { createdAt: "asc" },
    });
    expect(bumpedEvents).toHaveLength(1);
    expect(JSON.parse(bumpedEvents[0]?.payloadJson ?? "{}")).toMatchObject({
      ticketId: ticketId!,
    });
  });

  test("transfers an active table session and open check to another available table so service continues without re-entering the order", async ({
    request,
    testData,
  }, testInfo) => {
    const ownerAuth = await loginAsSeededUser(request, testData);
    const ownerClient = new HttpClient(request, ownerAuth);
    const actors = await seedRestaurantActors(requirePrisma(), {
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
      ownerUserId: testData.user.id,
      ownerEmail: testData.user.email,
      password: testData.user.password,
    });
    const serverAuth = await loginAsCredentials(request, {
      email: actors.cashier.email,
      password: actors.cashier.password,
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
    });
    const client = new HttpClient(request, serverAuth);
    const catalogItemId = `catalog-${randomUUID()}`;
    const testName = `focused-transfer-${Date.now()}`;

    const register = await createPosRegister(
      ownerClient,
      { name: `${testName} Register` },
      restaurantIdempotencyKey(testInfo, "focused-transfer-register")
    );
    expect(register.response.status()).toBe(201);

    const shift = await openShift(
      client,
      {
        sessionId: randomUUID(),
        registerId: register.register.registerId,
        openedByEmployeePartyId: actors.cashier.userId,
        startingCashCents: 2_500,
        notes: "Focused transfer e2e shift",
      },
      restaurantIdempotencyKey(testInfo, "focused-transfer-shift")
    );
    expect(shift.response.status()).toBe(201);

    const venue = await seedRestaurantVenue(ownerClient, testName, catalogItemId);

    const floorBefore = await getRestaurantFloorPlan(client);
    expect(floorBefore.response.status()).toBe(200);
    const sourceBefore = floorBefore.output.rooms
      .flatMap((room) => room.tables)
      .find((table) => table.id === venue.tableAId);
    const targetBefore = floorBefore.output.rooms
      .flatMap((room) => room.tables)
      .find((table) => table.id === venue.tableBId);
    expect(sourceBefore?.availabilityStatus).toBe("AVAILABLE");
    expect(targetBefore?.availabilityStatus).toBe("AVAILABLE");

    const opened = await openRestaurantTable(
      client,
      {
        tableSessionId: randomUUID(),
        orderId: randomUUID(),
        tableId: venue.tableAId,
        registerId: register.register.registerId,
        shiftSessionId: shift.shift.sessionId,
        notes: "Guests changed seats",
      },
      restaurantIdempotencyKey(testInfo, "focused-transfer-open")
    );
    expect(opened.response.status()).toBe(201);

    const draft = await putRestaurantDraftOrder(
      client,
      {
        orderId: opened.output.order.id,
        items: draftOrderItems(catalogItemId),
        discountCents: 0,
      },
      restaurantIdempotencyKey(testInfo, "focused-transfer-draft")
    );
    expect(draft.response.status()).toBe(200);
    expect(draft.output.order.items).toHaveLength(1);
    expect(draft.output.order.totalCents).toBe(1_498);

    const transferred = await transferRestaurantTable(
      client,
      {
        tableSessionId: opened.output.session.id,
        orderId: opened.output.order.id,
        toTableId: venue.tableBId,
      },
      restaurantIdempotencyKey(testInfo, "focused-transfer-command")
    );
    expect(transferred.response.status()).toBe(201);
    const body = transferred.body as {
      session: { id: string; tableId: string; transferCount: number };
      order: { id: string; tableId: string; totalCents: number; items: Array<{ sku: string }> };
    };
    expect(body.session.id).toBe(opened.output.session.id);
    expect(body.session.tableId).toBe(venue.tableBId);
    expect(body.session.transferCount).toBe(1);
    expect(body.order.id).toBe(opened.output.order.id);
    expect(body.order.tableId).toBe(venue.tableBId);
    expect(body.order.totalCents).toBe(1_498);
    expect(body.order.items[0]?.sku).toBe("PIZZA-MARG");

    const sourceAfter = await getActiveRestaurantOrder(client, venue.tableAId);
    expect(sourceAfter.response.status()).toBe(200);
    expect(sourceAfter.output.session).toBeNull();
    expect(sourceAfter.output.order).toBeNull();

    const destinationAfter = await getActiveRestaurantOrder(client, venue.tableBId);
    expect(destinationAfter.response.status()).toBe(200);
    expect(destinationAfter.output.session?.id).toBe(opened.output.session.id);
    expect(destinationAfter.output.session?.tableId).toBe(venue.tableBId);
    expect(destinationAfter.output.session?.status).toBe("OPEN");
    expect(destinationAfter.output.order?.id).toBe(opened.output.order.id);
    expect(destinationAfter.output.order?.tableId).toBe(venue.tableBId);
    expect(destinationAfter.output.order?.status).toBe("DRAFT");
    expect(destinationAfter.output.order?.items).toHaveLength(1);
    expect(destinationAfter.output.order?.items[0]?.sku).toBe("PIZZA-MARG");
    expect(destinationAfter.output.order?.totalCents).toBe(1_498);

    const floorAfter = await getRestaurantFloorPlan(client);
    expect(floorAfter.response.status()).toBe(200);
    const sourceTable = floorAfter.output.rooms
      .flatMap((room) => room.tables)
      .find((table) => table.id === venue.tableAId);
    const targetTable = floorAfter.output.rooms
      .flatMap((room) => room.tables)
      .find((table) => table.id === venue.tableBId);
    expect(sourceTable?.availabilityStatus).toBe("AVAILABLE");
    expect(sourceTable?.activeOrderId).toBeNull();
    expect(sourceTable?.activeSessionId).toBeNull();
    expect(targetTable?.availabilityStatus).toBe("OCCUPIED");
    expect(targetTable?.activeOrderId).toBe(opened.output.order.id);
    expect(targetTable?.activeSessionId).toBe(opened.output.session.id);

    const db = requirePrisma();
    const persistedSession = await db.restaurantTableSession.findUnique({
      where: { id: opened.output.session.id },
    });
    const persistedOrder = await db.restaurantOrder.findUnique({
      where: { id: opened.output.order.id },
      include: {
        items: true,
      },
    });
    expect(persistedSession?.tableId).toBe(venue.tableBId);
    expect(persistedSession?.transferCount).toBe(1);
    expect(persistedSession?.status).toBe("OPEN");
    expect(persistedOrder?.tableId).toBe(venue.tableBId);
    expect(persistedOrder?.status).toBe("DRAFT");
    expect(persistedOrder?.items).toHaveLength(1);
    expect(persistedOrder?.items[0]?.sku).toBe("PIZZA-MARG");
    expect(persistedOrder?.totalCents).toBe(1_498);
  });

  test("merges two active tables into one target check so one active bill remains for payment", async ({
    request,
    testData,
  }, testInfo) => {
    const ownerAuth = await loginAsSeededUser(request, testData);
    const ownerClient = new HttpClient(request, ownerAuth);
    const actors = await seedRestaurantActors(requirePrisma(), {
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
      ownerUserId: testData.user.id,
      ownerEmail: testData.user.email,
      password: testData.user.password,
    });
    const cashierAuth = await loginAsCredentials(request, {
      email: actors.cashier.email,
      password: actors.cashier.password,
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
    });
    const cashierClient = new HttpClient(request, cashierAuth);
    const catalogItemId = `catalog-${randomUUID()}`;
    const venue = await seedRestaurantVenue(ownerClient, `merge-${Date.now()}`, catalogItemId);

    const sourceOpened = await openRestaurantTable(
      cashierClient,
      {
        tableSessionId: randomUUID(),
        orderId: randomUUID(),
        tableId: venue.tableAId,
      },
      restaurantIdempotencyKey(testInfo, "merge-source-open")
    );
    expect(sourceOpened.response.status()).toBe(201);

    const targetOpened = await openRestaurantTable(
      cashierClient,
      {
        tableSessionId: randomUUID(),
        orderId: randomUUID(),
        tableId: venue.tableBId,
      },
      restaurantIdempotencyKey(testInfo, "merge-target-open")
    );
    expect(targetOpened.response.status()).toBe(201);

    const sourceDraft = await putRestaurantDraftOrder(
      cashierClient,
      {
        orderId: sourceOpened.output.order.id,
        items: draftOrderItems(catalogItemId),
        discountCents: 0,
      },
      restaurantIdempotencyKey(testInfo, "merge-source-draft")
    );
    expect(sourceDraft.response.status()).toBe(200);

    const targetDraft = await putRestaurantDraftOrder(
      cashierClient,
      {
        orderId: targetOpened.output.order.id,
        items: [
          {
            catalogItemId: `${catalogItemId}-drink`,
            itemName: "Lemonade",
            sku: "DRINK-LEMON",
            quantity: 2,
            unitPriceCents: 500,
            taxRateBps: 1000,
            modifiers: [],
          },
        ],
        discountCents: 0,
      },
      restaurantIdempotencyKey(testInfo, "merge-target-draft")
    );
    expect(targetDraft.response.status()).toBe(200);

    const merged = await mergeRestaurantChecks(
      cashierClient,
      {
        targetOrderId: targetOpened.output.order.id,
        targetTableSessionId: targetOpened.output.session.id,
        sourceOrderId: sourceOpened.output.order.id,
        sourceTableSessionId: sourceOpened.output.session.id,
      },
      restaurantIdempotencyKey(testInfo, "merge-checks")
    );
    expect(merged.response.status()).toBe(201);
    expect(merged.output.order.id).toBe(targetOpened.output.order.id);
    expect(merged.output.session.id).toBe(targetOpened.output.session.id);
    expect(merged.output.sourceOrderId).toBe(sourceOpened.output.order.id);
    expect(merged.output.sourceSessionId).toBe(sourceOpened.output.session.id);
    expect(merged.output.order.items).toHaveLength(
      sourceDraft.output.order.items.length + targetDraft.output.order.items.length
    );
    expect(merged.output.order.totalCents).toBe(
      sourceDraft.output.order.totalCents + targetDraft.output.order.totalCents
    );

    const sourceCurrent = await getActiveRestaurantOrder(cashierClient, venue.tableAId);
    expect(sourceCurrent.response.status()).toBe(200);
    expect(sourceCurrent.output.session).toBeNull();
    expect(sourceCurrent.output.order).toBeNull();

    const targetCurrent = await getActiveRestaurantOrder(cashierClient, venue.tableBId);
    expect(targetCurrent.response.status()).toBe(200);
    expect(targetCurrent.output.session?.id).toBe(targetOpened.output.session.id);
    expect(targetCurrent.output.order?.id).toBe(targetOpened.output.order.id);
    expect(targetCurrent.output.order?.items).toHaveLength(2);
    expect(targetCurrent.output.order?.totalCents).toBe(
      sourceDraft.output.order.totalCents + targetDraft.output.order.totalCents
    );

    const floorPlan = await getRestaurantFloorPlan(cashierClient);
    expect(floorPlan.response.status()).toBe(200);
    const sourceTable = floorPlan.output.rooms
      .flatMap((room) => room.tables)
      .find((table) => table.id === venue.tableAId);
    const targetTable = floorPlan.output.rooms
      .flatMap((room) => room.tables)
      .find((table) => table.id === venue.tableBId);
    expect(sourceTable?.availabilityStatus).toBe("AVAILABLE");
    expect(sourceTable?.activeOrderId).toBeNull();
    expect(sourceTable?.activeSessionId).toBeNull();
    expect(targetTable?.availabilityStatus).toBe("OCCUPIED");
    expect(targetTable?.activeOrderId).toBe(targetOpened.output.order.id);
    expect(targetTable?.activeSessionId).toBe(targetOpened.output.session.id);

    const db = requirePrisma();
    const sourceSession = await db.restaurantTableSession.findUnique({
      where: { id: sourceOpened.output.session.id },
    });
    const sourceOrder = await db.restaurantOrder.findUnique({
      where: { id: sourceOpened.output.order.id },
    });
    const targetOrder = await db.restaurantOrder.findUnique({
      where: { id: targetOpened.output.order.id },
      include: { items: true },
    });
    expect(sourceSession?.status).toBe("TRANSFERRED");
    expect(sourceSession?.closedAt).toBeTruthy();
    expect(sourceOrder?.status).toBe("CANCELLED");
    expect(sourceOrder?.closedAt).toBeTruthy();
    expect(targetOrder?.status).toBe("DRAFT");
    expect(targetOrder?.items).toHaveLength(2);
    expect(targetOrder?.totalCents).toBe(
      sourceDraft.output.order.totalCents + targetDraft.output.order.totalCents
    );

    const mergeAudit = await db.auditLog.findFirst({
      where: {
        tenantId: testData.tenant.id,
        action: "restaurant.table.merged",
        entity: "RestaurantOrder",
        entityId: targetOpened.output.order.id,
      },
      orderBy: { createdAt: "desc" },
    });
    expect(mergeAudit?.actorUserId).toBe(actors.cashier.userId);
    expect(JSON.parse(mergeAudit?.details ?? "{}")).toMatchObject({
      sourceOrderId: sourceOpened.output.order.id,
      sourceTableSessionId: sourceOpened.output.session.id,
      targetTableSessionId: targetOpened.output.session.id,
      mergedItemCount: sourceDraft.output.order.items.length,
    });

    const mergeEvent = await db.outboxEvent.findFirst({
      where: {
        tenantId: testData.tenant.id,
        eventType: "restaurant.table-merged",
        correlationId: targetOpened.output.order.id,
      },
      orderBy: { createdAt: "desc" },
    });
    expect(mergeEvent).toBeTruthy();
  });

  test("creates a pending void approval request without immediately voiding the item and prevents unauthorized self-approval", async ({
    request,
    testData,
  }, testInfo) => {
    const ownerAuth = await loginAsSeededUser(request, testData);
    const ownerClient = new HttpClient(request, ownerAuth);
    const actors = await seedRestaurantActors(requirePrisma(), {
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
      ownerUserId: testData.user.id,
      ownerEmail: testData.user.email,
      password: testData.user.password,
    });
    const cashierAuth = await loginAsCredentials(request, {
      email: actors.cashier.email,
      password: actors.cashier.password,
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
    });
    const cashierClient = new HttpClient(request, cashierAuth);
    const catalogItemId = `catalog-${randomUUID()}`;

    const voidPolicy = await createApprovalPolicy(request, ownerAuth, {
      key: "restaurant.void",
      name: `Restaurant void approval ${Date.now()}`,
      status: "ACTIVE",
      steps: [
        {
          name: "Manager approval",
          assigneeRoleId: actors.manager.roleId,
        },
      ],
    });
    expect(voidPolicy.response.status()).toBe(201);

    const venue = await seedRestaurantVenue(
      ownerClient,
      `void-request-${Date.now()}`,
      catalogItemId
    );

    const opened = await openRestaurantTable(
      cashierClient,
      {
        tableSessionId: randomUUID(),
        orderId: randomUUID(),
        tableId: venue.tableAId,
      },
      restaurantIdempotencyKey(testInfo, "focused-void-open")
    );
    expect(opened.response.status()).toBe(201);

    const draft = await putRestaurantDraftOrder(
      cashierClient,
      {
        orderId: opened.output.order.id,
        items: draftOrderItems(catalogItemId),
        discountCents: 0,
      },
      restaurantIdempotencyKey(testInfo, "focused-void-draft")
    );
    expect(draft.response.status()).toBe(200);
    const orderItemId = draft.output.order.items[0]?.id;
    expect(orderItemId).toBeTruthy();
    expect(draft.output.order.totalCents).toBe(1_498);

    const requested = await requestRestaurantVoid(
      cashierClient,
      {
        orderItemId: orderItemId!,
        reason: "Guest ordered by mistake",
      },
      restaurantIdempotencyKey(testInfo, "focused-void-request")
    );
    expect(requested.response.status()).toBe(201);
    expect(requested.output.approvalRequest.type).toBe("VOID");
    expect(requested.output.approvalRequest.status).toBe("PENDING");
    expect(requested.output.approvalRequest.orderId).toBe(opened.output.order.id);
    expect(requested.output.approvalRequest.orderItemId).toBe(orderItemId);
    expect(requested.output.approvalRequest.reason).toBe("Guest ordered by mistake");
    expect(requested.output.approvalRequest.requestedByUserId).toBe(actors.cashier.userId);
    expect(requested.output.approvalRequest.decidedByUserId).toBeNull();
    expect(requested.output.approvalRequest.decidedAt).toBeNull();
    expect(requested.output.order.id).toBe(opened.output.order.id);
    expect(requested.output.order.status).toBe("DRAFT");
    expect(requested.output.order.totalCents).toBe(1_498);
    expect(requested.output.order.items[0]?.id).toBe(orderItemId);
    expect(requested.output.order.items[0]?.voidedAt).toBeNull();

    const currentOrder = await getActiveRestaurantOrder(cashierClient, venue.tableAId);
    expect(currentOrder.response.status()).toBe(200);
    expect(currentOrder.output.order?.id).toBe(opened.output.order.id);
    expect(currentOrder.output.order?.items[0]?.id).toBe(orderItemId);
    expect(currentOrder.output.order?.items[0]?.voidedAt).toBeNull();
    expect(currentOrder.output.order?.totalCents).toBe(1_498);

    const unauthorizedApprove = await approveRestaurantApproval(
      cashierClient,
      requested.output.approvalRequest.id,
      { comment: "Cashier cannot self-approve" },
      restaurantIdempotencyKey(testInfo, "focused-void-cashier-approve")
    );
    await expectProblem(unauthorizedApprove.response, 403);

    const db = requirePrisma();
    const persistedApproval = await db.restaurantApprovalRequest.findUnique({
      where: { id: requested.output.approvalRequest.id },
    });
    expect(persistedApproval).toBeTruthy();
    expect(persistedApproval?.tenantId).toBe(testData.tenant.id);
    expect(persistedApproval?.workspaceId).toBe(testData.workspace.id);
    expect(persistedApproval?.type).toBe("VOID");
    expect(persistedApproval?.status).toBe("PENDING");
    expect(persistedApproval?.orderId).toBe(opened.output.order.id);
    expect(persistedApproval?.orderItemId).toBe(orderItemId);
    expect(persistedApproval?.reason).toBe("Guest ordered by mistake");
    expect(persistedApproval?.requestedByUserId).toBe(actors.cashier.userId);
    expect(persistedApproval?.decidedByUserId).toBeNull();
    expect(persistedApproval?.decidedAt).toBeNull();

    const persistedOrder = await db.restaurantOrder.findUnique({
      where: { id: opened.output.order.id },
      include: {
        items: true,
      },
    });
    expect(persistedOrder?.status).toBe("DRAFT");
    expect(persistedOrder?.totalCents).toBe(1_498);
    expect(persistedOrder?.items[0]?.id).toBe(orderItemId);
    expect(persistedOrder?.items[0]?.voidedAt).toBeNull();

    const auditRows = await db.auditLog.findMany({
      where: {
        tenantId: testData.tenant.id,
        action: "restaurant.void.requested",
        entityId: opened.output.order.id,
      },
      orderBy: { createdAt: "asc" },
    });
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0]?.actorUserId).toBe(actors.cashier.userId);
    expect(JSON.parse(auditRows[0]?.details ?? "{}")).toMatchObject({
      approvalRequestId: requested.output.approvalRequest.id,
    });

    const outboxRows = await db.outboxEvent.findMany({
      where: {
        tenantId: testData.tenant.id,
        eventType: "restaurant.void-requested",
        correlationId: opened.output.order.id,
      },
      orderBy: { createdAt: "asc" },
    });
    expect(outboxRows).toHaveLength(1);
    expect(JSON.parse(outboxRows[0]?.payloadJson ?? "{}")).toMatchObject({
      orderId: opened.output.order.id,
      approvalRequestId: requested.output.approvalRequest.id,
      status: "PENDING",
    });
  });

  test("allows a manager to approve a pending void request, applies the void, updates totals, and records approver traceability", async ({
    request,
    testData,
  }, testInfo) => {
    const ownerAuth = await loginAsSeededUser(request, testData);
    const ownerClient = new HttpClient(request, ownerAuth);
    const actors = await seedRestaurantActors(requirePrisma(), {
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
      ownerUserId: testData.user.id,
      ownerEmail: testData.user.email,
      password: testData.user.password,
    });
    const managerAuth = await loginAsCredentials(request, {
      email: actors.manager.email,
      password: actors.manager.password,
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
    });
    const cashierAuth = await loginAsCredentials(request, {
      email: actors.cashier.email,
      password: actors.cashier.password,
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
    });
    const managerClient = new HttpClient(request, managerAuth);
    const cashierClient = new HttpClient(request, cashierAuth);
    const catalogItemId = `catalog-${randomUUID()}`;

    const voidPolicy = await createApprovalPolicy(request, ownerAuth, {
      key: "restaurant.void",
      name: `Restaurant void approval ${Date.now()}`,
      status: "ACTIVE",
      steps: [
        {
          name: "Manager approval",
          assigneeRoleId: actors.manager.roleId,
        },
      ],
    });
    expect(voidPolicy.response.status()).toBe(201);

    const venue = await seedRestaurantVenue(
      ownerClient,
      `approve-void-${Date.now()}`,
      catalogItemId
    );

    const opened = await openRestaurantTable(
      cashierClient,
      {
        tableSessionId: randomUUID(),
        orderId: randomUUID(),
        tableId: venue.tableAId,
      },
      restaurantIdempotencyKey(testInfo, "focused-approve-void-open")
    );
    expect(opened.response.status()).toBe(201);

    const draft = await putRestaurantDraftOrder(
      cashierClient,
      {
        orderId: opened.output.order.id,
        items: draftOrderItems(catalogItemId),
        discountCents: 0,
      },
      restaurantIdempotencyKey(testInfo, "focused-approve-void-draft")
    );
    expect(draft.response.status()).toBe(200);
    const orderItemId = draft.output.order.items[0]?.id;
    expect(orderItemId).toBeTruthy();
    expect(draft.output.order.totalCents).toBe(1_498);

    const requested = await requestRestaurantVoid(
      cashierClient,
      {
        orderItemId: orderItemId!,
        reason: "Server entered duplicate item",
      },
      restaurantIdempotencyKey(testInfo, "focused-approve-void-request")
    );
    expect(requested.response.status()).toBe(201);
    expect(requested.output.approvalRequest.status).toBe("PENDING");
    expect(requested.output.order.items[0]?.voidedAt).toBeNull();

    const approved = await approveRestaurantApproval(
      managerClient,
      requested.output.approvalRequest.id,
      { comment: "Approved after review" },
      restaurantIdempotencyKey(testInfo, "focused-approve-void-manager")
    );
    expect(approved.response.status()).toBe(201);
    const approvedBody = approved.body as {
      approvalRequest: {
        id: string;
        type: string;
        status: string;
        orderId: string;
        orderItemId: string | null;
        decidedByUserId: string | null;
        decidedAt: string | null;
      };
      order: {
        id: string;
        status: string;
        subtotalCents: number;
        taxCents: number;
        totalCents: number;
        items: Array<{ id: string; voidedAt: string | null }>;
      };
    };
    expect(approvedBody.approvalRequest.id).toBe(requested.output.approvalRequest.id);
    expect(approvedBody.approvalRequest.type).toBe("VOID");
    expect(approvedBody.approvalRequest.status).toBe("APPLIED");
    expect(approvedBody.approvalRequest.orderId).toBe(opened.output.order.id);
    expect(approvedBody.approvalRequest.orderItemId).toBe(orderItemId);
    expect(approvedBody.approvalRequest.decidedByUserId).toBe(actors.manager.userId);
    expect(approvedBody.approvalRequest.decidedAt).toBeTruthy();
    expect(approvedBody.order.id).toBe(opened.output.order.id);
    expect(approvedBody.order.status).toBe("DRAFT");
    expect(approvedBody.order.subtotalCents).toBe(0);
    expect(approvedBody.order.taxCents).toBe(0);
    expect(approvedBody.order.totalCents).toBe(0);
    expect(approvedBody.order.items[0]?.id).toBe(orderItemId);
    expect(approvedBody.order.items[0]?.voidedAt).toBeTruthy();

    const currentOrder = await getActiveRestaurantOrder(cashierClient, venue.tableAId);
    expect(currentOrder.response.status()).toBe(200);
    expect(currentOrder.output.order?.id).toBe(opened.output.order.id);
    expect(currentOrder.output.order?.subtotalCents).toBe(0);
    expect(currentOrder.output.order?.taxCents).toBe(0);
    expect(currentOrder.output.order?.totalCents).toBe(0);
    expect(currentOrder.output.order?.items[0]?.id).toBe(orderItemId);
    expect(currentOrder.output.order?.items[0]?.voidedAt).toBeTruthy();

    const db = requirePrisma();
    const persistedApproval = await db.restaurantApprovalRequest.findUnique({
      where: { id: requested.output.approvalRequest.id },
    });
    expect(persistedApproval).toBeTruthy();
    expect(persistedApproval?.status).toBe("APPLIED");
    expect(persistedApproval?.decidedByUserId).toBe(actors.manager.userId);
    expect(persistedApproval?.decidedAt).toBeTruthy();

    const persistedOrder = await db.restaurantOrder.findUnique({
      where: { id: opened.output.order.id },
      include: {
        items: true,
      },
    });
    expect(persistedOrder?.status).toBe("DRAFT");
    expect(persistedOrder?.subtotalCents).toBe(0);
    expect(persistedOrder?.taxCents).toBe(0);
    expect(persistedOrder?.totalCents).toBe(0);
    expect(persistedOrder?.items[0]?.id).toBe(orderItemId);
    expect(persistedOrder?.items[0]?.voidedAt).toBeTruthy();

    const auditRows = await db.auditLog.findMany({
      where: {
        tenantId: testData.tenant.id,
        action: "restaurant.approval.approve",
        entityId: requested.output.approvalRequest.id,
      },
      orderBy: { createdAt: "asc" },
    });
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0]?.actorUserId).toBe(actors.manager.userId);
    expect(JSON.parse(auditRows[0]?.details ?? "{}")).toMatchObject({
      orderId: opened.output.order.id,
      type: "VOID",
    });
  });

  test("creates a pending discount approval request without immediately changing order pricing and prevents unauthorized self-approval", async ({
    request,
    testData,
  }, testInfo) => {
    const ownerAuth = await loginAsSeededUser(request, testData);
    const ownerClient = new HttpClient(request, ownerAuth);
    const actors = await seedRestaurantActors(requirePrisma(), {
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
      ownerUserId: testData.user.id,
      ownerEmail: testData.user.email,
      password: testData.user.password,
    });
    const cashierAuth = await loginAsCredentials(request, {
      email: actors.cashier.email,
      password: actors.cashier.password,
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
    });
    const cashierClient = new HttpClient(request, cashierAuth);
    const catalogItemId = `catalog-${randomUUID()}`;
    const discountAmountCents = 200;

    const discountPolicy = await createApprovalPolicy(request, ownerAuth, {
      key: "restaurant.discount",
      name: `Restaurant discount approval ${Date.now()}`,
      status: "ACTIVE",
      steps: [
        {
          name: "Manager approval",
          assigneeRoleId: actors.manager.roleId,
        },
      ],
    });
    expect(discountPolicy.response.status()).toBe(201);

    const venue = await seedRestaurantVenue(
      ownerClient,
      `discount-request-${Date.now()}`,
      catalogItemId
    );

    const opened = await openRestaurantTable(
      cashierClient,
      {
        tableSessionId: randomUUID(),
        orderId: randomUUID(),
        tableId: venue.tableAId,
      },
      restaurantIdempotencyKey(testInfo, "focused-discount-open")
    );
    expect(opened.response.status()).toBe(201);

    const draft = await putRestaurantDraftOrder(
      cashierClient,
      {
        orderId: opened.output.order.id,
        items: draftOrderItems(catalogItemId),
        discountCents: 0,
      },
      restaurantIdempotencyKey(testInfo, "focused-discount-draft")
    );
    expect(draft.response.status()).toBe(200);
    expect(draft.output.order.totalCents).toBe(1_498);
    expect(draft.output.order.discountCents).toBe(0);

    const requested = await requestRestaurantDiscount(
      cashierClient,
      {
        orderId: opened.output.order.id,
        amountCents: discountAmountCents,
        reason: "Service recovery for delayed order",
      },
      restaurantIdempotencyKey(testInfo, "focused-discount-request")
    );
    expect(requested.response.status()).toBe(201);
    expect(requested.output.approvalRequest.type).toBe("DISCOUNT");
    expect(requested.output.approvalRequest.status).toBe("PENDING");
    expect(requested.output.approvalRequest.orderId).toBe(opened.output.order.id);
    expect(requested.output.approvalRequest.orderItemId).toBeNull();
    expect(requested.output.approvalRequest.amountCents).toBe(discountAmountCents);
    expect(requested.output.approvalRequest.reason).toBe("Service recovery for delayed order");
    expect(requested.output.approvalRequest.requestedByUserId).toBe(actors.cashier.userId);
    expect(requested.output.approvalRequest.decidedByUserId).toBeNull();
    expect(requested.output.approvalRequest.decidedAt).toBeNull();
    expect(requested.output.order.id).toBe(opened.output.order.id);
    expect(requested.output.order.discountCents).toBe(0);
    expect(requested.output.order.subtotalCents).toBe(1_400);
    expect(requested.output.order.taxCents).toBe(98);
    expect(requested.output.order.totalCents).toBe(1_498);

    const currentOrder = await getActiveRestaurantOrder(cashierClient, venue.tableAId);
    expect(currentOrder.response.status()).toBe(200);
    expect(currentOrder.output.order?.id).toBe(opened.output.order.id);
    expect(currentOrder.output.order?.discountCents).toBe(0);
    expect(currentOrder.output.order?.totalCents).toBe(1_498);

    const unauthorizedApprove = await approveRestaurantApproval(
      cashierClient,
      requested.output.approvalRequest.id,
      { comment: "Cashier cannot self-approve discount" },
      restaurantIdempotencyKey(testInfo, "focused-discount-cashier-approve")
    );
    await expectProblem(unauthorizedApprove.response, 403);

    const db = requirePrisma();
    const persistedApproval = await db.restaurantApprovalRequest.findUnique({
      where: { id: requested.output.approvalRequest.id },
    });
    expect(persistedApproval).toBeTruthy();
    expect(persistedApproval?.tenantId).toBe(testData.tenant.id);
    expect(persistedApproval?.workspaceId).toBe(testData.workspace.id);
    expect(persistedApproval?.type).toBe("DISCOUNT");
    expect(persistedApproval?.status).toBe("PENDING");
    expect(persistedApproval?.orderId).toBe(opened.output.order.id);
    expect(persistedApproval?.orderItemId).toBeNull();
    expect(persistedApproval?.amountCents).toBe(discountAmountCents);
    expect(persistedApproval?.reason).toBe("Service recovery for delayed order");
    expect(persistedApproval?.requestedByUserId).toBe(actors.cashier.userId);
    expect(persistedApproval?.decidedByUserId).toBeNull();
    expect(persistedApproval?.decidedAt).toBeNull();

    const persistedOrder = await db.restaurantOrder.findUnique({
      where: { id: opened.output.order.id },
    });
    expect(persistedOrder?.discountCents).toBe(0);
    expect(persistedOrder?.subtotalCents).toBe(1_400);
    expect(persistedOrder?.taxCents).toBe(98);
    expect(persistedOrder?.totalCents).toBe(1_498);

    const auditRows = await db.auditLog.findMany({
      where: {
        tenantId: testData.tenant.id,
        action: "restaurant.discount.requested",
        entityId: opened.output.order.id,
      },
      orderBy: { createdAt: "asc" },
    });
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0]?.actorUserId).toBe(actors.cashier.userId);
    expect(JSON.parse(auditRows[0]?.details ?? "{}")).toMatchObject({
      approvalRequestId: requested.output.approvalRequest.id,
    });

    const outboxRows = await db.outboxEvent.findMany({
      where: {
        tenantId: testData.tenant.id,
        eventType: "restaurant.discount-requested",
        correlationId: opened.output.order.id,
      },
      orderBy: { createdAt: "asc" },
    });
    expect(outboxRows).toHaveLength(1);
    expect(JSON.parse(outboxRows[0]?.payloadJson ?? "{}")).toMatchObject({
      orderId: opened.output.order.id,
      approvalRequestId: requested.output.approvalRequest.id,
      status: "PENDING",
    });
  });

  test("allows a manager to approve a pending discount request, recalculates totals, and records approver traceability", async ({
    request,
    testData,
  }, testInfo) => {
    const ownerAuth = await loginAsSeededUser(request, testData);
    const ownerClient = new HttpClient(request, ownerAuth);
    const actors = await seedRestaurantActors(requirePrisma(), {
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
      ownerUserId: testData.user.id,
      ownerEmail: testData.user.email,
      password: testData.user.password,
    });
    const managerAuth = await loginAsCredentials(request, {
      email: actors.manager.email,
      password: actors.manager.password,
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
    });
    const cashierAuth = await loginAsCredentials(request, {
      email: actors.cashier.email,
      password: actors.cashier.password,
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
    });
    const managerClient = new HttpClient(request, managerAuth);
    const cashierClient = new HttpClient(request, cashierAuth);
    const catalogItemId = `catalog-${randomUUID()}`;
    const discountAmountCents = 200;

    const discountPolicy = await createApprovalPolicy(request, ownerAuth, {
      key: "restaurant.discount",
      name: `Restaurant discount approval ${Date.now()}`,
      status: "ACTIVE",
      steps: [
        {
          name: "Manager approval",
          assigneeRoleId: actors.manager.roleId,
        },
      ],
    });
    expect(discountPolicy.response.status()).toBe(201);

    const venue = await seedRestaurantVenue(
      ownerClient,
      `approve-discount-${Date.now()}`,
      catalogItemId
    );

    const opened = await openRestaurantTable(
      cashierClient,
      {
        tableSessionId: randomUUID(),
        orderId: randomUUID(),
        tableId: venue.tableAId,
      },
      restaurantIdempotencyKey(testInfo, "focused-approve-discount-open")
    );
    expect(opened.response.status()).toBe(201);

    const draft = await putRestaurantDraftOrder(
      cashierClient,
      {
        orderId: opened.output.order.id,
        items: draftOrderItems(catalogItemId),
        discountCents: 0,
      },
      restaurantIdempotencyKey(testInfo, "focused-approve-discount-draft")
    );
    expect(draft.response.status()).toBe(200);
    expect(draft.output.order.discountCents).toBe(0);
    expect(draft.output.order.totalCents).toBe(1_498);

    const requested = await requestRestaurantDiscount(
      cashierClient,
      {
        orderId: opened.output.order.id,
        amountCents: discountAmountCents,
        reason: "Manager approved service recovery",
      },
      restaurantIdempotencyKey(testInfo, "focused-approve-discount-request")
    );
    expect(requested.response.status()).toBe(201);
    expect(requested.output.approvalRequest.status).toBe("PENDING");
    expect(requested.output.order.discountCents).toBe(0);

    const approved = await approveRestaurantApproval(
      managerClient,
      requested.output.approvalRequest.id,
      { comment: "Approved after review" },
      restaurantIdempotencyKey(testInfo, "focused-approve-discount-manager")
    );
    expect(approved.response.status()).toBe(201);
    const approvedBody = approved.body as {
      approvalRequest: {
        id: string;
        type: string;
        status: string;
        orderId: string;
        amountCents: number | null;
        decidedByUserId: string | null;
        decidedAt: string | null;
      };
      order: {
        id: string;
        status: string;
        discountCents: number;
        subtotalCents: number;
        taxCents: number;
        totalCents: number;
      };
    };
    expect(approvedBody.approvalRequest.id).toBe(requested.output.approvalRequest.id);
    expect(approvedBody.approvalRequest.type).toBe("DISCOUNT");
    expect(approvedBody.approvalRequest.status).toBe("APPLIED");
    expect(approvedBody.approvalRequest.orderId).toBe(opened.output.order.id);
    expect(approvedBody.approvalRequest.amountCents).toBe(discountAmountCents);
    expect(approvedBody.approvalRequest.decidedByUserId).toBe(actors.manager.userId);
    expect(approvedBody.approvalRequest.decidedAt).toBeTruthy();
    expect(approvedBody.order.id).toBe(opened.output.order.id);
    expect(approvedBody.order.status).toBe("DRAFT");
    expect(approvedBody.order.discountCents).toBe(discountAmountCents);
    expect(approvedBody.order.subtotalCents).toBe(1_400);
    expect(approvedBody.order.taxCents).toBe(98);
    expect(approvedBody.order.totalCents).toBe(1_298);

    const currentOrder = await getActiveRestaurantOrder(cashierClient, venue.tableAId);
    expect(currentOrder.response.status()).toBe(200);
    expect(currentOrder.output.order?.id).toBe(opened.output.order.id);
    expect(currentOrder.output.order?.discountCents).toBe(discountAmountCents);
    expect(currentOrder.output.order?.subtotalCents).toBe(1_400);
    expect(currentOrder.output.order?.taxCents).toBe(98);
    expect(currentOrder.output.order?.totalCents).toBe(1_298);

    const db = requirePrisma();
    const persistedApproval = await db.restaurantApprovalRequest.findUnique({
      where: { id: requested.output.approvalRequest.id },
    });
    expect(persistedApproval).toBeTruthy();
    expect(persistedApproval?.status).toBe("APPLIED");
    expect(persistedApproval?.amountCents).toBe(discountAmountCents);
    expect(persistedApproval?.decidedByUserId).toBe(actors.manager.userId);
    expect(persistedApproval?.decidedAt).toBeTruthy();

    const persistedOrder = await db.restaurantOrder.findUnique({
      where: { id: opened.output.order.id },
    });
    expect(persistedOrder?.discountCents).toBe(discountAmountCents);
    expect(persistedOrder?.subtotalCents).toBe(1_400);
    expect(persistedOrder?.taxCents).toBe(98);
    expect(persistedOrder?.totalCents).toBe(1_298);

    const auditRows = await db.auditLog.findMany({
      where: {
        tenantId: testData.tenant.id,
        action: "restaurant.approval.approve",
        entityId: requested.output.approvalRequest.id,
      },
      orderBy: { createdAt: "asc" },
    });
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0]?.actorUserId).toBe(actors.manager.userId);
    expect(JSON.parse(auditRows[0]?.details ?? "{}")).toMatchObject({
      orderId: opened.output.order.id,
      type: "DISCOUNT",
    });
  });

  test("reviews a bill summary before payment with subtotal, tax, discounts, voided lines, and total due", async ({
    request,
    testData,
  }, testInfo) => {
    const ownerAuth = await loginAsSeededUser(request, testData);
    const ownerClient = new HttpClient(request, ownerAuth);
    const actors = await seedRestaurantActors(requirePrisma(), {
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
      ownerUserId: testData.user.id,
      ownerEmail: testData.user.email,
      password: testData.user.password,
    });
    const managerAuth = await loginAsCredentials(request, {
      email: actors.manager.email,
      password: actors.manager.password,
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
    });
    const cashierAuth = await loginAsCredentials(request, {
      email: actors.cashier.email,
      password: actors.cashier.password,
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
    });
    const managerClient = new HttpClient(request, managerAuth);
    const cashierClient = new HttpClient(request, cashierAuth);
    const catalogItemId = `catalog-${randomUUID()}`;

    const voidPolicy = await createApprovalPolicy(request, ownerAuth, {
      key: "restaurant.void",
      name: `Restaurant void approval ${Date.now()}`,
      status: "ACTIVE",
      steps: [
        {
          name: "Manager approval",
          assigneeRoleId: actors.manager.roleId,
        },
      ],
    });
    expect(voidPolicy.response.status()).toBe(201);

    const discountPolicy = await createApprovalPolicy(request, ownerAuth, {
      key: "restaurant.discount",
      name: `Restaurant discount approval ${Date.now()}`,
      status: "ACTIVE",
      steps: [
        {
          name: "Manager approval",
          assigneeRoleId: actors.manager.roleId,
        },
      ],
    });
    expect(discountPolicy.response.status()).toBe(201);

    const venue = await seedRestaurantVenue(
      ownerClient,
      `bill-review-${Date.now()}`,
      catalogItemId
    );

    const opened = await openRestaurantTable(
      cashierClient,
      {
        tableSessionId: randomUUID(),
        orderId: randomUUID(),
        tableId: venue.tableAId,
      },
      restaurantIdempotencyKey(testInfo, "bill-review-open")
    );
    expect(opened.response.status()).toBe(201);

    const draft = await putRestaurantDraftOrder(
      cashierClient,
      {
        orderId: opened.output.order.id,
        items: [
          ...draftOrderItems(catalogItemId),
          {
            catalogItemId: `${catalogItemId}-drink`,
            itemName: "Lemonade",
            sku: "DRINK-LEMON",
            quantity: 1,
            unitPriceCents: 500,
            taxRateBps: 1000,
            modifiers: [],
          },
        ],
        discountCents: 0,
      },
      restaurantIdempotencyKey(testInfo, "bill-review-draft")
    );
    expect(draft.response.status()).toBe(200);
    expect(draft.output.order.subtotalCents).toBe(1_900);
    expect(draft.output.order.taxCents).toBe(148);
    expect(draft.output.order.discountCents).toBe(0);
    expect(draft.output.order.totalCents).toBe(2_048);

    const voidItem = draft.output.order.items.find((item) => item.sku === "DRINK-LEMON");
    expect(voidItem).toBeTruthy();

    const voidRequested = await requestRestaurantVoid(
      cashierClient,
      {
        orderItemId: voidItem!.id,
        reason: "Drink comped after spill",
      },
      restaurantIdempotencyKey(testInfo, "bill-review-void-request")
    );
    expect(voidRequested.response.status()).toBe(201);

    const voidApproved = await approveRestaurantApproval(
      managerClient,
      voidRequested.output.approvalRequest.id,
      { comment: "Approved void for spilled drink" },
      restaurantIdempotencyKey(testInfo, "bill-review-void-approve")
    );
    expect(voidApproved.response.status()).toBe(201);

    const discountRequested = await requestRestaurantDiscount(
      cashierClient,
      {
        orderId: opened.output.order.id,
        amountCents: 100,
        reason: "Service recovery discount",
      },
      restaurantIdempotencyKey(testInfo, "bill-review-discount-request")
    );
    expect(discountRequested.response.status()).toBe(201);

    const discountApproved = await approveRestaurantApproval(
      managerClient,
      discountRequested.output.approvalRequest.id,
      { comment: "Approved bill review discount" },
      restaurantIdempotencyKey(testInfo, "bill-review-discount-approve")
    );
    expect(discountApproved.response.status()).toBe(201);

    const bill = await getActiveRestaurantOrder(cashierClient, venue.tableAId);
    expect(bill.response.status()).toBe(200);
    expect(bill.output.session?.id).toBe(opened.output.session.id);
    expect(bill.output.order?.id).toBe(opened.output.order.id);
    expect(bill.output.order?.status).toBe("DRAFT");
    expect(bill.output.order?.payments).toHaveLength(0);
    expect(bill.output.order?.paidAt).toBeNull();
    expect(bill.output.order?.closedAt).toBeNull();
    expect(bill.output.order?.subtotalCents).toBe(1_400);
    expect(bill.output.order?.taxCents).toBe(98);
    expect(bill.output.order?.discountCents).toBe(100);
    expect(bill.output.order?.totalCents).toBe(1_398);
    expect(bill.output.order?.items).toHaveLength(2);

    const pizza = bill.output.order?.items.find((item) => item.sku === "PIZZA-MARG");
    const lemonade = bill.output.order?.items.find((item) => item.sku === "DRINK-LEMON");
    expect(pizza?.voidedAt).toBeNull();
    expect(pizza?.lineSubtotalCents).toBe(1_400);
    expect(pizza?.lineTotalCents).toBe(1_498);
    expect(lemonade?.voidedAt).toBeTruthy();
    expect(lemonade?.lineSubtotalCents).toBe(500);
    expect(lemonade?.lineTotalCents).toBe(550);

    const db = requirePrisma();
    const persistedOrder = await db.restaurantOrder.findUnique({
      where: { id: opened.output.order.id },
      include: {
        items: true,
      },
    });
    expect(persistedOrder?.status).toBe("DRAFT");
    expect(persistedOrder?.subtotalCents).toBe(1_400);
    expect(persistedOrder?.taxCents).toBe(98);
    expect(persistedOrder?.discountCents).toBe(100);
    expect(persistedOrder?.totalCents).toBe(1_398);
    expect(persistedOrder?.items).toHaveLength(2);
    expect(persistedOrder?.items.find((item) => item.sku === "DRINK-LEMON")?.voidedAt).toBeTruthy();
  });

  test("captures cash and mixed payments through the close-table payment flow and links them to finalized sales", async ({
    request,
    testData,
  }, testInfo) => {
    const ownerAuth = await loginAsSeededUser(request, testData);
    const ownerClient = new HttpClient(request, ownerAuth);
    const actors = await seedRestaurantActors(requirePrisma(), {
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
      ownerUserId: testData.user.id,
      ownerEmail: testData.user.email,
      password: testData.user.password,
    });
    const cashierAuth = await loginAsCredentials(request, {
      email: actors.cashier.email,
      password: actors.cashier.password,
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
    });
    const client = new HttpClient(request, cashierAuth);
    const catalogItemId = `catalog-${randomUUID()}`;
    const testName = `take-payment-${Date.now()}`;

    const register = await createPosRegister(
      ownerClient,
      { name: `${testName} Register` },
      restaurantIdempotencyKey(testInfo, "take-payment-register")
    );
    expect(register.response.status()).toBe(201);

    const shift = await openShift(
      client,
      {
        sessionId: randomUUID(),
        registerId: register.register.registerId,
        openedByEmployeePartyId: actors.cashier.userId,
        startingCashCents: 2_500,
        notes: "Take-payment focused e2e shift",
      },
      restaurantIdempotencyKey(testInfo, "take-payment-shift")
    );
    expect(shift.response.status()).toBe(201);

    const venue = await seedRestaurantVenue(ownerClient, testName, catalogItemId);

    const cashOrder = await openRestaurantTable(
      client,
      {
        tableSessionId: randomUUID(),
        orderId: randomUUID(),
        tableId: venue.tableAId,
        registerId: register.register.registerId,
        shiftSessionId: shift.shift.sessionId,
        notes: "Cash payment table",
      },
      restaurantIdempotencyKey(testInfo, "take-payment-cash-open")
    );
    expect(cashOrder.response.status()).toBe(201);

    const cashDraft = await putRestaurantDraftOrder(
      client,
      {
        orderId: cashOrder.output.order.id,
        items: draftOrderItems(catalogItemId),
        discountCents: 0,
      },
      restaurantIdempotencyKey(testInfo, "take-payment-cash-draft")
    );
    expect(cashDraft.response.status()).toBe(200);
    expect(cashDraft.output.order.totalCents).toBe(1_498);

    const cashSent = await sendRestaurantOrderToKitchen(
      client,
      cashOrder.output.order.id,
      restaurantIdempotencyKey(testInfo, "take-payment-cash-send")
    );
    expect(cashSent.response.status()).toBe(201);

    const cashClose = await closeRestaurantTable(
      client,
      {
        orderId: cashOrder.output.order.id,
        tableSessionId: cashOrder.output.session.id,
        payments: [
          {
            paymentId: randomUUID(),
            method: "CASH",
            amountCents: cashDraft.output.order.totalCents,
            reference: "drawer-001",
          },
        ],
      },
      restaurantIdempotencyKey(testInfo, "take-payment-cash-close")
    );
    expect(cashClose.response.status()).toBe(201);
    expect(cashClose.output.finalizedSaleRef).toBe(`restaurant-sale:${cashOrder.output.order.id}`);
    expect(cashClose.output.order.status).toBe("CLOSED");
    expect(cashClose.output.order.totalCents).toBe(1_498);
    expect(cashClose.output.order.payments).toHaveLength(1);
    expect(cashClose.output.order.payments[0]?.method).toBe("CASH");
    expect(cashClose.output.order.payments[0]?.amountCents).toBe(1_498);
    expect(cashClose.output.session.status).toBe("CLOSED");

    const cashAfter = await getActiveRestaurantOrder(client, venue.tableAId);
    expect(cashAfter.response.status()).toBe(200);
    expect(cashAfter.output.session).toBeNull();
    expect(cashAfter.output.order).toBeNull();

    const mixedOrder = await openRestaurantTable(
      client,
      {
        tableSessionId: randomUUID(),
        orderId: randomUUID(),
        tableId: venue.tableBId,
        registerId: register.register.registerId,
        shiftSessionId: shift.shift.sessionId,
        notes: "Mixed payment table",
      },
      restaurantIdempotencyKey(testInfo, "take-payment-mixed-open")
    );
    expect(mixedOrder.response.status()).toBe(201);

    const mixedDraft = await putRestaurantDraftOrder(
      client,
      {
        orderId: mixedOrder.output.order.id,
        items: draftMenuItems(catalogItemId),
        discountCents: 0,
      },
      restaurantIdempotencyKey(testInfo, "take-payment-mixed-draft")
    );
    expect(mixedDraft.response.status()).toBe(200);
    expect(mixedDraft.output.order.totalCents).toBe(2_598);

    const mixedSent = await sendRestaurantOrderToKitchen(
      client,
      mixedOrder.output.order.id,
      restaurantIdempotencyKey(testInfo, "take-payment-mixed-send")
    );
    expect(mixedSent.response.status()).toBe(201);

    const mixedClose = await closeRestaurantTable(
      client,
      {
        orderId: mixedOrder.output.order.id,
        tableSessionId: mixedOrder.output.session.id,
        payments: [
          {
            paymentId: randomUUID(),
            method: "CASH",
            amountCents: 600,
            reference: "drawer-002",
          },
          {
            paymentId: randomUUID(),
            method: "CARD",
            amountCents: 1_998,
            reference: "terminal-002",
          },
        ],
      },
      restaurantIdempotencyKey(testInfo, "take-payment-mixed-close")
    );
    expect(mixedClose.response.status()).toBe(201);
    expect(mixedClose.output.finalizedSaleRef).toBe(
      `restaurant-sale:${mixedOrder.output.order.id}`
    );
    expect(mixedClose.output.order.status).toBe("CLOSED");
    expect(mixedClose.output.order.totalCents).toBe(2_598);
    expect(mixedClose.output.order.payments).toHaveLength(2);
    expect(mixedClose.output.order.payments.map((payment) => payment.method)).toEqual(
      expect.arrayContaining(["CASH", "CARD"])
    );
    expect(
      mixedClose.output.order.payments.reduce((sum, payment) => sum + payment.amountCents, 0)
    ).toBe(2_598);
    expect(mixedClose.output.session.status).toBe("CLOSED");

    const floorAfter = await getRestaurantFloorPlan(client);
    expect(floorAfter.response.status()).toBe(200);
    const tableAAfter = floorAfter.output.rooms
      .flatMap((room) => room.tables)
      .find((table) => table.id === venue.tableAId);
    const tableBAfter = floorAfter.output.rooms
      .flatMap((room) => room.tables)
      .find((table) => table.id === venue.tableBId);
    expect(tableAAfter?.availabilityStatus).toBe("AVAILABLE");
    expect(tableAAfter?.activeOrderId).toBeNull();
    expect(tableBAfter?.availabilityStatus).toBe("AVAILABLE");
    expect(tableBAfter?.activeOrderId).toBeNull();

    const db = requirePrisma();
    const persistedCashOrder = await db.restaurantOrder.findUnique({
      where: { id: cashOrder.output.order.id },
      include: { payments: true },
    });
    const persistedMixedOrder = await db.restaurantOrder.findUnique({
      where: { id: mixedOrder.output.order.id },
      include: { payments: true },
    });
    expect(persistedCashOrder?.status).toBe("CLOSED");
    expect(persistedCashOrder?.payments).toHaveLength(1);
    expect(persistedCashOrder?.payments[0]?.method).toBe("CASH");
    expect(persistedMixedOrder?.status).toBe("CLOSED");
    expect(persistedMixedOrder?.payments).toHaveLength(2);
    expect(
      persistedMixedOrder?.payments.reduce((sum, payment) => sum + payment.amountCents, 0)
    ).toBe(2_598);

    const paymentEvents = await db.outboxEvent.findMany({
      where: {
        tenantId: testData.tenant.id,
        eventType: "restaurant.payment-captured",
      },
      orderBy: { createdAt: "asc" },
    });
    expect(
      paymentEvents.filter((event) => event.correlationId === cashOrder.output.order.id)
    ).toHaveLength(1);
    expect(
      paymentEvents.filter((event) => event.correlationId === mixedOrder.output.order.id)
    ).toHaveLength(1);
  });

  test("closes a fully paid table, finalizes the sale, makes the check immutable, and returns the table to reusable availability", async ({
    request,
    testData,
  }, testInfo) => {
    const ownerAuth = await loginAsSeededUser(request, testData);
    const ownerClient = new HttpClient(request, ownerAuth);
    const actors = await seedRestaurantActors(requirePrisma(), {
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
      ownerUserId: testData.user.id,
      ownerEmail: testData.user.email,
      password: testData.user.password,
    });
    const cashierAuth = await loginAsCredentials(request, {
      email: actors.cashier.email,
      password: actors.cashier.password,
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
    });
    const client = new HttpClient(request, cashierAuth);
    const catalogItemId = `catalog-${randomUUID()}`;
    const testName = `close-table-${Date.now()}`;

    const register = await createPosRegister(
      ownerClient,
      { name: `${testName} Register` },
      restaurantIdempotencyKey(testInfo, "close-table-register")
    );
    expect(register.response.status()).toBe(201);

    const shift = await openShift(
      client,
      {
        sessionId: randomUUID(),
        registerId: register.register.registerId,
        openedByEmployeePartyId: actors.cashier.userId,
        startingCashCents: 2_500,
        notes: "Close-table focused e2e shift",
      },
      restaurantIdempotencyKey(testInfo, "close-table-shift")
    );
    expect(shift.response.status()).toBe(201);

    const venue = await seedRestaurantVenue(ownerClient, testName, catalogItemId);

    const opened = await openRestaurantTable(
      client,
      {
        tableSessionId: randomUUID(),
        orderId: randomUUID(),
        tableId: venue.tableAId,
        registerId: register.register.registerId,
        shiftSessionId: shift.shift.sessionId,
        notes: "Close-table focus order",
      },
      restaurantIdempotencyKey(testInfo, "close-table-open")
    );
    expect(opened.response.status()).toBe(201);

    const draft = await putRestaurantDraftOrder(
      client,
      {
        orderId: opened.output.order.id,
        items: draftOrderItems(catalogItemId),
        discountCents: 0,
      },
      restaurantIdempotencyKey(testInfo, "close-table-draft")
    );
    expect(draft.response.status()).toBe(200);
    expect(draft.output.order.totalCents).toBe(1_498);

    const sent = await sendRestaurantOrderToKitchen(
      client,
      opened.output.order.id,
      restaurantIdempotencyKey(testInfo, "close-table-send")
    );
    expect(sent.response.status()).toBe(201);
    expect(sent.output.order.status).toBe("SENT");

    const closed = await closeRestaurantTable(
      client,
      {
        orderId: opened.output.order.id,
        tableSessionId: opened.output.session.id,
        payments: [
          {
            paymentId: randomUUID(),
            method: "CARD",
            amountCents: draft.output.order.totalCents,
            reference: "terminal-close-001",
          },
        ],
      },
      restaurantIdempotencyKey(testInfo, "close-table-command")
    );
    expect(closed.response.status()).toBe(201);
    expect(closed.output.finalizedSaleRef).toBe(`restaurant-sale:${opened.output.order.id}`);
    expect(closed.output.order.id).toBe(opened.output.order.id);
    expect(closed.output.order.status).toBe("CLOSED");
    expect(closed.output.order.paidAt).toBeTruthy();
    expect(closed.output.order.closedAt).toBeTruthy();
    expect(closed.output.order.payments).toHaveLength(1);
    expect(closed.output.order.payments[0]?.method).toBe("CARD");
    expect(closed.output.order.payments[0]?.amountCents).toBe(1_498);
    expect(closed.output.session.id).toBe(opened.output.session.id);
    expect(closed.output.session.status).toBe("CLOSED");
    expect(closed.output.session.closedAt).toBeTruthy();

    const activeAfterClose = await getActiveRestaurantOrder(client, venue.tableAId);
    expect(activeAfterClose.response.status()).toBe(200);
    expect(activeAfterClose.output.session).toBeNull();
    expect(activeAfterClose.output.order).toBeNull();

    const floorAfterClose = await getRestaurantFloorPlan(client);
    expect(floorAfterClose.response.status()).toBe(200);
    const tableAfterClose = floorAfterClose.output.rooms
      .flatMap((room) => room.tables)
      .find((table) => table.id === venue.tableAId);
    expect(tableAfterClose?.availabilityStatus).toBe("AVAILABLE");
    expect(tableAfterClose?.activeOrderId).toBeNull();
    expect(tableAfterClose?.activeSessionId).toBeNull();

    const immutableUpdate = await client.putJson(
      `/restaurant/orders/${encodeURIComponent(opened.output.order.id)}/draft`,
      {
        orderId: opened.output.order.id,
        items: draftOrderItems(catalogItemId),
        discountCents: 0,
        idempotencyKey: restaurantIdempotencyKey(testInfo, "close-table-immutable-update"),
      },
      restaurantIdempotencyKey(testInfo, "close-table-immutable-update")
    );
    await expectProblem(immutableUpdate.response, 409);

    const reopened = await openRestaurantTable(
      client,
      {
        tableSessionId: randomUUID(),
        orderId: randomUUID(),
        tableId: venue.tableAId,
        registerId: register.register.registerId,
        shiftSessionId: shift.shift.sessionId,
        notes: "Reused table after close",
      },
      restaurantIdempotencyKey(testInfo, "close-table-reopen")
    );
    expect(reopened.response.status()).toBe(201);
    expect(reopened.output.session.id).not.toBe(opened.output.session.id);
    expect(reopened.output.order.id).not.toBe(opened.output.order.id);
    expect(reopened.output.session.status).toBe("OPEN");
    expect(reopened.output.order.status).toBe("DRAFT");

    const db = requirePrisma();
    const persistedClosedOrder = await db.restaurantOrder.findUnique({
      where: { id: opened.output.order.id },
      include: { payments: true },
    });
    const persistedClosedSession = await db.restaurantTableSession.findUnique({
      where: { id: opened.output.session.id },
    });
    expect(persistedClosedOrder?.status).toBe("CLOSED");
    expect(persistedClosedOrder?.payments).toHaveLength(1);
    expect(persistedClosedSession?.status).toBe("CLOSED");

    const auditRows = await db.auditLog.findMany({
      where: {
        tenantId: testData.tenant.id,
        action: "restaurant.table.closed",
        entityId: opened.output.order.id,
      },
      orderBy: { createdAt: "asc" },
    });
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0]?.actorUserId).toBe(actors.cashier.userId);
    expect(JSON.parse(auditRows[0]?.details ?? "{}")).toMatchObject({
      sessionId: opened.output.session.id,
      totalCents: 1_498,
      paymentCount: 1,
    });

    const outboxRows = await db.outboxEvent.findMany({
      where: {
        tenantId: testData.tenant.id,
        correlationId: opened.output.order.id,
        eventType: { in: ["restaurant.payment-captured", "restaurant.table-closed"] },
      },
      orderBy: { createdAt: "asc" },
    });
    expect(outboxRows.map((event) => event.eventType).sort()).toEqual([
      "restaurant.payment-captured",
      "restaurant.table-closed",
    ]);
  });

  test("runs the cashier table flow through shift open, floor plan, modifiers, kitchen send, idempotent close, and post-close guards", async ({
    request,
    testData,
  }, testInfo) => {
    const ownerAuth = await loginAsSeededUser(request, testData);
    const ownerClient = new HttpClient(request, ownerAuth);
    const actors = await seedRestaurantActors(requirePrisma(), {
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
      ownerUserId: testData.user.id,
      ownerEmail: testData.user.email,
      password: testData.user.password,
    });
    const cashierAuth = await loginAsCredentials(request, {
      email: actors.cashier.email,
      password: actors.cashier.password,
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
    });
    const client = new HttpClient(request, cashierAuth);
    const catalogItemId = `catalog-${randomUUID()}`;

    const register = await createPosRegister(
      client,
      { name: `Front Register ${Date.now()}` },
      restaurantIdempotencyKey(testInfo, "create-register")
    );
    expect(register.response.status()).toBe(201);

    const shift = await openShift(
      client,
      {
        sessionId: randomUUID(),
        registerId: register.register.registerId,
        openedByEmployeePartyId: actors.cashier.userId,
        startingCashCents: 2_000,
        notes: "Restaurant breakfast shift",
      },
      restaurantIdempotencyKey(testInfo, "open-shift")
    );
    expect(shift.response.status()).toBe(201);

    const currentShift = await getCurrentShift(client, register.register.registerId);
    expect(currentShift.response.status()).toBe(200);
    expect(currentShift.output.session?.sessionId).toBe(shift.shift.sessionId);

    const venue = await seedRestaurantVenue(ownerClient, `primary-${Date.now()}`, catalogItemId);

    const floorBefore = await getRestaurantFloorPlan(client);
    expect(floorBefore.response.status()).toBe(200);
    const roomBefore = floorBefore.output.rooms.find((room) => room.id === venue.roomId);
    expect(roomBefore).toBeTruthy();
    const tableBefore = roomBefore?.tables.find((table) => table.id === venue.tableAId);
    expect(tableBefore?.availabilityStatus).toBe("AVAILABLE");
    expect(tableBefore?.activeOrderId).toBeNull();

    const opened = await openRestaurantTable(
      client,
      {
        tableSessionId: randomUUID(),
        orderId: randomUUID(),
        tableId: venue.tableAId,
        registerId: register.register.registerId,
        shiftSessionId: shift.shift.sessionId,
        notes: "Lunch cover",
      },
      restaurantIdempotencyKey(testInfo, "open-table")
    );
    expect(opened.response.status()).toBe(201);
    expect(opened.output.session.tableId).toBe(venue.tableAId);
    expect(opened.output.order.status).toBe("DRAFT");

    const floorOccupied = await getRestaurantFloorPlan(client);
    const occupiedTable = floorOccupied.output.rooms
      .flatMap((room) => room.tables)
      .find((table) => table.id === venue.tableAId);
    expect(occupiedTable?.availabilityStatus).toBe("OCCUPIED");
    expect(occupiedTable?.activeOrderId).toBe(opened.output.order.id);
    expect(occupiedTable?.activeSessionId).toBe(opened.output.session.id);

    const activeOrder = await getActiveRestaurantOrder(client, venue.tableAId);
    expect(activeOrder.response.status()).toBe(200);
    expect(activeOrder.output.session?.id).toBe(opened.output.session.id);
    expect(activeOrder.output.order?.id).toBe(opened.output.order.id);

    const draft = await putRestaurantDraftOrder(
      client,
      {
        orderId: opened.output.order.id,
        items: draftOrderItems(catalogItemId),
        discountCents: 0,
      },
      restaurantIdempotencyKey(testInfo, "draft-order")
    );
    expect(draft.response.status()).toBe(200);
    expect(draft.output.order.items).toHaveLength(1);
    expect(draft.output.order.items[0]?.modifiers).toHaveLength(1);
    expect(draft.output.order.subtotalCents).toBe(1_400);
    expect(draft.output.order.taxCents).toBe(98);
    expect(draft.output.order.totalCents).toBe(1_498);
    expect(draft.output.order.status).toBe("DRAFT");

    const sendKey = restaurantIdempotencyKey(testInfo, "send-kitchen");
    const sendA = await sendRestaurantOrderToKitchen(client, opened.output.order.id, sendKey);
    const sendB = await sendRestaurantOrderToKitchen(client, opened.output.order.id, sendKey);
    expect(sendA.response.status()).toBe(201);
    expect(sendB.response.status()).toBe(201);
    expect(sendA.output.tickets).toHaveLength(1);
    expect(sendA.output.tickets[0]?.id).toBe(sendB.output.tickets[0]?.id);
    expect(sendA.output.order.status).toBe("SENT");

    const tickets = await listKitchenTickets(client);
    expect(tickets.response.status()).toBe(200);
    expect(tickets.output.items).toHaveLength(1);
    expect(tickets.output.items[0]?.id).toBe(sendA.output.tickets[0]?.id);
    expect(tickets.output.items[0]?.status).toBe("NEW");

    const closeKey = restaurantIdempotencyKey(testInfo, "close-table");
    const paymentId = randomUUID();
    const closeA = await closeRestaurantTable(
      client,
      {
        orderId: opened.output.order.id,
        tableSessionId: opened.output.session.id,
        payments: [
          {
            paymentId,
            method: "CARD",
            amountCents: draft.output.order.totalCents,
            reference: "terminal-001",
          },
        ],
      },
      closeKey
    );
    const closeB = await closeRestaurantTable(
      client,
      {
        orderId: opened.output.order.id,
        tableSessionId: opened.output.session.id,
        payments: [
          {
            paymentId,
            method: "CARD",
            amountCents: draft.output.order.totalCents,
            reference: "terminal-001",
          },
        ],
      },
      closeKey
    );
    expect(closeA.response.status()).toBe(201);
    expect(closeB.response.status()).toBe(201);
    expect(closeA.output.finalizedSaleRef).toBe(closeB.output.finalizedSaleRef);
    expect(closeA.output.order.status).toBe("CLOSED");
    expect(closeA.output.session.status).toBe("CLOSED");
    expect(closeA.output.order.payments).toHaveLength(1);

    const closeMismatch = await client.postJson(
      `/restaurant/orders/${encodeURIComponent(opened.output.order.id)}/close`,
      {
        orderId: opened.output.order.id,
        tableSessionId: opened.output.session.id,
        payments: [
          {
            paymentId: randomUUID(),
            method: "CARD",
            amountCents: draft.output.order.totalCents,
            reference: "terminal-002",
          },
        ],
        idempotencyKey: closeKey,
      },
      closeKey
    );
    await expectProblem(closeMismatch.response, 400);

    const floorReleased = await getRestaurantFloorPlan(client);
    const releasedTable = floorReleased.output.rooms
      .flatMap((room) => room.tables)
      .find((table) => table.id === venue.tableAId);
    expect(releasedTable?.availabilityStatus).toBe("AVAILABLE");
    expect(releasedTable?.activeOrderId).toBeNull();
    expect(releasedTable?.activeSessionId).toBeNull();

    const activeAfterClose = await getActiveRestaurantOrder(client, venue.tableAId);
    expect(activeAfterClose.output.session).toBeNull();
    expect(activeAfterClose.output.order).toBeNull();

    const resendClosed = await client.postJson(
      `/restaurant/orders/${encodeURIComponent(opened.output.order.id)}/send`,
      {
        orderId: opened.output.order.id,
        idempotencyKey: restaurantIdempotencyKey(testInfo, "resend-closed-order"),
      },
      restaurantIdempotencyKey(testInfo, "resend-closed-order")
    );
    expect([201, 409]).toContain(resendClosed.response.status());

    const ticketsAfterCloseResend = await listKitchenTickets(client);
    expect(ticketsAfterCloseResend.output.items).toHaveLength(1);

    const db = requirePrisma();
    expect(
      await db.kitchenTicket.count({
        where: {
          tenantId: testData.tenant.id,
          workspaceId: testData.workspace.id,
          orderId: opened.output.order.id,
        },
      })
    ).toBe(1);
    expect(
      await db.restaurantOrderPayment.count({
        where: {
          tenantId: testData.tenant.id,
          workspaceId: testData.workspace.id,
          orderId: opened.output.order.id,
        },
      })
    ).toBe(1);
    expect(
      await db.auditLog.count({
        where: {
          tenantId: testData.tenant.id,
          action: "restaurant.order.sent-to-kitchen",
          entity: "RestaurantOrder",
          entityId: opened.output.order.id,
        },
      })
    ).toBe(1);
    expect(
      await db.outboxEvent.count({
        where: {
          tenantId: testData.tenant.id,
          eventType: "restaurant.order-sent-to-kitchen",
          payloadJson: { contains: opened.output.order.id },
        },
      })
    ).toBe(1);
    expect(
      await db.outboxEvent.count({
        where: {
          tenantId: testData.tenant.id,
          eventType: "restaurant.table-closed",
          payloadJson: { contains: opened.output.session.id },
        },
      })
    ).toBe(1);
  });

  test("transfers an occupied table and enforces kitchen ticket status progression rules", async ({
    request,
    testData,
  }, testInfo) => {
    const auth = await loginAsSeededUser(request, testData);
    const client = new HttpClient(request, auth);
    const catalogItemId = `catalog-${randomUUID()}`;

    const venue = await seedRestaurantVenue(client, `transfer-${Date.now()}`, catalogItemId);

    const opened = await openRestaurantTable(
      client,
      {
        tableSessionId: randomUUID(),
        orderId: randomUUID(),
        tableId: venue.tableAId,
      },
      restaurantIdempotencyKey(testInfo, "transfer-open")
    );
    const draft = await putRestaurantDraftOrder(
      client,
      {
        orderId: opened.output.order.id,
        items: draftOrderItems(catalogItemId),
        discountCents: 0,
      },
      restaurantIdempotencyKey(testInfo, "transfer-draft")
    );
    expect(draft.output.order.totalCents).toBeGreaterThan(0);

    const transfer = await transferRestaurantTable(
      client,
      {
        tableSessionId: opened.output.session.id,
        orderId: opened.output.order.id,
        toTableId: venue.tableBId,
      },
      restaurantIdempotencyKey(testInfo, "transfer-order")
    );
    expect(transfer.response.status()).toBe(201);
    const transferred = transfer.body as {
      session: { tableId: string; transferCount: number };
      order: { tableId: string; id: string };
    };
    expect(transferred.session.tableId).toBe(venue.tableBId);
    expect(transferred.session.transferCount).toBe(1);
    expect(transferred.order.tableId).toBe(venue.tableBId);

    const originAfterTransfer = await getActiveRestaurantOrder(client, venue.tableAId);
    expect(originAfterTransfer.output.session).toBeNull();
    expect(originAfterTransfer.output.order).toBeNull();

    const destinationAfterTransfer = await getActiveRestaurantOrder(client, venue.tableBId);
    expect(destinationAfterTransfer.output.session?.id).toBe(opened.output.session.id);
    expect(destinationAfterTransfer.output.order?.id).toBe(opened.output.order.id);

    const floorAfterTransfer = await getRestaurantFloorPlan(client);
    const tableA = floorAfterTransfer.output.rooms
      .flatMap((room) => room.tables)
      .find((table) => table.id === venue.tableAId);
    const tableB = floorAfterTransfer.output.rooms
      .flatMap((room) => room.tables)
      .find((table) => table.id === venue.tableBId);
    expect(tableA?.availabilityStatus).toBe("AVAILABLE");
    expect(tableB?.availabilityStatus).toBe("OCCUPIED");
    expect(tableB?.activeOrderId).toBe(opened.output.order.id);

    const sent = await sendRestaurantOrderToKitchen(
      client,
      opened.output.order.id,
      restaurantIdempotencyKey(testInfo, "transfer-send")
    );
    const ticketId = sent.output.tickets[0]?.id;
    expect(ticketId).toBeTruthy();

    const inProgress = await updateKitchenTicketStatus(
      client,
      { ticketId: ticketId!, status: "IN_PROGRESS" },
      restaurantIdempotencyKey(testInfo, "ticket-in-progress")
    );
    expect(inProgress.response.status()).toBe(201);
    expect(inProgress.output.ticket.status).toBe("IN_PROGRESS");

    const done = await updateKitchenTicketStatus(
      client,
      { ticketId: ticketId!, status: "DONE" },
      restaurantIdempotencyKey(testInfo, "ticket-done")
    );
    expect(done.output.ticket.status).toBe("DONE");

    const bumped = await updateKitchenTicketStatus(
      client,
      { ticketId: ticketId!, status: "BUMPED" },
      restaurantIdempotencyKey(testInfo, "ticket-bumped")
    );
    expect(bumped.output.ticket.status).toBe("BUMPED");

    const invalid = await request.post(
      `${process.env.API_URL ?? "http://localhost:3000"}/restaurant/kitchen/tickets/${encodeURIComponent(ticketId!)}/status`,
      {
        headers: {
          ...authHeaders(auth),
          "Content-Type": "application/json",
          "Idempotency-Key": restaurantIdempotencyKey(testInfo, "ticket-invalid"),
        },
        data: {
          ticketId,
          status: "NEW",
          idempotencyKey: restaurantIdempotencyKey(testInfo, "ticket-invalid"),
        },
      }
    );
    await expectProblem(invalid, 409);

    const db = requirePrisma();
    expect(
      await db.outboxEvent.count({
        where: {
          tenantId: testData.tenant.id,
          eventType: "restaurant.table-transferred",
          payloadJson: { contains: opened.output.order.id },
        },
      })
    ).toBe(1);
    expect(
      await db.outboxEvent.count({
        where: {
          tenantId: testData.tenant.id,
          eventType: "restaurant.kitchen-ticket-bumped",
          payloadJson: { contains: ticketId! },
        },
      })
    ).toBe(1);
  });

  test("requires manager approval for voids and discounts, rejects non-manager approval attempts, and preserves tenant isolation", async ({
    request,
    testData,
  }, testInfo) => {
    const ownerAuth = await loginAsSeededUser(request, testData);
    const ownerClient = new HttpClient(request, ownerAuth);
    const actors = await seedRestaurantActors(requirePrisma(), {
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
      ownerUserId: testData.user.id,
      ownerEmail: testData.user.email,
      password: testData.user.password,
    });
    const managerAuth = await loginAsCredentials(request, {
      email: actors.manager.email,
      password: actors.manager.password,
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
    });
    const cashierAuth = await loginAsCredentials(request, {
      email: actors.cashier.email,
      password: actors.cashier.password,
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
    });
    const cashierClient = new HttpClient(request, cashierAuth);
    const managerClient = new HttpClient(request, managerAuth);
    const catalogItemId = `catalog-${randomUUID()}`;

    const venue = await seedRestaurantVenue(ownerClient, `approval-${Date.now()}`, catalogItemId);

    const voidPolicy = await createApprovalPolicy(request, ownerAuth, {
      key: "restaurant.void",
      name: "Restaurant void approval",
      status: "ACTIVE",
      steps: [
        {
          name: "Manager approval",
          assigneeRoleId: actors.manager.roleId,
        },
      ],
    });
    expect(voidPolicy.response.status()).toBe(201);

    const discountPolicy = await createApprovalPolicy(request, ownerAuth, {
      key: "restaurant.discount",
      name: "Restaurant discount approval",
      status: "ACTIVE",
      steps: [
        {
          name: "Manager approval",
          assigneeRoleId: actors.manager.roleId,
        },
      ],
    });
    expect(discountPolicy.response.status()).toBe(201);

    const voidOrder = await openRestaurantTable(
      cashierClient,
      {
        tableSessionId: randomUUID(),
        orderId: randomUUID(),
        tableId: venue.tableAId,
      },
      restaurantIdempotencyKey(testInfo, "void-open")
    );
    const voidDraft = await putRestaurantDraftOrder(
      cashierClient,
      {
        orderId: voidOrder.output.order.id,
        items: draftOrderItems(catalogItemId),
      },
      restaurantIdempotencyKey(testInfo, "void-draft")
    );
    const voidItemId = voidDraft.output.order.items[0]?.id;
    expect(voidItemId).toBeTruthy();

    const voidRequested = await requestRestaurantVoid(
      cashierClient,
      {
        orderItemId: voidItemId!,
        reason: "Guest changed their mind",
      },
      restaurantIdempotencyKey(testInfo, "void-request")
    );
    expect(voidRequested.response.status()).toBe(201);
    expect(voidRequested.output.approvalRequest.status).toBe("PENDING");
    expect(voidRequested.output.order.items[0]?.voidedAt).toBeNull();

    const voidForbidden = await approveRestaurantApproval(
      cashierClient,
      voidRequested.output.approvalRequest.id,
      { comment: "Cashier cannot self-approve" },
      restaurantIdempotencyKey(testInfo, "void-cashier-approve")
    );
    await expectProblem(voidForbidden.response, 403);

    const voidApproved = await approveRestaurantApproval(
      managerClient,
      voidRequested.output.approvalRequest.id,
      { comment: "Approved by manager" },
      restaurantIdempotencyKey(testInfo, "void-manager-approve")
    );
    expect(voidApproved.response.status()).toBe(201);
    const voidApprovedBody = voidApproved.body as {
      approvalRequest: { status: string; decidedByUserId: string | null };
      order: { totalCents: number; items: Array<{ voidedAt: string | null }> };
    };
    expect(voidApprovedBody.approvalRequest.status).toBe("APPLIED");
    expect(voidApprovedBody.approvalRequest.decidedByUserId).toBe(actors.manager.userId);
    expect(voidApprovedBody.order.items[0]?.voidedAt).toBeTruthy();
    expect(voidApprovedBody.order.totalCents).toBe(0);

    const discountOrder = await openRestaurantTable(
      cashierClient,
      {
        tableSessionId: randomUUID(),
        orderId: randomUUID(),
        tableId: venue.tableBId,
      },
      restaurantIdempotencyKey(testInfo, "discount-open")
    );
    const discountDraft = await putRestaurantDraftOrder(
      cashierClient,
      {
        orderId: discountOrder.output.order.id,
        items: draftOrderItems(catalogItemId),
      },
      restaurantIdempotencyKey(testInfo, "discount-draft")
    );

    const discountRequested = await requestRestaurantDiscount(
      cashierClient,
      {
        orderId: discountOrder.output.order.id,
        amountCents: 200,
        reason: "VIP courtesy",
      },
      restaurantIdempotencyKey(testInfo, "discount-request")
    );
    expect(discountRequested.response.status()).toBe(201);
    expect(discountRequested.output.approvalRequest.status).toBe("PENDING");
    expect(discountRequested.output.order.discountCents).toBe(0);

    const discountForbidden = await approveRestaurantApproval(
      cashierClient,
      discountRequested.output.approvalRequest.id,
      { comment: "Cashier cannot self-approve discount" },
      restaurantIdempotencyKey(testInfo, "discount-cashier-approve")
    );
    await expectProblem(discountForbidden.response, 403);

    const discountApproved = await approveRestaurantApproval(
      managerClient,
      discountRequested.output.approvalRequest.id,
      { comment: "Discount approved" },
      restaurantIdempotencyKey(testInfo, "discount-manager-approve")
    );
    expect(discountApproved.response.status()).toBe(201);
    const discountApprovedBody = discountApproved.body as {
      approvalRequest: { status: string };
      order: { discountCents: number; totalCents: number };
    };
    expect(discountApprovedBody.approvalRequest.status).toBe("APPLIED");
    expect(discountApprovedBody.order.discountCents).toBe(200);
    expect(discountApprovedBody.order.totalCents).toBe(discountDraft.output.order.totalCents - 200);

    const otherTenant = await seedIsolatedTestData();
    try {
      const otherAuth = await loginAsSeededUser(request, otherTenant);
      const otherClient = new HttpClient(request, otherAuth);
      const crossTenantOpen = await otherClient.postJson(
        "/restaurant/tables/open",
        {
          tableSessionId: randomUUID(),
          orderId: randomUUID(),
          tableId: venue.tableAId,
          idempotencyKey: restaurantIdempotencyKey(testInfo, "cross-tenant-open"),
        },
        restaurantIdempotencyKey(testInfo, "cross-tenant-open")
      );
      await expectProblem(crossTenantOpen.response, 404);
    } finally {
      await resetTenantDataForE2e(otherTenant.tenant.id);
    }

    const db = requirePrisma();
    expect(
      await db.restaurantApprovalRequest.count({
        where: {
          tenantId: testData.tenant.id,
          workspaceId: testData.workspace.id,
          status: "APPLIED",
        },
      })
    ).toBe(2);
    expect(
      await db.auditLog.count({
        where: {
          tenantId: testData.tenant.id,
          action: "approval.requested",
        },
      })
    ).toBeGreaterThanOrEqual(2);
  });

  test("records traceable audit and event history for implemented sensitive restaurant and shift actions", async ({
    request,
    testData,
  }, testInfo) => {
    const ownerAuth = await loginAsSeededUser(request, testData);
    const ownerClient = new HttpClient(request, ownerAuth);
    const actors = await seedRestaurantActors(requirePrisma(), {
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
      ownerUserId: testData.user.id,
      ownerEmail: testData.user.email,
      password: testData.user.password,
    });
    const cashierAuth = await loginAsCredentials(request, {
      email: actors.cashier.email,
      password: actors.cashier.password,
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
    });
    const managerAuth = await loginAsCredentials(request, {
      email: actors.manager.email,
      password: actors.manager.password,
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
    });
    const cashierClient = new HttpClient(request, cashierAuth);
    const managerClient = new HttpClient(request, managerAuth);
    const catalogItemId = `catalog-${randomUUID()}`;
    const openingCashCents = 2_500;
    const countedCashCents = 3_100;
    const dayKey = new Date().toISOString().slice(0, 10);

    const voidPolicy = await createApprovalPolicy(request, ownerAuth, {
      key: "restaurant.void",
      name: `Restaurant void trace ${Date.now()}`,
      status: "ACTIVE",
      steps: [
        {
          name: "Manager approval",
          assigneeRoleId: actors.manager.roleId,
        },
      ],
    });
    expect(voidPolicy.response.status()).toBe(201);

    const discountPolicy = await createApprovalPolicy(request, ownerAuth, {
      key: "restaurant.discount",
      name: `Restaurant discount trace ${Date.now()}`,
      status: "ACTIVE",
      steps: [
        {
          name: "Manager approval",
          assigneeRoleId: actors.manager.roleId,
        },
      ],
    });
    expect(discountPolicy.response.status()).toBe(201);

    const billingTrial = await startBillingTrial(
      ownerClient,
      {
        productKey: "cash-management",
        source: "restaurant-pos-e2e",
      },
      restaurantIdempotencyKey(testInfo, "audit-trace-trial-start")
    );
    expect(billingTrial.response.status()).toBe(201);

    const register = await createPosRegister(
      ownerClient,
      { name: `Audit Trace Register ${Date.now()}` },
      restaurantIdempotencyKey(testInfo, "audit-trace-register")
    );
    expect(register.response.status()).toBe(201);

    const shift = await openShift(
      cashierClient,
      {
        sessionId: randomUUID(),
        registerId: register.register.registerId,
        openedByEmployeePartyId: actors.cashier.userId,
        startingCashCents: openingCashCents,
        notes: "Audit trace shift open",
      },
      restaurantIdempotencyKey(testInfo, "audit-trace-open-shift")
    );
    expect(shift.response.status()).toBe(201);

    await seedShiftCloseCashMirror(requirePrisma(), {
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
      registerId: register.register.registerId,
      ownerUserId: actors.cashier.userId,
      openingCashCents,
      dayKey,
    });

    const venue = await seedRestaurantVenue(
      ownerClient,
      `audit-trace-${Date.now()}`,
      catalogItemId
    );

    const opened = await openRestaurantTable(
      cashierClient,
      {
        tableSessionId: randomUUID(),
        orderId: randomUUID(),
        tableId: venue.tableAId,
        registerId: register.register.registerId,
        shiftSessionId: shift.shift.sessionId,
        notes: "Audit trace order",
      },
      restaurantIdempotencyKey(testInfo, "audit-trace-open-table")
    );
    expect(opened.response.status()).toBe(201);

    const drafted = await putRestaurantDraftOrder(
      cashierClient,
      {
        orderId: opened.output.order.id,
        items: draftMenuItems(catalogItemId),
        discountCents: 0,
      },
      restaurantIdempotencyKey(testInfo, "audit-trace-draft")
    );
    expect(drafted.response.status()).toBe(200);

    const transferred = await transferRestaurantTable(
      cashierClient,
      {
        orderId: opened.output.order.id,
        tableSessionId: opened.output.session.id,
        toTableId: venue.tableBId,
      },
      restaurantIdempotencyKey(testInfo, "audit-trace-transfer")
    );
    expect(transferred.response.status()).toBe(201);

    const sent = await sendRestaurantOrderToKitchen(
      cashierClient,
      opened.output.order.id,
      restaurantIdempotencyKey(testInfo, "audit-trace-send")
    );
    expect(sent.response.status()).toBe(201);

    const voidItemId = drafted.output.order.items[0]?.id;
    expect(voidItemId).toBeTruthy();
    const voidRequested = await requestRestaurantVoid(
      cashierClient,
      {
        orderItemId: voidItemId!,
        reason: "Entered on wrong guest seat",
      },
      restaurantIdempotencyKey(testInfo, "audit-trace-void-request")
    );
    expect(voidRequested.response.status()).toBe(201);

    const voidApproved = await approveRestaurantApproval(
      managerClient,
      voidRequested.output.approvalRequest.id,
      { comment: "Manager approved void" },
      restaurantIdempotencyKey(testInfo, "audit-trace-void-approve")
    );
    expect(voidApproved.response.status()).toBe(201);

    const discountRequested = await requestRestaurantDiscount(
      cashierClient,
      {
        orderId: opened.output.order.id,
        amountCents: 150,
        reason: "Guest service recovery",
      },
      restaurantIdempotencyKey(testInfo, "audit-trace-discount-request")
    );
    expect(discountRequested.response.status()).toBe(201);

    const discountApproved = await approveRestaurantApproval(
      managerClient,
      discountRequested.output.approvalRequest.id,
      { comment: "Manager approved discount" },
      restaurantIdempotencyKey(testInfo, "audit-trace-discount-approve")
    );
    expect(discountApproved.response.status()).toBe(201);
    const discountApprovedBody = discountApproved.body as {
      order: { totalCents: number };
    };

    const closed = await closeRestaurantTable(
      cashierClient,
      {
        orderId: opened.output.order.id,
        tableSessionId: opened.output.session.id,
        payments: [
          {
            paymentId: randomUUID(),
            method: "CARD",
            amountCents: discountApprovedBody.order.totalCents,
            reference: "audit-trace-terminal-001",
          },
        ],
      },
      restaurantIdempotencyKey(testInfo, "audit-trace-close-table")
    );
    expect(closed.response.status()).toBe(201);

    const shiftClosed = await closeShift(
      cashierClient,
      {
        sessionId: shift.shift.sessionId,
        closingCashCents: countedCashCents,
        notes: "Audit trace shift close",
      },
      restaurantIdempotencyKey(testInfo, "audit-trace-close-shift")
    );
    expect(shiftClosed.response.status()).toBe(201);
    expect(shiftClosed.shift.status).toBe("CLOSED");

    const db = requirePrisma();
    const auditRows = await db.auditLog.findMany({
      where: {
        tenantId: testData.tenant.id,
        action: {
          in: [
            "restaurant.table.opened",
            "restaurant.table.transferred",
            "restaurant.order.sent-to-kitchen",
            "restaurant.void.requested",
            "restaurant.discount.requested",
            "restaurant.approval.approve",
            "restaurant.table.closed",
            "cash.day-close.submitted",
          ],
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const parseDetails = (details: string | null) => {
      if (!details) {
        return {};
      }
      return JSON.parse(details) as Record<string, unknown>;
    };

    const openAudit = auditRows.find(
      (row) => row.action === "restaurant.table.opened" && row.entityId === opened.output.session.id
    );
    expect(openAudit?.entity).toBe("RestaurantTableSession");
    expect(openAudit?.actorUserId).toBe(actors.cashier.userId);
    expect(parseDetails(openAudit?.details ?? null)).toMatchObject({
      orderId: opened.output.order.id,
      tableId: venue.tableAId,
    });

    const transferAudit = auditRows.find(
      (row) =>
        row.action === "restaurant.table.transferred" && row.entityId === opened.output.session.id
    );
    expect(transferAudit?.entity).toBe("RestaurantTableSession");
    expect(transferAudit?.actorUserId).toBe(actors.cashier.userId);
    expect(parseDetails(transferAudit?.details ?? null)).toMatchObject({
      orderId: opened.output.order.id,
      toTableId: venue.tableBId,
    });

    const sendAudit = auditRows.find(
      (row) =>
        row.action === "restaurant.order.sent-to-kitchen" && row.entityId === opened.output.order.id
    );
    expect(sendAudit?.entity).toBe("RestaurantOrder");
    expect(sendAudit?.actorUserId).toBe(actors.cashier.userId);
    expect(parseDetails(sendAudit?.details ?? null)).toMatchObject({
      ticketCount: 1,
    });

    const voidRequestAudit = auditRows.find(
      (row) => row.action === "restaurant.void.requested" && row.entityId === opened.output.order.id
    );
    expect(voidRequestAudit?.entity).toBe("RestaurantOrder");
    expect(voidRequestAudit?.actorUserId).toBe(actors.cashier.userId);
    expect(parseDetails(voidRequestAudit?.details ?? null)).toMatchObject({
      approvalRequestId: voidRequested.output.approvalRequest.id,
    });

    const discountRequestAudit = auditRows.find(
      (row) =>
        row.action === "restaurant.discount.requested" && row.entityId === opened.output.order.id
    );
    expect(discountRequestAudit?.entity).toBe("RestaurantOrder");
    expect(discountRequestAudit?.actorUserId).toBe(actors.cashier.userId);
    expect(parseDetails(discountRequestAudit?.details ?? null)).toMatchObject({
      approvalRequestId: discountRequested.output.approvalRequest.id,
    });

    const approvalAudits = auditRows.filter(
      (row) =>
        row.action === "restaurant.approval.approve" && row.actorUserId === actors.manager.userId
    );
    expect(approvalAudits).toHaveLength(2);
    expect(approvalAudits.map((row) => row.entityId).sort()).toEqual(
      [discountRequested.output.approvalRequest.id, voidRequested.output.approvalRequest.id].sort()
    );
    expect(approvalAudits.map((row) => parseDetails(row.details).type).sort()).toEqual([
      "DISCOUNT",
      "VOID",
    ]);

    const closeAudit = auditRows.find(
      (row) => row.action === "restaurant.table.closed" && row.entityId === opened.output.order.id
    );
    expect(closeAudit?.entity).toBe("RestaurantOrder");
    expect(closeAudit?.actorUserId).toBe(actors.cashier.userId);
    expect(parseDetails(closeAudit?.details ?? null)).toMatchObject({
      sessionId: opened.output.session.id,
      paymentCount: 1,
      totalCents: discountApprovedBody.order.totalCents,
    });

    const dayClose = await db.cashDayClose.findFirstOrThrow({
      where: {
        tenantId: testData.tenant.id,
        workspaceId: testData.workspace.id,
        registerId: register.register.registerId,
        dayKey,
      },
    });
    const shiftCloseAudit = auditRows.find(
      (row) => row.action === "cash.day-close.submitted" && row.entityId === dayClose.id
    );
    expect(shiftCloseAudit?.entity).toBe("CashDayClose");
    expect(shiftCloseAudit?.actorUserId).toBe(actors.cashier.userId);
    expect(parseDetails(shiftCloseAudit?.details ?? null)).toMatchObject({
      registerId: register.register.registerId,
      dayKey,
      expectedBalanceCents: openingCashCents,
      countedBalanceCents: countedCashCents,
      differenceCents: countedCashCents - openingCashCents,
    });

    const paymentAndCloseEvents = await db.outboxEvent.findMany({
      where: {
        tenantId: testData.tenant.id,
        correlationId: opened.output.order.id,
        eventType: { in: ["restaurant.payment-captured", "restaurant.table-closed"] },
      },
      orderBy: { createdAt: "asc" },
    });
    expect(paymentAndCloseEvents.map((event) => event.eventType).sort()).toEqual([
      "restaurant.payment-captured",
      "restaurant.table-closed",
    ]);
  });

  test("closes an active shift with counted cash reconciliation, records variance, and stores closing audit details", async ({
    request,
    testData,
  }, testInfo) => {
    const ownerAuth = await loginAsSeededUser(request, testData);
    const ownerClient = new HttpClient(request, ownerAuth);
    const actors = await seedRestaurantActors(requirePrisma(), {
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
      ownerUserId: testData.user.id,
      ownerEmail: testData.user.email,
      password: testData.user.password,
    });
    const cashierAuth = await loginAsCredentials(request, {
      email: actors.cashier.email,
      password: actors.cashier.password,
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
    });
    const client = new HttpClient(request, cashierAuth);
    const openingCashCents = 3_000;
    const countedCashCents = 3_500;
    const dayKey = new Date().toISOString().slice(0, 10);

    const billingTrial = await startBillingTrial(
      ownerClient,
      {
        productKey: "cash-management",
        source: "restaurant-pos-e2e",
      },
      restaurantIdempotencyKey(testInfo, "close-shift-trial-start")
    );
    expect(billingTrial.response.status()).toBe(201);

    const register = await createPosRegister(
      client,
      { name: `Focused Close Shift Register ${Date.now()}` },
      restaurantIdempotencyKey(testInfo, "close-shift-register")
    );
    expect(register.response.status()).toBe(201);

    const shift = await openShift(
      client,
      {
        sessionId: randomUUID(),
        registerId: register.register.registerId,
        openedByEmployeePartyId: actors.cashier.userId,
        startingCashCents: openingCashCents,
        notes: "Focused close shift e2e",
      },
      restaurantIdempotencyKey(testInfo, "close-shift-open")
    );
    expect(shift.response.status()).toBe(201);

    await seedShiftCloseCashMirror(requirePrisma(), {
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
      registerId: register.register.registerId,
      ownerUserId: actors.cashier.userId,
      openingCashCents,
      dayKey,
    });

    const currentBeforeClose = await getCurrentShift(client, register.register.registerId);
    expect(currentBeforeClose.response.status()).toBe(200);
    expect(currentBeforeClose.output.session?.sessionId).toBe(shift.shift.sessionId);
    expect(currentBeforeClose.output.session?.status).toBe("OPEN");

    const closed = await closeShift(
      client,
      {
        sessionId: shift.shift.sessionId,
        closingCashCents: countedCashCents,
        notes: "Drawer counted and confirmed",
      },
      restaurantIdempotencyKey(testInfo, "close-shift-command")
    );
    expect(closed.response.status()).toBe(201);
    expect(closed.shift.sessionId).toBe(shift.shift.sessionId);
    expect(closed.shift.status).toBe("CLOSED");
    expect(closed.shift.closedAt).toBeTruthy();
    expect(closed.shift.totalSalesCents).toBe(0);
    expect(closed.shift.totalCashReceivedCents).toBe(0);
    expect(closed.shift.varianceCents).toBe(500);

    const currentAfterClose = await getCurrentShift(client, register.register.registerId);
    expect(currentAfterClose.response.status()).toBe(200);
    expect(currentAfterClose.output.session).toBeNull();

    const db = requirePrisma();
    const dayClose = await db.cashDayClose.findFirst({
      where: {
        tenantId: testData.tenant.id,
        workspaceId: testData.workspace.id,
        registerId: register.register.registerId,
        dayKey,
      },
    });
    expect(dayClose).toBeTruthy();
    expect(dayClose?.expectedBalanceCents).toBe(openingCashCents);
    expect(dayClose?.countedBalanceCents).toBe(countedCashCents);
    expect(dayClose?.differenceCents).toBe(500);
    expect(dayClose?.status).toBe("SUBMITTED");

    expect(
      await db.auditLog.count({
        where: {
          tenantId: testData.tenant.id,
          action: "cash.day-close.submitted",
          entity: "CashDayClose",
          entityId: dayClose?.id,
        },
      })
    ).toBe(1);
  });

  test("closes a shift with counted cash reconciliation and rejects duplicate close attempts", async ({
    request,
    testData,
  }, testInfo) => {
    const ownerAuth = await loginAsSeededUser(request, testData);
    const ownerClient = new HttpClient(request, ownerAuth);
    const actors = await seedRestaurantActors(requirePrisma(), {
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
      ownerUserId: testData.user.id,
      ownerEmail: testData.user.email,
      password: testData.user.password,
    });
    const cashierAuth = await loginAsCredentials(request, {
      email: actors.cashier.email,
      password: actors.cashier.password,
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
    });
    const client = new HttpClient(request, cashierAuth);
    const openingCashCents = 3_000;
    const countedCashCents = 3_500;
    const dayKey = new Date().toISOString().slice(0, 10);

    const billingTrial = await startBillingTrial(
      ownerClient,
      {
        productKey: "cash-management",
        source: "restaurant-pos-e2e",
      },
      restaurantIdempotencyKey(testInfo, "cash-trial-start")
    );
    expect(billingTrial.response.status()).toBe(201);

    const register = await createPosRegister(
      client,
      { name: `Close Shift Register ${Date.now()}` },
      restaurantIdempotencyKey(testInfo, "shift-register")
    );
    const shift = await openShift(
      client,
      {
        sessionId: randomUUID(),
        registerId: register.register.registerId,
        openedByEmployeePartyId: actors.cashier.userId,
        startingCashCents: openingCashCents,
        notes: "Dinner close shift",
      },
      restaurantIdempotencyKey(testInfo, "shift-open-close-test")
    );

    await seedShiftCloseCashMirror(requirePrisma(), {
      tenantId: testData.tenant.id,
      workspaceId: testData.workspace.id,
      registerId: register.register.registerId,
      ownerUserId: actors.cashier.userId,
      openingCashCents,
      dayKey,
    });

    const closed = await closeShift(
      client,
      {
        sessionId: shift.shift.sessionId,
        closingCashCents: countedCashCents,
        notes: "Drawer counted at end of shift",
      },
      restaurantIdempotencyKey(testInfo, "shift-close")
    );
    expect(closed.response.status()).toBe(201);
    expect(closed.shift.status).toBe("CLOSED");
    expect(closed.shift.varianceCents).toBe(500);

    const currentShift = await getCurrentShift(client, register.register.registerId);
    expect(currentShift.output.session).toBeNull();

    const secondClose = await client.postJson(
      "/pos/shifts/close",
      {
        sessionId: shift.shift.sessionId,
        closingCashCents: countedCashCents,
        notes: "duplicate close",
      },
      restaurantIdempotencyKey(testInfo, "shift-close-second")
    );
    await expectProblem(secondClose.response, 409);

    const db = requirePrisma();
    const dayClose = await db.cashDayClose.findFirst({
      where: {
        tenantId: testData.tenant.id,
        workspaceId: testData.workspace.id,
        registerId: register.register.registerId,
        dayKey,
      },
    });
    expect(dayClose).toBeTruthy();
    expect(dayClose?.expectedBalanceCents).toBe(openingCashCents);
    expect(dayClose?.countedBalanceCents).toBe(countedCashCents);
    expect(dayClose?.differenceCents).toBe(500);
    expect(dayClose?.status).toBe("SUBMITTED");

    expect(
      await db.auditLog.count({
        where: {
          tenantId: testData.tenant.id,
          action: "cash.day-close.submitted",
          entity: "CashDayClose",
          entityId: dayClose?.id,
        },
      })
    ).toBe(1);
  });

  test("runs a real cashier flow through the POS app on pos.localhost with live demo data", async ({
    page,
  }) => {
    test.skip(
      !POS_BROWSER_BASE_URL.includes("localhost"),
      "This smoke test is intended for a local POS host such as pos.localhost:6080."
    );

    autoAcceptNativeDialogs(page);

    await loginToLivePos(page, {
      email: POS_BROWSER_DEMO_EMAIL,
      password: POS_BROWSER_DEMO_PASSWORD,
      baseUrl: POS_BROWSER_BASE_URL,
    });
    await selectRegisterByName(page, POS_BROWSER_DEMO_REGISTER_NAME);

    const restaurantTabVisible = await page
      .getByRole("tab", { name: /restaurant/i })
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    if (!restaurantTabVisible) {
      await openShiftFromGuardAndSubmit(page);
    }

    await page.getByRole("tab", { name: /restaurant/i }).click();
    await expect(page.getByTestId("pos-restaurant-floor-screen")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Table 2")).toBeVisible();
    await expect(page.getByText(POS_BROWSER_DEMO_TABLE_NAME)).toBeVisible();
    await expect(page.getByText("Table 7")).toBeVisible();

    await page.getByText(POS_BROWSER_DEMO_TABLE_NAME, { exact: true }).click();
    await expect(page.getByTestId("pos-restaurant-table-screen")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("pos-restaurant-order-title")).toBeVisible();
  });
});

function authHeaders(auth: { accessToken: string; tenantId: string; workspaceId: string }) {
  return buildAuthHeaders(auth);
}
