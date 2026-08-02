import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { CashEntriesScreen } from "./CashEntriesScreen";
import { DailyCloseScreen } from "./DailyCloseScreen";
import { CashExportsScreen } from "./CashExportsScreen";
import { CreateEntryDialog, defaultCreateForm } from "./cash-entries-dialogs";

const { apiMocks, taxApiMocks, uploadMocks } = vi.hoisted(() => ({
  apiMocks: {
    getRegister: vi.fn(),
    listEntries: vi.fn(),
    listAttachments: vi.fn(),
    createEntry: vi.fn(),
    reverseEntry: vi.fn(),
    attachBeleg: vi.fn(),
    getDayClose: vi.fn(),
    listDayCloses: vi.fn(),
    getKassenbericht: vi.fn(),
    getDashboard: vi.fn(),
    submitDayClose: vi.fn(),
    exportCashBook: vi.fn(),
    downloadExport: vi.fn(),
    downloadDocument: vi.fn(),
  },
  taxApiMocks: {
    getProfile: vi.fn(),
    listTaxCodes: vi.fn(),
    listTaxRates: vi.fn(),
    upsertProfile: vi.fn(),
  },
  uploadMocks: {
    uploadBelegDocument: vi.fn(),
  },
}));

class ResizeObserverMock {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

vi.mock("@corely/web-shared/lib/cash-management-api", () => ({
  cashManagementApi: apiMocks,
}));

vi.mock("@corely/web-shared/lib/tax-api", () => ({
  taxApi: taxApiMocks,
}));

vi.mock("../upload-beleg-document", () => ({
  uploadBelegDocument: uploadMocks.uploadBelegDocument,
}));

const renderRoute = (path: string, element: React.ReactNode) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <MemoryRouter initialEntries={[path]}>
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route path="/cash/registers/:id/entries" element={element} />
          <Route path="/cash/registers/:id/day-close" element={element} />
          <Route path="/cash/registers/:id/exports" element={element} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>
  );
};

