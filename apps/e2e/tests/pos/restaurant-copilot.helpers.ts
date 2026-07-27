import type { Page, Route } from "@playwright/test";
import type {
  DraftRestaurantOrderItemInput,
  FloorPlanRoom,
  ProductSnapshot,
  RestaurantAiToolCard,
  RestaurantModifierGroup,
  RestaurantOrder,
  RestaurantOrderItem,
  RestaurantOrderItemModifier,
  TableSession,
} from "@corely/contracts";
import { installPosApiMock, POS_IDS } from "./helpers.ts";

const TENANT_ID = "f6f4f2c0-b49a-4bdb-9a0a-f88c1f0a8f10";
const ROOM_ID = "1c9cc5c3-63d9-4bb5-a537-f1546c783b31";
const TABLE_ID = "fa1e5375-c416-4d81-8f6b-e5e9753f5850";
const OCCUPIED_TABLE_ID = "c3370e65-e49e-4db1-b4b0-3ad95de534c5";
const DIRTY_TABLE_ID = "b5cc7501-fcb8-4020-a9f0-6db6c553f48c";
const BLOCKED_TABLE_ID = "dd4bf49e-4bf7-4fcb-baf0-431f2dcf761d";
const TABLE_SESSION_ID = "08ced917-6faf-4862-8f4d-557e40f4dddc";
const ORDER_ID = "58da6b0a-a265-4973-8bc6-6e54b778b977";
const STATIC_OCCUPIED_SESSION_ID = "d2023046-f0da-45a8-bc0e-60d45cabef51";
const STATIC_OCCUPIED_ORDER_ID = "1eaa7d13-2acf-4ccb-b956-a2c9e89c6e59";

const MARGHERITA_ID = "4c7d0de1-0e2f-43b5-8462-58fe59aa9bb1";
const COKE_ID = "6c7a9b2b-beb3-4309-90fd-b53be87a11fe";
const BURGER_ID = "bc8c39c2-c5a3-4fe6-8d0c-f53776699a1e";
const FRIES_ID = "3020e334-a5b7-4b55-bf1b-6e20de2785cf";

const EXTRAS_GROUP_ID = "a0f0d1b5-b99d-4e10-a5f6-c801f54eb74e";
const EXTRA_CHEESE_OPTION_ID = "84f34451-ad7f-43fb-9305-725b0dcf0640";
const ONION_GROUP_ID = "c87a70bd-8edc-4f6b-b1cc-9197ea1f2d92";
const NO_ONION_OPTION_ID = "16d4ea6d-3075-46c5-8dd2-526e44e13a9f";
const CHEESE_GROUP_ID = "db001745-5d9d-4d94-b4a7-f7304ddc4554";
const CHEDDAR_OPTION_ID = "4b33bde6-d31a-424a-8cd7-713928a83493";
const PICKLES_GROUP_ID = "9f0729df-7726-4599-b779-68d4cacceb3f";
const NO_PICKLES_OPTION_ID = "cab3d40c-c440-47a9-91d0-3d2f74d8f5fd";

const NOW = "2026-03-24T12:00:00.000Z";

export const RESTAURANT_POS_IDS = {
  tenantId: TENANT_ID,
  roomId: ROOM_ID,
  tableId: TABLE_ID,
  occupiedTableId: OCCUPIED_TABLE_ID,
  orderId: ORDER_ID,
  sessionId: TABLE_SESSION_ID,
  margheritaId: MARGHERITA_ID,
  cokeId: COKE_ID,
  burgerId: BURGER_ID,
  friesId: FRIES_ID,
};

type CopilotMode = "ok" | "unavailable";

type MockOptions = {
  copilotMode?: CopilotMode;
};

type DraftCall = {
  orderId: string;
  items: DraftRestaurantOrderItemInput[];
  discountCents: number;
};

type CloseCall = {
  orderId: string;
  tableSessionId: string;
};

type PromptSnapshot = {
  prompt: string;
  threadId: string;
};

type ThreadMessage = {
  id: string;
  threadId: string;
  role: "assistant" | "user" | "system" | "tool";
  parts?: unknown[];
  createdAt: string;
};

type MockState = {
  activeSession: TableSession | null;
  activeOrder: RestaurantOrder | null;
  draftCalls: DraftCall[];
  openTableCalls: string[];
  closeCalls: CloseCall[];
  copilotPrompts: PromptSnapshot[];
  lastCopilotCard: RestaurantAiToolCard | null;
  threads: Map<string, ThreadMessage[]>;
};

