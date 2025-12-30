// @vitest-environment jsdom
import React, { useState, act } from "react";
import { describe, it, expect } from "vitest";
import { createRoot } from "react-dom/client";
import type { PermissionGroup } from "@corely/contracts";
import { RolePermissionsEditor } from "./RolePermissionsEditor";

const catalog: PermissionGroup[] = [
  {
    id: "sales",
    label: "Sales",
    permissions: [
      { key: "sales.quotes.read", group: "sales", label: "View quotes" },
      { key: "sales.quotes.manage", group: "sales", label: "Manage quotes" },
    ],
  },
];

const Wrapper: React.FC = () => {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  return (
    <RolePermissionsEditor
      catalog={catalog}
      selectedKeys={selectedKeys}
      onChange={setSelectedKeys}
    />
  );
};

describe("RolePermissionsEditor", () => {
  it("toggles permissions and updates the count", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(<Wrapper />);
    });

    expect(container.textContent).toContain("0 / 2 permissions enabled");

    const checkbox = container.querySelector('[role="checkbox"]');
    expect(checkbox).toBeTruthy();

    act(() => {
      checkbox?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("1 / 2 permissions enabled");
  });
});
