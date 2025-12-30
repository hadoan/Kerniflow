import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import {
  CreateDealInputSchema,
  UpdateDealInputSchema,
  MoveDealStageInputSchema,
  MarkDealWonInputSchema,
  MarkDealLostInputSchema,
  ListDealsInputSchema,
  GetDealInputSchema,
} from "@corely/contracts";
import { CrmApplication } from "../../application/crm.application";
import { buildUseCaseContext, mapResultToHttp } from "../../../../shared/http/usecase-mappers";
import { AuthGuard } from "../../../identity";
import { RbacGuard, RequirePermission } from "../../../identity/adapters/http/rbac.guard";

@Controller("crm/deals")
@UseGuards(AuthGuard, RbacGuard)
export class DealsHttpController {
  constructor(private readonly app: CrmApplication) {}

  @Post()
  @RequirePermission("crm.deals.manage")
  async create(@Body() body: unknown, @Req() req: Request) {
    const input = CreateDealInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.createDeal.execute(input, ctx);
    return mapResultToHttp(result).deal;
  }

  @Patch(":id")
  @RequirePermission("crm.deals.manage")
  async update(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const input = UpdateDealInputSchema.parse({
      dealId: id,
      ...(body as Record<string, unknown>),
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.updateDeal.execute(input, ctx);
    return mapResultToHttp(result).deal;
  }

  @Post(":id/move-stage")
  @RequirePermission("crm.deals.manage")
  async moveStage(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const input = MoveDealStageInputSchema.parse({
      dealId: id,
      ...(body as Record<string, unknown>),
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.moveDealStage.execute(input, ctx);
    return mapResultToHttp(result).deal;
  }

  @Post(":id/mark-won")
  @RequirePermission("crm.deals.manage")
  async markWon(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const input = MarkDealWonInputSchema.parse({
      dealId: id,
      ...(body as Record<string, unknown>),
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.markDealWon.execute(input, ctx);
    return mapResultToHttp(result).deal;
  }

  @Post(":id/mark-lost")
  @RequirePermission("crm.deals.manage")
  async markLost(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const input = MarkDealLostInputSchema.parse({
      dealId: id,
      ...(body as Record<string, unknown>),
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.markDealLost.execute(input, ctx);
    return mapResultToHttp(result).deal;
  }

  @Get(":id")
  @RequirePermission("crm.deals.read")
  async get(@Param("id") id: string, @Req() req: Request) {
    const input = GetDealInputSchema.parse({ dealId: id });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getDealById.execute(input, ctx);
    return mapResultToHttp(result).deal;
  }

  @Get()
  @RequirePermission("crm.deals.read")
  async list(@Query() query: any, @Req() req: Request) {
    const input = ListDealsInputSchema.parse({
      partyId: query.partyId,
      stageId: query.stageId,
      status: query.status,
      ownerUserId: query.ownerUserId,
      cursor: query.cursor,
      limit: query.pageSize ? Number(query.pageSize) : undefined,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.listDeals.execute(input, ctx);
    return mapResultToHttp(result);
  }
}
