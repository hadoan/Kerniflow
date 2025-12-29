import type { SalesSettingsProps } from "./sales.types";

export class SalesSettingsAggregate {
  private props: SalesSettingsProps;

  constructor(props: SalesSettingsProps) {
    this.props = props;
  }

  static createDefault(params: { id: string; tenantId: string; now: Date }) {
    return new SalesSettingsAggregate({
      id: params.id,
      tenantId: params.tenantId,
      defaultPaymentTerms: null,
      defaultCurrency: "EUR",
      quoteNumberPrefix: "Q-",
      quoteNextNumber: 1,
      orderNumberPrefix: "SO-",
      orderNextNumber: 1,
      invoiceNumberPrefix: "INV-",
      invoiceNextNumber: 1,
      defaultRevenueAccountId: null,
      defaultAccountsReceivableAccountId: null,
      defaultBankAccountId: null,
      autoPostOnIssue: true,
      autoPostOnPayment: true,
      createdAt: params.now,
      updatedAt: params.now,
    });
  }

  get id() {
    return this.props.id;
  }
  get tenantId() {
    return this.props.tenantId;
  }
  get defaultPaymentTerms() {
    return this.props.defaultPaymentTerms ?? null;
  }
  get defaultCurrency() {
    return this.props.defaultCurrency;
  }
  get quoteNumberPrefix() {
    return this.props.quoteNumberPrefix;
  }
  get quoteNextNumber() {
    return this.props.quoteNextNumber;
  }
  get orderNumberPrefix() {
    return this.props.orderNumberPrefix;
  }
  get orderNextNumber() {
    return this.props.orderNextNumber;
  }
  get invoiceNumberPrefix() {
    return this.props.invoiceNumberPrefix;
  }
  get invoiceNextNumber() {
    return this.props.invoiceNextNumber;
  }
  get defaultRevenueAccountId() {
    return this.props.defaultRevenueAccountId ?? null;
  }
  get defaultAccountsReceivableAccountId() {
    return this.props.defaultAccountsReceivableAccountId ?? null;
  }
  get defaultBankAccountId() {
    return this.props.defaultBankAccountId ?? null;
  }
  get autoPostOnIssue() {
    return this.props.autoPostOnIssue;
  }
  get autoPostOnPayment() {
    return this.props.autoPostOnPayment;
  }
  get createdAt() {
    return this.props.createdAt;
  }
  get updatedAt() {
    return this.props.updatedAt;
  }

  updateSettings(
    patch: Partial<Omit<SalesSettingsProps, "id" | "tenantId" | "createdAt">>,
    now: Date
  ) {
    if (patch.defaultPaymentTerms !== undefined) {
      this.props.defaultPaymentTerms = patch.defaultPaymentTerms ?? null;
    }
    if (patch.defaultCurrency !== undefined) {
      this.props.defaultCurrency = patch.defaultCurrency;
    }
    if (patch.quoteNumberPrefix !== undefined) {
      this.props.quoteNumberPrefix = patch.quoteNumberPrefix;
    }
    if (patch.quoteNextNumber !== undefined) {
      this.props.quoteNextNumber = patch.quoteNextNumber;
    }
    if (patch.orderNumberPrefix !== undefined) {
      this.props.orderNumberPrefix = patch.orderNumberPrefix;
    }
    if (patch.orderNextNumber !== undefined) {
      this.props.orderNextNumber = patch.orderNextNumber;
    }
    if (patch.invoiceNumberPrefix !== undefined) {
      this.props.invoiceNumberPrefix = patch.invoiceNumberPrefix;
    }
    if (patch.invoiceNextNumber !== undefined) {
      this.props.invoiceNextNumber = patch.invoiceNextNumber;
    }
    if (patch.defaultRevenueAccountId !== undefined) {
      this.props.defaultRevenueAccountId = patch.defaultRevenueAccountId ?? null;
    }
    if (patch.defaultAccountsReceivableAccountId !== undefined) {
      this.props.defaultAccountsReceivableAccountId =
        patch.defaultAccountsReceivableAccountId ?? null;
    }
    if (patch.defaultBankAccountId !== undefined) {
      this.props.defaultBankAccountId = patch.defaultBankAccountId ?? null;
    }
    if (patch.autoPostOnIssue !== undefined) {
      this.props.autoPostOnIssue = patch.autoPostOnIssue;
    }
    if (patch.autoPostOnPayment !== undefined) {
      this.props.autoPostOnPayment = patch.autoPostOnPayment;
    }
    this.touch(now);
  }

  allocateQuoteNumber(): string {
    const number = `${this.props.quoteNumberPrefix}${this.props.quoteNextNumber
      .toString()
      .padStart(6, "0")}`;
    this.props.quoteNextNumber += 1;
    return number;
  }

  allocateOrderNumber(): string {
    const number = `${this.props.orderNumberPrefix}${this.props.orderNextNumber
      .toString()
      .padStart(6, "0")}`;
    this.props.orderNextNumber += 1;
    return number;
  }

  allocateInvoiceNumber(): string {
    const number = `${this.props.invoiceNumberPrefix}${this.props.invoiceNextNumber
      .toString()
      .padStart(6, "0")}`;
    this.props.invoiceNextNumber += 1;
    return number;
  }

  toProps(): SalesSettingsProps {
    return { ...this.props };
  }

  static fromProps(props: SalesSettingsProps): SalesSettingsAggregate {
    return new SalesSettingsAggregate(props);
  }

  private touch(now: Date) {
    this.props.updatedAt = now;
  }
}
