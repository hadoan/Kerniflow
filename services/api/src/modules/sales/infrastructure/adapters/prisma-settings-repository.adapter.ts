import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type { SalesSettingsRepositoryPort } from "../../application/ports/settings-repository.port";
import { SalesSettingsAggregate } from "../../domain/settings.aggregate";

@Injectable()
export class PrismaSalesSettingsRepositoryAdapter implements SalesSettingsRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByTenant(tenantId: string): Promise<SalesSettingsAggregate | null> {
    const data = await this.prisma.salesSettings.findFirst({
      where: { tenantId },
    });
    if (!data) {
      return null;
    }
    return SalesSettingsAggregate.fromProps({
      id: data.id,
      tenantId: data.tenantId,
      defaultPaymentTerms: data.defaultPaymentTerms ?? null,
      defaultCurrency: data.defaultCurrency,
      quoteNumberPrefix: data.quoteNumberPrefix,
      quoteNextNumber: data.quoteNextNumber,
      orderNumberPrefix: data.orderNumberPrefix,
      orderNextNumber: data.orderNextNumber,
      invoiceNumberPrefix: data.invoiceNumberPrefix,
      invoiceNextNumber: data.invoiceNextNumber,
      defaultRevenueAccountId: data.defaultRevenueAccountId ?? null,
      defaultAccountsReceivableAccountId: data.defaultAccountsReceivableAccountId ?? null,
      defaultBankAccountId: data.defaultBankAccountId ?? null,
      autoPostOnIssue: data.autoPostOnIssue,
      autoPostOnPayment: data.autoPostOnPayment,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  async save(settings: SalesSettingsAggregate): Promise<void> {
    await this.prisma.salesSettings.upsert({
      where: { tenantId: settings.tenantId },
      update: {
        defaultPaymentTerms: settings.defaultPaymentTerms,
        defaultCurrency: settings.defaultCurrency,
        quoteNumberPrefix: settings.quoteNumberPrefix,
        quoteNextNumber: settings.quoteNextNumber,
        orderNumberPrefix: settings.orderNumberPrefix,
        orderNextNumber: settings.orderNextNumber,
        invoiceNumberPrefix: settings.invoiceNumberPrefix,
        invoiceNextNumber: settings.invoiceNextNumber,
        defaultRevenueAccountId: settings.defaultRevenueAccountId,
        defaultAccountsReceivableAccountId: settings.defaultAccountsReceivableAccountId,
        defaultBankAccountId: settings.defaultBankAccountId,
        autoPostOnIssue: settings.autoPostOnIssue,
        autoPostOnPayment: settings.autoPostOnPayment,
        updatedAt: settings.updatedAt,
      },
      create: {
        id: settings.id,
        tenantId: settings.tenantId,
        defaultPaymentTerms: settings.defaultPaymentTerms,
        defaultCurrency: settings.defaultCurrency,
        quoteNumberPrefix: settings.quoteNumberPrefix,
        quoteNextNumber: settings.quoteNextNumber,
        orderNumberPrefix: settings.orderNumberPrefix,
        orderNextNumber: settings.orderNextNumber,
        invoiceNumberPrefix: settings.invoiceNumberPrefix,
        invoiceNextNumber: settings.invoiceNextNumber,
        defaultRevenueAccountId: settings.defaultRevenueAccountId,
        defaultAccountsReceivableAccountId: settings.defaultAccountsReceivableAccountId,
        defaultBankAccountId: settings.defaultBankAccountId,
        autoPostOnIssue: settings.autoPostOnIssue,
        autoPostOnPayment: settings.autoPostOnPayment,
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt,
      },
    });
  }
}
