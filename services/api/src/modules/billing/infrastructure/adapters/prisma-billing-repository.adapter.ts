import { Injectable } from "@nestjs/common";
import {
  Prisma,
  BillingAccount,
  BillingProviderEvent,
  BillingSubscription,
  BillingTrial,
  BillingUsageCounter,
} from "@prisma/client";
import { PrismaService, getPrismaClient } from "@corely/data";
import type { TransactionContext } from "@corely/kernel";
import type {
  BillingPlanCode,
  BillingProductKey,
  BillingSubscriptionStatus,
  BillingTrialStatus,
  BillingUsageMetricKey,
} from "@corely/contracts";
import {
  billingContractStatusFor,
  billingDbStatusFor,
} from "../../application/billing-access.service";
import type {
  BillingAccountRecord,
  BillingAccountRepoPort,
  BillingProviderEventRecord,
  BillingProviderEventRepoPort,
  BillingSubscriptionRecord,
  BillingSubscriptionRepoPort,
  BillingTenantProfile,
  BillingTrialRecord,
  BillingTrialRepoPort,
  BillingUsageCounterRecord,
  BillingUsageRepoPort,
} from "../../application/ports/billing-repository.port";

const toProviderEnum = (provider: "stripe" | null | undefined): "STRIPE" | null | undefined => {
  if (provider === undefined) {
    return undefined;
  }

  return provider === null ? null : "STRIPE";
};

const toJsonValue = (
  value: unknown
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return Prisma.JsonNull;
  }

  return value as Prisma.InputJsonValue;
};

