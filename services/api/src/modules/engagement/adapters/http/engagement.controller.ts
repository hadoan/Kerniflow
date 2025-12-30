import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { isErr } from "@corely/kernel";
import {
  CancelCheckInEventInputSchema,
  CompleteCheckInEventInputSchema,
  CreateCheckInEventInputSchema,
  CreateLoyaltyAdjustEntryInputSchema,
  CreateLoyaltyEarnEntryInputSchema,
  GetEngagementSettingsInputSchema,
  GetLoyaltySummaryInputSchema,
  ListCheckInEventsInputSchema,
  ListLoyaltyLedgerInputSchema,
  UpdateEngagementSettingsInputSchema,
} from "@corely/contracts";
import { AuthGuard } from "../../../identity";
import { EngagementApplication } from "../../application/engagement.application";
import { toHttpException } from "../../../../shared/http/usecase-error.mapper";

type RequestWithUser = Request & { user?: { workspaceId?: string; userId?: string } };

@ApiTags("Engagement")
@ApiBearerAuth()
@Controller("engagement")
@UseGuards(AuthGuard)
export class EngagementController {
  constructor(private readonly app: EngagementApplication) {}

  private buildCtx(req: RequestWithUser) {
    return {
      tenantId: req.user?.workspaceId,
      userId: req.user?.userId,
      requestId: (req.headers["x-request-id"] as string | undefined) ?? undefined,
      correlationId: (req.headers["x-correlation-id"] as string | undefined) ?? undefined,
    };
  }

  @Post("checkins")
  async createCheckIn(@Body() body: unknown, @Req() req: RequestWithUser) {
    const input = CreateCheckInEventInputSchema.parse(body);
    const result = await this.app.createCheckIn.execute(input, this.buildCtx(req));
    if (isErr(result)) {
      throw toHttpException(result.error);
    }
    return result.value;
  }

  @Get("checkins")
  async listCheckIns(@Query() query: any, @Req() req: RequestWithUser) {
    const input = ListCheckInEventsInputSchema.parse({
      customerPartyId: query.customerPartyId,
      registerId: query.registerId,
      status: query.status,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      cursor: query.cursor,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    });
    const result = await this.app.listCheckIns.execute(input, this.buildCtx(req));
    if (isErr(result)) {
      throw toHttpException(result.error);
    }
    return result.value;
  }

  @Post("checkins/:id/complete")
  async completeCheckIn(@Param("id") id: string, @Req() req: RequestWithUser) {
    const input = CompleteCheckInEventInputSchema.parse({ checkInEventId: id });
    const result = await this.app.completeCheckIn.execute(input, this.buildCtx(req));
    if (isErr(result)) {
      throw toHttpException(result.error);
    }
    return result.value;
  }

  @Post("checkins/:id/cancel")
  async cancelCheckIn(@Param("id") id: string, @Body() body: any, @Req() req: RequestWithUser) {
    const input = CancelCheckInEventInputSchema.parse({
      checkInEventId: id,
      reason: body?.reason,
    });
    const result = await this.app.cancelCheckIn.execute(input, this.buildCtx(req));
    if (isErr(result)) {
      throw toHttpException(result.error);
    }
    return result.value;
  }

  @Get("loyalty/:customerPartyId")
  async getLoyalty(@Param("customerPartyId") customerPartyId: string, @Req() req: RequestWithUser) {
    const input = GetLoyaltySummaryInputSchema.parse({ customerPartyId });
    const result = await this.app.getLoyaltySummary.execute(input, this.buildCtx(req));
    if (isErr(result)) {
      throw toHttpException(result.error);
    }
    return result.value;
  }

  @Get("loyalty/:customerPartyId/ledger")
  async listLoyaltyLedger(
    @Param("customerPartyId") customerPartyId: string,
    @Query() query: any,
    @Req() req: RequestWithUser
  ) {
    const input = ListLoyaltyLedgerInputSchema.parse({
      customerPartyId,
      cursor: query.cursor,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    });
    const result = await this.app.listLoyaltyLedger.execute(input, this.buildCtx(req));
    if (isErr(result)) {
      throw toHttpException(result.error);
    }
    return result.value;
  }

  @Post("loyalty/earn")
  async createLoyaltyEarn(@Body() body: unknown, @Req() req: RequestWithUser) {
    const input = CreateLoyaltyEarnEntryInputSchema.parse(body);
    const result = await this.app.createLoyaltyEarn.execute(input, this.buildCtx(req));
    if (isErr(result)) {
      throw toHttpException(result.error);
    }
    return result.value;
  }

  @Post("loyalty/adjust")
  async createLoyaltyAdjust(@Body() body: unknown, @Req() req: RequestWithUser) {
    const input = CreateLoyaltyAdjustEntryInputSchema.parse(body);
    const result = await this.app.createLoyaltyAdjust.execute(input, this.buildCtx(req));
    if (isErr(result)) {
      throw toHttpException(result.error);
    }
    return result.value;
  }

  @Get("settings")
  async getSettings(@Req() req: RequestWithUser) {
    const input = GetEngagementSettingsInputSchema.parse({});
    const result = await this.app.getSettings.execute(input, this.buildCtx(req));
    if (isErr(result)) {
      throw toHttpException(result.error);
    }
    return result.value;
  }

  @Patch("settings")
  async updateSettings(@Body() body: unknown, @Req() req: RequestWithUser) {
    const input = UpdateEngagementSettingsInputSchema.parse(body);
    const result = await this.app.updateSettings.execute(input, this.buildCtx(req));
    if (isErr(result)) {
      throw toHttpException(result.error);
    }
    return result.value;
  }
}