export type RestaurantPosCopilotMock = {
  ids: typeof RESTAURANT_POS_IDS;
  getActiveOrder: () => RestaurantOrder | null;
  getDraftCalls: () => DraftCall[];
  getOpenTableCalls: () => string[];
  getCloseCalls: () => CloseCall[];
  getCopilotPrompts: () => PromptSnapshot[];
};

const products: ProductSnapshot[] = [
  {
    productId: MARGHERITA_ID,
    sku: "MARGHERITA",
    name: "Margherita",
    barcode: null,
    priceCents: 1200,
    taxable: true,
    status: "ACTIVE",
    estimatedQty: 10,
  },
  {
    productId: COKE_ID,
    sku: "COKE",
    name: "Coke",
    barcode: null,
    priceCents: 300,
    taxable: true,
    status: "ACTIVE",
    estimatedQty: 20,
  },
  {
    productId: BURGER_ID,
    sku: "BURGER",
    name: "Burger",
    barcode: null,
    priceCents: 1500,
    taxable: true,
    status: "ACTIVE",
    estimatedQty: 8,
  },
  {
    productId: FRIES_ID,
    sku: "FRIES",
    name: "Fries",
    barcode: null,
    priceCents: 500,
    taxable: true,
    status: "ACTIVE",
    estimatedQty: 12,
  },
];

const modifierGroups: RestaurantModifierGroup[] = [
  {
    id: EXTRAS_GROUP_ID,
    tenantId: TENANT_ID,
    workspaceId: POS_IDS.workspaceId,
    name: "Extras",
    selectionMode: "MULTI",
    isRequired: false,
    sortOrder: 0,
    linkedCatalogItemIds: [MARGHERITA_ID],
    options: [
      {
        id: EXTRA_CHEESE_OPTION_ID,
        name: "Extra cheese",
        priceDeltaCents: 200,
        sortOrder: 0,
      },
    ],
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: ONION_GROUP_ID,
    tenantId: TENANT_ID,
    workspaceId: POS_IDS.workspaceId,
    name: "Onions",
    selectionMode: "SINGLE",
    isRequired: false,
    sortOrder: 1,
    linkedCatalogItemIds: [MARGHERITA_ID],
    options: [
      {
        id: NO_ONION_OPTION_ID,
        name: "No onion",
        priceDeltaCents: 0,
        sortOrder: 0,
      },
    ],
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: CHEESE_GROUP_ID,
    tenantId: TENANT_ID,
    workspaceId: POS_IDS.workspaceId,
    name: "Cheese",
    selectionMode: "SINGLE",
    isRequired: false,
    sortOrder: 2,
    linkedCatalogItemIds: [BURGER_ID],
    options: [
      {
        id: CHEDDAR_OPTION_ID,
        name: "Add cheddar",
        priceDeltaCents: 150,
        sortOrder: 0,
      },
    ],
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: PICKLES_GROUP_ID,
    tenantId: TENANT_ID,
    workspaceId: POS_IDS.workspaceId,
    name: "Pickles",
    selectionMode: "SINGLE",
    isRequired: false,
    sortOrder: 3,
    linkedCatalogItemIds: [BURGER_ID],
    options: [
      {
        id: NO_PICKLES_OPTION_ID,
        name: "No pickles",
        priceDeltaCents: 0,
        sortOrder: 0,
      },
    ],
    createdAt: NOW,
    updatedAt: NOW,
  },
];

function buildSession(input?: Partial<TableSession>): TableSession {
  return {
    id: TABLE_SESSION_ID,
    tenantId: TENANT_ID,
    workspaceId: POS_IDS.workspaceId,
    tableId: TABLE_ID,
    registerId: POS_IDS.registerId,
    shiftSessionId: "e1e3e85d-0fd1-4eef-bfad-d2f91e8a537b",
    openedByUserId: POS_IDS.userId,
    openedAt: NOW,
    closedAt: null,
    status: "OPEN",
    transferCount: 0,
    createdAt: NOW,
    updatedAt: NOW,
    ...input,
  };
}

