import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import {
  AttachBelegInputSchema,
  CreateCashEntryInputSchema,
  CreateCashRegisterSchema,
  ExportCashBookInputSchema,
  GetCashDashboardQuerySchema,
  GetCashReconciliationReportQuerySchema,
  ListCashDayClosesQuerySchema,
  ListCashEntriesQuerySchema,
  ListCashRegistersQuerySchema,
  ReverseCashEntryInputSchema,
  SubmitCashDayCloseInputSchema,
  UpdateCashRegisterSchema,
} from "@corely/contracts";
import {
  buildUseCaseContext,
  mapResultToHttp,
  resolveIdempotencyKey,
} from "@/shared/http/usecase-mappers";
import type { ContextAwareRequest } from "@/shared/request-context";
import { AuthGuard } from "@/modules/identity/adapters/http/auth.guard";
import { AllowSurfaces } from "@/shared/surface";
import { ListCashRegistersQueryUseCase } from "../application/use-cases/list-cash-registers.query";
import { GetCashRegisterQueryUseCase } from "../application/use-cases/get-cash-register.query";
import { CreateCashRegisterUseCase } from "../application/use-cases/create-cash-register.usecase";
import { UpdateCashRegisterUseCase } from "../application/use-cases/update-cash-register.usecase";
import { ListCashEntriesQueryUseCase } from "../application/use-cases/list-cash-entries.query";
import { CreateCashEntryUseCase } from "../application/use-cases/create-cash-entry.usecase";
import { ReverseCashEntryUseCase } from "../application/use-cases/reverse-cash-entry.usecase";
import { GetCashDayCloseQueryUseCase } from "../application/use-cases/get-cash-day-close.query";
import { SubmitCashDayCloseUseCase } from "../application/use-cases/submit-cash-day-close.usecase";
import { AttachBelegToCashEntryUseCase } from "../application/use-cases/attach-beleg-to-cash-entry.usecase";
import { ListCashEntryAttachmentsQueryUseCase } from "../application/use-cases/list-cash-entry-attachments.query";
import { ExportCashBookUseCase } from "../application/use-cases/export-cash-book.usecase";
import { ListCashDayClosesQueryUseCase } from "../application/use-cases/list-cash-day-closes.query";
import { GetCashExportArtifactQueryUseCase } from "../application/use-cases/get-cash-export-artifact.query";
import { GetCashDashboardQueryUseCase } from "../application/use-cases/get-cash-dashboard.query";
import { GetCashReportPreviewQueryUseCase } from "../application/use-cases/get-cash-report-preview.query";
import { GetCashReconciliationReportQueryUseCase } from "../application/use-cases/get-cash-reconciliation-report.query";
import { ConfirmCashEntryUseCase } from "../application/use-cases/confirm-cash-entry.usecase";
import { createKassenberichtPdf } from "./kassenbericht-pdf.generator";

@AllowSurfaces("platform", "pos")
@Controller()
@UseGuards(AuthGuard)
export class CashManagementController {
  constructor(
    private readonly listRegistersQuery: ListCashRegistersQueryUseCase,
    private readonly getRegisterQuery: GetCashRegisterQueryUseCase,
    private readonly createRegisterUseCase: CreateCashRegisterUseCase,
    private readonly updateRegisterUseCase: UpdateCashRegisterUseCase,
    private readonly listEntriesQuery: ListCashEntriesQueryUseCase,
    private readonly createEntryUseCase: CreateCashEntryUseCase,
    private readonly reverseEntryUseCase: ReverseCashEntryUseCase,
    private readonly getDayCloseQuery: GetCashDayCloseQueryUseCase,
    private readonly submitDayCloseUseCase: SubmitCashDayCloseUseCase,
    private readonly listDayClosesQuery: ListCashDayClosesQueryUseCase,
    private readonly attachBelegUseCase: AttachBelegToCashEntryUseCase,
    private readonly listAttachmentsQuery: ListCashEntryAttachmentsQueryUseCase,
    private readonly exportCashBookUseCase: ExportCashBookUseCase,
    private readonly getExportArtifactQuery: GetCashExportArtifactQueryUseCase,
    private readonly getCashDashboardQuery: GetCashDashboardQueryUseCase,
    private readonly getCashReportPreviewQuery: GetCashReportPreviewQueryUseCase,
    private readonly getCashReconciliationReportQuery: GetCashReconciliationReportQueryUseCase,
    private readonly confirmCashEntryUseCase: ConfirmCashEntryUseCase
  ) {}

