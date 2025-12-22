import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseInterceptors,
} from "@nestjs/common";
import type { Request } from "express";
import {
  GetTaxProfileOutputSchema,
  UpsertTaxProfileInputSchema,
  ListTaxCodesOutputSchema,
  CreateTaxCodeInputSchema,
  UpdateTaxCodeInputSchema,
  CreateTaxRateInputSchema,
  CalculateTaxInputSchema,
  LockTaxSnapshotInputSchema,
  type GetTaxProfileOutput,
  type UpsertTaxProfileOutput,
  type ListTaxCodesOutput,
  type CreateTaxCodeOutput,
  type UpdateTaxCodeOutput,
  type CreateTaxRateOutput,
  type CalculateTaxOutput,
  type LockTaxSnapshotOutput,
  type ListTaxRatesOutput,
  type TaxProfileDto,
  type TaxCodeDto,
  type TaxRateDto,
} from "@kerniflow/contracts";
import { IdempotencyInterceptor } from "../../shared/idempotency/IdempotencyInterceptor";
import { GetTaxProfileUseCase } from "./application/use-cases/get-tax-profile.use-case";
import { UpsertTaxProfileUseCase } from "./application/use-cases/upsert-tax-profile.use-case";
import { ListTaxCodesUseCase } from "./application/use-cases/list-tax-codes.use-case";
import { CreateTaxCodeUseCase } from "./application/use-cases/create-tax-code.use-case";
import { CalculateTaxUseCase } from "./application/use-cases/calculate-tax.use-case";
import { LockTaxSnapshotUseCase } from "./application/use-cases/lock-tax-snapshot.use-case";
import type { UseCaseContext } from "./application/use-cases/use-case-context";

@Controller("tax")
@UseInterceptors(IdempotencyInterceptor)
export class TaxController {
  constructor(
    private readonly getTaxProfileUseCase: GetTaxProfileUseCase,
    private readonly upsertTaxProfileUseCase: UpsertTaxProfileUseCase,
    private readonly listTaxCodesUseCase: ListTaxCodesUseCase,
    private readonly createTaxCodeUseCase: CreateTaxCodeUseCase,
    private readonly calculateTaxUseCase: CalculateTaxUseCase,
    private readonly lockTaxSnapshotUseCase: LockTaxSnapshotUseCase
  ) {}

  // ============================================================================
  // Tax Profile
  // ============================================================================

  @Get("profile")
  async getProfile(@Req() req: Request): Promise<GetTaxProfileOutput> {
    const ctx = this.buildContext(req);
    const profile = await this.getTaxProfileUseCase.execute(ctx);

    return {
      profile: profile ? this.profileToDto(profile) : null,
    };
  }

  @Put("profile")
  async upsertProfile(@Body() body: unknown, @Req() req: Request): Promise<UpsertTaxProfileOutput> {
    const input = UpsertTaxProfileInputSchema.parse(body);
    const ctx = this.buildContext(req);

    const profile = await this.upsertTaxProfileUseCase.execute(input, ctx);

    return {
      profile: this.profileToDto(profile),
    };
  }

  // ============================================================================
  // Tax Codes
  // ============================================================================

  @Get("codes")
  async listCodes(@Req() req: Request): Promise<ListTaxCodesOutput> {
    const ctx = this.buildContext(req);
    const codes = await this.listTaxCodesUseCase.execute(ctx);

    return {
      codes: codes.map((c) => this.codeToDto(c)),
    };
  }

  @Post("codes")
  async createCode(@Body() body: unknown, @Req() req: Request): Promise<CreateTaxCodeOutput> {
    const input = CreateTaxCodeInputSchema.parse(body);
    const ctx = this.buildContext(req);

    const code = await this.createTaxCodeUseCase.execute(input, ctx);

    return {
      code: this.codeToDto(code),
    };
  }

  // ============================================================================
  // Tax Calculation
  // ============================================================================

  @Post("calculate")
  async calculate(@Body() body: unknown, @Req() req: Request): Promise<CalculateTaxOutput> {
    const input = CalculateTaxInputSchema.parse(body);
    const ctx = this.buildContext(req);

    const breakdown = await this.calculateTaxUseCase.execute(input, ctx);

    return { breakdown };
  }

  // ============================================================================
  // Tax Snapshot
  // ============================================================================

  @Post("snapshots/lock")
  async lockSnapshot(@Body() body: unknown, @Req() req: Request): Promise<LockTaxSnapshotOutput> {
    const input = LockTaxSnapshotInputSchema.parse(body);
    const ctx = this.buildContext(req);

    const snapshot = await this.lockTaxSnapshotUseCase.execute(input, ctx);

    return { snapshot };
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private buildContext(req: Request): UseCaseContext {
    // Extract tenant/user from request (in real app, from JWT)
    // For now, use headers or defaults
    return {
      tenantId: (req.headers["x-tenant-id"] as string) || "default-tenant",
      userId: (req.headers["x-user-id"] as string) || "default-user",
      correlationId: req.headers["x-correlation-id"] as string | undefined,
      idempotencyKey: req.headers["x-idempotency-key"] as string | undefined,
    };
  }

  private profileToDto(entity: any): TaxProfileDto {
    return {
      id: entity.id,
      tenantId: entity.tenantId,
      country: entity.country,
      regime: entity.regime,
      vatId: entity.vatId,
      currency: entity.currency,
      filingFrequency: entity.filingFrequency,
      effectiveFrom: entity.effectiveFrom.toISOString(),
      effectiveTo: entity.effectiveTo?.toISOString() || null,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }

  private codeToDto(entity: any): TaxCodeDto {
    return {
      id: entity.id,
      tenantId: entity.tenantId,
      code: entity.code,
      kind: entity.kind,
      label: entity.label,
      isActive: entity.isActive,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