function buildOrder(
  items: DraftRestaurantOrderItemInput[] = [],
  input?: Partial<RestaurantOrder>
): RestaurantOrder {
  const pricedItems = priceOrderItems(ORDER_ID, items, input?.status === "SENT");
  const subtotalCents = pricedItems.reduce((sum, item) => sum + item.lineSubtotalCents, 0);
  const discountCents = input?.discountCents ?? 0;
  const taxCents = pricedItems.reduce((sum, item) => sum + item.taxCents, 0);
  const totalCents = subtotalCents - discountCents + taxCents;

  return {
    id: ORDER_ID,
    tenantId: TENANT_ID,
    workspaceId: POS_IDS.workspaceId,
    tableSessionId: TABLE_SESSION_ID,
    tableId: TABLE_ID,
    status: input?.status ?? "DRAFT",
    subtotalCents,
    discountCents,
    taxCents,
    totalCents,
    sentAt: input?.sentAt ?? null,
    paidAt: input?.paidAt ?? null,
    closedAt: input?.closedAt ?? null,
    items: pricedItems,
    payments: input?.payments ?? [],
    createdAt: NOW,
    updatedAt: NOW,
    ...input,
  };
}

function priceOrderItems(
  orderId: string,
  items: DraftRestaurantOrderItemInput[],
  markSent: boolean
): RestaurantOrderItem[] {
  return items.map((item, index) => {
    const modifierTotal = item.modifiers.reduce(
      (sum, modifier) => sum + modifier.priceDeltaCents * modifier.quantity,
      0
    );
    const lineSubtotalCents = item.quantity * item.unitPriceCents + modifierTotal;
    const taxCents = Math.round((lineSubtotalCents * item.taxRateBps) / 10_000);
    return {
      id: item.id ?? `order-item-${index + 1}`,
      orderId,
      catalogItemId: item.catalogItemId,
      itemName: item.itemName,
      sku: item.sku,
      quantity: item.quantity,
      sentQuantity: markSent ? item.quantity : 0,
      unitPriceCents: item.unitPriceCents,
      taxRateBps: item.taxRateBps,
      taxCents,
      lineSubtotalCents,
      lineTotalCents: lineSubtotalCents + taxCents,
      voidedAt: null,
      modifiers: item.modifiers.map((modifier, modifierIndex) => ({
        id: modifier.id ?? `${item.id ?? `order-item-${index + 1}`}-modifier-${modifierIndex + 1}`,
        modifierGroupId: modifier.modifierGroupId ?? null,
        optionName: modifier.optionName,
        quantity: modifier.quantity,
        priceDeltaCents: modifier.priceDeltaCents,
      })),
    };
  });
}

function buildFloorPlan(
  activeSession: TableSession | null,
  activeOrder: RestaurantOrder | null
): FloorPlanRoom[] {
  return [
    {
      id: ROOM_ID,
      tenantId: TENANT_ID,
      workspaceId: POS_IDS.workspaceId,
      name: "Main room",
      sortOrder: 0,
      createdAt: NOW,
      updatedAt: NOW,
      tables: [
        {
          id: TABLE_ID,
          tenantId: TENANT_ID,
          workspaceId: POS_IDS.workspaceId,
          diningRoomId: ROOM_ID,
          name: "T1",
          capacity: 4,
          posX: null,
          posY: null,
          shape: "SQUARE",
          availabilityStatus: activeOrder ? "OCCUPIED" : "AVAILABLE",
          createdAt: NOW,
          updatedAt: NOW,
          activeSessionId: activeSession?.id ?? null,
          activeOrderId: activeOrder?.id ?? null,
        },
        {
          id: OCCUPIED_TABLE_ID,
          tenantId: TENANT_ID,
          workspaceId: POS_IDS.workspaceId,
          diningRoomId: ROOM_ID,
          name: "T2",
          capacity: 4,
          posX: null,
          posY: null,
          shape: "SQUARE",
          availabilityStatus: "OCCUPIED",
          createdAt: NOW,
          updatedAt: NOW,
          activeSessionId: STATIC_OCCUPIED_SESSION_ID,
          activeOrderId: STATIC_OCCUPIED_ORDER_ID,
        },
        {
          id: DIRTY_TABLE_ID,
          tenantId: TENANT_ID,
          workspaceId: POS_IDS.workspaceId,
          diningRoomId: ROOM_ID,
          name: "T3",
          capacity: 2,
          posX: null,
          posY: null,
          shape: "SQUARE",
          availabilityStatus: "DIRTY",
          createdAt: NOW,
          updatedAt: NOW,
          activeSessionId: null,
          activeOrderId: null,
        },
        {
          id: BLOCKED_TABLE_ID,
          tenantId: TENANT_ID,
          workspaceId: POS_IDS.workspaceId,
          diningRoomId: ROOM_ID,
          name: "T4",
          capacity: 6,
          posX: null,
          posY: null,
          shape: "SQUARE",
          availabilityStatus: "OUT_OF_SERVICE",
          createdAt: NOW,
          updatedAt: NOW,
          activeSessionId: null,
          activeOrderId: null,
        },
      ],
    },
  ];
}

