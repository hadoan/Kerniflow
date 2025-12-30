import type { AppManifest } from "@kerniflow/contracts";

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
  dependencies: ["customers"], // Invoices depend on the customers module
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
      id: "invoices-list",
      scope: "web",
      section: "finance",
      labelKey: "nav.invoices",
      defaultLabel: "Invoices",
      route: "/invoices",
      icon: "FileText",
      order: 10,
      requiresPermissions: ["invoices.read"],
      tags: ["sales", "billing", "finance"],
    },
    {
      id: "invoices-create",
      scope: "web",
      section: "finance",
      labelKey: "nav.invoices.create",
      defaultLabel: "Create Invoice",
      route: "/invoices/new",
      icon: "FilePlus",
      order: 11,
      requiresPermissions: ["invoices.write"],
      tags: ["sales", "billing"],
    },
  ],
};
