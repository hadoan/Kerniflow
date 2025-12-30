import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type { PurchasingSettingsRepositoryPort } from "../../application/ports/settings-repository.port";
import { PurchasingSettingsAggregate } from "../../domain/settings.aggregate";

@Injectable()
export class PrismaPurchasingSettingsRepository implements PurchasingSettingsRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByTenant(tenantId: string): Promise<PurchasingSettingsAggregate | null> {
    const data = await this.prisma.purchasingSettings.findFirst({ where: { tenantId } });
    if (!data) {
      return null;
    }
    return PurchasingSettingsAggregate.fromProps({
      id: data.id,
      tenantId: data.tenantId,
      defaultPaymentTerms: data.defaultPaymentTerms ?? null,
      defaultCurrency: data.defaultCurrency,
      poNumberingPrefix: data.poNumberingPrefix,
      poNextNumber: data.poNextNumber,
      billInternalRefPrefix: data.billInternalRefPrefix ?? null,
      billNextNumber: data.billNextNumber ?? null,
      defaultAccountsPayableAccountId: data.defaultAccountsPayableAccountId ?? null,
      defaultExpenseAccountId: data.defaultExpenseAccountId ?? null,
      defaultBankAccountId: data.defaultBankAccountId ?? null,
      autoPostOnBillPost: data.autoPostOnBillPost,
      autoPostOnPaymentRecord: data.autoPostOnPaymentRecord,
      billDuplicateDetectionEnabled: data.billDuplicateDetectionEnabled,
      approvalRequiredForBills: data.approvalRequiredForBills,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  async save(settings: PurchasingSettingsAggregate): Promise<void> {
    const props = settings.toProps();
    await this.prisma.purchasingSettings.upsert({
      where: { tenantId: props.tenantId },
      update: {
        defaultPaymentTerms: props.defaultPaymentTerms,
        defaultCurrency: props.defaultCurrency,
        poNumberingPrefix: props.poNumberingPrefix,
        poNextNumber: props.poNextNumber,
        billInternalRefPrefix: props.billInternalRefPrefix,
        billNextNumber: props.billNextNumber,
        defaultAccountsPayableAccountId: props.defaultAccountsPayableAccountId,
        defaultExpenseAccountId: props.defaultExpenseAccountId,
        defaultBankAccountId: props.defaultBankAccountId,
        autoPostOnBillPost: props.autoPostOnBillPost,
        autoPostOnPaymentRecord: props.autoPostOnPaymentRecord,
        billDuplicateDetectionEnabled: props.billDuplicateDetectionEnabled,
        approvalRequiredForBills: props.approvalRequiredForBills,
        updatedAt: props.updatedAt,
      },
      create: {
        id: props.id,
        tenantId: props.tenantId,
        defaultPaymentTerms: props.defaultPaymentTerms,
        defaultCurrency: props.defaultCurrency,
        poNumberingPrefix: props.poNumberingPrefix,
        poNextNumber: props.poNextNumber,
        billInternalRefPrefix: props.billInternalRefPrefix,
        billNextNumber: props.billNextNumber,
        defaultAccountsPayableAccountId: props.defaultAccountsPayableAccountId,
        defaultExpenseAccountId: props.defaultExpenseAccountId,
        defaultBankAccountId: props.defaultBankAccountId,
        autoPostOnBillPost: props.autoPostOnBillPost,
        autoPostOnPaymentRecord: props.autoPostOnPaymentRecord,
        billDuplicateDetectionEnabled: props.billDuplicateDetectionEnabled,
        approvalRequiredForBills: props.approvalRequiredForBills,
        createdAt: props.createdAt,
        updatedAt: props.updatedAt,
      },
    });
  }
}
