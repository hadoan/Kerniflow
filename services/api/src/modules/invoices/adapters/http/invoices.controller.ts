import {
  Body,
  Controller,
  Get,
  Inject,
  Optional,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { InvoicesApplication } from "../../application/invoices.application";
import {
  CancelInvoiceInputSchema,
  CreateInvoiceInputSchema,
  DownloadInvoicePdfInputSchema,
  FinalizeInvoiceInputSchema,
  GetInvoiceByIdInputSchema,
  ListInvoicesInputSchema,
  RecordPaymentInputSchema,
  SendInvoiceInputSchema,
  UpdateInvoiceInputSchema,
} from "@corely/contracts";
import { buildUseCaseContext, mapResultToHttp } from "./mappers";
import { AuthGuard } from "../../../identity";
import { ModuleRef } from "@nestjs/core";

@Controller("invoices")
@UseGuards(AuthGuard)
export class InvoicesHttpController {
  constructor(
    @Inject(InvoicesApplication) @Optional() private readonly app: InvoicesApplication | null,
    @Optional() private readonly moduleRef?: ModuleRef
  ) {}

  @Post()
  async create(@Body() body: unknown, @Req() req: Request) {
    const input = CreateInvoiceInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const app = this.app ?? this.moduleRef?.get(InvoicesApplication, { strict: false });
    if (!app) {
      throw new Error("InvoicesApplication not available");
    }

    const result = await app.createInvoice.execute(input, ctx);
    const invoice = mapResultToHttp(result).invoice;
    return { ...invoice, invoice };
  }

  @Patch(":invoiceId")
  async update(@Param("invoiceId") invoiceId: string, @Body() body: unknown, @Req() req: Request) {
    const input = UpdateInvoiceInputSchema.parse({ ...(body as object), invoiceId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.updateInvoice.execute(input, ctx);
    return mapResultToHttp(result).invoice;
  }

  @Post(":invoiceId/finalize")
  async finalize(@Param("invoiceId") invoiceId: string, @Req() req: Request) {
    const input = FinalizeInvoiceInputSchema.parse({ invoiceId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.finalizeInvoice.execute(input, ctx);
    return mapResultToHttp(result).invoice;
  }

  @Post(":invoiceId/send")
  async send(@Param("invoiceId") invoiceId: string, @Body() body: unknown, @Req() req: Request) {
    const input = SendInvoiceInputSchema.parse({ ...(body as object), invoiceId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.sendInvoice.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post(":invoiceId/payments")
  async recordPayment(
    @Param("invoiceId") invoiceId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = RecordPaymentInputSchema.parse({ ...(body as object), invoiceId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.recordPayment.execute(input, ctx);
    return mapResultToHttp(result).invoice;
  }

  @Post(":invoiceId/cancel")
  async cancel(@Param("invoiceId") invoiceId: string, @Body() body: unknown, @Req() req: Request) {
    const input = CancelInvoiceInputSchema.parse({ ...(body as object), invoiceId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.cancelInvoice.execute(input, ctx);
    return mapResultToHttp(result).invoice;
  }

  @Get(":invoiceId/pdf")
  async downloadPdf(@Param("invoiceId") invoiceId: string, @Req() req: Request) {
    const input = DownloadInvoicePdfInputSchema.parse({ invoiceId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.downloadInvoicePdf.execute(input, ctx);
    return {
      downloadUrl: result.downloadUrl,
      expiresAt: result.expiresAt.toISOString(),
    };
  }

  @Get(":invoiceId")
  async getInvoice(@Param("invoiceId") invoiceId: string, @Req() req: Request) {
    const input = GetInvoiceByIdInputSchema.parse({ invoiceId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getInvoiceById.execute(input, ctx);
    return mapResultToHttp(result).invoice;
  }

  @Get()
  async list(@Query() query: any, @Req() req: Request) {
    const input = ListInvoicesInputSchema.parse({
      status: query.status,
      customerPartyId: query.customerPartyId,
      fromDate: query.fromDate,
      toDate: query.toDate,
      cursor: query.cursor,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.listInvoices.execute(input, ctx);
    return mapResultToHttp(result);
  }
}
