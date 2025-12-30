import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { AccountingApplication } from "../../application/accounting.application";
import type { Request } from "express";
import {
  SetupAccountingInputSchema,
  CreateLedgerAccountInputSchema,
  UpdateLedgerAccountInputSchema,
  ListLedgerAccountsInputSchema,
  CreateJournalEntryInputSchema,
  UpdateJournalEntryInputSchema,
  PostJournalEntryInputSchema,
  ReverseJournalEntryInputSchema,
  ListJournalEntriesInputSchema,
  GetTrialBalanceInputSchema,
  GetGeneralLedgerInputSchema,
  GetProfitLossInputSchema,
  GetBalanceSheetInputSchema,
  ClosePeriodInputSchema,
  ReopenPeriodInputSchema,
  UpdateAccountingSettingsInputSchema,
} from "@corely/contracts";
import { isOk } from "@corely/kernel";

// Assuming auth guard from existing modules
// @UseGuards(AuthGuard)

interface RequestWithAuth extends Request {
  user?: { userId: string };
  tenantId?: string;
}

function buildContext(req: RequestWithAuth) {
  return {
    tenantId: req.tenantId,
    userId: req.user?.userId,
    correlationId: req.headers["x-correlation-id"] as string,
    requestId: req.headers["x-request-id"] as string,
  };
}

@Controller("accounting")
export class AccountingController {
  constructor(private readonly app: AccountingApplication) {}

  // ===== Setup =====
  @Get("setup/status")
  async getSetupStatus(@Req() req: RequestWithAuth) {
    const result = await this.app.getSetupStatus.execute(undefined, buildContext(req));
    if (!isOk(result)) {
      throw new HttpException(result.error.message, HttpStatus.BAD_REQUEST);
    }
    return result.value;
  }

  @Post("setup")
  async setup(@Body() body: unknown, @Req() req: RequestWithAuth) {
    const input = SetupAccountingInputSchema.parse(body);
    const result = await this.app.setupAccounting.execute(input, buildContext(req));
    if (!isOk(result)) {
      throw new HttpException(result.error.message, HttpStatus.BAD_REQUEST);
    }
    return result.value;
  }

  // ===== Accounts =====
  @Get("accounts")
  async listAccounts(@Query() query: unknown, @Req() req: RequestWithAuth) {
    const input = ListLedgerAccountsInputSchema.parse(query);
    const result = await this.app.listLedgerAccounts.execute(input, buildContext(req));
    if (!isOk(result)) {
      throw new HttpException(result.error.message, HttpStatus.BAD_REQUEST);
    }
    return result.value;
  }

  @Post("accounts")
  async createAccount(@Body() body: unknown, @Req() req: RequestWithAuth) {
    const input = CreateLedgerAccountInputSchema.parse(body);
    const result = await this.app.createLedgerAccount.execute(input, buildContext(req));
    if (!isOk(result)) {
      throw new HttpException(result.error.message, HttpStatus.BAD_REQUEST);
    }
    return result.value;
  }

  @Patch("accounts/:accountId")
  async updateAccount(
    @Param("accountId") accountId: string,
    @Body() body: unknown,
    @Req() req: RequestWithAuth
  ) {
    const input = UpdateLedgerAccountInputSchema.parse({
      ...(body as Record<string, unknown>),
      accountId,
    });
    const result = await this.app.updateLedgerAccount.execute(input, buildContext(req));
    if (!isOk(result)) {
      throw new HttpException(result.error.message, HttpStatus.BAD_REQUEST);
    }
    return result.value;
  }

  // ===== Journal Entries =====
  @Get("journal-entries")
  async listEntries(@Query() query: unknown, @Req() req: RequestWithAuth) {
    const input = ListJournalEntriesInputSchema.parse(query);
    const result = await this.app.listJournalEntries.execute(input, buildContext(req));
    if (!isOk(result)) {
      throw new HttpException(result.error.message, HttpStatus.BAD_REQUEST);
    }
    return result.value;
  }

  @Post("journal-entries")
  async createEntry(@Body() body: unknown, @Req() req: RequestWithAuth) {
    const input = CreateJournalEntryInputSchema.parse(body);
    const result = await this.app.createJournalEntry.execute(input, buildContext(req));
    if (!isOk(result)) {
      throw new HttpException(result.error.message, HttpStatus.BAD_REQUEST);
    }
    return result.value;
  }

