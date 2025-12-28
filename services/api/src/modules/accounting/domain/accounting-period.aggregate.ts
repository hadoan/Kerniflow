import type { PeriodStatus } from "@kerniflow/contracts";
import type { AccountingPeriodProps } from "./accounting.types";

export class AccountingPeriodAggregate {
  private props: AccountingPeriodProps;

  constructor(props: AccountingPeriodProps) {
    this.props = props;
  }

  // Factory methods
  static create(params: {
    id: string;
    tenantId: string;
    fiscalYearId: string;
    name: string;
    startDate: string;
    endDate: string;
    now: Date;
  }): AccountingPeriodAggregate {
    return new AccountingPeriodAggregate({
      id: params.id,
      tenantId: params.tenantId,
      fiscalYearId: params.fiscalYearId,
      name: params.name,
      startDate: params.startDate,
      endDate: params.endDate,
      status: "Open",
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

  get fiscalYearId(): string {
    return this.props.fiscalYearId;
  }

  get name(): string {
    return this.props.name;
  }

  get startDate(): string {
    return this.props.startDate;
  }

  get endDate(): string {
    return this.props.endDate;
  }

  get status(): PeriodStatus {
    return this.props.status;
  }

  get closedAt(): Date | undefined {
    return this.props.closedAt;
  }

  get closedBy(): string | undefined {
    return this.props.closedBy;
  }

  // Business methods
  close(closedBy: string, now: Date): void {
    if (this.props.status === "Closed") {
      throw new Error("Period is already closed");
    }

    this.props.status = "Closed";
    this.props.closedBy = closedBy;
    this.props.closedAt = now;
    this.touch(now);
  }

  reopen(now: Date): void {
    if (this.props.status !== "Closed") {
      throw new Error("Period is not closed");
    }

    this.props.status = "Open";
    this.props.closedBy = undefined;
    this.props.closedAt = undefined;
    this.touch(now);
  }

  containsDate(date: string): boolean {
    return date >= this.props.startDate && date <= this.props.endDate;
  }

  private touch(now: Date): void {
    this.props.updatedAt = now;
  }

  // Serialization
  toProps(): AccountingPeriodProps {
    return { ...this.props };
  }

  static fromProps(props: AccountingPeriodProps): AccountingPeriodAggregate {
    return new AccountingPeriodAggregate(props);
  }
}
