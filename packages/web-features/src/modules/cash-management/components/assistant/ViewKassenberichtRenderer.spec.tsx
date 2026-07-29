import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ViewKassenberichtRenderer } from "./ViewKassenberichtRenderer";
import { MemoryRouter } from "react-router-dom";
import { useTranslation } from "react-i18next";

vi.mock("react-i18next", () => ({
  useTranslation: vi.fn(),
}));

describe("ViewKassenberichtRenderer", () => {
  const defaultOutput = {
    type: "cash.view-kassenbericht",
    version: 1,
    registerId: "reg-1",
    day: "2026-07-23",
  };

  it("renders the correct title, formatted date, and link for English", () => {
    vi.mocked(useTranslation).mockReturnValue({
      t: (key: string, options: any) => {
        if (key === "cashAssistant.kassenbericht.title") {
          return "Kassenbericht";
        }
        if (key === "cashAssistant.kassenbericht.open") {
          return "Open Kassenbericht";
        }
        if (key === "cashAssistant.kassenbericht.openForDay") {
          return options?.defaultValue || key;
        }
        return key;
      },
      i18n: { language: "en" },
    } as any);

    render(
      <MemoryRouter>
        <ViewKassenberichtRenderer
          state="output-available"
          output={{ ok: true, result: defaultOutput } as any}
        />
      </MemoryRouter>
    );

    expect(screen.getByText("Kassenbericht")).toBeInTheDocument();
    expect(screen.getByText("Jul 23, 2026")).toBeInTheDocument(); // Formatted using enUS

    const link = screen.getByRole("link", { name: /Open Kassenbericht for Jul 23, 2026/i });
    expect(link).toHaveAttribute("href", "/cash/registers/reg-1/kassenbericht?day=2026-07-23");
  });

  it("renders the correct title, formatted date, and link for German", () => {
    vi.mocked(useTranslation).mockReturnValue({
      t: (key: string, options: any) => {
        if (key === "cashAssistant.kassenbericht.title") {
          return "Kassenbericht";
        }
        if (key === "cashAssistant.kassenbericht.open") {
          return "Kassenbericht öffnen";
        }
        if (key === "cashAssistant.kassenbericht.openForDay") {
          return options?.defaultValue || key;
        }
        return key;
      },
      i18n: { language: "de" },
    } as any);

    render(
      <MemoryRouter>
        <ViewKassenberichtRenderer
          state="output-available"
          output={{ ok: true, result: defaultOutput } as any}
        />
      </MemoryRouter>
    );

    expect(screen.getByText("23.07.2026")).toBeInTheDocument();

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/cash/registers/reg-1/kassenbericht?day=2026-07-23");
    expect(screen.getByText("Kassenbericht öffnen")).toBeInTheDocument();
  });

  it("renders an error state for invalid output", () => {
    vi.mocked(useTranslation).mockReturnValue({
      t: (key: string) =>
        key === "cashAssistant.kassenbericht.invalidLink" ? "Error generating link" : key,
      i18n: { language: "en" },
    } as any);

    render(
      <MemoryRouter>
        <ViewKassenberichtRenderer
          state="output-available"
          output={{ ok: false, error: { message: "Error generating link" } }}
        />
      </MemoryRouter>
    );

    expect(screen.getByText("Error")).toBeInTheDocument();
    expect(screen.getByText("Error generating link")).toBeInTheDocument();
  });
});
