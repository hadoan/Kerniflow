import {
  Body,
  Controller,
  Headers,
  Post,
  Get,
  Param,
  Req,
  Res,
  UseGuards,
  BadRequestException,
  Inject,
  Logger,
} from "@nestjs/common";
import type { Response, Request } from "express";
import { CopilotChatRequestDto } from "./copilot.dto";
import { StreamCopilotChatUseCase } from "../../application/use-cases/stream-copilot-chat.usecase";
import { AuthGuard as IdentityAuthGuard } from "../../../identity/adapters/http/auth.guard";
import { TenantGuard } from "./guards/tenant.guard";
import type { ClockPort } from "@corely/kernel";
import { CreateRunUseCase } from "../../application/use-cases/create-run.usecase";
import { GetRunUseCase } from "../../application/use-cases/get-run.usecase";
import { ListMessagesUseCase } from "../../application/use-cases/list-messages.usecase";
import { EnvService } from "@corely/config";

type AuthedRequest = Request & { tenantId?: string; user?: { userId?: string }; traceId?: string };

@Controller("copilot")
export class CopilotController {
  private readonly logger = new Logger(CopilotController.name);

  constructor(
    private readonly streamCopilotChat: StreamCopilotChatUseCase,
    private readonly createRun: CreateRunUseCase,
    private readonly getRun: GetRunUseCase,
    private readonly listMessagesUseCase: ListMessagesUseCase,
    @Inject("COPILOT_CLOCK") private readonly clock: ClockPort,
    private readonly env: EnvService
  ) {
    this.logger.debug("CopilotController instantiated");
  }

  @Post("chat")
  @UseGuards(IdentityAuthGuard, TenantGuard)
  async chat(
    @Body() body: CopilotChatRequestDto,
    @Headers("x-idempotency-key") idempotencyKey: string,
    @Req() req: AuthedRequest,
    @Res({ passthrough: false }) res: Response
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException("Missing X-Idempotency-Key");
    }

    const tenantId = req.tenantId as string;
    const userId = req.user?.userId || "unknown";
    const requestId = req.traceId || "unknown";

    return this.streamCopilotChat.execute({
      messages: body.messages || [],
      tenantId,
      userId,
      idempotencyKey,
      runId: body.id,
      response: res,
      intent: body.requestData?.activeModule,
      requestId,
      workspaceId: tenantId,
      workspaceKind: "COMPANY",
      environment: this.env.APP_ENV,
      modelId: this.env.AI_MODEL_ID,
      modelProvider: this.env.AI_MODEL_PROVIDER,
    });
  }

  @Post("runs")
  @UseGuards(IdentityAuthGuard, TenantGuard)
  async create(
    @Body() body: CopilotChatRequestDto,
    @Headers("x-idempotency-key") idempotencyKey: string,
    @Req() req: AuthedRequest
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException("Missing X-Idempotency-Key");
    }
    const tenantId = req.tenantId as string;
    const userId = req.user?.userId || "unknown";
    const requestId = req.traceId || "unknown";

    const { runId } = await this.createRun.execute({
      runId: body.id,
      tenantId,
      userId,
      traceId: requestId,
      metadataJson: body.requestData ? JSON.stringify(body.requestData) : undefined,
    });

    return { runId, status: "running" };
  }

  @Get("runs/:id")
  @UseGuards(IdentityAuthGuard, TenantGuard)
  async get(@Param("id") id: string, @Req() req: AuthedRequest) {
    const tenantId = req.tenantId as string;
    const run = await this.getRun.execute({ tenantId, runId: id });
    return { run };
  }

  @Get("runs/:id/messages")
  @UseGuards(IdentityAuthGuard, TenantGuard)
  async listMessages(@Param("id") id: string, @Req() req: AuthedRequest) {
    const tenantId = req.tenantId as string;
    const messages = await this.listMessagesUseCase.execute({ tenantId, runId: id });
    return { items: messages };
  }

  @Post("runs/:id/messages")
  @UseGuards(IdentityAuthGuard, TenantGuard)
  async appendMessage(
    @Param("id") id: string,
    @Body() body: CopilotChatRequestDto,
    @Headers("x-idempotency-key") idempotencyKey: string,
    @Req() req: AuthedRequest,
    @Res() res: Response
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException("Missing X-Idempotency-Key");
    }
    const tenantId = req.tenantId as string;
    const userId = req.user?.userId || "unknown";
    const requestId = req.traceId || "unknown";

    await this.streamCopilotChat.execute({
      messages: body.messages || [],
      tenantId,
      userId,
      idempotencyKey,
      runId: id,
      response: res,
      intent: body.requestData?.activeModule,
      requestId,
      workspaceId: tenantId,
      workspaceKind: "COMPANY",
      environment: this.env.APP_ENV,
      modelId: this.env.AI_MODEL_ID,
      modelProvider: this.env.AI_MODEL_PROVIDER,
    });
  }
}
