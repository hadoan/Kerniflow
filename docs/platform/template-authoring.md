# Template Authoring Guide

## Overview

Templates are configuration presets that can be applied to tenants to seed data or configure settings. They use a **plan/apply** execution model that allows users to preview changes before applying them.

## Core Concepts

### Plan/Apply Workflow

1. **Plan**: Generate a preview of what will be created/updated/skipped
2. **Review**: User reviews the plan
3. **Apply**: Execute the plan and record the installation
4. **Track**: System tracks which records came from which template

### Customization Protection

Templates use `SeededRecordMeta` to track which records were created by templates. When a tenant edits a seeded record, it's marked as `isCustomized = true`. Future template upgrades will skip customized records by default.

### Idempotency

Templates must be idempotent - safe to apply multiple times. Use stable keys (like account codes, tax codes) rather than auto-increment IDs.

## Template Structure

A complete template consists of two parts:

1. **Definition** (`*.definition.ts`): Metadata and data structure
2. **Executor** (`*.executor.ts`): Plan and apply logic

## Creating a Template

### Step 1: Define Template Metadata

Create a `*.definition.ts` file:

```typescript
import type { TemplateDefinition } from "@corely/contracts";
import { z } from "zod";

// 1. Define parameter schema with Zod
export const MyTemplateParamsSchema = z.object({
  param1: z.string().default("default-value"),
  param2: z.boolean().default(true),
});

export type MyTemplateParams = z.infer<typeof MyTemplateParamsSchema>;

// 2. Define the template metadata
export const myTemplate: TemplateDefinition = {
  templateId: "my-template",
  name: "My Template Name",
  category: "accounting", // or "tax", "inventory", etc.
  version: "1.0.0",
  description: "What this template does",
  requiresApps: ["accounting"], // Apps that must be enabled
  paramsSchema: MyTemplateParamsSchema,
  upgradePolicy: {
    skipCustomized: true, // Skip records that have been customized
    additiveOnly: false, // If true, only add new records, never update
  },
};

// 3. Define the data structure
export interface MyDataRecord {
  code: string; // Stable key for idempotency
  name: string;
  // ... other fields
}

// 4. Function to generate records
export function getMyData(params: MyTemplateParams): MyDataRecord[] {
  const records: MyDataRecord[] = [
    {
      code: "RECORD-001",
      name: "Example Record",
    },
    // ... more records
  ];

  return records;
}
```

### Step 2: Implement Template Executor

Create a `*.executor.ts` file:

```typescript
import { Injectable, Inject } from "@nestjs/common";
import type { TemplatePlan, TemplateResult, TemplatePlanAction } from "@corely/contracts";
import type { TemplateExecutorPort } from "../../platform/application/ports/template-executor.port";
import type { SeededRecordMetaRepositoryPort } from "../../platform/application/ports/seeded-record-meta-repository.port";
import { SEEDED_RECORD_META_REPOSITORY_TOKEN } from "../../platform/application/ports/seeded-record-meta-repository.port";
import { PrismaService } from "@corely/data";
import {
  MyTemplateParamsSchema,
  type MyTemplateParams,
  getMyData,
  myTemplate,
} from "./my-template.definition";

@Injectable()
export class MyTemplateExecutor implements TemplateExecutorPort {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(SEEDED_RECORD_META_REPOSITORY_TOKEN)
    private readonly seededRecordRepo: SeededRecordMetaRepositoryPort
  ) {}

  async plan(tenantId: string, params: Record<string, any>): Promise<TemplatePlan> {
    // 1. Validate parameters
    const validatedParams = MyTemplateParamsSchema.parse(params) as MyTemplateParams;

    // 2. Get records to create/update
    const records = getMyData(validatedParams);

    const actions: TemplatePlanAction[] = [];

    // 3. For each record, determine action
    for (const record of records) {
      const existing = await this.prisma.myTable.findFirst({
        where: {
          tenantId,
          code: record.code, // Use stable key
        },
      });

      if (!existing) {
        // New record - will create
        actions.push({
          type: "create",
          table: "MyTable",
          key: record.code,
          data: record,
        });
      } else {
        // Check if customized
        const seededMeta = await this.seededRecordRepo.findByTargetRecord(
          tenantId,
          "MyTable",
          existing.id
        );

        if (seededMeta?.isCustomized) {
          // Skip - user has customized it
          actions.push({
            type: "skip",
            table: "MyTable",
            key: record.code,
            data: record,
            reason: "Record has been customized by tenant",
          });
        } else {
          // Update existing record
          actions.push({
            type: "update",
            table: "MyTable",
            key: record.code,
            data: record,
          });
        }
      }
    }

    // 4. Generate summary
    const createCount = actions.filter((a) => a.type === "create").length;
    const updateCount = actions.filter((a) => a.type === "update").length;
    const skipCount = actions.filter((a) => a.type === "skip").length;

    return {
      actions,
      summary: `Will create ${createCount}, update ${updateCount}, skip ${skipCount} records`,
    };
  }

  async apply(tenantId: string, params: Record<string, any>): Promise<TemplateResult> {
    // 1. Get the plan
    const plan = await this.plan(tenantId, params);

    let created = 0;
    let updated = 0;
    let skipped = 0;

    // 2. Execute each action
    for (const action of plan.actions) {
      if (action.type === "skip") {
        skipped++;
        continue;
      }

      if (action.type === "create") {
        // Create new record
        const newRecord = await this.prisma.myTable.create({
          data: {
            tenantId,
            code: action.data.code as string,
            name: action.data.name as string,
            // ... other fields
          },
        });

        // Register as seeded record
        await this.seededRecordRepo.create({
          tenantId,
          targetTable: "MyTable",
          targetId: newRecord.id,
          sourceTemplateId: myTemplate.templateId,
          sourceTemplateVersion: myTemplate.version,
          isCustomized: false,
          customizedAt: null,
          customizedByUserId: null,
        });

        created++;
      } else if (action.type === "update") {
        // Find and update existing
        const existing = await this.prisma.myTable.findFirst({
          where: {
            tenantId,
            code: action.data.code as string,
          },
        });

        if (existing) {
          await this.prisma.myTable.update({
            where: { id: existing.id },
            data: {
              name: action.data.name as string,
              // ... other fields
            },
          });

          updated++;
        }
      }
    }

    // 3. Return result
    return {
      summary: {
        created,
        updated,
        skipped,
        actions: plan.actions,
      },
    };
  }
}
```