function normalizeApiPath(pathname: string): string {
  return pathname.startsWith("/api/") ? pathname.slice(4) : pathname;
}

function extractPrompt(requestBody: unknown): string {
  if (!requestBody || typeof requestBody !== "object") {
    return "";
  }
  const asRecord = requestBody as {
    message?: { parts?: Array<{ type?: string; text?: string }> };
  };
  return asRecord.message?.parts?.find((part) => part.type === "text")?.text ?? "";
}

function extractTrailingJson(prompt: string): Record<string, unknown> | null {
  const jsonStart = prompt.indexOf("{");
  if (jsonStart < 0) {
    return null;
  }
  try {
    const parsed = JSON.parse(prompt.slice(jsonStart)) as Record<string, unknown>;
    return parsed;
  } catch {
    return null;
  }
}

function buildProvenance() {
  return {
    sourceText: "E2E restaurant copilot mock response",
    extractedFields: ["sourceText"],
  };
}

function createOrderProposalCard(
  summary: string,
  rationale: string,
  action: Extract<RestaurantAiToolCard, { cardType: "restaurant.order-proposal" }>["action"],
  options?: {
    ambiguities?: Array<{
      field: string;
      message: string;
      options: Array<{ id: string; label: string; detail?: string }>;
    }>;
    missingRequiredModifiers?: Array<{
      catalogItemId: string;
      itemName: string;
      modifierGroupId: string;
      modifierGroupName: string;
    }>;
    confidence?: number;
  }
): RestaurantAiToolCard {
  return {
    ok: true,
    cardType: "restaurant.order-proposal",
    title: "Draft order proposal",
    summary,
    action,
    ambiguities: options?.ambiguities ?? [],
    missingRequiredModifiers: options?.missingRequiredModifiers ?? [],
    confidence: options?.confidence ?? 0.92,
    rationale,
    provenance: buildProvenance(),
  };
}

