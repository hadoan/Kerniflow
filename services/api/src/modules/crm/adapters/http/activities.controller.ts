import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import {
  CreateActivityInputSchema,
  UpdateActivityInputSchema,
  CompleteActivityInputSchema,
  ListActivitiesInputSchema,
  GetTimelineInputSchema,
} from "@corely/contracts";
import { CrmApplication } from "../../application/crm.application";
import { buildUseCaseContext, mapResultToHttp } from "../../../../shared/http/usecase-mappers";
import { AuthGuard } from "../../../identity";
import { RbacGuard, RequirePermission } from "../../../identity/adapters/http/rbac.guard";

@Controller("crm/activities")
@UseGuards(AuthGuard, RbacGuard)
export class ActivitiesHttpController {
  constructor(private readonly app: CrmApplication) {}

  @Post()
  @RequirePermission("crm.activities.manage")
  async create(@Body() body: unknown, @Req() req: Request) {
    const input = CreateActivityInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.createActivity.execute(input, ctx);
    return mapResultToHttp(result).activity;
  }

  @Patch(":id")
  @RequirePermission("crm.activities.manage")
  async update(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const input = UpdateActivityInputSchema.parse({
      activityId: id,
      ...(body as Record<string, unknown>),
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.updateActivity.execute(input, ctx);
    return mapResultToHttp(result).activity;
  }

  @Post(":id/complete")
  @RequirePermission("crm.activities.manage")
  async complete(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const input = CompleteActivityInputSchema.parse({
      activityId: id,
      ...(body as Record<string, unknown>),
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.completeActivity.execute(input, ctx);
    return mapResultToHttp(result).activity;
  }

  @Get()
  @RequirePermission("crm.activities.read")
  async list(@Query() query: any, @Req() req: Request) {
    const input = ListActivitiesInputSchema.parse({
      partyId: query.partyId,
      dealId: query.dealId,
      type: query.type,
      status: query.status,
      assignedToUserId: query.assignedToUserId,
      cursor: query.cursor,
      limit: query.pageSize ? Number(query.pageSize) : undefined,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.listActivities.execute(input, ctx);
    return mapResultToHttp(result);
  }
}

@Controller("crm/timeline")
@UseGuards(AuthGuard, RbacGuard)
export class TimelineHttpController {
  constructor(private readonly app: CrmApplication) {}

  @Get(":entityType/:entityId")
  @RequirePermission("crm.activities.read")
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
      limit: query.pageSize ? Number(query.pageSize) : undefined,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getTimeline.execute(input, ctx);
    return mapResultToHttp(result);
  }
}
