import type { AccountType } from "@corely/contracts";
import type { LedgerAccountProps } from "./accounting.types";

export class LedgerAccountAggregate {
  private props: LedgerAccountProps;

  constructor(props: LedgerAccountProps) {
    this.props = props;
  }

  // Factory methods
  static create(params: {
    id: string;
    tenantId: string;
    code: string;
    name: string;
    type: AccountType;
    description?: string;
    systemAccountKey?: string;
    isActive?: boolean;
    now: Date;
  }): LedgerAccountAggregate {
    return new LedgerAccountAggregate({
      id: params.id,
      tenantId: params.tenantId,
      code: params.code,
      name: params.name,
      type: params.type,
      isActive: params.isActive ?? true,
      description: params.description,
      systemAccountKey: params.systemAccountKey,
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

  get code(): string {
    return this.props.code;
  }

  get name(): string {
    return this.props.name;
  }

  get type(): AccountType {
    return this.props.type;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get description(): string | undefined {
    return this.props.description;
  }

  get systemAccountKey(): string | undefined {
    return this.props.systemAccountKey;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  // Business methods
  update(params: { name?: string; description?: string; now: Date }): void {
    if (params.name) {
      this.props.name = params.name;
    }
    if (params.description !== undefined) {
      this.props.description = params.description;
    }
    this.touch(params.now);
  }

  activate(now: Date): void {
    this.props.isActive = true;
    this.touch(now);
  }

  deactivate(now: Date): void {
    this.props.isActive = false;
    this.touch(now);
  }

  private touch(now: Date): void {
    this.props.updatedAt = now;
  }

  // Serialization
  toProps(): LedgerAccountProps {
    return { ...this.props };
  }

  static fromProps(props: LedgerAccountProps): LedgerAccountAggregate {
    return new LedgerAccountAggregate(props);
  }
}
