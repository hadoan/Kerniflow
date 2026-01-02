import type { AppManifest } from "@corely/contracts";

/**
 * Invoices App Manifest
 * Defines the invoices module as an installable app
 */
export const invoicesAppManifest: AppManifest = {
  appId: "invoices",
  name: "Invoices",
  tier: 1,
  version: "1.0.0",
  description: "Create, manage, and send invoices to customers",
  dependencies: ["parties"], // Invoices depend on the parties module
  capabilities: ["invoices.create", "invoices.send", "invoices.pdf", "invoices.recurring"],
  permissions: [
    "invoices.read",
    "invoices.write",
    "invoices.delete",
    "invoices.send",
    "invoices.finalize",
  ],
  menu: [
    {
      id: "invoices",
      scope: "web",
      section: "invoices",
      labelKey: "nav.invoices",
      defaultLabel: "Invoices",
      route: "/invoices",
      icon: "FileText",
      order: 10,
      requiresPermissions: ["invoices.read"],
    },
  ],
};
