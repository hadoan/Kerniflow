import type {
  WorkspaceCapabilities,
  WorkspaceCapabilityKey,
  WorkspaceNavigationGroup,
} from "@corely/contracts";

export const filterNavigationGroups = (
  groups: WorkspaceNavigationGroup[],
  capabilities: WorkspaceCapabilities
): WorkspaceNavigationGroup[] =>
  groups
    .map((group) => {
      const items = group.items.filter((item) => {
        if (!item.requiredCapabilities || item.requiredCapabilities.length === 0) {
          return true;
        }
        return item.requiredCapabilities.every((capability) => {
          if (!Object.prototype.hasOwnProperty.call(capabilities, capability)) {
            return true;
          }
          return capabilities[capability as WorkspaceCapabilityKey];
        });
      });

      return {
        ...group,
        items,
      };
    })
    .filter((group) => group.items.length > 0);
