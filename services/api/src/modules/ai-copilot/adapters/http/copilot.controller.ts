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
import type { StreamCopilotChatUseCase } from "../../application/use-cases/stream-copilot-chat.usecase";
import { AuthGuard as IdentityAuthGuard } from "../../../identity/adapters/http/auth.guard";
import { TenantGuard } from "./guards/tenant.guard";
import type { ClockPort } from "@corely/kernel";
import { CreateRunUseCase } from "../../application/use-cases/create-run.usecase";
import { GetRunUseCase } from "../../application/use-cases/get-run.usecase";
import { ListMessagesUseCase } from "../../application/use-cases/list-messages.usecase";

@Controller("copilot")
export class CopilotController {
  private readonly logger = new Logger(CopilotController.name);

  constructor(
    private readonly streamCopilotChat: StreamCopilotChatUseCase,
    private readonly createRun: CreateRunUseCase,
    private readonly getRun: GetRunUseCase,
    private readonly listMessages: ListMessagesUseCase,
    @Inject("COPILOT_CLOCK") private readonly clock: ClockPort
  ) {
    this.logger.debug("CopilotController instantiated");
  }

  @Post("chat")
  @UseGuards(IdentityAuthGuard, TenantGuard)
  async chat(
    @Body() body: CopilotChatRequestDto,
    @Headers("x-idempotency-key") idempotencyKey: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException("Missing X-Idempotency-Key");
    }

    const tenantId = (req as any).tenantId as string;
    const userId = (req as any).user?.userId || "unknown";

    await this.streamCopilotChat.execute({
      messages: (body as any).messages || [],
      tenantId,
      userId,
      idempotencyKey,
      runId: body.id,
      response: res,
    });
  }

  @Post("runs")
  @UseGuards(IdentityAuthGuard, TenantGuard)
  async create(
    @Body() body: CopilotChatRequestDto,
    @Headers("x-idempotency-key") idempotencyKey: string,
    @Req() req: Request
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException("Missing X-Idempotency-Key");
    }
    const tenantId = (req as any).tenantId as string;
    const userId = (req as any).user?.userId || "unknown";

    const { runId } = await this.createRun.execute({
      runId: body.id,
      tenantId,
      userId,
      metadataJson: body.requestData ? JSON.stringify(body.requestData) : undefined,
    });

    return { runId, status: "running" };
  }

  @Get("runs/:id")
  @UseGuards(IdentityAuthGuard, TenantGuard)
  async get(@Param("id") id: string, @Req() req: Request) {
    const tenantId = (req as any).tenantId as string;
    const run = await this.getRun.execute({ tenantId, runId: id });
    return { run };
  }

  @Get("runs/:id/messages")
  @UseGuards(IdentityAuthGuard, TenantGuard)
  async listMessages(@Param("id") id: string, @Req() req: Request) {
    const tenantId = (req as any).tenantId as string;
    const messages = await this.listMessages.execute({ tenantId, runId: id });
    return { items: messages };
  }

  @Post("runs/:id/messages")
  @UseGuards(IdentityAuthGuard, TenantGuard)
  async appendMessage(
    @Param("id") id: string,
    @Body() body: CopilotChatRequestDto,
    @Headers("x-idempotency-key") idempotencyKey: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException("Missing X-Idempotency-Key");
    }
    const tenantId = (req as any).tenantId as string;
    const userId = (req as any).user?.userId || "unknown";

    await this.streamCopilotChat.execute({
      messages: (body as any).messages || [],
      tenantId,
      userId,
      idempotencyKey,
      runId: id,
      response: res,
    });
  }
}
