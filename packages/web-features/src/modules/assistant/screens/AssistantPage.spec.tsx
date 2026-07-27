import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type * as CorelyUi from "@corely/ui";
import { CashManagementBillingFeatureKeys, CashManagementProductKey } from "@corely/contracts";
import AssistantPage from "./AssistantPage";

const chatSpy = vi.fn();

vi.mock("@corely/web-shared/shared/components/Chat", () => ({
  Chat: (props: unknown) => {
    chatSpy(props);
    return <div data-testid="assistant-chat-mock" />;
  },
}));

vi.mock("@corely/web-shared/lib/copilot-api", () => ({
  listCopilotThreads: vi.fn(async () => ({ items: [] })),
  searchCopilotThreads: vi.fn(async () => ({ items: [] })),
  getCopilotThread: vi.fn(async () => ({ thread: { title: "Assistant" } })),
  createCopilotThread: vi.fn(async () => "thread-1"),
}));

vi.mock("@corely/web-shared/lib/billing-api", () => ({
  billingApi: {
    getCurrent: vi.fn(),
  },
}));

vi.mock("@corely/web-shared/lib/cash-management-api", () => ({
  cashManagementApi: {
    listRegisters: vi.fn(async () => ({ registers: [] })),
    listWorkspaces: vi.fn(async () => ({ items: [] })),
    resolveWorkspace: vi.fn(),
  },
}));

vi.mock("@corely/ui", async () => {
  const actual = (await vi.importActual("@corely/ui")) as typeof CorelyUi;
  return {
    ...actual,
    useToast: () => ({ toast: vi.fn() }),
  };
});

const renderPage = (
  activeModule: "cash-management" | "assistant" = "cash-management",
  initialEntry = "/assistant"
) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route path="/assistant" element={<AssistantPage activeModule={activeModule} />} />
          <Route
            path="/assistant/t/:threadId"
            element={<AssistantPage activeModule={activeModule} />}
          />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>
  );
};