  @Patch("journal-entries/:entryId")
  async updateEntry(
    @Param("entryId") entryId: string,
    @Body() body: unknown,
    @Req() req: RequestWithAuth
  ) {
    const input = UpdateJournalEntryInputSchema.parse({
      ...(body as Record<string, unknown>),
      entryId,
    });
    const result = await this.app.updateJournalEntry.execute(input, buildContext(req));
    if (!isOk(result)) {
      throw new HttpException(result.error.message, HttpStatus.BAD_REQUEST);
    }
    return result.value;
  }

  @Post("journal-entries/:entryId/post")
  async postEntry(
    @Param("entryId") entryId: string,
    @Body() body: unknown,
    @Req() req: RequestWithAuth
  ) {
    const input = PostJournalEntryInputSchema.parse({
      ...(body as Record<string, unknown>),
      entryId,
    });
    const result = await this.app.postJournalEntry.execute(input, buildContext(req));
    if (!isOk(result)) {
      throw new HttpException(result.error.message, HttpStatus.BAD_REQUEST);
    }
    return result.value;
  }

  @Post("journal-entries/:entryId/reverse")
  async reverseEntry(
    @Param("entryId") entryId: string,
    @Body() body: unknown,
    @Req() req: RequestWithAuth
  ) {
    const input = ReverseJournalEntryInputSchema.parse({
      ...(body as Record<string, unknown>),
      entryId,
    });
    const result = await this.app.reverseJournalEntry.execute(input, buildContext(req));
    if (!isOk(result)) {
      throw new HttpException(result.error.message, HttpStatus.BAD_REQUEST);
    }
    return result.value;
  }

  // ===== Reports =====
  @Get("reports/trial-balance")
  async getTrialBalance(@Query() query: unknown, @Req() req: RequestWithAuth) {
    const input = GetTrialBalanceInputSchema.parse(query);
    const result = await this.app.getTrialBalance.execute(input, buildContext(req));
    if (!isOk(result)) {
      throw new HttpException(result.error.message, HttpStatus.BAD_REQUEST);
    }
    return result.value;
  }

  @Get("reports/general-ledger")
  async getGeneralLedger(@Query() query: unknown, @Req() req: RequestWithAuth) {
    const input = GetGeneralLedgerInputSchema.parse(query);
    const result = await this.app.getGeneralLedger.execute(input, buildContext(req));
    if (!isOk(result)) {
      throw new HttpException(result.error.message, HttpStatus.BAD_REQUEST);
    }
    return result.value;
  }

  @Get("reports/profit-loss")
  async getProfitLoss(@Query() query: unknown, @Req() req: RequestWithAuth) {
    const input = GetProfitLossInputSchema.parse(query);
    const result = await this.app.getProfitLoss.execute(input, buildContext(req));
    if (!isOk(result)) {
      throw new HttpException(result.error.message, HttpStatus.BAD_REQUEST);
    }
    return result.value;
  }

  @Get("reports/balance-sheet")
  async getBalanceSheet(@Query() query: unknown, @Req() req: RequestWithAuth) {
    const input = GetBalanceSheetInputSchema.parse(query);
    const result = await this.app.getBalanceSheet.execute(input, buildContext(req));
    if (!isOk(result)) {
      throw new HttpException(result.error.message, HttpStatus.BAD_REQUEST);
    }
    return result.value;
  }

  // ===== Periods & Settings =====
  @Post("periods/:periodId/close")
  async closePeriod(
    @Param("periodId") periodId: string,
    @Body() body: unknown,
    @Req() req: RequestWithAuth
  ) {
    const input = ClosePeriodInputSchema.parse({
      ...(body as Record<string, unknown>),
      periodId,
    });
    const result = await this.app.closePeriod.execute(input, buildContext(req));
    if (!isOk(result)) {
      throw new HttpException(result.error.message, HttpStatus.BAD_REQUEST);
    }
    return result.value;
  }

  @Post("periods/:periodId/reopen")
  async reopenPeriod(
    @Param("periodId") periodId: string,
    @Body() body: unknown,
    @Req() req: RequestWithAuth
  ) {
    const input = ReopenPeriodInputSchema.parse({
      ...(body as Record<string, unknown>),
      periodId,
    });
    const result = await this.app.reopenPeriod.execute(input, buildContext(req));
    if (!isOk(result)) {
      throw new HttpException(result.error.message, HttpStatus.BAD_REQUEST);
    }
    return result.value;
  }

  @Patch("settings")
  async updateSettings(@Body() body: unknown, @Req() req: RequestWithAuth) {
    const input = UpdateAccountingSettingsInputSchema.parse(body);
    const result = await this.app.updateSettings.execute(input, buildContext(req));
    if (!isOk(result)) {
      throw new HttpException(result.error.message, HttpStatus.BAD_REQUEST);
    }
    return result.value;
  }
}