function resolveCopilotCard(prompt: string, state: MockState): RestaurantAiToolCard {
  if (prompt.includes("restaurant_summarizeFloorPlanAttention")) {
    return {
      ok: true,
      cardType: "restaurant.floor-attention",
      summary: "3 tables need attention right now.",
      items: [
        {
          tableId: OCCUPIED_TABLE_ID,
          tableName: "T2",
          status: "OCCUPIED",
          reason: "Open check has been waiting on payment for 18 minutes.",
          activeOrderId: STATIC_OCCUPIED_ORDER_ID,
          activeSessionId: STATIC_OCCUPIED_SESSION_ID,
        },
        {
          tableId: DIRTY_TABLE_ID,
          tableName: "T3",
          status: "DIRTY",
          reason: "Dirty table needs reset before seating the next party.",
          activeOrderId: null,
          activeSessionId: null,
        },
        {
          tableId: BLOCKED_TABLE_ID,
          tableName: "T4",
          status: "OUT_OF_SERVICE",
          reason: "Blocked table should not be assigned until it is reopened.",
          activeOrderId: null,
          activeSessionId: null,
        },
      ],
      confidence: 0.9,
      rationale: "Summary is based on the current floor-plan state loaded by POS.",
      provenance: buildProvenance(),
    };
  }

  if (prompt.includes("restaurant_summarizeShiftClose")) {
    return {
      ok: true,
      cardType: "restaurant.shift-close-summary",
      summary: "Shift looks ready to close with one pending attention item.",
      metrics: {
        openTables: state.activeOrder ? 1 : 0,
        sentOrders: state.activeOrder?.status === "SENT" ? 1 : 0,
        unpaidOrders: state.activeOrder ? 1 : 0,
        pendingApprovals: 0,
        expectedCashCents: 10000,
        countedCashCents: null,
        varianceCents: null,
      },
      anomalies: ["One occupied table is still unpaid and should be reviewed before close."],
      confidence: 0.88,
      rationale: "Summary is read-only and does not initiate shift close.",
      provenance: buildProvenance(),
    };
  }

  const input = extractTrailingJson(prompt);
  const sourceText =
    typeof input?.sourceText === "string" ? input.sourceText.toLowerCase() : prompt.toLowerCase();
  const tableId = typeof input?.tableId === "string" ? input.tableId : TABLE_ID;
  const orderId = typeof input?.orderId === "string" ? input.orderId : ORDER_ID;

  if (sourceText.includes("2 margherita") && sourceText.includes("coke")) {
    return createOrderProposalCard(
      "Add 2 Margherita pizzas and 1 Coke to the draft order.",
      "Matched menu items and modifiers from the operator instruction without changing the order yet.",
      {
        actionType: "REPLACE_DRAFT",
        orderId,
        tableId,
        discountCents: 0,
        items: [
          {
            catalogItemId: MARGHERITA_ID,
            itemName: "Margherita",
            sku: "MARGHERITA",
            quantity: 2,
            unitPriceCents: 1200,
            taxRateBps: 700,
            modifiers: [
              {
                modifierGroupId: EXTRAS_GROUP_ID,
                optionName: "Extra cheese",
                quantity: 1,
                priceDeltaCents: 200,
              },
              {
                modifierGroupId: ONION_GROUP_ID,
                optionName: "No onion",
                quantity: 1,
                priceDeltaCents: 0,
              },
            ],
          },
          {
            catalogItemId: COKE_ID,
            itemName: "Coke",
            sku: "COKE",
            quantity: 1,
            unitPriceCents: 300,
            taxRateBps: 700,
            modifiers: [],
          },
        ],
      }
    );
  }

  if (sourceText.includes("burger") && sourceText.includes("cheddar")) {
    return createOrderProposalCard(
      "Replace the draft with a burger customized as no pickles and add cheddar.",
      "Parsed the burger base item and matched the modifier phrases to supported options.",
      {
        actionType: "REPLACE_DRAFT",
        orderId,
        tableId,
        discountCents: 0,
        items: [
          {
            catalogItemId: BURGER_ID,
            itemName: "Burger",
            sku: "BURGER",
            quantity: 1,
            unitPriceCents: 1500,
            taxRateBps: 700,
            modifiers: [
              {
                modifierGroupId: PICKLES_GROUP_ID,
                optionName: "No pickles",
                quantity: 1,
                priceDeltaCents: 0,
              },
              {
                modifierGroupId: CHEESE_GROUP_ID,
                optionName: "Add cheddar",
                quantity: 1,
                priceDeltaCents: 150,
              },
            ],
          },
        ],
      }
    );
  }

  if (sourceText.includes("piz")) {
    return createOrderProposalCard(
      "Need clarification before changing the draft.",
      "The phrase matched multiple menu items, so the copilot surfaced the ambiguity instead of guessing.",
      {
        actionType: "NOOP",
        reason: "Multiple menu items match the request. Choose one explicitly before applying.",
      },
      {
        ambiguities: [
          {
            field: "catalogItemId",
            message: "Multiple menu items match “piz”.",
            options: [
              { id: MARGHERITA_ID, label: "Margherita", detail: "SKU MARGHERITA" },
              { id: "pepperoni-id", label: "Pepperoni", detail: "SKU PEPPERONI" },
            ],
          },
        ],
        confidence: 0.55,
      }
    );
  }

  if (sourceText.includes("close this table") || sourceText.includes("take payment")) {
    return createOrderProposalCard(
      "Payment and finalization still require the standard POS flow.",
      "Restaurant Copilot can summarize the next step, but it does not capture payment or close tables autonomously.",
      {
        actionType: "NOOP",
        reason: "Use the normal payment and close-table actions to finalize the sale.",
      },
      { confidence: 0.97 }
    );
  }

  return createOrderProposalCard(
    "No safe action was identified.",
    "The instruction did not map to a supported restaurant proposal.",
    {
      actionType: "NOOP",
      reason: "No safe restaurant action could be proposed.",
    },
    { confidence: 0.4 }
  );
}