const toRequiredJsonValue = (value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull => {
  if (value === null || value === undefined) {
    return Prisma.JsonNull;
  }

  return value as Prisma.InputJsonValue;
};

@Injectable()
export class PrismaBillingRepositoryAdapter
  implements
    BillingAccountRepoPort,
    BillingSubscriptionRepoPort,
    BillingTrialRepoPort,
    BillingUsageRepoPort,
    BillingProviderEventRepoPort
{
  constructor(private readonly prisma: PrismaService) {}

  private client(tx?: TransactionContext): PrismaService {
    return getPrismaClient(this.prisma, tx);
  }

  async findAccountByTenantId(
    tenantId: string,
    tx?: TransactionContext
  ): Promise<BillingAccountRecord | null> {
    const row = await this.client(tx).billingAccount.findUnique({
      where: { tenantId },
    });
    return row ? this.mapAccount(row) : null;
  }

  async upsertAccount(
    input: {
      tenantId: string;
      provider: "stripe" | null;
      providerCustomerRef?: string | null;
      billingCurrency?: string;
      email?: string | null;
    },
    tx?: TransactionContext
  ): Promise<BillingAccountRecord> {
    const providerVal = input.provider !== undefined ? toProviderEnum(input.provider) : undefined;

    const row = await this.client(tx).billingAccount.upsert({
      where: { tenantId: input.tenantId },
      update: {
        ...(providerVal !== undefined ? { provider: providerVal } : {}),
        ...(input.providerCustomerRef !== undefined
          ? { providerCustomerRef: input.providerCustomerRef }
          : {}),
        ...(input.billingCurrency ? { billingCurrency: input.billingCurrency } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
      },
      create: {
        tenantId: input.tenantId,
        provider: providerVal ?? null,
        providerCustomerRef: input.providerCustomerRef ?? null,
        billingCurrency: input.billingCurrency ?? "EUR",
        email: input.email ?? null,
      },
    });

    return this.mapAccount(row);
  }

  async getTenantProfile(tenantId: string): Promise<BillingTenantProfile> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
      },
    });

    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    return {
      tenantId: tenant.id,
      name: tenant.name,
      primaryEmail: null,
      workspaceCount: await this.prisma.workspace.count({
        where: {
          tenantId,
        },
      }),
    };
  }

  async findByProviderSubscriptionRef(
    provider: "stripe",
    subscriptionRef: string,
    tx?: TransactionContext
  ): Promise<BillingSubscriptionRecord | null> {
    const row = await this.client(tx).billingSubscription.findFirst({
      where: {
        provider: toProviderEnum(provider) ?? "STRIPE",
        providerSubscriptionRef: subscriptionRef,
      },
    });
    return row ? this.mapSubscription(row) : null;
  }

  async findSubscriptionByTenantId(
    tenantId: string,
    productKey: BillingProductKey,
    tx?: TransactionContext
  ): Promise<BillingSubscriptionRecord | null> {
    const row = await this.client(tx).billingSubscription.findUnique({
      where: {
        tenantId_productKey: {
          tenantId,
          productKey,
        },
      },
    });
    return row ? this.mapSubscription(row) : null;
  }

  async listSubscriptionsByTenantId(
    tenantId: string,
    tx?: TransactionContext
  ): Promise<BillingSubscriptionRecord[]> {
    const rows = await this.client(tx).billingSubscription.findMany({
      where: { tenantId },
      orderBy: [{ createdAt: "asc" }],
    });
    return rows.map((row) => this.mapSubscription(row));
  }

  async upsertSubscription(
    input: {
      tenantId: string;
      productKey: BillingProductKey;
      accountId: string;
      planCode: BillingPlanCode;
      provider: "stripe" | null;
      providerSubscriptionRef?: string | null;
      providerPriceRef?: string | null;
      status: BillingSubscriptionStatus;
      currentPeriodStart?: Date | null;
      currentPeriodEnd?: Date | null;
      cancelAtPeriodEnd?: boolean;
      canceledAt?: Date | null;
      trialEndsAt?: Date | null;
      rawSnapshotJson?: unknown;
      lastSyncedAt?: Date | null;
    },
    tx?: TransactionContext
  ): Promise<BillingSubscriptionRecord> {
    const row = await this.client(tx).billingSubscription.upsert({
      where: {
        tenantId_productKey: {
          tenantId: input.tenantId,
          productKey: input.productKey,
        },
      },
      create: {
        tenantId: input.tenantId,
        productKey: input.productKey,
        accountId: input.accountId,
        planCode: input.planCode,
        provider: toProviderEnum(input.provider) ?? null,
        providerSubscriptionRef: input.providerSubscriptionRef ?? null,
        providerPriceRef: input.providerPriceRef ?? null,
        status: billingDbStatusFor(input.status),
        currentPeriodStart: input.currentPeriodStart ?? null,
        currentPeriodEnd: input.currentPeriodEnd ?? null,
        cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
        canceledAt: input.canceledAt ?? null,
        trialEndsAt: input.trialEndsAt ?? null,
        rawSnapshotJson: toJsonValue(input.rawSnapshotJson) ?? Prisma.JsonNull,
        lastSyncedAt: input.lastSyncedAt ?? null,
      },
      update: {
        accountId: input.accountId,
        planCode: input.planCode,
        provider: toProviderEnum(input.provider) ?? null,
        providerSubscriptionRef: input.providerSubscriptionRef ?? null,
        providerPriceRef: input.providerPriceRef ?? null,
        status: billingDbStatusFor(input.status),
        currentPeriodStart: input.currentPeriodStart ?? null,
        currentPeriodEnd: input.currentPeriodEnd ?? null,
        cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
        canceledAt: input.canceledAt ?? null,
        trialEndsAt: input.trialEndsAt ?? null,
        rawSnapshotJson: toJsonValue(input.rawSnapshotJson) ?? Prisma.JsonNull,
        lastSyncedAt: input.lastSyncedAt ?? null,
      },
    });

    return this.mapSubscription(row);
  }

  async findTrialByTenantId(
    tenantId: string,
    productKey: BillingProductKey,
    tx?: TransactionContext
  ): Promise<BillingTrialRecord | null> {
    const row = await this.client(tx).billingTrial.findUnique({
      where: {
        tenantId_productKey: {
          tenantId,
          productKey,
        },
      },
    });
    return row ? this.mapTrial(row) : null;
  }

  async listTrialsEndingBefore(
    endsBefore: Date,
    tx?: TransactionContext
  ): Promise<BillingTrialRecord[]> {
    const rows = await this.client(tx).billingTrial.findMany({
      where: {
        status: "ACTIVE",
        endsAt: {
          lte: endsBefore,
        },
      },
      orderBy: [{ endsAt: "asc" }],
    });
    return rows.map((row) => this.mapTrial(row));
  }

  async upsertTrial(
    input: {
      tenantId: string;
      productKey: BillingProductKey;
      accountId: string;
      planCode: BillingPlanCode;
      status: Exclude<BillingTrialStatus, "not_started">;
      startedAt: Date;
      endsAt: Date;
      expiredAt?: Date | null;
      supersededAt?: Date | null;
      activatedByUserId?: string | null;
      source?: string | null;
    },
    tx?: TransactionContext
  ): Promise<BillingTrialRecord> {
    const row = await this.client(tx).billingTrial.upsert({
      where: {
        tenantId_productKey: {
          tenantId: input.tenantId,
          productKey: input.productKey,
        },
      },
      create: {
        tenantId: input.tenantId,
        productKey: input.productKey,
        accountId: input.accountId,
        planCode: input.planCode,
        status:
          input.status === "active"
            ? "ACTIVE"
            : input.status === "expired"
              ? "EXPIRED"
              : "SUPERSEDED_BY_SUBSCRIPTION",
        startedAt: input.startedAt,
        endsAt: input.endsAt,
        expiredAt: input.expiredAt ?? null,
        supersededAt: input.supersededAt ?? null,
        activatedByUserId: input.activatedByUserId ?? null,
        source: input.source ?? null,
      },
      update: {
        accountId: input.accountId,
        planCode: input.planCode,
        status:
          input.status === "active"
            ? "ACTIVE"
            : input.status === "expired"
              ? "EXPIRED"
              : "SUPERSEDED_BY_SUBSCRIPTION",
        startedAt: input.startedAt,
        endsAt: input.endsAt,
        expiredAt: input.expiredAt ?? null,
        supersededAt: input.supersededAt ?? null,
        activatedByUserId: input.activatedByUserId ?? null,
        source: input.source ?? null,
      },
    });

    return this.mapTrial(row);
  }

  async listUsage(
    tenantId: string,
    productKey: BillingProductKey,
    tx?: TransactionContext
  ): Promise<BillingUsageCounterRecord[]> {
    const rows = await this.client(tx).billingUsageCounter.findMany({
      where: {
        tenantId,
        productKey,
      },
      orderBy: [{ periodStart: "desc" }],
    });
    return rows.map((row) => this.mapUsage(row));
  }

  async incrementUsage(
    input: {
      tenantId: string;
      productKey: BillingProductKey;
      metricKey: BillingUsageMetricKey;
      periodStart: Date;
      periodEnd: Date;
      quantity: number;
    },
    tx?: TransactionContext
  ): Promise<void> {
    await this.client(tx).billingUsageCounter.upsert({
      where: {
        tenantId_productKey_metricKey_periodStart_periodEnd: {
          tenantId: input.tenantId,
          productKey: input.productKey,
          metricKey: input.metricKey,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
        },
      },
      create: {
        tenantId: input.tenantId,
        productKey: input.productKey,
        metricKey: input.metricKey,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        quantity: input.quantity,
      },
      update: {
        quantity: { increment: input.quantity },
      },
    });
  }

  async findByExternalEventId(
    provider: "stripe",
    externalEventId: string,
    tx?: TransactionContext
  ): Promise<BillingProviderEventRecord | null> {
    const row = await this.client(tx).billingProviderEvent.findFirst({
      where: {
        provider: toProviderEnum(provider) ?? "STRIPE",
        externalEventId,
      },
    });
    return row ? this.mapProviderEvent(row) : null;
  }

  async createEvent(
    input: {
      tenantId: string;
      accountId?: string | null;
      provider: "stripe";
      externalEventId: string;
      eventType: string;
      payloadJson: unknown;
    },
    tx?: TransactionContext
  ): Promise<BillingProviderEventRecord> {
    const row = await this.client(tx).billingProviderEvent.create({
      data: {
        tenantId: input.tenantId,
        accountId: input.accountId ?? null,
        provider: toProviderEnum(input.provider) ?? "STRIPE",
        externalEventId: input.externalEventId,
        eventType: input.eventType,
        payloadJson: toRequiredJsonValue(input.payloadJson),
      },
    });
    return this.mapProviderEvent(row);
  }

  async markProcessed(eventId: string, tx?: TransactionContext): Promise<void> {
    await this.client(tx).billingProviderEvent.update({
      where: { id: eventId },
      data: {
        status: "PROCESSED",
        processedAt: new Date(),
        errorMessage: null,
      },
    });
  }

  async markFailed(eventId: string, errorMessage: string, tx?: TransactionContext): Promise<void> {
    await this.client(tx).billingProviderEvent.update({
      where: { id: eventId },
      data: {
        status: "FAILED",
        errorMessage,
      },
    });
  }

  async markIgnored(eventId: string, tx?: TransactionContext): Promise<void> {
    await this.client(tx).billingProviderEvent.update({
      where: { id: eventId },
      data: {
        status: "IGNORED",
        processedAt: new Date(),
      },
    });
  }

  private mapAccount(row: BillingAccount): BillingAccountRecord {
    return {
      id: row.id,
      tenantId: row.tenantId,
      provider: row.provider ? (row.provider.toLowerCase() as "stripe") : null,
      providerCustomerRef: row.providerCustomerRef,
      billingCurrency: row.billingCurrency,
      email: row.email,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapSubscription(row: BillingSubscription): BillingSubscriptionRecord {
    return {
      id: row.id,
      tenantId: row.tenantId,
      productKey: row.productKey as BillingProductKey,
      accountId: row.accountId,
      planCode: row.planCode as BillingPlanCode,
      provider: row.provider ? (row.provider.toLowerCase() as "stripe") : null,
      providerSubscriptionRef: row.providerSubscriptionRef,
      providerPriceRef: row.providerPriceRef,
      status: billingContractStatusFor(row.status),
      currentPeriodStart: row.currentPeriodStart,
      currentPeriodEnd: row.currentPeriodEnd,
      cancelAtPeriodEnd: row.cancelAtPeriodEnd,
      canceledAt: row.canceledAt,
      trialEndsAt: row.trialEndsAt,
      rawSnapshotJson: row.rawSnapshotJson,
      lastSyncedAt: row.lastSyncedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapUsage(row: BillingUsageCounter): BillingUsageCounterRecord {
    return {
      id: row.id,
      tenantId: row.tenantId,
      productKey: row.productKey as BillingProductKey,
      metricKey: row.metricKey as BillingUsageMetricKey,
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      quantity: row.quantity,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapTrial(row: BillingTrial): BillingTrialRecord {
    return {
      id: row.id,
      tenantId: row.tenantId,
      productKey: row.productKey as BillingProductKey,
      accountId: row.accountId,
      planCode: row.planCode as BillingPlanCode,
      status:
        row.status === "ACTIVE"
          ? "active"
          : row.status === "EXPIRED"
            ? "expired"
            : "superseded_by_subscription",
      startedAt: row.startedAt,
      endsAt: row.endsAt,
      expiredAt: row.expiredAt,
      supersededAt: row.supersededAt,
      activatedByUserId: row.activatedByUserId,
      source: row.source,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapProviderEvent(row: BillingProviderEvent): BillingProviderEventRecord {
    return {
      id: row.id,
      tenantId: row.tenantId,
      accountId: row.accountId,
      provider: row.provider.toLowerCase() as "stripe",
      externalEventId: row.externalEventId,
      eventType: row.eventType,
      payloadJson: row.payloadJson,
      status: row.status.toLowerCase() as BillingProviderEventRecord["status"],
      errorMessage: row.errorMessage,
      processedAt: row.processedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
