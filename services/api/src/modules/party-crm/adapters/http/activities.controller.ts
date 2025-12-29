import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import {
  CreateActivityInputSchema,
  UpdateActivityInputSchema,
  CompleteActivityInputSchema,
  ListActivitiesInputSchema,
  GetTimelineInputSchema,
} from "@kerniflow/contracts";
import { PartyCrmApplication } from "../../application/party-crm.application";
import { buildUseCaseContext, mapResultToHttp } from "./http-mappers";
import { AuthGuard } from "../../../identity";

@Controller("crm/activities")
@UseGuards(AuthGuard)
export class ActivitiesHttpController {
  constructor(private readonly app: PartyCrmApplication) {}

  @Post()
  async create(@Body() body: unknown, @Req() req: Request) {
    const input = CreateActivityInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.createActivity.execute(input, ctx);
    return mapResultToHttp(result).activity;
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const input = UpdateActivityInputSchema.parse({ activityId: id, ...body });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.updateActivity.execute(input, ctx);
    return mapResultToHttp(result).activity;
  }

  @Post(":id/complete")
  async complete(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const input = CompleteActivityInputSchema.parse({ activityId: id, ...body });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.completeActivity.execute(input, ctx);
    return mapResultToHttp(result).activity;
  }

  @Get()
  async list(@Query() query: any, @Req() req: Request) {
    const input = ListActivitiesInputSchema.parse({
      partyId: query.partyId,
      dealId: query.dealId,
      type: query.type,
      status: query.status,
      assignedToUserId: query.assignedToUserId,
      cursor: query.cursor,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.listActivities.execute(input, ctx);
    return mapResultToHttp(result);
  }
}

@Controller("crm/timeline")
@UseGuards(AuthGuard)
export class TimelineHttpController {
  constructor(private readonly app: PartyCrmApplication) {}

  @Get(":entityType/:entityId")
  async getTimeline(
    @Param("entityType") entityType: string,
    @Param("entityId") entityId: string,
    @Query() query: any,
    @Req() req: Request
  ) {
    const input = GetTimelineInputSchema.parse({
      entityType,
      entityId,
      cursor: query.cursor,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getTimeline.execute(input, ctx);
    return mapResultToHttp(result);
  }
}