describe("cash-management screens secondary", () => {
  let anchorClickSpy: ReturnType<typeof vi.spyOn> | null = null;

  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    if (!HTMLElement.prototype.scrollIntoView) {
      Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
        value: vi.fn(),
        writable: true,
      });
    }

    Object.values(apiMocks).forEach((fn) => fn.mockReset());
    Object.values(taxApiMocks).forEach((fn) => fn.mockReset());
    Object.values(uploadMocks).forEach((fn) => fn.mockReset());
    taxApiMocks.getProfile.mockResolvedValue({ regime: "SMALL_BUSINESS" });
    taxApiMocks.listTaxCodes.mockResolvedValue([]);
    taxApiMocks.listTaxRates.mockResolvedValue([]);
    taxApiMocks.upsertProfile.mockResolvedValue({ regime: "STANDARD_VAT" });
    anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });

  afterEach(() => {
    anchorClickSpy?.mockRestore();
    anchorClickSpy = null;
    vi.unstubAllGlobals();
  });

  it("stops the camera stream when the dialog closes", async () => {
    const user = userEvent.setup();
    const stop = vi.fn();
    const getUserMedia = vi.fn().mockResolvedValue({
      getTracks: () => [{ stop }],
    });
    const originalMediaDevices = navigator.mediaDevices;
    const originalSrcObject = Object.getOwnPropertyDescriptor(
      HTMLMediaElement.prototype,
      "srcObject"
    );

    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia },
    });
    Object.defineProperty(HTMLMediaElement.prototype, "srcObject", {
      configurable: true,
      get() {
        return (this as HTMLMediaElement & { __srcObject?: MediaStream }).__srcObject ?? null;
      },
      set(value) {
        (this as HTMLMediaElement & { __srcObject?: MediaStream | null }).__srcObject =
          value as MediaStream | null;
      },
    });

    const setForm = vi.fn();
    const view = render(
      <CreateEntryDialog
        open
        onOpenChange={() => undefined}
        form={defaultCreateForm()}
        setForm={setForm}
        entryTypes={["SALE_CASH"]}
        entryTypeLabel={(value) => value}
        taxCodeOptions={[]}
        taxRelevant={false}
        requiresTaxProfileSetup={false}
        taxCodeRequired={false}
        taxCodeLabel="VAT"
        registerCurrency="EUR"
        projectedBalance={0}
        isPending={false}
        isError={false}
        canSave={false}
        onSave={() => undefined}
      />
    );

    await user.click(screen.getByRole("button", { name: "Take picture" }));
    await waitFor(() => expect(getUserMedia).toHaveBeenCalled());

    view.rerender(
      <CreateEntryDialog
        open={false}
        onOpenChange={() => undefined}
        form={defaultCreateForm()}
        setForm={setForm}
        entryTypes={["SALE_CASH"]}
        entryTypeLabel={(value) => value}
        taxCodeOptions={[]}
        taxRelevant={false}
        requiresTaxProfileSetup={false}
        taxCodeRequired={false}
        taxCodeLabel="VAT"
        registerCurrency="EUR"
        projectedBalance={0}
        isPending={false}
        isError={false}
        canSave={false}
        onSave={() => undefined}
      />
    );

    await waitFor(() => expect(stop).toHaveBeenCalled());

    if (originalMediaDevices) {
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: originalMediaDevices,
      });
    }
    if (originalSrcObject) {
      Object.defineProperty(HTMLMediaElement.prototype, "srcObject", originalSrcObject);
    }
  });

  it("day close screen is locked when status is submitted", async () => {
    apiMocks.getRegister.mockResolvedValue({
      register: {
        id: "reg-1",
        name: "Main",
        location: null,
        currency: "EUR",
        currentBalanceCents: 10000,
        disallowNegativeBalance: false,
      },
    });
    apiMocks.getKassenbericht.mockResolvedValue({
      preview: {
        status: "LOCKED",
        businessDate: "2026-02-27",
        expectedClosingCashCents: 10000,
        countedClosingCashCents: 10000,
        effectiveClosingCashCents: 10000,
        cashDifferenceCents: 0,
        verificationStatus: "COUNTED_MATCH",
        previousClosingCashCents: 0,
        calculatedCashSalesCents: 0,
        businessExpensesCents: 0,
        goodsPurchasesCents: 0,
        privateWithdrawalsCents: 0,
        bankDepositsCents: 0,
        otherCashOutflowsCents: 0,
        subtotalCents: 10000,
        cashInflowCents: 0,
        otherNonSalesCashInflowsCents: 0,
        privateDepositsCents: 0,
        bankWithdrawalsToCashCents: 0,
        warnings: [],
        evidenceRequirements: [],
        calculation: { operands: [] },
        generatedAt: new Date().toISOString(),
        version: 1,
      },
    });

    renderRoute("/cash/registers/reg-1/day-close?day=2026-02-27", <DailyCloseScreen />);

    expect(
      await screen.findByText("This day is locked. Use correction entries only.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit and lock day" })).not.toBeInTheDocument();
  });

  it("reverse entry updates list and saldo", async () => {
    const user = userEvent.setup();
    const entries: Array<Record<string, unknown>> = [
      {
        id: "entry-1",
        entryNo: 1,
        occurredAt: "2026-02-27T09:00:00.000Z",
        dayKey: "2026-02-27",
        description: "Sale",
        type: "SALE_CASH",
        direction: "IN",
        source: "MANUAL",
        paymentMethod: "CASH",
        grossAmountCents: 1000,
        netAmountCents: 1000,
        taxAmountCents: 0,
        taxMode: "NONE",
        taxCodeId: null,
        taxCode: null,
        taxRateBps: null,
        taxLabel: null,
        amount: 1000,
        amountCents: 1000,
        currency: "EUR",
        balanceAfterCents: 1000,
        sourceDocumentId: null,
        sourceDocumentRef: null,
        sourceDocumentKind: null,
        reversedByEntryId: null,
      },
    ];

    apiMocks.getRegister.mockResolvedValue({
      register: {
        id: "reg-1",
        name: "Main",
        location: null,
        currency: "EUR",
        currentBalanceCents: 1000,
        disallowNegativeBalance: false,
      },
    });
    apiMocks.listEntries.mockImplementation(async () => ({ entries }));
    apiMocks.listDayCloses.mockResolvedValue({ closes: [] });
    apiMocks.listAttachments.mockResolvedValue({ attachments: [] });
    apiMocks.reverseEntry.mockImplementation(async () => {
      entries[0].reversedByEntryId = "entry-2";
      entries.push({
        id: "entry-2",
        entryNo: 2,
        occurredAt: "2026-02-27T10:00:00.000Z",
        dayKey: "2026-02-27",
        description: "Reversal #1: Wrong entry",
        type: "CORRECTION",
        direction: "OUT",
        source: "MANUAL",
        paymentMethod: "CASH",
        grossAmountCents: 1000,
        netAmountCents: 1000,
        taxAmountCents: 0,
        taxMode: "NONE",
        taxCodeId: null,
        taxCode: null,
        taxRateBps: null,
        taxLabel: null,
        amount: 1000,
        amountCents: 1000,
        currency: "EUR",
        balanceAfterCents: 0,
        sourceDocumentId: null,
        sourceDocumentRef: null,
        sourceDocumentKind: null,
        reversedByEntryId: null,
      });
      return { entry: entries[1] };
    });

    renderRoute("/cash/registers/reg-1/entries", <CashEntriesScreen />);

    await screen.findAllByText("Sale");
    const menuTrigger = screen
      .getAllByRole("button")
      .find((button) => button.getAttribute("aria-haspopup") === "menu");
    expect(menuTrigger).toBeDefined();
    if (!menuTrigger) {
      throw new Error("Menu trigger not found");
    }
    await user.click(menuTrigger);
    const reverseButtons = await screen.findAllByText("Reverse");
    fireEvent.click(reverseButtons[0]);

    await waitFor(() => expect(document.querySelector("#reverse-reason")).not.toBeNull());
    await user.type(document.querySelector("#reverse-reason") as HTMLElement, "Wrong entry");
    await user.click(screen.getByRole("button", { name: "Confirm reversal" }));

    await waitFor(() =>
      expect(screen.getAllByText("Reversal #1: Wrong entry").length).toBeGreaterThan(0)
    );
  });

  it("export generation returns downloadable result", async () => {
    const user = userEvent.setup();
    const createObjectUrl = vi.fn(() => "blob:test");
    const revokeObjectUrl = vi.fn();
    vi.stubGlobal("URL", {
      createObjectURL: createObjectUrl,
      revokeObjectURL: revokeObjectUrl,
    } as unknown as typeof URL);

    apiMocks.getRegister.mockResolvedValue({
      register: {
        id: "reg-1",
        name: "Main",
        location: null,
        currency: "EUR",
        currentBalanceCents: 1000,
        disallowNegativeBalance: false,
      },
    });
    apiMocks.exportCashBook.mockResolvedValue({
      export: {
        fileToken: "file-1",
        fileName: "cashbook.csv",
        contentType: "text/csv",
        sizeBytes: 200,
      },
    });
    apiMocks.downloadExport.mockResolvedValue(
      new Blob(["id,amount\n1,1000"], { type: "text/csv" })
    );

    renderRoute("/cash/registers/reg-1/exports", <CashExportsScreen />);

    await user.click(await screen.findByRole("button", { name: "Generate export" }));
    await waitFor(() => expect(apiMocks.exportCashBook).toHaveBeenCalled());

    await user.click(await screen.findByRole("button", { name: "Download export" }));
    await waitFor(() => expect(apiMocks.downloadExport).toHaveBeenCalledWith("file-1"));
    expect(createObjectUrl).toHaveBeenCalled();
  });
});
