import type { AccountingSettingsProps } from "./accounting.types";

export class AccountingSettingsAggregate {
  private props: AccountingSettingsProps;

  constructor(props: AccountingSettingsProps) {
    this.props = props;
  }

  // Factory methods
  static create(params: {
    id: string;
    tenantId: string;
    baseCurrency: string;
    fiscalYearStartMonthDay: string;
    periodLockingEnabled: boolean;
    entryNumberPrefix: string;
    now: Date;
  }): AccountingSettingsAggregate {
    return new AccountingSettingsAggregate({
      id: params.id,
      tenantId: params.tenantId,
      baseCurrency: params.baseCurrency,
      fiscalYearStartMonthDay: params.fiscalYearStartMonthDay,
      periodLockingEnabled: params.periodLockingEnabled,
      entryNumberPrefix: params.entryNumberPrefix,
      nextEntryNumber: 1,
      createdAt: params.now,
      updatedAt: params.now,
    });
  }

  // Getters
  get id(): string {
    return this.props.id;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get baseCurrency(): string {
    return this.props.baseCurrency;
  }

  get fiscalYearStartMonthDay(): string {
    return this.props.fiscalYearStartMonthDay;
  }

  get periodLockingEnabled(): boolean {
    return this.props.periodLockingEnabled;
  }

  get entryNumberPrefix(): string {
    return this.props.entryNumberPrefix;
  }

  get nextEntryNumber(): number {
    return this.props.nextEntryNumber;
  }

  // Business methods
  updateSettings(params: {
    periodLockingEnabled?: boolean;
    entryNumberPrefix?: string;
    now: Date;
  }): void {
    if (params.periodLockingEnabled !== undefined) {
      this.props.periodLockingEnabled = params.periodLockingEnabled;
    }
    if (params.entryNumberPrefix) {
      this.props.entryNumberPrefix = params.entryNumberPrefix;
    }
    this.touch(params.now);
  }

  allocateEntryNumber(): string {
    const number = `${this.props.entryNumberPrefix}${this.props.nextEntryNumber.toString().padStart(6, "0")}`;
    this.props.nextEntryNumber += 1;
    return number;
  }

  private touch(now: Date): void {
    this.props.updatedAt = now;
  }

  // Serialization
  toProps(): AccountingSettingsProps {
    return { ...this.props };
  }

  static fromProps(props: AccountingSettingsProps): AccountingSettingsAggregate {
    return new AccountingSettingsAggregate(props);
  }
}