  @Get("cash-registers")
  async listCashRegisters(
    @Req() req: ContextAwareRequest,
    @Query() query: Record<string, unknown>
  ) {
    const ctx = buildUseCaseContext(req);
    const input = ListCashRegistersQuerySchema.parse(query);
    const result = await this.listRegistersQuery.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Get("cash-registers/:id")
  async getCashRegister(@Req() req: ContextAwareRequest, @Param("id") registerId: string) {
    const ctx = buildUseCaseContext(req);
    const result = await this.getRegisterQuery.execute({ registerId }, ctx);
    return mapResultToHttp(result);
  }

  @Post("cash-registers")
  async createCashRegister(@Req() req: ContextAwareRequest, @Body() body: unknown) {
    const ctx = buildUseCaseContext(req);
    const parsed = CreateCashRegisterSchema.parse(body);
    console.log(`[API] createRegister called for tenant ${ctx.tenantId} with name ${parsed.name}`);
    const result = await this.createRegisterUseCase.execute(
      {
        ...parsed,
        idempotencyKey: resolveIdempotencyKey(req) ?? parsed.idempotencyKey,
      },
      ctx
    );
    return mapResultToHttp(result);
  }

  @Patch("cash-registers/:id")
  async updateCashRegister(
    @Req() req: ContextAwareRequest,
    @Param("id") registerId: string,
    @Body() body: unknown
  ) {
    const ctx = buildUseCaseContext(req);
    const input = UpdateCashRegisterSchema.parse(body);
    const result = await this.updateRegisterUseCase.execute({ registerId, input }, ctx);
    return mapResultToHttp(result);
  }

  @Get("cash-registers/:id/entries")
  async listCashEntries(
    @Req() req: ContextAwareRequest,
    @Param("id") registerId: string,
    @Query() query: Record<string, unknown>
  ) {
    const ctx = buildUseCaseContext(req);
    const input = ListCashEntriesQuerySchema.parse({ ...query, registerId });
    const result = await this.listEntriesQuery.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post("cash-registers/:id/entries")
  async createCashEntry(
    @Req() req: ContextAwareRequest,
    @Param("id") registerId: string,
    @Body() body: unknown
  ) {
    const ctx = buildUseCaseContext(req);
    const parsed = CreateCashEntryInputSchema.parse({ ...(body as object), registerId });
    const result = await this.createEntryUseCase.execute(
      {
        ...parsed,
        registerId,
        idempotencyKey: resolveIdempotencyKey(req) ?? parsed.idempotencyKey,
      },
      ctx
    );
    return mapResultToHttp(result);
  }

  @Post("cash-registers/:id/confirm-entry/:confirmationId")
  async confirmCashEntry(
    @Req() req: ContextAwareRequest,
    @Param("id") registerId: string,
    @Param("confirmationId") confirmationId: string
  ) {
    const ctx = buildUseCaseContext(req);
    const idempotencyKey = resolveIdempotencyKey(req);

    if (!idempotencyKey) {
      throw new BadRequestException("Idempotency key is required");
    }

    const result = await this.confirmCashEntryUseCase.execute(
      {
        registerId,
        confirmationId,
        idempotencyKey,
      },
      ctx
    );
    return mapResultToHttp(result);
  }

  @Post("cash-entries/:id/reverse")
  async reverseCashEntry(
    @Req() req: ContextAwareRequest,
    @Param("id") entryId: string,
    @Body() body: unknown
  ) {
    const ctx = buildUseCaseContext(req);
    const parsed = ReverseCashEntryInputSchema.parse(body);

    const result = await this.reverseEntryUseCase.execute(
      {
        ...parsed,
        entryId,
        idempotencyKey: resolveIdempotencyKey(req) ?? parsed.idempotencyKey,
      },
      ctx
    );
    return mapResultToHttp(result);
  }

  @Get("cash-registers/:id/day-closes")
  async listCashDayCloses(
    @Req() req: ContextAwareRequest,
    @Param("id") registerId: string,
    @Query() query: Record<string, unknown>
  ) {
    const ctx = buildUseCaseContext(req);
    const parsed = ListCashDayClosesQuerySchema.parse({ ...query, registerId });
    const result = await this.listDayClosesQuery.execute(parsed, ctx);
    return mapResultToHttp(result);
  }

  @Get("cash-registers/:id/day-closes/:dayKey")
  async getCashDayClose(
    @Req() req: ContextAwareRequest,
    @Param("id") registerId: string,
    @Param("dayKey") dayKey: string
  ) {
    const ctx = buildUseCaseContext(req);
    const result = await this.getDayCloseQuery.execute({ registerId, dayKey }, ctx);
    return mapResultToHttp(result);
  }

  @Get("cash-registers/:id/kassenbericht/:dayKey")
  async getKassenbericht(
    @Req() req: ContextAwareRequest,
    @Param("id") registerId: string,
    @Param("dayKey") businessDate: string
  ) {
    const result = await this.getCashReportPreviewQuery.execute(
      { registerId, businessDate },
      buildUseCaseContext(req)
    );
    return mapResultToHttp(result);
  }

  @Get("cash-registers/:id/kassenabrechnung")
  async getKassenabrechnung(
    @Req() req: ContextAwareRequest,
    @Param("id") registerId: string,
    @Query() query: Record<string, unknown>
  ) {
    const input = GetCashReconciliationReportQuerySchema.parse({ ...query, registerId });
    return mapResultToHttp(
      await this.getCashReconciliationReportQuery.execute(input, buildUseCaseContext(req))
    );
  }

  @Get("cash-registers/:id/kassenbericht/:dayKey/pdf")
  @Header("Cache-Control", "no-store")
  async downloadKassenberichtPdf(
    @Req() req: ContextAwareRequest,
    @Param("id") registerId: string,
    @Param("dayKey") businessDate: string,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.getCashReportPreviewQuery.execute(
      { registerId, businessDate },
      buildUseCaseContext(req)
    );
    const { preview } = mapResultToHttp(result);
    const buffer = await createKassenberichtPdf(preview);
    const fileName = `kassenbericht-${preview.businessDate}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", String(buffer.byteLength));
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    return new StreamableFile(buffer);
  }

  @Get("cash-registers/:id/dashboard")
  async getCashDashboard(
    @Req() req: ContextAwareRequest,
    @Param("id") registerId: string,
    @Query() query: Record<string, unknown>
  ) {
    const ctx = buildUseCaseContext(req);
    const parsed = GetCashDashboardQuerySchema.parse({ ...query, registerId });
    const result = await this.getCashDashboardQuery.execute(parsed, ctx);
    return mapResultToHttp(result);
  }

  @Post("cash-registers/:id/day-closes/:dayKey/submit")
  async submitCashDayClose(
    @Req() req: ContextAwareRequest,
    @Param("id") registerId: string,
    @Param("dayKey") dayKey: string,
    @Body() body: unknown
  ) {
    const ctx = buildUseCaseContext(req);
    const parsed = SubmitCashDayCloseInputSchema.parse({
      ...(body as object),
      registerId,
      dayKey,
    });

    const result = await this.submitDayCloseUseCase.execute(
      {
        ...parsed,
        registerId,
        dayKey,
        idempotencyKey: resolveIdempotencyKey(req) ?? parsed.idempotencyKey,
      },
      ctx
    );
    return mapResultToHttp(result);
  }

  // Legacy route compatibility
  @Post("cash-registers/:id/daily-close")
  async submitCashDayCloseLegacy(
    @Req() req: ContextAwareRequest,
    @Param("id") registerId: string,
    @Body() body: unknown
  ) {
    const raw = body as Record<string, unknown>;
    const dayKey = typeof raw.businessDate === "string" ? raw.businessDate : undefined;
    if (!dayKey) {
      throw new BadRequestException("businessDate is required");
    }

    return this.submitCashDayClose(req, registerId, dayKey, body);
  }

  @Get("cash-registers/:id/daily-close")
  async listCashDayClosesLegacy(
    @Req() req: ContextAwareRequest,
    @Param("id") registerId: string,
    @Query() query: Record<string, unknown>
  ) {
    return this.listCashDayCloses(req, registerId, query);
  }

  @Post("cash-entries/:id/attachments")
  async attachBeleg(
    @Req() req: ContextAwareRequest,
    @Param("id") entryId: string,
    @Body() body: unknown
  ) {
    const ctx = buildUseCaseContext(req);
    const parsed = AttachBelegInputSchema.parse({ ...(body as object), entryId });
    const result = await this.attachBelegUseCase.execute(
      {
        ...parsed,
        entryId,
        idempotencyKey: resolveIdempotencyKey(req) ?? parsed.idempotencyKey,
      },
      ctx
    );
    return mapResultToHttp(result);
  }

  @Get("cash-entries/:id/attachments")
  async listAttachments(@Req() req: ContextAwareRequest, @Param("id") entryId: string) {
    const ctx = buildUseCaseContext(req);
    const result = await this.listAttachmentsQuery.execute({ entryId }, ctx);
    return mapResultToHttp(result);
  }

  @Post("cash-registers/:id/exports")
  async exportCashBook(
    @Req() req: ContextAwareRequest,
    @Param("id") registerId: string,
    @Body() body: unknown
  ) {
    const ctx = buildUseCaseContext(req);
    const parsed = ExportCashBookInputSchema.parse({ ...(body as object), registerId });

    const result = await this.exportCashBookUseCase.execute(
      {
        ...parsed,
        registerId,
        idempotencyKey: resolveIdempotencyKey(req) ?? parsed.idempotencyKey,
      },
      ctx
    );
    return mapResultToHttp(result);
  }

  @Get("cash-exports/:id")
  @Header("Cache-Control", "no-store")
  async downloadExport(
    @Req() req: ContextAwareRequest,
    @Param("id") artifactId: string,
    @Res({ passthrough: true }) res: Response
  ) {
    const ctx = buildUseCaseContext(req);
    const result = await this.getExportArtifactQuery.execute({ artifactId }, ctx);
    const file = mapResultToHttp(result);

    res.setHeader("Content-Type", file.contentType);
    res.setHeader("Content-Length", String(file.sizeBytes));
    res.setHeader("Content-Disposition", `attachment; filename="${file.fileName}"`);

    return new StreamableFile(file.buffer);
  }
}
