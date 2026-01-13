import { describe, expect, it } from "vitest";
import { WorkspaceTemplateService } from "../application/services/workspace-template.service";

describe("WorkspaceTemplateService", () => {
  const service = new WorkspaceTemplateService();

  it("returns freelancer defaults for PERSONAL", () => {
    const capabilities = service.getDefaultCapabilities("PERSONAL");
    const navigation = service.getNavigationGroupsStructure("PERSONAL");

    expect(capabilities["workspace.multiUser"]).toBe(false);
    expect(capabilities["sales.quotes"]).toBe(false);
    expect(capabilities["ai.copilot"]).toBe(true);
    expect(navigation.length).toBeGreaterThan(0);
  });

  it("returns company defaults for COMPANY", () => {
    const capabilities = service.getDefaultCapabilities("COMPANY");
    const navigation = service.getNavigationGroupsStructure("COMPANY");

    expect(capabilities["workspace.multiUser"]).toBe(true);
    expect(capabilities["sales.quotes"]).toBe(true);
    expect(capabilities["ai.copilot"]).toBe(true);
    expect(navigation.some((group) => group.id === "sales")).toBe(true);
  });
});
