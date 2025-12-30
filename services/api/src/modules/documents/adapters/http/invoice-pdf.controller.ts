import { Body, Controller, Param, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { RequestInvoicePdfInputSchema } from "@corely/contracts";
import { DocumentsApplication } from "../../application/documents.application";
import { buildUseCaseContext, mapResultToHttp } from "./http-mappers";
import { AuthGuard } from "../../../identity";

@Controller("invoices")
@UseGuards(AuthGuard)
export class InvoicePdfController {
  constructor(private readonly app: DocumentsApplication) {}

  @Post(":invoiceId/pdf")
  async requestInvoicePdf(
    @Param("invoiceId") invoiceId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = RequestInvoicePdfInputSchema.parse({ ...(body as object), invoiceId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.requestInvoicePdf.execute(input, ctx);
    return mapResultToHttp(result);
  }
}
