import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import {
  CreateQuoteInputSchema,
  UpdateQuoteInputSchema,
  SendQuoteInputSchema,
  AcceptQuoteInputSchema,
  RejectQuoteInputSchema,
  ConvertQuoteToOrderInputSchema,
  ConvertQuoteToInvoiceInputSchema,
  GetQuoteInputSchema,
  ListQuotesInputSchema,
  CreateSalesOrderInputSchema,
  UpdateSalesOrderInputSchema,
  ConfirmSalesOrderInputSchema,
  FulfillSalesOrderInputSchema,
  CancelSalesOrderInputSchema,
  CreateInvoiceFromOrderInputSchema,
  GetSalesOrderInputSchema,
  ListSalesOrdersInputSchema,
  CreateSalesInvoiceInputSchema,
  UpdateSalesInvoiceInputSchema,
  IssueSalesInvoiceInputSchema,
  VoidSalesInvoiceInputSchema,
  GetSalesInvoiceInputSchema,
  ListSalesInvoicesInputSchema,
  SalesRecordPaymentInputSchema,
  ListPaymentsInputSchema,
  ReversePaymentInputSchema,
  GetSalesSettingsInputSchema,
  UpdateSalesSettingsInputSchema,
} from "@corely/contracts";
import { SalesApplication } from "../../application/sales.application";
import { buildUseCaseContext, mapResultToHttp } from "./mappers";
import { AuthGuard } from "../../../identity";
import { RbacGuard, RequirePermission } from "../../../identity/adapters/http/rbac.guard";

@Controller("sales")
@UseGuards(AuthGuard, RbacGuard)
export class SalesController {
  constructor(private readonly app: SalesApplication) {}

