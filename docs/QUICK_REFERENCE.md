# Quick Reference Guide

Quick commands and patterns for common development tasks.

## Table of Contents

1. [New Module Setup](#new-module-setup)
2. [Schema Patterns](#schema-patterns)
3. [Common Commands](#common-commands)
4. [File Templates](#file-templates)

---

## New Module Setup

### 1. Create Contracts (Wire Format)

```bash
# Create schema files
mkdir -p packages/contracts/src/{module}
cd packages/contracts/src/{module}

# Create files
touch {module}.types.ts
touch create-{module}.schema.ts
touch update-{module}.schema.ts
touch get-{module}.schema.ts
touch list-{module}.schema.ts
touch index.ts

# Build
cd ../../../
pnpm --filter @corely/contracts build
```

### 2. Create Backend Module

```bash
cd services/api
mkdir -p src/modules/{module}/{domain,application,infrastructure,adapters/http}
touch src/modules/{module}/index.ts

# Create files
touch src/modules/{module}/domain/{module}.entity.ts
touch src/modules/{module}/application/ports/{module}-repository.port.ts
touch src/modules/{module}/application/use-cases/create-{module}.usecase.ts
touch src/modules/{module}/infrastructure/adapters/prisma-{module}-repository.adapter.ts
touch src/modules/{module}/adapters/http/{module}.controller.ts
touch src/modules/{module}/{module}.module.ts
```

### 3. Create Frontend Module

```bash
cd apps/web
mkdir -p src/modules/{module}/{screens,components,schemas}
mkdir -p src/lib

# Create files
touch src/lib/{module}-api.ts
touch src/modules/{module}/schemas/{module}-form.schema.ts
touch src/modules/{module}/screens/{Module}ListPage.tsx
touch src/modules/{module}/screens/New{Module}Page.tsx
touch src/modules/{module}/index.ts
```

---

## Schema Patterns

### Contract Schema (Wire Format)

```typescript
// packages/contracts/src/{module}/create-{module}.schema.ts
import { z } from "zod";

export const Create{Module}InputSchema = z.object({
  name: z.string().min(1),
  idempotencyKey: z.string(),
  // Dates as ISO strings
  startDate: z.string().datetime().optional(),
  // IDs
  customerId: z.string(),
  // Arrays
  items: z.array(ItemSchema).min(1),
  // Optional
  notes: z.string().optional(),
});

export type Create{Module}Input = z.infer<typeof Create{Module}InputSchema>;
```

### Form Schema (UI Format)

```typescript
// apps/web/src/modules/{module}/schemas/{module}-form.schema.ts
import { Create{Module}InputSchema } from "@corely/contracts";

export const {module}FormSchema = Create{Module}InputSchema.extend({
  // Dates as Date objects
  startDate: z.date(),
  endDate: z.date().optional(),
  // UI-only fields
  vatRate: z.number().default(19),
}).omit({
  idempotencyKey: true,
});

export type {Module}FormData = z.infer<typeof {module}FormSchema>;

// Transform function
export function toCreate{Module}Input(form: {Module}FormData): Create{Module}Input {
  return {
    ...form,
    startDate: form.startDate?.toISOString(),
  };
}
```

---

## Common Commands

### Build & Type Check

```bash
# Build contracts package
pnpm --filter @corely/contracts build

# Type check frontend
pnpm --filter @corely/web typecheck

# Type check backend
pnpm --filter @corely/api typecheck

# Build all
pnpm build
```

### Development

```bash
# Start frontend dev server
pnpm dev:web

# Start backend dev server
pnpm dev:api

# Start worker
pnpm dev:worker

# Start both (from root)
pnpm dev
```

### Database

```bash
# Create migration
pnpm prisma:migrate --name add_{module}_table

# Apply migrations
pnpm --filter @corely/data exec prisma migrate deploy

# Generate client
pnpm prisma:generate

# View database
pnpm prisma:studio
```

### Testing

```bash
# Run tests
pnpm test

# Run specific test file
pnpm test {module}.spec.ts

# Watch mode
pnpm test:watch
```

### Architecture Checks

```bash
# Boundary + Prisma access check
pnpm arch:check
```

---

## File Templates

### Contract DTO

```typescript
// {module}.types.ts
import { z } from "zod";

export const {Module}StatusSchema = z.enum(["DRAFT", "ACTIVE", "COMPLETED"]);
export type {Module}Status = z.infer<typeof {Module}StatusSchema>;

export const {Module}DtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  status: {Module}StatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type {Module}Dto = z.infer<typeof {Module}DtoSchema>;
```

### Domain Entity

```typescript
// {module}.entity.ts
export interface {Module}Entity {
  id: string;
  tenantId: string;
  status: {Module}Status;
  createdAt: Date;
  updatedAt: Date;
}

export type {Module}Status = "DRAFT" | "ACTIVE" | "COMPLETED";

export class {Module} {
  static create(props: Create{Module}Props): {Module}Entity {
    return {
      id: crypto.randomUUID(),
      status: "DRAFT",
      ...props,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}
```

### Repository Port

```typescript
// {module}-repo.port.ts
export interface {Module}RepoPort {
  create(entity: {Module}Entity): Promise<{Module}Entity>;
  findById(id: string, tenantId: string): Promise<{Module}Entity | null>;
  findAll(tenantId: string): Promise<{Module}Entity[]>;
  update(id: string, tenantId: string, updates: Partial<{Module}Entity>): Promise<{Module}Entity>;
  delete(id: string, tenantId: string): Promise<void>;
}
```

### Use Case

```typescript
// create-{module}.use-case.ts
import { Injectable } from "@nestjs/common";
import type { Create{Module}Input } from "@corely/contracts";

export interface UseCaseContext {
  tenantId: string;
  userId: string;
}

@Injectable()
export class Create{Module}UseCase {
  constructor(private readonly repo: {Module}RepoPort) {}

  async execute(input: Create{Module}Input, ctx: UseCaseContext): Promise<{Module}Entity> {
    const entity = {Module}.create({
      ...input,
      tenantId: ctx.tenantId,
    });

    return await this.repo.create(entity);
  }
}
```

### Controller

```typescript
// {module}.controller.ts
import { Controller, Post, Body, UseGuards, Req } from "@nestjs/common";
import { Create{Module}InputSchema } from "@corely/contracts";
import { JwtAuthGuard } from "@/shared/guards/jwt-auth.guard";

@Controller("{module}s")
@UseGuards(JwtAuthGuard)
export class {Module}Controller {
  constructor(private readonly createUseCase: Create{Module}UseCase) {}

  @Post()
  async create(@Body() body: unknown, @Req() req: any) {
    const input = Create{Module}InputSchema.parse(body);

    const ctx = {
      tenantId: req.user.tenantId,
      userId: req.user.userId,
    };

    const entity = await this.createUseCase.execute(input, ctx);

    return { {module}: this.toDto(entity) };
  }

  private toDto(entity: {Module}Entity): {Module}Dto {
    return {
      ...entity,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
```

### API Client

```typescript
// {module}-api.ts
import type { Create{Module}Input, {Module}Dto } from "@corely/contracts";
import { apiClient } from "./api-client";

export class {Module}Api {
  async create{Module}(input: Create{Module}Input): Promise<{Module}Dto> {
    const result = await apiClient.post<{ {module}: {Module}Dto }>(
      "/{module}s",
      input,
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.{module};
  }

  async list{Module}s(): Promise<{Module}Dto[]> {
    const result = await apiClient.get<{ {module}s: {Module}Dto[] }>("/{module}s");
    return result.{module}s;
  }
}

export const {module}Api = new {Module}Api();
```

### React Component

```typescript
// New{Module}Page.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/shared/ui/button";
import { toast } from "sonner";
import { {module}Api } from "@/lib/{module}-api";
import {
  {module}FormSchema,
  toCreate{Module}Input,
  type {Module}FormData,
} from "../schemas/{module}-form.schema";

export default function New{Module}Page() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const form = useForm<{Module}FormData>({
    resolver: zodResolver({module}FormSchema),
    defaultValues: {},
  });

  const createMutation = useMutation({
    mutationFn: async (data: {Module}FormData) => {
      const input = toCreate{Module}Input(data);
      return {module}Api.create{Module}(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["{module}s"] });
      toast.success("{Module} created!");
      navigate("/{module}s");
    },
    onError: () => {
      toast.error("Failed to create {module}");
    },
  });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-h1">Create {Module}</h1>
      <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))}>
        {/* Form fields */}
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? "Creating..." : "Create {Module}"}
        </Button>
      </form>
    </div>
  );
}
```

---

## Data Flow Quick Reference

```
User Action (UI)
    ↓
React Form (Date objects)
    ↓
Form Schema Validation (Zod)
    ↓
Transform (toCreateXInput) - Date → ISO string
    ↓
API Client (fetch with Bearer token, idempotency key)
    ↓
HTTP/JSON Request
    ↓
NestJS Controller
    ↓
Contract Schema Validation (Zod)
    ↓
Use Case (Business Logic)
    ↓
Repository (Prisma with tenant scoping)
    ↓
Database
    ↓
Response (Entity → DTO, Date → ISO string)
    ↓
API Client
    ↓
React Query Cache
    ↓
UI Update
```

---

## Common Gotchas

### ❌ Don't put Date objects in contracts

```typescript
// WRONG
export const CreateXInputSchema = z.object({
  startDate: z.date(), // ❌ Won't serialize to JSON
});
```

### ✅ Use ISO strings instead

```typescript
// CORRECT
export const CreateXInputSchema = z.object({
  startDate: z.string().datetime(), // ✅ Serializes to JSON
});
```

### ❌ Don't skip tenant scoping

```typescript
// WRONG
await this.prisma.x.findMany(); // ❌ Leaks cross-tenant data
```

### ✅ Always scope by tenant

```typescript
// CORRECT
await this.prisma.x.findMany({
  where: { tenantId }, // ✅ Tenant scoping
});
```

### ❌ Don't duplicate validation

```typescript
// WRONG - validation in both places
// Frontend
const schema = z.object({ name: z.string().min(1) });

// Backend
const schema = z.object({ name: z.string().min(1) });
```

### ✅ Share validation via contracts

```typescript
// CORRECT - one schema in contracts
// packages/contracts/src/x/create-x.schema.ts
export const CreateXInputSchema = z.object({
  name: z.string().min(1),
});

// Frontend extends for UI needs
export const xFormSchema = CreateXInputSchema.extend({
  startDate: z.date(),
});

// Backend uses directly
const input = CreateXInputSchema.parse(body);
```

---

## Environment Variables

### Frontend (.env)

```bash
VITE_API_URL=http://localhost:3000
```

### Backend (.env)

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/db
JWT_SECRET=your-secret-key
PORT=3000
```

---

## Useful Snippets

### React Query Hook

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { {module}Api } from "@/lib/{module}-api";

// List query
const { data: {module}s = [] } = useQuery({
  queryKey: ["{module}s"],
  queryFn: () => {module}Api.list{Module}s(),
});

// Create mutation
const queryClient = useQueryClient();
const createMutation = useMutation({
  mutationFn: {module}Api.create{Module},
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["{module}s"] });
  },
});
```

### Prisma Query

```typescript
// With tenant scoping and relations
const entities = await this.prisma.{module}.findMany({
  where: {
    tenantId, // Always scope!
    status: "ACTIVE",
  },
  include: {
    lineItems: true,
    customer: true,
  },
  orderBy: {
    createdAt: "desc",
  },
});
```

---

## Related Docs

- [Full Module Implementation Guide](./MODULE_IMPLEMENTATION_GUIDE.md)
- [Architecture Overview](./ARCHITECTURE.md)
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md)
