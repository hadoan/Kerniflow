# Pack Authoring Guide

## Overview

A **Pack** is a bundle that combines multiple apps and templates for easy installation. Packs orchestrate complex multi-step installations through a background worker, making it easy to set up complete workflows with a single action.

## Pack Structure

A pack definition includes:

- **Apps to enable**: List of apps in dependency order
- **Templates to apply**: Configuration templates with parameters
- **Feature flags** (optional): Feature toggles to enable
- **Menu preset** (optional): Customized menu layout
- **Post-install checks**: Validation steps to ensure successful installation

## Creating a Pack

### Step 1: Define Pack Metadata

Create a `*.pack.ts` file in `services/api/src/modules/platform/packs/`:

```typescript
import type { PackDefinition } from "@corely/contracts";

export const myPack: PackDefinition = {
  packId: "my-pack",
  name: "My Pack Name",
  version: "1.0.0",
  description: "What this pack does and who it's for",

  // Apps to enable (in dependency order)
  appsToEnable: [
    "base-module", // Dependencies first
    "dependent-module", // Then dependents
  ],

  // Templates to apply (in order)
  templatesToApply: [
    {
      templateId: "my-template",
      versionRange: "^1.0.0", // Optional: acceptable version range
      defaultParams: {
        param1: "value1",
        param2: true,
      },
    },
  ],

  // Optional: Feature flags
  featureFlags: {
    enableAdvancedFeature: true,
    enableBetaFeature: false,
  },

  // Optional: Menu preset template
  menuPresetTemplateId: "my-menu-preset",

  // Post-install validation
  postInstallChecks: ["verify-data-created", "verify-apps-enabled", "verify-user-access"],
};
```

### Step 2: Register Pack

In `services/api/src/modules/platform/infrastructure/registries/pack-registry.ts`:

```typescript
loadPacks(): void {
  import { myPack } from '../packs/my-pack.pack';
  this.register(myPack);
}
```

### Step 3: Run Catalog Sync

```bash
pnpm catalog:sync
```

## Pack Installation Flow

When a pack is installed, the system executes these steps:

1. **Validate**: Check all required apps and templates exist
2. **Enable Apps**: Enable apps in dependency order
3. **Apply Templates**: Execute templates sequentially with params
4. **Apply Feature Flags**: Set feature toggles (if specified)
5. **Apply Menu Preset**: Customize menu layout (if specified)
6. **Run Checks**: Execute post-install validation
7. **Record Installation**: Save pack install record with logs

## Pack Examples

### Small Business Starter Pack

Complete setup for small businesses:

```typescript
export const smallBusinessStarterPack: PackDefinition = {
  packId: "small-business-starter",
  name: "Small Business Starter",
  version: "1.0.0",
  description:
    "Complete business management setup with accounting, customers, invoicing, and expenses. Includes standard US GAAP chart of accounts.",

  appsToEnable: [
    "party", // Base party module
    "customers", // Customer management (depends on party)
    "accounting", // Accounting module
    "invoices", // Invoicing (depends on customers, accounting)
    "expenses", // Expense tracking
  ],

  templatesToApply: [
    {
      templateId: "coa-us-gaap",
      versionRange: "^1.0.0",
      defaultParams: {
        currency: "USD",
        includeSubAccounts: true,
      },
    },
  ],

  featureFlags: {
    enableRecurringInvoices: true,
    enableMultiCurrency: false,
    enableAdvancedReporting: false,
  },

  postInstallChecks: [
    "verify-chart-of-accounts-created",
    "verify-apps-enabled",
    "verify-user-has-access",
  ],
};
```

### Restaurant POS Pack

Complete POS setup for restaurants:

```typescript
export const restaurantPosPack: PackDefinition = {
  packId: "restaurant-pos",
  name: "Restaurant POS",
  version: "1.0.0",
  description:
    "Point of sale system for restaurants with table management, kitchen display, and inventory tracking.",

  appsToEnable: ["party", "customers", "inventory", "pos", "accounting"],

  templatesToApply: [
    {
      templateId: "restaurant-product-categories",
      defaultParams: {
        includeBarItems: true,
      },
    },
    {
      templateId: "pos-payment-methods",
      defaultParams: {
        includeCash: true,
        includeCard: true,
        includeMobilePayments: true,
      },
    },
  ],

  featureFlags: {
    enableTableManagement: true,
    enableKitchenDisplay: true,
    enableSplitBills: true,
  },

  menuPresetTemplateId: "restaurant-menu-layout",

  postInstallChecks: [
    "verify-product-categories",
    "verify-payment-methods",
    "verify-pos-configured",
  ],
};
```

### E-commerce Starter Pack

