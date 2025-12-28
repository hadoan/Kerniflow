import type { EntryStatus, SourceType } from "@kerniflow/contracts";
import type { JournalEntryProps, JournalLineProps } from "./accounting.types";

export class JournalEntryAggregate {
  private props: JournalEntryProps;

  constructor(props: JournalEntryProps) {
    this.props = props;
  }

  // Factory methods
  static createDraft(params: {
    id: string;
    tenantId: string;
    postingDate: string;
    memo: string;
    lines: JournalLineProps[];
    sourceType?: SourceType;
    sourceId?: string;
    sourceRef?: string;
    createdBy: string;
    now: Date;
  }): JournalEntryAggregate {
    return new JournalEntryAggregate({
      id: params.id,
      tenantId: params.tenantId,
      status: "Draft",
      postingDate: params.postingDate,
      memo: params.memo,
      lines: params.lines,
      sourceType: params.sourceType,
      sourceId: params.sourceId,
      sourceRef: params.sourceRef,
      createdBy: params.createdBy,
      createdAt: params.now,
      updatedAt: params.now,
    });
  }

  static createReversal(params: {
    id: string;
    tenantId: string;
    originalEntry: JournalEntryAggregate;
    reversalDate: string;
    reversalMemo?: string;
    createdBy: string;
    now: Date;
  }): JournalEntryAggregate {
    // Create reversing lines (swap debit/credit)
    const reversingLines = params.originalEntry.props.lines.map((line) => ({
      ...line,
      id: `${params.id}-line-${line.id}`, // New ID for reversing line
      direction: line.direction === "Debit" ? ("Credit" as const) : ("Debit" as const),
    }));

    return new JournalEntryAggregate({
      id: params.id,
      tenantId: params.tenantId,
      status: "Draft",
      postingDate: params.reversalDate,
      memo: params.reversalMemo || `Reversal of ${params.originalEntry.props.memo}`,
      lines: reversingLines,
      sourceType: "Adjustment",
      reversesEntryId: params.originalEntry.id,
      createdBy: params.createdBy,
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

  get entryNumber(): string | undefined {
    return this.props.entryNumber;
  }

  get status(): EntryStatus {
    return this.props.status;
  }

  get postingDate(): string {
    return this.props.postingDate;
  }

  get memo(): string {
    return this.props.memo;
  }

  get lines(): JournalLineProps[] {
    return this.props.lines;
  }

  get sourceType(): SourceType | undefined {
    return this.props.sourceType;
  }

  get sourceId(): string | undefined {
    return this.props.sourceId;
  }

  get reversesEntryId(): string | undefined {
    return this.props.reversesEntryId;
  }

  get reversedByEntryId(): string | undefined {
    return this.props.reversedByEntryId;
  }

  get createdBy(): string {
    return this.props.createdBy;
  }

  get postedBy(): string | undefined {
    return this.props.postedBy;
  }

  get postedAt(): Date | undefined {
    return this.props.postedAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  // Business methods
  updateDraft(params: {
    postingDate?: string;
    memo?: string;
    lines?: JournalLineProps[];
    now: Date;
  }): void {
    if (this.props.status !== "Draft") {
      throw new Error("Only draft entries can be updated");
    }

    if (params.postingDate) {
      this.props.postingDate = params.postingDate;
    }
    if (params.memo) {
      this.props.memo = params.memo;
    }
    if (params.lines) {
      this.props.lines = params.lines;
    }
    this.touch(params.now);
  }

  post(params: { entryNumber: string; postedBy: string; now: Date }): void {
    if (this.props.status !== "Draft") {
      throw new Error("Only draft entries can be posted");
    }

    // Validate balanced
    if (!this.isBalanced()) {
      const imbalance = this.calculateImbalance();
      throw new Error(
        `Entry is unbalanced by ${Math.abs(imbalance)} ${this.props.lines[0]?.currency || ""}`
      );
    }

    // Validate at least 2 lines
    if (this.props.lines.length < 2) {
      throw new Error("At least 2 lines are required to post an entry");
    }

    this.props.status = "Posted";
    this.props.entryNumber = params.entryNumber;
    this.props.postedBy = params.postedBy;
    this.props.postedAt = params.now;
    this.touch(params.now);
  }

  markAsReversed(reversedByEntryId: string, now: Date): void {
    if (this.props.status !== "Posted") {
      throw new Error("Only posted entries can be reversed");
    }
    if (this.props.reversedByEntryId) {
      throw new Error("Entry has already been reversed");
    }

    this.props.status = "Reversed";
    this.props.reversedByEntryId = reversedByEntryId;
    this.touch(now);
  }

  // Validation helpers
  isBalanced(): boolean {
    return this.calculateImbalance() === 0;
  }

  calculateImbalance(): number {
    const totalDebits = this.props.lines
      .filter((l) => l.direction === "Debit")
      .reduce((sum, l) => sum + l.amountCents, 0);

    const totalCredits = this.props.lines
      .filter((l) => l.direction === "Credit")
      .reduce((sum, l) => sum + l.amountCents, 0);

    return totalDebits - totalCredits;
  }

  getTotalDebits(): number {
    return this.props.lines
      .filter((l) => l.direction === "Debit")
      .reduce((sum, l) => sum + l.amountCents, 0);
  }

  getTotalCredits(): number {
    return this.props.lines
      .filter((l) => l.direction === "Credit")
      .reduce((sum, l) => sum + l.amountCents, 0);
  }

  private touch(now: Date): void {
    this.props.updatedAt = now;
  }

  // Serialization
  toProps(): JournalEntryProps {
    return { ...this.props, lines: [...this.props.lines] };
  }

  static fromProps(props: JournalEntryProps): JournalEntryAggregate {
    return new JournalEntryAggregate(props);
  }
}