  // Quotes
  @Get("quotes")
  @RequirePermission("sales.quotes.read")
  async listQuotes(@Query() query: any, @Req() req: Request) {
    const input = ListQuotesInputSchema.parse({
      status: query.status,
      customerPartyId: query.customerPartyId,
      fromDate: query.fromDate,
      toDate: query.toDate,
      cursor: query.cursor,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.listQuotes.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post("quotes")
  @RequirePermission("sales.quotes.manage")
  async createQuote(@Body() body: unknown, @Req() req: Request) {
    const input = CreateQuoteInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.createQuote.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Get("quotes/:quoteId")
  @RequirePermission("sales.quotes.read")
  async getQuote(@Param("quoteId") quoteId: string, @Req() req: Request) {
    const input = GetQuoteInputSchema.parse({ quoteId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getQuote.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Patch("quotes/:quoteId")
  @RequirePermission("sales.quotes.manage")
  async updateQuote(@Param("quoteId") quoteId: string, @Body() body: unknown, @Req() req: Request) {
    const input = UpdateQuoteInputSchema.parse({ ...(body as object), quoteId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.updateQuote.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post("quotes/:quoteId/send")
  @RequirePermission("sales.quotes.send")
  async sendQuote(@Param("quoteId") quoteId: string, @Body() body: unknown, @Req() req: Request) {
    const input = SendQuoteInputSchema.parse({ ...(body as object), quoteId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.sendQuote.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post("quotes/:quoteId/accept")
  @RequirePermission("sales.quotes.accept")
  async acceptQuote(@Param("quoteId") quoteId: string, @Body() body: unknown, @Req() req: Request) {
    const input = AcceptQuoteInputSchema.parse({ ...(body as object), quoteId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.acceptQuote.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post("quotes/:quoteId/reject")
  @RequirePermission("sales.quotes.accept")
  async rejectQuote(@Param("quoteId") quoteId: string, @Body() body: unknown, @Req() req: Request) {
    const input = RejectQuoteInputSchema.parse({ ...(body as object), quoteId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.rejectQuote.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post("quotes/:quoteId/convert-to-order")
  @RequirePermission("sales.quotes.manage")
  async convertQuoteToOrder(
    @Param("quoteId") quoteId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = ConvertQuoteToOrderInputSchema.parse({ ...(body as object), quoteId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.convertQuoteToOrder.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post("quotes/:quoteId/convert-to-invoice")
  @RequirePermission("sales.quotes.manage")
  async convertQuoteToInvoice(
    @Param("quoteId") quoteId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = ConvertQuoteToInvoiceInputSchema.parse({ ...(body as object), quoteId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.convertQuoteToInvoice.execute(input, ctx);
    return mapResultToHttp(result);
  }

  // Orders
  @Get("orders")
  @RequirePermission("sales.orders.read")
  async listOrders(@Query() query: any, @Req() req: Request) {
    const input = ListSalesOrdersInputSchema.parse({
      status: query.status,
      customerPartyId: query.customerPartyId,
      fromDate: query.fromDate,
      toDate: query.toDate,
      cursor: query.cursor,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.listOrders.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post("orders")
  @RequirePermission("sales.orders.manage")
  async createOrder(@Body() body: unknown, @Req() req: Request) {
    const input = CreateSalesOrderInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.createOrder.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Get("orders/:orderId")
  @RequirePermission("sales.orders.read")
  async getOrder(@Param("orderId") orderId: string, @Req() req: Request) {
    const input = GetSalesOrderInputSchema.parse({ orderId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getOrder.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Patch("orders/:orderId")
  @RequirePermission("sales.orders.manage")
  async updateOrder(@Param("orderId") orderId: string, @Body() body: unknown, @Req() req: Request) {
    const input = UpdateSalesOrderInputSchema.parse({ ...(body as object), orderId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.updateOrder.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post("orders/:orderId/confirm")
  @RequirePermission("sales.orders.confirm")
  async confirmOrder(
    @Param("orderId") orderId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = ConfirmSalesOrderInputSchema.parse({ ...(body as object), orderId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.confirmOrder.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post("orders/:orderId/fulfill")
  @RequirePermission("sales.orders.fulfill")
  async fulfillOrder(
    @Param("orderId") orderId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = FulfillSalesOrderInputSchema.parse({ ...(body as object), orderId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.fulfillOrder.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post("orders/:orderId/cancel")
  @RequirePermission("sales.orders.manage")
  async cancelOrder(@Param("orderId") orderId: string, @Body() body: unknown, @Req() req: Request) {
    const input = CancelSalesOrderInputSchema.parse({ ...(body as object), orderId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.cancelOrder.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post("orders/:orderId/create-invoice")
  @RequirePermission("sales.orders.manage")
  async createInvoiceFromOrder(
    @Param("orderId") orderId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = CreateInvoiceFromOrderInputSchema.parse({ ...(body as object), orderId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.createInvoiceFromOrder.execute(input, ctx);
    return mapResultToHttp(result);
  }

  // Invoices
  @Get("invoices")
  @RequirePermission("sales.invoices.read")
  async listInvoices(@Query() query: any, @Req() req: Request) {
    const input = ListSalesInvoicesInputSchema.parse({
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

  @Post("invoices")
  @RequirePermission("sales.invoices.manage")
  async createInvoice(@Body() body: unknown, @Req() req: Request) {
    const input = CreateSalesInvoiceInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.createInvoice.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Get("invoices/:invoiceId")
  @RequirePermission("sales.invoices.read")
  async getInvoice(@Param("invoiceId") invoiceId: string, @Req() req: Request) {
    const input = GetSalesInvoiceInputSchema.parse({ invoiceId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getInvoice.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Patch("invoices/:invoiceId")
  @RequirePermission("sales.invoices.manage")
  async updateInvoice(
    @Param("invoiceId") invoiceId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = UpdateSalesInvoiceInputSchema.parse({ ...(body as object), invoiceId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.updateInvoice.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post("invoices/:invoiceId/issue")
  @RequirePermission("sales.invoices.issue")
  async issueInvoice(
    @Param("invoiceId") invoiceId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = IssueSalesInvoiceInputSchema.parse({ ...(body as object), invoiceId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.issueInvoice.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post("invoices/:invoiceId/void")
  @RequirePermission("sales.invoices.void")
  async voidInvoice(
    @Param("invoiceId") invoiceId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = VoidSalesInvoiceInputSchema.parse({ ...(body as object), invoiceId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.voidInvoice.execute(input, ctx);
    return mapResultToHttp(result);
  }

  // Payments
  @Post("invoices/:invoiceId/payments")
  @RequirePermission("sales.payments.record")
  async recordPayment(
    @Param("invoiceId") invoiceId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = SalesRecordPaymentInputSchema.parse({ ...(body as object), invoiceId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.recordPayment.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Get("invoices/:invoiceId/payments")
  @RequirePermission("sales.invoices.read")
  async listPayments(@Param("invoiceId") invoiceId: string, @Req() req: Request) {
    const input = ListPaymentsInputSchema.parse({ invoiceId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.listPayments.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post("payments/:paymentId/reverse")
  @RequirePermission("sales.payments.record")
  async reversePayment(
    @Param("paymentId") paymentId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = ReversePaymentInputSchema.parse({ ...(body as object), paymentId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.reversePayment.execute(input, ctx);
    return mapResultToHttp(result);
  }

  // Settings
  @Get("settings")
  @RequirePermission("sales.settings.manage")
  async getSettings(@Req() req: Request) {
    const input = GetSalesSettingsInputSchema.parse({});
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getSettings.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Patch("settings")
  @RequirePermission("sales.settings.manage")
  async updateSettings(@Body() body: unknown, @Req() req: Request) {
    const input = UpdateSalesSettingsInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.updateSettings.execute(input, ctx);
    return mapResultToHttp(result);
  }
}
