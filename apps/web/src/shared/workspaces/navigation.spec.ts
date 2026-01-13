import { describe, expect, it } from "vitest";
import {
  WorkspaceCapabilitiesSchema,
  type WorkspaceCapabilities,
  type WorkspaceNavigationGroup,
} from "@corely/contracts";
import { filterNavigationGroups } from "./navigation";

const buildCapabilities = (overrides: Partial<WorkspaceCapabilities>) => {
  const base = Object.fromEntries(
    Object.keys(WorkspaceCapabilitiesSchema.shape).map((key) => [key, false])
  ) as WorkspaceCapabilities;
  return { ...base, ...overrides };
};

describe("filterNavigationGroups", () => {
  it("filters items when required capability is disabled", () => {
    const groups: WorkspaceNavigationGroup[] = [
      {
        id: "sales",
        labelKey: "nav.groups.sales",
        defaultLabel: "Sales",
        order: 1,
        items: [
          {
            id: "quotes",
            section: "quotes",
            label: "Quotes",
            icon: "FileCheck",
            order: 1,
            requiredCapabilities: ["sales.quotes"],
          },
          {
            id: "projects",
            section: "projects",
            label: "Projects",
            icon: "Briefcase",
            order: 2,
            requiredCapabilities: ["sales.projects"],
          },
        ],
      },
    ];

    const capabilities = buildCapabilities({ "sales.quotes": true });
    const filtered = filterNavigationGroups(groups, capabilities);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].items).toHaveLength(1);
    expect(filtered[0].items[0].id).toBe("quotes");
  });

  it("drops empty groups after filtering", () => {
    const groups: WorkspaceNavigationGroup[] = [
      {
        id: "inventory",
        labelKey: "nav.groups.inventory",
        defaultLabel: "Inventory",
        order: 1,
        items: [
          {
            id: "products",
            section: "products",
            label: "Products",
            icon: "Boxes",
            order: 1,
            requiredCapabilities: ["inventory.basic"],
          },
        ],
      },
    ];

    const capabilities = buildCapabilities({ "inventory.basic": false });
    const filtered = filterNavigationGroups(groups, capabilities);

    expect(filtered).toHaveLength(0);
  });
});
