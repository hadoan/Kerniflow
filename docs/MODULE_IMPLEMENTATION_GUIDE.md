# Module Implementation Guide

This guide walks you through implementing a complete feature module in Corely, from frontend to backend.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Step 1: Define API Contracts](#step-1-define-api-contracts)
3. [Step 2: Backend Implementation](#step-2-backend-implementation)
4. [Step 3: Frontend API Client](#step-3-frontend-api-client)
5. [Step 4: Frontend UI Implementation](#step-4-frontend-ui-implementation)
6. [Complete Flow Example](#complete-flow-example)
7. [Best Practices](#best-practices)

---

## Architecture Overview

Corely follows a clean architecture pattern with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (React)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   UI Layer   │→ │  Form Schema │→ │  API Client  │      │
│  │ (Components) │  │  (UI format) │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────────────────┬────────────────────────────┘
                                 │ HTTP (JSON)
                                 ↓ Bearer Token + Idempotency
┌────────────────────────────────┴────────────────────────────┐
│                    Shared Contracts Package                  │
│              (API Schemas - Wire Format)                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  CreateXInput, XDto, XStatus (ISO strings for dates) │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────────────┬────────────────────────────┘
                                 │
                                 ↓ Validates
┌────────────────────────────────┴────────────────────────────┐
│                      Backend (NestJS)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Controller  │→ │   Use Case   │→ │  Repository  │      │
│  │  (HTTP/REST) │  │  (Business)  │  │   (Prisma)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

**Key Principles:**

- **Shared Contracts**: Single source of truth for API validation
- **Clean Architecture**: Business logic isolated in use cases
- **Type Safety**: End-to-end TypeScript type checking
- **Idempotency**: Safe retries with idempotency keys
- **Date Handling**: Date objects in UI, ISO strings over wire

---

## Step 1: Define API Contracts

All API schemas live in `packages/contracts/src/{module}/`.

### 1.1 Create Module Directory

```bash
mkdir -p packages/contracts/src/{module}
```

### 1.2 Define DTOs and Types

**File: `packages/contracts/src/{module}/{module}.types.ts`**

```typescript
import { z } from "zod";

// Enum types
export const XStatusSchema = z.enum(["DRAFT", "ACTIVE", "COMPLETED", "CANCELED"]);
export type XStatus = z.infer<typeof XStatusSchema>;

// Line items (if applicable)
export const XLineItemSchema = z.object({
  id: z.string(),
  description: z.string(),
  qty: z.number().positive(),
  unitPriceCents: z.number().int().nonnegative(),
});
export type XLineItemDto = z.infer<typeof XLineItemSchema>;

// Main DTO
export const XDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  customerId: z.string(),
  status: XStatusSchema,

  // Dates as ISO strings (wire format)
  createdAt: z.string(),
  updatedAt: z.string(),

  // Related data
  lineItems: z.array(XLineItemSchema),

  // Optional fields
  notes: z.string().optional().nullable(),
});
export type XDto = z.infer<typeof XDtoSchema>;
```

### 1.3 Define Operation Schemas

**File: `packages/contracts/src/{module}/create-{module}.schema.ts`**

```typescript
import { z } from "zod";
import { XDtoSchema } from "./{module}.types";

// Input line items (no id yet)
export const XLineInputSchema = z.object({
  description: z.string().min(1),
  qty: z.number().positive(),
  unitPriceCents: z.number().int().nonnegative(),
});

// Create input (what frontend sends)
export const CreateXInputSchema = z.object({
  customerId: z.string().min(1),
  currency: z.string().default("EUR"),
  notes: z.string().optional(),
  lineItems: z.array(XLineInputSchema).min(1),

  // Optional idempotency key (added by API client)
  idempotencyKey: z.string().optional(),
});

// Create output (what backend returns)
export const CreateXOutputSchema = z.object({
  x: XDtoSchema,
});

export type CreateXInput = z.infer<typeof CreateXInputSchema>;
export type CreateXOutput = z.infer<typeof CreateXOutputSchema>;
```

**Similar files:**

- `update-{module}.schema.ts`
- `get-{module}.schema.ts`
- `list-{module}.schema.ts`
- `{action}-{module}.schema.ts` (e.g., `finalize-invoice.schema.ts`)

### 1.4 Create Index File

**File: `packages/contracts/src/{module}/index.ts`**

```typescript
export * from "./{module}.types";
export * from "./create-{module}.schema";
export * from "./update-{module}.schema";
export * from "./get-{module}.schema";
export * from "./list-{module}.schema";
```

### 1.5 Export from Main Index

**File: `packages/contracts/src/index.ts`**

```typescript
export * from "./{module}";
```

### 1.6 Build Contracts

```bash
cd packages/contracts
pnpm build
```

---

## Step 2: Backend Implementation

Backend follows clean architecture: Controller → Use Case → Repository.

### 2.1 Create Module Structure

```bash
cd apps/api
mkdir -p src/modules/{module}/{domain,infrastructure,application}
```

### 2.2 Domain Layer (Business Logic)

**File: `src/modules/{module}/domain/{module}.entity.ts`**

```typescript
export interface XEntity {
  id: string;
  tenantId: string;
  customerId: string;
  status: XStatus;
  lineItems: XLineItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface XLineItem {
  id: string;
  description: string;
  qty: number;
  unitPriceCents: number;
}

export type XStatus = "DRAFT" | "ACTIVE" | "COMPLETED" | "CANCELED";

// Domain methods
export class X {
  static create(props: CreateXProps): XEntity {
    // Validation and business rules
    return {
      id: crypto.randomUUID(),
      status: "DRAFT",
      ...props,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  static calculateTotal(lineItems: XLineItem[]): number {
    return lineItems.reduce((sum, item) => sum + item.qty * item.unitPriceCents, 0);
  }

  static canTransitionTo(current: XStatus, next: XStatus): boolean {
    // State machine logic
    const validTransitions: Record<XStatus, XStatus[]> = {
      DRAFT: ["ACTIVE", "CANCELED"],
      ACTIVE: ["COMPLETED", "CANCELED"],
      COMPLETED: [],
      CANCELED: [],
    };
    return validTransitions[current].includes(next);
  }
}
```

**File: `src/modules/{module}/domain/{module}-repo.port.ts`**

```typescript
export interface XRepoPort {
  create(x: XEntity): Promise<XEntity>;
  findById(id: string, tenantId: string): Promise<XEntity | null>;
  findAll(tenantId: string, filters?: XFilters): Promise<XEntity[]>;
  update(id: string, tenantId: string, updates: Partial<XEntity>): Promise<XEntity>;
  delete(id: string, tenantId: string): Promise<void>;
}

export interface XFilters {
  status?: XStatus;
  customerId?: string;
}
```

### 2.3 Application Layer (Use Cases)

**File: `src/modules/{module}/application/create-{module}.use-case.ts`**

```typescript
import { Injectable } from "@nestjs/common";
import type { CreateXInput } from "@corely/contracts";
import { XRepoPort } from "../domain/{module}-repo.port";
import { X, XEntity } from "../domain/{module}.entity";

export interface UseCaseContext {
  tenantId: string;
  userId: string;
  correlationId?: string;
}

@Injectable()
export class CreateXUseCase {
  constructor(private readonly repo: XRepoPort) {}

  async execute(input: CreateXInput, ctx: UseCaseContext): Promise<XEntity> {
    // 1. Validate business rules
    if (input.lineItems.length === 0) {
      throw new Error("At least one line item required");
    }

    // 2. Create domain entity
    const x = X.create({
      tenantId: ctx.tenantId,
      customerId: input.customerId,
      lineItems: input.lineItems.map((item) => ({
        id: crypto.randomUUID(),
        ...item,
      })),
    });

    // 3. Persist
    const created = await this.repo.create(x);

    // 4. (Optional) Emit domain event
    // await this.eventBus.publish(new XCreatedEvent(created));

    return created;
  }
}
```

### 2.4 Infrastructure Layer (Repository)

**File: `src/modules/{module}/infrastructure/prisma-{module}-repo.adapter.ts`**

```typescript
import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/shared/infrastructure/prisma.service";
import { XRepoPort, XFilters } from "../domain/{module}-repo.port";
import { XEntity } from "../domain/{module}.entity";

@Injectable()
export class PrismaXRepoAdapter implements XRepoPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(x: XEntity): Promise<XEntity> {
    const created = await this.prisma.x.create({
      data: {
        id: x.id,
        tenantId: x.tenantId,
        customerId: x.customerId,
        status: x.status,
        lineItems: {
          create: x.lineItems.map((item) => ({
            id: item.id,
            description: item.description,
            qty: item.qty,
            unitPriceCents: item.unitPriceCents,
          })),
        },
      },
      include: {
        lineItems: true,
      },
    });

    return this.toDomain(created);
  }

  async findById(id: string, tenantId: string): Promise<XEntity | null> {
    const found = await this.prisma.x.findUnique({
      where: { id, tenantId }, // Tenant scoping!
      include: { lineItems: true },
    });

    return found ? this.toDomain(found) : null;
  }

  async findAll(tenantId: string, filters?: XFilters): Promise<XEntity[]> {
    const records = await this.prisma.x.findMany({
      where: {
        tenantId, // Tenant scoping!
        status: filters?.status,
        customerId: filters?.customerId,
      },
      include: { lineItems: true },
      orderBy: { createdAt: "desc" },
    });

    return records.map((r) => this.toDomain(r));
  }

  async update(id: string, tenantId: string, updates: Partial<XEntity>): Promise<XEntity> {
    const updated = await this.prisma.x.update({
      where: { id, tenantId },
      data: {
        status: updates.status,
        updatedAt: new Date(),
      },
      include: { lineItems: true },
    });

    return this.toDomain(updated);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await this.prisma.x.delete({
      where: { id, tenantId },
    });
  }

  // Prisma model → Domain entity
  private toDomain(prismaModel: any): XEntity {
    return {
      id: prismaModel.id,
      tenantId: prismaModel.tenantId,
      customerId: prismaModel.customerId,
      status: prismaModel.status,
      lineItems: prismaModel.lineItems || [],
      createdAt: prismaModel.createdAt,
      updatedAt: prismaModel.updatedAt,
    };
  }
}
```

### 2.5 Controller Layer

**File: `src/modules/{module}/{module}.controller.ts`**

```typescript
import { Controller, Post, Get, Patch, Delete, Body, Param, UseGuards, Req } from "@nestjs/common";
import { CreateXInputSchema, CreateXOutput, XDto } from "@corely/contracts";
import { JwtAuthGuard } from "@/shared/guards/jwt-auth.guard";
import { CreateXUseCase } from "./application/create-{module}.use-case";

@Controller("x")
@UseGuards(JwtAuthGuard)
export class XController {
  constructor(private readonly createXUseCase: CreateXUseCase) {}

  @Post()
  async create(@Body() body: unknown, @Req() req: any): Promise<CreateXOutput> {
    // 1. Validate using shared contract schema
    const input = CreateXInputSchema.parse(body);

    // 2. Build use case context
    const ctx = {
      tenantId: req.user.tenantId,
      userId: req.user.userId,
      correlationId: req.headers["x-correlation-id"],
    };

    // 3. Execute use case
    const x = await this.createXUseCase.execute(input, ctx);

    // 4. Map to DTO
    return {
      x: this.toDto(x),
    };
  }

  @Get(":id")
  async getById(@Param("id") id: string, @Req() req: any): Promise<{ x: XDto }> {
    // Implementation
  }

  @Get()
  async list(@Req() req: any): Promise<{ xs: XDto[] }> {
    // Implementation
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: any
  ): Promise<{ x: XDto }> {
    // Implementation
  }

  @Delete(":id")
  async delete(@Param("id") id: string, @Req() req: any): Promise<void> {
    // Implementation
  }

  // Entity → DTO
  private toDto(entity: XEntity): XDto {
    return {
      id: entity.id,
      tenantId: entity.tenantId,
      customerId: entity.customerId,
      status: entity.status,
      lineItems: entity.lineItems,
      createdAt: entity.createdAt.toISOString(), // Date → ISO string
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
```

### 2.6 Module Definition

**File: `src/modules/{module}/{module}.module.ts`**

```typescript
import { Module } from "@nestjs/common";
import { XController } from "./{module}.controller";
import { CreateXUseCase } from "./application/create-{module}.use-case";
import { PrismaXRepoAdapter } from "./infrastructure/prisma-{module}-repo.adapter";
import { XRepoPort } from "./domain/{module}-repo.port";

@Module({
  controllers: [XController],
  providers: [
    CreateXUseCase,
    {
      provide: XRepoPort,
      useClass: PrismaXRepoAdapter,
    },
  ],
  exports: [CreateXUseCase],
})
export class XModule {}
```

---

## Step 3: Frontend API Client

### 3.1 Create API Client

**File: `apps/web/src/lib/{module}-api.ts`**

```typescript
import type { CreateXInput, CreateXOutput, XDto } from "@corely/contracts";
import { apiClient } from "./api-client";

export class XApi {
  /**
   * Create a new X
   */
  async createX(input: CreateXInput, idempotencyKey?: string): Promise<XDto> {
    const result = await apiClient.post<CreateXOutput>("/x", input, {
      idempotencyKey: idempotencyKey || apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.x;
  }

  /**
   * Get all Xs
   */
  async listXs(): Promise<XDto[]> {
    const result = await apiClient.get<{ xs: XDto[] }>("/x", {
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.xs;
  }

  /**
   * Get X by ID
   */
  async getX(id: string): Promise<XDto> {
    const result = await apiClient.get<{ x: XDto }>(`/x/${id}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.x;
  }

  /**
   * Update X
   */
  async updateX(id: string, input: Partial<CreateXInput>): Promise<XDto> {
    const result = await apiClient.patch<{ x: XDto }>(`/x/${id}`, input, {
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.x;
  }

  /**
   * Delete X
   */
  async deleteX(id: string): Promise<void> {
    await apiClient.delete<void>(`/x/${id}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }
}

export const xApi = new XApi();
```

---

## Step 4: Frontend UI Implementation

### 4.1 Create Form Schema (UI Format)

**File: `apps/web/src/modules/{module}/schemas/{module}-form.schema.ts`**

```typescript
import { z } from "zod";
import type { CreateXInput } from "@corely/contracts";
import { CreateXInputSchema, XLineInputSchema } from "@corely/contracts";

/**
 * Form schema for line items (extends contract with UI fields)
 */
export const xLineFormSchema = XLineInputSchema.extend({
  unit: z.string().default("h"), // UI-only field for display
});

/**
 * Form schema for X creation
 * Extends contract schema with Date objects for better UX
 */
export const xFormSchema = CreateXInputSchema.extend({
  // Add UI-specific date fields (Date objects for form)
  startDate: z.date(),
  endDate: z.date().optional(),
  dueDate: z.date().optional(),

  // Add UI-specific fields
  vatRate: z.number().min(0).max(100).default(19),

  // Override lineItems to use form schema
  lineItems: z.array(xLineFormSchema).min(1, "At least one line item is required"),
}).omit({
  idempotencyKey: true, // This will be added by the API client
});

export type XFormData = z.infer<typeof xFormSchema>;
export type XLineFormData = z.infer<typeof xLineFormSchema>;

/**
 * Transform form data to API request format
 * Converts Date objects to ISO strings
 */
export function toCreateXInput(form: XFormData): CreateXInput {
  return {
    customerId: form.customerId,
    currency: form.currency,
    notes: form.notes,
    lineItems: form.lineItems.map((item) => ({
      description: item.description,
      qty: item.qty,
      unitPriceCents: item.unitPriceCents,
    })),
  };
}

/**
 * Default values for new X form
 */
export function getDefaultXFormValues(): Partial<XFormData> {
  return {
    startDate: new Date(),
    currency: "EUR",
    vatRate: 19,
    lineItems: [
      {
        description: "",
        qty: 1,
        unit: "h",
        unitPriceCents: 0,
      },
    ],
  };
}
```

### 4.2 Create Module Directory

```bash
mkdir -p apps/web/src/modules/{module}/{screens,components,schemas}
```

### 4.3 Create List Page

**File: `apps/web/src/modules/{module}/screens/XListPage.tsx`**

```typescript
import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { xApi } from "@/lib/{module}-api";

export default function XListPage() {
  const navigate = useNavigate();

  const { data: xs = [], isLoading } = useQuery({
    queryKey: ["{module}s"],
    queryFn: () => xApi.listXs(),
  });

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-h1 text-foreground">Xs</h1>
        <Button variant="accent" onClick={() => navigate("/{module}s/new")}>
          <Plus className="h-4 w-4" />
          Create X
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : xs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No Xs yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      ID
                    </th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      Customer
                    </th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      Status
                    </th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {xs.map((x) => (
                    <tr
                      key={x.id}
                      className="border-b border-border hover:bg-muted/30 cursor-pointer"
                      onClick={() => navigate(`/{module}s/${x.id}`)}
                    >
                      <td className="px-4 py-3 text-sm font-medium">{x.id}</td>
                      <td className="px-4 py-3 text-sm">{x.customerId}</td>
                      <td className="px-4 py-3 text-sm">{x.status}</td>
                      <td className="px-4 py-3 text-sm">
                        {new Date(x.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

### 4.4 Create Form Page

**File: `apps/web/src/modules/{module}/screens/NewXPage.tsx`**

```typescript
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { toast } from "sonner";
import { xApi } from "@/lib/{module}-api";
import {
  xFormSchema,
  toCreateXInput,
  getDefaultXFormValues,
  type XFormData,
} from "../schemas/{module}-form.schema";

export default function NewXPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const form = useForm<XFormData>({
    resolver: zodResolver(xFormSchema),
    defaultValues: getDefaultXFormValues(),
  });

  const createMutation = useMutation({
    mutationFn: async (data: XFormData) => {
      const input = toCreateXInput(data);
      return xApi.createX(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["{module}s"] });
      toast.success("X created successfully!");
      navigate("/{module}s");
    },
    onError: (error) => {
      console.error("Error creating X:", error);
      toast.error("Failed to create X. Please try again.");
    },
  });

  const onSubmit = (data: XFormData) => {
    createMutation.mutate(data);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/{module}s")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-h1 text-foreground">Create New X</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/{module}s")}>
            Cancel
          </Button>
          <Button
            variant="accent"
            onClick={form.handleSubmit(onSubmit)}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Creating..." : "Create X"}
          </Button>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardContent className="p-8 space-y-6">
            {/* Form fields */}
            <div>
              <Label htmlFor="customerId">Customer ID</Label>
              <Input
                id="customerId"
                {...form.register("customerId")}
                placeholder="Enter customer ID"
              />
              {form.formState.errors.customerId && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.customerId.message}
                </p>
              )}
            </div>

            {/* Add more fields as needed */}
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
```

### 4.5 Add Routes

**File: `apps/web/src/app/router/index.tsx`**

```typescript
import { XListPage, NewXPage } from "../../modules/{module}";

// Inside <Route element={<AppShell />}>
<Route path="/{module}s" element={<XListPage />} />
<Route path="/{module}s/new" element={<NewXPage />} />
<Route path="/{module}s/:id" element={<XDetailPage />} />
```

### 4.6 Export Module

**File: `apps/web/src/modules/{module}/index.ts`**

```typescript
export { default as XListPage } from "./screens/XListPage";
export { default as NewXPage } from "./screens/NewXPage";
export { default as XDetailPage } from "./screens/XDetailPage";
```

---

## Complete Flow Example

Let's trace a complete request from UI to database:

### 1. User Submits Form

```typescript
// NewXPage.tsx
const onSubmit = (data: XFormData) => {
  createMutation.mutate(data); // Date objects
};
```

### 2. Transform to API Format

```typescript
// {module}-form.schema.ts
export function toCreateXInput(form: XFormData): CreateXInput {
  return {
    customerId: form.customerId,
    currency: form.currency,
    lineItems: form.lineItems.map((item) => ({
      description: item.description,
      qty: item.qty,
      unitPriceCents: item.unitPriceCents,
    })),
  };
}
```

### 3. API Client Sends Request

```typescript
// {module}-api.ts
async createX(input: CreateXInput): Promise<XDto> {
  const result = await apiClient.post<CreateXOutput>(
    "/x",
    input, // JSON with ISO strings
    {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    }
  );
  return result.x;
}
```

**HTTP Request:**

```http
POST /x HTTP/1.1
Authorization: Bearer eyJhbGc...
X-Idempotency-Key: 1234567890-abc123
X-Correlation-Id: 1234567890-def456
Content-Type: application/json

{
  "customerId": "cust-123",
  "currency": "EUR",
  "lineItems": [...]
}
```

### 4. Backend Controller Receives

```typescript
// {module}.controller.ts
@Post()
async create(@Body() body: unknown, @Req() req: any): Promise<CreateXOutput> {
  // Validate using shared contract
  const input = CreateXInputSchema.parse(body); ✅

  const ctx = {
    tenantId: req.user.tenantId,
    userId: req.user.userId,
    correlationId: req.headers["x-correlation-id"],
  };

  const x = await this.createXUseCase.execute(input, ctx);

  return { x: this.toDto(x) };
}
```

### 5. Use Case Executes Business Logic

```typescript
// create-{module}.use-case.ts
async execute(input: CreateXInput, ctx: UseCaseContext): Promise<XEntity> {
  // Business rules
  const x = X.create({
    tenantId: ctx.tenantId,
    customerId: input.customerId,
    lineItems: input.lineItems,
  });

  // Persist
  return await this.repo.create(x);
}
```

### 6. Repository Saves to Database

```typescript
// prisma-{module}-repo.adapter.ts
async create(x: XEntity): Promise<XEntity> {
  const created = await this.prisma.x.create({
    data: {
      id: x.id,
      tenantId: x.tenantId, // Tenant scoping!
      customerId: x.customerId,
      lineItems: {
        create: x.lineItems,
      },
    },
    include: { lineItems: true },
  });

  return this.toDomain(created);
}
```

### 7. Response Flows Back

```typescript
// Controller → API Client → React Query → UI
{
  "x": {
    "id": "x-123",
    "tenantId": "tenant-1",
    "customerId": "cust-123",
    "status": "DRAFT",
    "lineItems": [...],
    "createdAt": "2025-01-15T10:30:00Z", // ISO string
    "updatedAt": "2025-01-15T10:30:00Z"
  }
}
```

---

## Best Practices

### Schema Design

✅ **DO:**

- Define schemas in `packages/contracts` (single source of truth)
- Use ISO strings for dates in contracts (wire format)
- Use `z.string().datetime()` for date validation
- Export both schema and inferred type

❌ **DON'T:**

- Duplicate validation in frontend and backend
- Use Date objects in API contracts
- Put UI-specific fields in contracts

### Date Handling

✅ **DO:**

```typescript
// Contract (API)
createdAt: z.string().datetime();

// Form (UI)
startDate: z.date();

// Transform
createdAt: form.startDate.toISOString();
```

❌ **DON'T:**

```typescript
// Contract
createdAt: z.date(); // ❌ Won't serialize to JSON

// Form
startDate: z.string(); // ❌ Poor UX, need manual parsing
```

### Security

✅ **DO:**

- Always validate tenant scoping in repositories
- Use `@UseGuards(JwtAuthGuard)` on controllers
- Add idempotency keys for create/update operations
- Validate all inputs with Zod schemas

❌ **DON'T:**

- Trust client-provided tenant IDs
- Skip authentication on any endpoint
- Allow cross-tenant data access

### Error Handling

✅ **DO:**

```typescript
// Use case
if (!customer) {
  throw new NotFoundException("Customer not found");
}

// API client
try {
  await xApi.createX(input);
} catch (error) {
  if (error.status === 404) {
    toast.error("Customer not found");
  } else {
    toast.error("An error occurred");
  }
}
```

### Type Safety

✅ **DO:**

- Import types from contracts: `import type { XDto } from "@corely/contracts"`
- Use transform functions: `toCreateXInput(formData)`
- Let TypeScript catch mismatches

❌ **DON'T:**

- Use `any` types
- Skip transformation step
- Manually construct request objects

---

## Checklist

When implementing a new module, check:

### Contracts ✅

- [ ] DTOs defined in `packages/contracts/src/{module}/{module}.types.ts`
- [ ] Operation schemas in `packages/contracts/src/{module}/create-{module}.schema.ts`
- [ ] Exported from `packages/contracts/src/{module}/index.ts`
- [ ] Exported from `packages/contracts/src/index.ts`
- [ ] Built with `pnpm build`

### Backend ✅

- [ ] Domain entities in `src/modules/{module}/domain/{module}.entity.ts`
- [ ] Repository port in `src/modules/{module}/domain/{module}-repo.port.ts`
- [ ] Use cases in `src/modules/{module}/application/`
- [ ] Prisma adapter in `src/modules/{module}/infrastructure/`
- [ ] Controller in `src/modules/{module}/{module}.controller.ts`
- [ ] Module defined in `src/modules/{module}/{module}.module.ts`
- [ ] Module imported in `app.module.ts`
- [ ] Guards applied (`@UseGuards(JwtAuthGuard)`)
- [ ] Tenant scoping in all queries

### Frontend ✅

- [ ] API client in `apps/web/src/lib/{module}-api.ts`
- [ ] Form schema in `apps/web/src/modules/{module}/schemas/{module}-form.schema.ts`
- [ ] Transform function `toCreate{Module}Input()`
- [ ] List page component
- [ ] Form page component
- [ ] Routes added to router
- [ ] Module exported from `apps/web/src/modules/{module}/index.ts`

### Testing ✅

- [ ] Unit tests for use cases
- [ ] Integration tests for API endpoints
- [ ] E2E tests for critical flows

---

## References

- [Invoice Module Implementation](../apps/web/src/modules/invoices/) - Complete example
- [Contracts Package](../packages/contracts/) - Schema definitions
- [API Client Pattern](../apps/web/src/lib/api-client.ts) - HTTP client setup
- [Clean Architecture Docs](./ARCHITECTURE.md) - Overall system design

---

**Questions?** Check existing modules (invoices, expenses) for reference implementations.
