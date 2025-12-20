import { Body, Controller, Param, Post, Req } from "@nestjs/common";
import { isErr, UseCaseContext } from "@kerniflow/kernel";
import { CreateInvoiceDraftUseCase } from "../../application/use-cases/create-invoice-draft/CreateInvoiceDraftUseCase";
import { IssueInvoiceUseCase } from "../../application/use-cases/IssueInvoiceUseCase";
import { CreateInvoiceDraftInputSchema, IssueInvoiceInputSchema } from "@kerniflow/contracts";
import { Request } from "express";
import { toHttpException } from "../../../../shared/http/usecase-error.mapper";
import { buildRequestContext } from "../../../../shared/context/request-context";

@Controller("invoices")
export class InvoicesController {
  constructor(
    private readonly createDraftUseCase: CreateInvoiceDraftUseCase,
    private readonly issueInvoiceUseCase: IssueInvoiceUseCase
  ) {}

  @Post("draft")
  async createDraft(@Body() body: unknown, @Req() req: Request) {
    const input = CreateInvoiceDraftInputSchema.parse(body);
    const ctx: UseCaseContext = {
      tenantId: input.tenantId,
      userId: input.actorUserId,
      requestId: req.headers["x-request-id"] as string | undefined,
      correlationId: req.headers["x-correlation-id"] as string | undefined,
    };
    const result = await this.createDraftUseCase.execute(
      {
        tenantId: input.tenantId,
        currency: input.currency,
        clientId: input.clientId ?? null,
        lines: input.lines,
        actorUserId: input.actorUserId,
        custom: input.custom,
        idempotencyKey: req.headers["x-idempotency-key"] as string | undefined,
      },
      ctx
    );

    if (isErr(result)) {
      throw toHttpException(result.error);
    }

    return result.value;
  }

  @Post(":id/issue")
  async issue(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const input = IssueInvoiceInputSchema.parse({ ...body, invoiceId: id });
    const ctx = buildRequestContext({
      requestId: req.headers["x-request-id"] as string | undefined,
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
    });
    const invoice = await this.issueInvoiceUseCase.execute({
      ...input,
      idempotencyKey: (req.headers["x-idempotency-key"] as string) ?? "default",
      context: ctx,
    });
    return {
      id: invoice.id,
      status: invoice.status,
      tenantId: invoice.tenantId,
      issuedAt: invoice.issuedAt?.toISOString() ?? null,
      custom: invoice.custom ?? undefined,
    };
  }
}
