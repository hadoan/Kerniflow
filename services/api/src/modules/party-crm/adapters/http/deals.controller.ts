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
} from "@kerniflow/contracts";
import { PartyCrmApplication } from "../../application/party-crm.application";
import { buildUseCaseContext, mapResultToHttp } from "./http-mappers";
import { AuthGuard } from "../../../identity";

@Controller("crm/deals")
@UseGuards(AuthGuard)
export class DealsHttpController {
  constructor(private readonly app: PartyCrmApplication) {}

  @Post()
  async create(@Body() body: unknown, @Req() req: Request) {
    const input = CreateDealInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.createDeal.execute(input, ctx);
    return mapResultToHttp(result).deal;
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const input = UpdateDealInputSchema.parse({ dealId: id, ...body });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.updateDeal.execute(input, ctx);
    return mapResultToHttp(result).deal;
  }

  @Post(":id/move-stage")
  async moveStage(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const input = MoveDealStageInputSchema.parse({ dealId: id, ...body });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.moveDealStage.execute(input, ctx);
    return mapResultToHttp(result).deal;
  }

  @Post(":id/mark-won")
  async markWon(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const input = MarkDealWonInputSchema.parse({ dealId: id, ...body });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.markDealWon.execute(input, ctx);
    return mapResultToHttp(result).deal;
  }

  @Post(":id/mark-lost")
  async markLost(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const input = MarkDealLostInputSchema.parse({ dealId: id, ...body });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.markDealLost.execute(input, ctx);
    return mapResultToHttp(result).deal;
  }

  @Get(":id")
  async get(@Param("id") id: string, @Req() req: Request) {
    const input = GetDealInputSchema.parse({ dealId: id });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getDealById.execute(input, ctx);
    return mapResultToHttp(result).deal;
  }

  @Get()
  async list(@Query() query: any, @Req() req: Request) {
    const input = ListDealsInputSchema.parse({
      partyId: query.partyId,
      stageId: query.stageId,
      status: query.status,
      ownerUserId: query.ownerUserId,
      cursor: query.cursor,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.listDeals.execute(input, ctx);
    return mapResultToHttp(result);
  }
}