```typescript
export const ecommerceStarterPack: PackDefinition = {
  packId: "ecommerce-starter",
  name: "E-commerce Starter",
  version: "1.0.0",
  description:
    "Complete e-commerce setup with product catalog, inventory, orders, and customer management.",

  appsToEnable: ["party", "customers", "inventory", "sales", "invoices", "shipping", "accounting"],

  templatesToApply: [
    {
      templateId: "product-attributes",
      defaultParams: {
        includeVariants: true,
      },
    },
    {
      templateId: "shipping-methods",
      defaultParams: {
        country: "US",
      },
    },
    {
      templateId: "payment-gateways",
      defaultParams: {
        enableStripe: true,
        enablePayPal: true,
      },
    },
  ],

  featureFlags: {
    enableProductReviews: true,
    enableWishlist: true,
    enableRecommendations: false,
  },

  postInstallChecks: [
    "verify-product-catalog",
    "verify-shipping-methods",
    "verify-payment-gateways",
  ],
};
```

## Best Practices

### 1. Order Matters

Apps and templates are processed in order. Ensure dependencies come first:

```typescript
appsToEnable: [
  "foundation", // First
  "depends-on-foundation", // Second
];
```

### 2. Use Version Ranges

Specify acceptable template versions for forward compatibility:

```typescript
templatesToApply: [
  {
    templateId: "my-template",
    versionRange: "^1.0.0", // Accept 1.x.x, but not 2.0.0
  },
];
```

### 3. Provide Sensible Defaults

Make packs work out-of-the-box with good default parameters:

```typescript
defaultParams: {
  currency: "USD", // Most common default
  includeAdvanced: false, // Start simple
};
```

### 4. Test Installation Thoroughly

Packs are critical user journeys - test them end-to-end:

```typescript
describe("Small Business Starter Pack", () => {
  it("should install successfully", async () => {
    const result = await packInstaller.install(tenantId, "small-business-starter");

    expect(result.status).toBe("COMPLETED");
    expect(result.logs).toContainEqual(
      expect.objectContaining({
        level: "info",
        message: expect.stringContaining("Apps enabled successfully"),
      })
    );
  });
});
```

### 5. Document Prerequisites

Clearly document what users need before installing:

```typescript
description: "Complete restaurant POS system. Prerequisites: Printer configured, payment terminal connected, network stable.";
```

### 6. Implement Post-Install Checks

Validate that installation succeeded:

```typescript
postInstallChecks: [
  "verify-chart-of-accounts-created",
  "verify-default-customer-exists",
  "verify-user-permissions-granted",
];
```

### 7. Version Packs Appropriately

Use semantic versioning:

- **Patch** (1.0.1): Bug fixes, parameter tweaks
- **Minor** (1.1.0): New templates, new apps
- **Major** (2.0.0): Breaking changes, removed features

### 8. Consider Uninstall Path

Document what happens if apps are disabled after pack install:

```typescript
// Add to pack description:
description: "... Note: Disabling core apps after installation may result in data access issues.";
```

## Pack Installation Monitoring

### Check Installation Status

```typescript
GET /platform/packs/small-business-starter/installs/:installId

Response:
{
  "installId": "abc123",
  "packId": "small-business-starter",
  "status": "RUNNING",
  "logs": [
    {
      "step": "apps",
      "message": "Enabled app: party",
      "timestamp": "2025-01-01T10:00:00Z",
      "level": "info"
    },
    {
      "step": "apps",
      "message": "Enabled app: customers",
      "timestamp": "2025-01-01T10:00:01Z",
      "level": "info"
    },
    {
      "step": "templates",
      "message": "Applying template: coa-us-gaap",
      "timestamp": "2025-01-01T10:00:02Z",
      "level": "info"
    }
  ],
  "startedAt": "2025-01-01T10:00:00Z",
  "completedAt": null
}
```

### Installation States

- **PENDING**: Queued, not started
- **RUNNING**: Currently installing
- **COMPLETED**: Finished successfully
- **FAILED**: Encountered error

## Troubleshooting

### Pack Install Fails

Check the logs:

```typescript
GET /platform/packs/:packId/installs/:installId
```

Look for error-level log entries:

```typescript
{
  "level": "error",
  "message": "Failed to apply template: coa-us-gaap - Template requires app 'accounting' which is not enabled",
  "step": "templates"
}
```

### Template Apply Fails Mid-Install

Packs are NOT transactional - partial installs may occur. To recover:

1. Check which steps completed
2. Disable successfully enabled apps if needed
3. Delete partially created data
4. Retry pack install

### Dependencies Not Met

Ensure all required apps exist in the registry:

```bash
# Check available apps
pnpm catalog:sync
```

## Pack Installation Worker

Packs are installed via a background worker (BullMQ) to handle long-running installations without blocking HTTP requests.

### Job Structure

```typescript
interface PackInstallJob {
  tenantId: string;
  packId: string;
  params: Record<string, any>;
  userId: string;
}
```

### Job Processing

1. Create `TenantPackInstall` record with status `PENDING`
2. Queue background job
3. Worker picks up job
4. Execute installation steps
5. Update status to `COMPLETED` or `FAILED`
6. Append logs at each step

## Related Documentation

- [Apps + Templates + Packs Overview](./apps-templates-packs.md)
- [Template Authoring Guide](./template-authoring.md)
- [App Manifest Schema](./app-manifest.md)
