import type { ShiftSession as ShiftSessionDto } from "@corely/contracts";

/**
 * Shift Session Aggregate - Register operating session
 */
export class ShiftSession {
  constructor(
    public readonly id: string,
    public readonly registerId: string,
    public readonly workspaceId: string,
    public readonly openedByEmployeePartyId: string,
    public readonly openedAt: Date,
    public startingCashCents: number | null,
    public status: "OPEN" | "CLOSED",
    public closedAt: Date | null,
    public closedByEmployeePartyId: string | null,
    public closingCashCents: number | null,
    public totalSalesCents: number,
    public totalCashReceivedCents: number,
    public varianceCents: number | null,
    public notes: string | null,
    public readonly createdAt: Date,
    public updatedAt: Date
  ) {}

  /**
   * Close the shift session
   */
  close(data: {
    closedByEmployeePartyId: string;
    closingCashCents: number | null;
    totalSalesCents: number;
    totalCashReceivedCents: number;
    notes?: string;
  }): void {
    if (this.status === "CLOSED") {
      throw new Error("Shift session is already closed");
    }

    this.status = "CLOSED";
    this.closedAt = new Date();
    this.closedByEmployeePartyId = data.closedByEmployeePartyId;
    this.closingCashCents = data.closingCashCents;
    this.totalSalesCents = data.totalSalesCents;
    this.totalCashReceivedCents = data.totalCashReceivedCents;

    // Calculate variance: closing - starting - cash received
    if (this.closingCashCents !== null && this.startingCashCents !== null) {
      this.varianceCents =
        this.closingCashCents - this.startingCashCents - this.totalCashReceivedCents;
    }

    if (data.notes) {
      this.notes = data.notes;
    }

    this.updatedAt = new Date();
  }

  /**
   * Check if session is open
   */
  isOpen(): boolean {
    return this.status === "OPEN";
  }

  /**
   * Convert to DTO
   */
  toDto(): ShiftSessionDto {
    return {
      sessionId: this.id,
      registerId: this.registerId,
      workspaceId: this.workspaceId,
      openedByEmployeePartyId: this.openedByEmployeePartyId,
      openedAt: this.openedAt,
      startingCashCents: this.startingCashCents,
      status: this.status,
      closedAt: this.closedAt,
      closedByEmployeePartyId: this.closedByEmployeePartyId,
      closingCashCents: this.closingCashCents,
      totalSalesCents: this.totalSalesCents,
      totalCashReceivedCents: this.totalCashReceivedCents,
      varianceCents: this.varianceCents,
      notes: this.notes,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
