import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import {
  ArchiveCustomerInputSchema,
  CreateCustomerInputSchema,
  GetCustomerInputSchema,
  ListCustomersInputSchema,
  SearchCustomersInputSchema,
  UnarchiveCustomerInputSchema,
  UpdateCustomerInputSchema,
} from "@kerniflow/contracts";
import { PartyCrmApplication } from "../../application/party-crm.application";
import { buildUseCaseContext, mapResultToHttp } from "./http-mappers";
import { AuthGuard } from "../../../identity";

@Controller("customers")
@UseGuards(AuthGuard)
export class CustomersHttpController {
  constructor(private readonly app: PartyCrmApplication) {}

  @Post()
  async create(@Body() body: unknown, @Req() req: Request) {
    const input = CreateCustomerInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.createCustomer.execute(input, ctx);
    return mapResultToHttp(result).customer;
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const input = UpdateCustomerInputSchema.parse({ id, patch: body as object });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.updateCustomer.execute(input, ctx);
    return mapResultToHttp(result).customer;
  }

  @Post(":id/archive")
  async archive(@Param("id") id: string, @Req() req: Request) {
    const input = ArchiveCustomerInputSchema.parse({ id });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.archiveCustomer.execute(input, ctx);
    return mapResultToHttp(result).customer;
  }

  @Post(":id/unarchive")
  async unarchive(@Param("id") id: string, @Req() req: Request) {
    const input = UnarchiveCustomerInputSchema.parse({ id });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.unarchiveCustomer.execute(input, ctx);
    return mapResultToHttp(result).customer;
  }

  @Get("search")
  async search(@Query() query: any, @Req() req: Request) {
    const input = SearchCustomersInputSchema.parse({
      q: query.q,
      cursor: query.cursor,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.searchCustomers.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Get(":id")
  async get(@Param("id") id: string, @Req() req: Request) {
    const input = GetCustomerInputSchema.parse({ id });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getCustomerById.execute(input, ctx);
    return mapResultToHttp(result).customer;
  }

  @Get()
  async list(@Query() query: any, @Req() req: Request) {
    const input = ListCustomersInputSchema.parse({
      cursor: query.cursor,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
      includeArchived: query.includeArchived === "true" || query.includeArchived === true,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.listCustomers.execute(input, ctx);
    return mapResultToHttp(result);
  }
}