describe("AssistantPage billing access", () => {
  beforeEach(async () => {
    chatSpy.mockClear();
    const { cashManagementApi } = await import("@corely/web-shared/lib/cash-management-api");
    vi.mocked(cashManagementApi.listRegisters).mockReset();
    vi.mocked(cashManagementApi.listRegisters).mockResolvedValue({ registers: [] });
    vi.mocked(cashManagementApi.listWorkspaces).mockReset();
    vi.mocked(cashManagementApi.listWorkspaces).mockResolvedValue({ items: [] });
    vi.mocked(cashManagementApi.resolveWorkspace).mockReset();
  });

  it("allows sending when cash management AI is enabled through trial entitlements", async () => {
    const { billingApi } = await import("@corely/web-shared/lib/billing-api");
    vi.mocked(billingApi.getCurrent).mockResolvedValue({
      subscription: {
        accountId: "billing-account-1",
        productKey: CashManagementProductKey,
        planCode: "multi-location-monthly",
        entitlementSource: "trial",
        provider: null,
        status: "trialing",
        customerRef: null,
        currentPeriodStart: "2026-03-01T00:00:00.000Z",
        currentPeriodEnd: "2026-03-31T23:59:59.000Z",
        cancelAtPeriodEnd: false,
        canceledAt: null,
        trialEndsAt: "2026-03-31T23:59:59.000Z",
        lastSyncedAt: "2026-03-01T00:00:00.000Z",
      },
      entitlements: {
        productKey: CashManagementProductKey,
        planCode: "multi-location-monthly",
        featureValues: {
          [CashManagementBillingFeatureKeys.aiAssistant]: true,
        },
      },
      trial: {
        productKey: CashManagementProductKey,
        status: "active",
        startedAt: "2026-03-01T00:00:00.000Z",
        endsAt: "2026-03-31T23:59:59.000Z",
        expiredAt: null,
        supersededAt: null,
        activatedByUserId: "user-1",
        source: "billing-page",
        daysRemaining: 28,
        isExpiringSoon: false,
      },
      upgradeContext: {
        productKey: CashManagementProductKey,
        effectivePlanCode: "multi-location-monthly",
        entitlementSource: "trial",
        recommendedPlanCode: null,
        requiresUpgrade: false,
        isOverEntitlement: false,
        overEntitlementReasons: [],
        trial: {
          productKey: CashManagementProductKey,
          status: "active",
          startedAt: "2026-03-01T00:00:00.000Z",
          endsAt: "2026-03-31T23:59:59.000Z",
          expiredAt: null,
          supersededAt: null,
          activatedByUserId: "user-1",
          source: "billing-page",
          daysRemaining: 28,
          isExpiringSoon: false,
        },
      },
      plan: {
        code: "multi-location-monthly",
        productKey: CashManagementProductKey,
        name: "Multi-location",
        priceCents: 0,
        currency: "EUR",
        interval: "month",
        summary: "Trial plan",
        highlights: ["AI assistant"],
        entitlements: {
          productKey: CashManagementProductKey,
          planCode: "multi-location-monthly",
          featureValues: {
            [CashManagementBillingFeatureKeys.aiAssistant]: true,
          },
        },
        upgradeRank: 3,
      },
    });

    renderPage();

    expect(await screen.findByTestId("assistant-chat-mock")).toBeInTheDocument();
    await waitFor(() => {
      expect(chatSpy).toHaveBeenCalled();
      const lastCall = chatSpy.mock.calls.at(-1)?.[0] as
        | { canSend?: boolean; capabilityGroups?: Array<{ items?: unknown[] }> }
        | undefined;
      expect(lastCall?.canSend).toBe(true);
      expect(lastCall?.capabilityGroups?.length).toBeGreaterThan(0);
    });
  });

  it("disables 'New chat' button until a user message is sent", async () => {
    const { billingApi } = await import("@corely/web-shared/lib/billing-api");
    vi.mocked(billingApi.getCurrent).mockResolvedValue({
      subscription: null,
      entitlements: null,
      trial: null,
      upgradeContext: null,
      plan: null,
    } as any);

    renderPage("assistant");

    await screen.findByTestId("assistant-chat-mock");

    const newChatButtons = screen.getAllByRole("button", { name: /New chat/i });
    expect(newChatButtons.length).toBeGreaterThan(0);
    for (const btn of newChatButtons) {
      expect(btn).toBeDisabled();
    }

    // Simulate Chat notifying AssistantPage that a user message was sent
    const lastCall = chatSpy.mock.calls.at(-1)?.[0] as {
      onHasUserMessagesChange?: (hasUserMessages: boolean) => void;
    };
    expect(lastCall?.onHasUserMessagesChange).toBeDefined();

    const { act } = await import("@testing-library/react");
    act(() => {
      lastCall.onHasUserMessagesChange?.(true);
    });

    for (const btn of newChatButtons) {
      expect(btn).not.toBeDisabled();
    }
  });

  it("binds the sole register before mounting Chat", async () => {
    const { cashManagementApi } = await import("@corely/web-shared/lib/cash-management-api");
    vi.mocked(cashManagementApi.listRegisters).mockResolvedValue({
      registers: [
        {
          id: "reg-1",
          tenantId: "tenant-1",
          workspaceId: "ws-1",
          name: "Front Desk",
          location: "Berlin",
          currency: "EUR",
          currentBalanceCents: 0,
          disallowNegativeBalance: false,
          createdAt: "2026-03-14T00:00:00.000Z",
          updatedAt: "2026-03-14T00:00:00.000Z",
        },
      ],
    });
    vi.mocked(cashManagementApi.resolveWorkspace).mockResolvedValue({
      id: "cash-ws-1",
      tenantId: "tenant-1",
      workspaceId: "ws-1",
      registerId: "reg-1",
      type: "GENERAL_HELP",
      conversationId: "thread-1",
      register: { id: "reg-1", name: "Front Desk", location: "Berlin", currency: "EUR" },
    });

    renderPage();

    await waitFor(() => {
      expect(cashManagementApi.resolveWorkspace).toHaveBeenCalledWith({
        type: "GENERAL_HELP",
        registerId: "reg-1",
        conversationId: undefined,
      });
    });
    expect(await screen.findByTestId("assistant-chat-mock")).toBeInTheDocument();
  });

  it("shows a retry action when automatic register binding fails", async () => {
    const { cashManagementApi } = await import("@corely/web-shared/lib/cash-management-api");
    vi.mocked(cashManagementApi.listRegisters).mockResolvedValue({
      registers: [
        {
          id: "reg-1",
          tenantId: "tenant-1",
          workspaceId: "ws-1",
          name: "Front Desk",
          location: "Berlin",
          currency: "EUR",
          currentBalanceCents: 0,
          disallowNegativeBalance: false,
          createdAt: "2026-03-14T00:00:00.000Z",
          updatedAt: "2026-03-14T00:00:00.000Z",
        },
      ],
    });
    vi.mocked(cashManagementApi.resolveWorkspace)
      .mockRejectedValueOnce(new Error("Temporary connection problem"))
      .mockResolvedValue({
        id: "cash-ws-1",
        tenantId: "tenant-1",
        workspaceId: "ws-1",
        registerId: "reg-1",
        type: "GENERAL_HELP",
        conversationId: "thread-1",
        register: { id: "reg-1", name: "Front Desk", location: "Berlin", currency: "EUR" },
      });

    renderPage();

    expect(await screen.findByText("Temporary connection problem")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    await waitFor(() => {
      expect(cashManagementApi.resolveWorkspace).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByTestId("assistant-chat-mock")).toBeInTheDocument();
  });

  it("shows the selector for an existing unbound conversation with multiple registers", async () => {
    const { cashManagementApi } = await import("@corely/web-shared/lib/cash-management-api");
    vi.mocked(cashManagementApi.listRegisters).mockResolvedValue({
      registers: [
        {
          id: "reg-1",
          tenantId: "tenant-1",
          workspaceId: "ws-1",
          name: "Front Desk",
          location: "Berlin",
          currency: "EUR",
          currentBalanceCents: 0,
          disallowNegativeBalance: false,
          createdAt: "2026-03-14T00:00:00.000Z",
          updatedAt: "2026-03-14T00:00:00.000Z",
        },
        {
          id: "reg-2",
          tenantId: "tenant-1",
          workspaceId: "ws-1",
          name: "Back Office",
          location: "Hamburg",
          currency: "EUR",
          currentBalanceCents: 0,
          disallowNegativeBalance: false,
          createdAt: "2026-03-14T00:00:00.000Z",
          updatedAt: "2026-03-14T00:00:00.000Z",
        },
      ],
    });

    renderPage("cash-management", "/assistant/t/legacy-thread");

    expect(await screen.findByTestId("cash-register-selector")).toBeInTheDocument();
    expect(screen.queryByTestId("assistant-chat-mock")).not.toBeInTheDocument();
  });
});
