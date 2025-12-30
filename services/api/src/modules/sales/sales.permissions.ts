import type { PermissionGroup } from "@corely/contracts";

export const salesPermissions: PermissionGroup[] = [
  {
    id: "sales",
    label: "Sales",
    permissions: [
      {
        key: "sales.quotes.read",
        group: "sales",
        label: "View quotes",
      },
      {
        key: "sales.quotes.manage",
        group: "sales",
        label: "Manage quotes",
      },
      {
        key: "sales.quotes.send",
        group: "sales",
        label: "Send quotes",
      },
      {
        key: "sales.quotes.accept",
        group: "sales",
        label: "Accept quotes",
      },
      {
        key: "sales.orders.read",
        group: "sales",
        label: "View orders",
      },
      {
        key: "sales.orders.manage",
        group: "sales",
        label: "Manage orders",
      },
      {
        key: "sales.orders.confirm",
        group: "sales",
        label: "Confirm orders",
      },
      {
        key: "sales.orders.fulfill",
        group: "sales",
        label: "Fulfill orders",
      },
      {
        key: "sales.invoices.read",
        group: "sales",
        label: "View sales invoices",
      },
      {
        key: "sales.invoices.manage",
        group: "sales",
        label: "Manage sales invoices",
      },
      {
        key: "sales.invoices.issue",
        group: "sales",
        label: "Issue sales invoices",
      },
      {
        key: "sales.invoices.void",
        group: "sales",
        label: "Void sales invoices",
        danger: true,
      },
      {
        key: "sales.payments.record",
        group: "sales",
        label: "Record payments",
      },
      {
        key: "sales.settings.manage",
        group: "sales",
        label: "Manage sales settings",
      },
    ],
  },
];
