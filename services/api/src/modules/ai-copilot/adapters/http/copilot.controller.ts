import {
  Body,
  Controller,
  Headers,
  Post,
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

@Controller("copilot")
export class CopilotController {
  private readonly logger = new Logger(CopilotController.name);

  constructor(
    private readonly streamCopilotChat: StreamCopilotChatUseCase,
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
      response: res,
    });
  }
}