function buildThreadMessages(threadId: string, card: RestaurantAiToolCard): ThreadMessage[] {
  return [
    {
      id: `assistant-${threadId}`,
      threadId,
      role: "assistant",
      createdAt: NOW,
      parts: [
        {
          type: "tool-invocation",
          toolCallId: `tool-${threadId}`,
          toolName: "restaurant_mock_tool",
          state: "output-available",
          output: card,
        },
      ],
    },
  ];
}

export async function installRestaurantPosCopilotMock(
  page: Page,
  options: MockOptions = {}
): Promise<RestaurantPosCopilotMock> {
  const state: MockState = {
    activeSession: null,
    activeOrder: null,
    draftCalls: [],
    openTableCalls: [],
    closeCalls: [],
    copilotPrompts: [],
    lastCopilotCard: null,
    threads: new Map<string, ThreadMessage[]>(),
  };

  await installPosApiMock(page, {
    startWithOpenShift: true,
    extraApiHandler: async ({ path, method, fulfillJson }) => {
      const normalizedPath = normalizeApiPath(path);

      if (normalizedPath === "/pos/catalog/snapshot" && method === "GET") {
        await fulfillJson(200, {
          products,
          hasMore: false,
          total: products.length,
        });
        return true;
      }

      return false;
    },
  });

  const apiHandler = async (route: Route) => {
    const request = route.request();
    if (request.resourceType() === "document") {
      await route.continue();
      return;
    }

    const url = new URL(request.url());
    const normalizedPath = normalizeApiPath(url.pathname);
    const method = request.method();
    const headers = {
      "Access-Control-Allow-Origin": request.headers().origin ?? "http://localhost:18084",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, X-Idempotency-Key, X-Workspace-Id, x-idempotency-key",
      "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,OPTIONS",
      "Content-Type": "application/json",
    };

    const fulfillJson = async (status: number, payload: unknown) => {
      await route.fulfill({
        status,
        headers,
        body: JSON.stringify(payload),
      });
    };

    if (method === "OPTIONS") {
      await route.fulfill({ status: 204, headers });
      return;
    }

    if (normalizedPath === "/restaurant/floor-plan" && method === "GET") {
      await fulfillJson(200, {
        rooms: buildFloorPlan(state.activeSession, state.activeOrder),
      });
      return;
    }

    if (normalizedPath === "/restaurant/modifier-groups" && method === "GET") {
      await fulfillJson(200, {
        items: modifierGroups,
        pageInfo: {
          page: 1,
          pageSize: modifierGroups.length,
          total: modifierGroups.length,
          hasNextPage: false,
        },
      });
      return;
    }

    const currentMatch = normalizedPath.match(/^\/restaurant\/tables\/([^/]+)\/current$/u);
    if (currentMatch && method === "GET") {
      const currentTableId = currentMatch[1];
      if (currentTableId === TABLE_ID && state.activeSession && state.activeOrder) {
        await fulfillJson(200, {
          session: state.activeSession,
          order: state.activeOrder,
        });
        return;
      }
      await fulfillJson(200, {
        session: null,
        order: null,
      });
      return;
    }

    if (normalizedPath === "/restaurant/tables/open" && method === "POST") {
      const payload = request.postDataJSON() as {
        tableId: string;
        tableSessionId: string;
        orderId: string;
      };
      state.openTableCalls.push(payload.tableId);
      state.activeSession = buildSession({
        id: payload.tableSessionId,
        tableId: payload.tableId,
      });
      state.activeOrder = buildOrder([], {
        id: payload.orderId,
        tableId: payload.tableId,
        tableSessionId: payload.tableSessionId,
      });
      await fulfillJson(200, {
        session: state.activeSession,
        order: state.activeOrder,
      });
      return;
    }

    const draftMatch = normalizedPath.match(/^\/restaurant\/orders\/([^/]+)\/draft$/u);
    if (draftMatch && method === "PUT") {
      const payload = request.postDataJSON() as {
        orderId: string;
        items: DraftRestaurantOrderItemInput[];
        discountCents?: number;
      };
      state.draftCalls.push({
        orderId: payload.orderId,
        items: payload.items,
        discountCents: payload.discountCents ?? 0,
      });
      state.activeOrder = buildOrder(payload.items, {
        id: payload.orderId,
        discountCents: payload.discountCents ?? 0,
      });
      await fulfillJson(200, { order: state.activeOrder });
      return;
    }

    const sendMatch = normalizedPath.match(/^\/restaurant\/orders\/([^/]+)\/send$/u);
    if (sendMatch && method === "POST" && state.activeOrder) {
      state.activeOrder = buildOrder(
        state.activeOrder.items.map((item) => ({
          id: item.id,
          catalogItemId: item.catalogItemId,
          itemName: item.itemName,
          sku: item.sku,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          taxRateBps: item.taxRateBps,
          modifiers: item.modifiers.map((modifier: RestaurantOrderItemModifier) => ({
            id: modifier.id,
            modifierGroupId: modifier.modifierGroupId,
            optionName: modifier.optionName,
            quantity: modifier.quantity,
            priceDeltaCents: modifier.priceDeltaCents,
          })),
        })),
        {
          ...state.activeOrder,
          status: "SENT",
          sentAt: NOW,
        }
      );
      await fulfillJson(200, { order: state.activeOrder, tickets: [] });
      return;
    }

    const closeMatch = normalizedPath.match(/^\/restaurant\/orders\/([^/]+)\/close$/u);
    if (closeMatch && method === "POST") {
      const payload = request.postDataJSON() as { orderId: string; tableSessionId: string };
      state.closeCalls.push({
        orderId: payload.orderId,
        tableSessionId: payload.tableSessionId,
      });
      if (state.activeSession) {
        state.activeSession = {
          ...state.activeSession,
          status: "CLOSED",
          closedAt: NOW,
          updatedAt: NOW,
        };
      }
      if (state.activeOrder) {
        state.activeOrder = {
          ...state.activeOrder,
          status: "CLOSED",
          paidAt: NOW,
          closedAt: NOW,
          updatedAt: NOW,
        };
      }
      await fulfillJson(200, {
        order: state.activeOrder,
        session: state.activeSession,
        finalizedSaleRef: "SALE-E2E-0001",
      });
      return;
    }

    const copilotThreadPath =
      normalizedPath === "/copilot/threads" || normalizedPath === "/ai-copilot/threads";
    if (copilotThreadPath && method === "POST") {
      const body = request.postDataJSON() as { title?: string };
      const threadId = `thread-${state.threads.size + 1}`;
      state.threads.set(threadId, []);
      await fulfillJson(201, {
        thread: {
          id: threadId,
          title: body.title ?? "Restaurant POS Copilot",
          createdAt: NOW,
          updatedAt: NOW,
          lastMessageAt: NOW,
          archivedAt: null,
        },
      });
      return;
    }

    const copilotMessagesMatch = normalizedPath.match(
      /^\/(?:ai-copilot|copilot)\/threads\/([^/]+)\/messages$/u
    );
    if (copilotMessagesMatch && method === "GET") {
      const threadId = copilotMessagesMatch[1];
      await fulfillJson(200, {
        items: state.threads.get(threadId) ?? [],
        nextCursor: null,
      });
      return;
    }

    const copilotChatPath =
      normalizedPath === "/copilot/chat" || normalizedPath === "/ai-copilot/chat";
    if (copilotChatPath && method === "POST") {
      if (options.copilotMode === "unavailable") {
        await fulfillJson(503, {
          title: "Copilot unavailable",
          status: 503,
          detail: "Restaurant copilot is temporarily unavailable.",
        });
        return;
      }

      const body = request.postDataJSON() as { threadId?: string };
      const threadId = body.threadId ?? `thread-${state.threads.size + 1}`;
      const prompt = extractPrompt(body);
      state.copilotPrompts.push({ prompt, threadId });
      const card = resolveCopilotCard(prompt, state);
      state.lastCopilotCard = card;
      state.threads.set(threadId, buildThreadMessages(threadId, card));
      await fulfillJson(200, { ok: true });
      return;
    }

    await route.fulfill({
      status: 404,
      headers,
      body: JSON.stringify({
        title: "Not found",
        status: 404,
        detail: `No mock implemented for ${method} ${normalizedPath}`,
      }),
    });
  };

  for (const pattern of ["**/restaurant/**", "**/copilot/**", "**/ai-copilot/**"]) {
    await page.route(pattern, apiHandler);
  }

  return {
    ids: RESTAURANT_POS_IDS,
    getActiveOrder: () => state.activeOrder,
    getDraftCalls: () => [...state.draftCalls],
    getOpenTableCalls: () => [...state.openTableCalls],
    getCloseCalls: () => [...state.closeCalls],
    getCopilotPrompts: () => [...state.copilotPrompts],
  };
}
