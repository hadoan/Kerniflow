import type { LocalDate } from "@kerniflow/kernel";
import type {
  InventoryDocumentLine,
  InventoryDocumentProps,
  InventoryDocumentStatus,
  InventoryDocumentType,
} from "./inventory.types";

export class InventoryDocumentAggregate {
  id: string;
  tenantId: string;
  documentType: InventoryDocumentType;
  documentNumber: string | null;
  status: InventoryDocumentStatus;
  reference: string | null;
  scheduledDate: LocalDate | null;
  postingDate: LocalDate | null;
  notes: string | null;
  partyId: string | null;
  sourceType: string | null;
  sourceId: string | null;
  lines: InventoryDocumentLine[];
  createdAt: Date;
  updatedAt: Date;
  confirmedAt: Date | null;
  postedAt: Date | null;
  canceledAt: Date | null;

  constructor(props: InventoryDocumentProps) {
    this.id = props.id;
    this.tenantId = props.tenantId;
    this.documentType = props.documentType;
    this.documentNumber = props.documentNumber;
    this.status = props.status;
    this.reference = props.reference ?? null;
    this.scheduledDate = props.scheduledDate ?? null;
    this.postingDate = props.postingDate ?? null;
    this.notes = props.notes ?? null;
    this.partyId = props.partyId ?? null;
    this.sourceType = props.sourceType ?? null;
    this.sourceId = props.sourceId ?? null;
    this.lines = props.lines;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.confirmedAt = props.confirmedAt ?? null;
    this.postedAt = props.postedAt ?? null;
    this.canceledAt = props.canceledAt ?? null;
  }

  static createDraft(params: {
    id: string;
    tenantId: string;
    documentType: InventoryDocumentType;
    reference?: string | null;
    scheduledDate?: LocalDate | null;
    postingDate?: LocalDate | null;
    notes?: string | null;
    partyId?: string | null;
    sourceType?: string | null;
    sourceId?: string | null;
    lines: InventoryDocumentLine[];
    now: Date;
  }): InventoryDocumentAggregate {
    return new InventoryDocumentAggregate({
      id: params.id,
      tenantId: params.tenantId,
      documentType: params.documentType,
      documentNumber: null,
      status: "DRAFT",
      reference: params.reference ?? null,
      scheduledDate: params.scheduledDate ?? null,
      postingDate: params.postingDate ?? null,
      notes: params.notes ?? null,
      partyId: params.partyId ?? null,
      sourceType: params.sourceType ?? null,
      sourceId: params.sourceId ?? null,
      lines: params.lines,
      createdAt: params.now,
      updatedAt: params.now,
      confirmedAt: null,
      postedAt: null,
      canceledAt: null,
    });
  }

  updateHeader(
    patch: Partial<
      Pick<
        InventoryDocumentProps,
        | "reference"
        | "scheduledDate"
        | "postingDate"
        | "notes"
        | "partyId"
        | "sourceType"
        | "sourceId"
      >
    >,
    now: Date
  ) {
    this.ensureDraft();
    if (patch.reference !== undefined) {
      this.reference = patch.reference ?? null;
    }
    if (patch.scheduledDate !== undefined) {
      this.scheduledDate = patch.scheduledDate ?? null;
    }
    if (patch.postingDate !== undefined) {
      this.postingDate = patch.postingDate ?? null;
    }
    if (patch.notes !== undefined) {
      this.notes = patch.notes ?? null;
    }
    if (patch.partyId !== undefined) {
      this.partyId = patch.partyId ?? null;
    }
    if (patch.sourceType !== undefined) {
      this.sourceType = patch.sourceType ?? null;
    }
    if (patch.sourceId !== undefined) {
      this.sourceId = patch.sourceId ?? null;
    }
    this.touch(now);
  }

  replaceLineItems(lineItems: InventoryDocumentLine[], now: Date) {
    this.ensureDraft();
    this.lines = lineItems;
    this.touch(now);
  }

  confirm(documentNumber: string, confirmedAt: Date, now: Date) {
    this.ensureDraft();
    if (!this.lines.length) {
      throw new Error("Document must have at least one line item");
    }
    this.documentNumber = documentNumber;
    this.status = "CONFIRMED";
    this.confirmedAt = confirmedAt;
    this.touch(now);
  }

  post(postedAt: Date, now: Date) {
    if (this.status !== "CONFIRMED") {
      throw new Error("Only confirmed documents can be posted");
    }
    this.status = "POSTED";
    this.postedAt = postedAt;
    this.touch(now);
  }

  cancel(canceledAt: Date, now: Date) {
    if (this.status === "POSTED") {
      throw new Error("Posted documents cannot be canceled");
    }
    this.status = "CANCELED";
    this.canceledAt = canceledAt;
    this.touch(now);
  }

  setPostingDate(postingDate: LocalDate, now: Date) {
    this.postingDate = postingDate;
    this.touch(now);
  }

  private ensureDraft() {
    if (this.status !== "DRAFT") {
      throw new Error("Document is not editable unless in draft");
    }
  }

  private touch(now: Date) {
    this.updatedAt = now;
  }
}