### Step 3: Register Template

In `services/api/src/modules/platform/infrastructure/registries/template-registry.ts`:

```typescript
loadTemplates(): void {
  import { myTemplate } from '../../../my-module/templates/my-template.definition';
  this.register(myTemplate);
}
```

### Step 4: Run Catalog Sync

After creating your template, run the catalog sync to mirror it to the database:

```bash
pnpm catalog:sync
```

## Best Practices

### 1. Use Stable Keys

Always use stable, meaningful keys for idempotency:

```typescript
// Good - stable keys
{ code: "1000", name: "Assets" }
{ taxCode: "CA-STATE", name: "California State Tax" }

// Bad - auto-increment IDs
{ id: 1, name: "Assets" }
```

### 2. Validate Parameters Strictly

Use Zod for strict parameter validation:

```typescript
export const MyParamsSchema = z.object({
  currency: z.enum(["USD", "EUR", "GBP"]),
  includeAdvanced: z.boolean(),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
```

### 3. Protect Customizations

Always check `isCustomized` before updating seeded records:

```typescript
if (seededMeta?.isCustomized) {
  actions.push({
    type: "skip",
    reason: "Record has been customized by tenant",
  });
}
```

### 4. Provide Meaningful Summaries

Help users understand what will happen:

```typescript
const summary = `Will create ${createCount} new accounts, update ${updateCount} existing accounts, and skip ${skipCount} customized accounts`;
```

### 5. Handle Parent-Child Relationships

Create parent records before children:

```typescript
export function getAccounts(params: Params): AccountRecord[] {
  return [
    { code: "1000", name: "Assets", parentCode: null }, // Parent first
    { code: "1100", name: "Current Assets", parentCode: "1000" }, // Child second
  ];
}
```

### 6. Version Your Templates

Increment version when making significant changes:

```typescript
version: "1.1.0"; // Was 1.0.0
```

### 7. Document Template Purpose

Provide clear descriptions:

```typescript
description: "Standard US GAAP chart of accounts with 50+ accounts covering common business needs for small to medium-sized businesses";
```

## Examples

See these reference implementations:

- **Chart of Accounts**: [services/api/src/modules/accounting/templates/coa-us-gaap.definition.ts](../../services/api/src/modules/accounting/templates/coa-us-gaap.definition.ts)
- **Tax Rates**: [services/api/src/modules/tax/templates/sales-tax-ca.definition.ts](../../services/api/src/modules/tax/templates/sales-tax-ca.definition.ts)

## Testing Templates

### Test Plan Generation

```typescript
describe("MyTemplate", () => {
  it("should plan correctly for new tenant", async () => {
    const plan = await executor.plan(tenantId, { param1: "value" });

    expect(plan.actions).toHaveLength(expectedCount);
    expect(plan.actions.filter((a) => a.type === "create")).toHaveLength(createCount);
  });
});
```

### Test Apply

```typescript
it("should apply template successfully", async () => {
  const result = await executor.apply(tenantId, { param1: "value" });

  expect(result.summary.created).toBe(expectedCount);

  // Verify records were created
  const records = await prisma.myTable.findMany({ where: { tenantId } });
  expect(records).toHaveLength(expectedCount);
});
```

### Test Idempotency

```typescript
it("should be idempotent", async () => {
  // Apply once
  await executor.apply(tenantId, params);

  // Apply again
  const result = await executor.apply(tenantId, params);

  // Should update existing records, not create duplicates
  expect(result.summary.created).toBe(0);
  expect(result.summary.updated).toBeGreaterThan(0);
});
```

## Troubleshooting

### Template Not Showing in Catalog

1. Ensure template is registered in `TemplateRegistry.loadTemplates()`
2. Run `pnpm catalog:sync`
3. Check for errors in sync output

### Records Being Skipped

Check if records are marked as customized:

```sql
SELECT * FROM "SeededRecordMeta"
WHERE tenant_id = 'your-tenant-id'
  AND is_customized = true;
```

### Plan vs Apply Mismatch

Ensure plan and apply use the exact same logic. Consider extracting shared logic to avoid drift.

## Related Documentation

- [Apps + Templates + Packs Overview](./apps-templates-packs.md)
- [Pack Authoring Guide](./pack-authoring.md)
- [API Reference](./api-reference.md)
