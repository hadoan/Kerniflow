import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CashAssistantRegisterSelector } from "./cash-assistant-register-selector";
import { type CashRegister } from "@corely/contracts";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback: string) => fallback,
  }),
}));

const mockRegisters: CashRegister[] = [
  {
    id: "reg-1",
    tenantId: "t-1",
    workspaceId: "w-1",
    name: "Front Desk",
    location: "Berlin",
    currency: "EUR",
    currentBalanceCents: 1000,
    disallowNegativeBalance: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "reg-2",
    tenantId: "t-1",
    workspaceId: "w-1",
    name: "Back Office",
    location: "Hamburg",
    currency: "EUR",
    currentBalanceCents: 2000,
    disallowNegativeBalance: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

describe("CashAssistantRegisterSelector", () => {
  it("renders register options with name and location", () => {
    const onSelect = vi.fn();
    render(<CashAssistantRegisterSelector registers={mockRegisters} onSelectRegister={onSelect} />);

    expect(screen.getByText("Choose a cash register")).toBeInTheDocument();
    expect(screen.getByText("Front Desk")).toBeInTheDocument();
    expect(screen.getByText("Berlin")).toBeInTheDocument();
    expect(screen.getByText("Back Office")).toBeInTheDocument();
    expect(screen.getByText("Hamburg")).toBeInTheDocument();
  });

  it("calls onSelectRegister when a register card is clicked", () => {
    const onSelect = vi.fn();
    render(<CashAssistantRegisterSelector registers={mockRegisters} onSelectRegister={onSelect} />);

    const firstRegisterBtn = screen.getByTestId("select-register-item-0");
    fireEvent.click(firstRegisterBtn);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(mockRegisters[0]);
  });

  it("disables buttons and displays loading indicator when isBinding is true", () => {
    const onSelect = vi.fn();
    render(
      <CashAssistantRegisterSelector
        registers={mockRegisters}
        onSelectRegister={onSelect}
        isBinding={true}
      />
    );

    const firstRegisterBtn = screen.getByTestId("select-register-item-0");
    expect(firstRegisterBtn).toBeDisabled();
    expect(screen.getByText("Selecting register...")).toBeInTheDocument();
  });
});
