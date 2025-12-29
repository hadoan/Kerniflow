import { type PrivacyRequestStatus, type PrivacyRequestType } from "./privacy.types";

export class PrivacyRequest {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly subjectUserId: string,
    public readonly requestedByUserId: string,
    public readonly type: PrivacyRequestType,
    public status: PrivacyRequestStatus,
    public resultDocumentId: string | null,
    public resultReportDocumentId: string | null,
    public errorMessage: string | null,
    public readonly createdAt: Date,
    public updatedAt: Date,
    public completedAt: Date | null
  ) {}

  static create(params: {
    id: string;
    tenantId: string;
    subjectUserId: string;
    requestedByUserId: string;
    type: PrivacyRequestType;
    now: Date;
  }) {
    return new PrivacyRequest(
      params.id,
      params.tenantId,
      params.subjectUserId,
      params.requestedByUserId,
      params.type,
      "PENDING",
      null,
      null,
      null,
      params.now,
      params.now,
      null
    );
  }

  markProcessing(now: Date) {
    this.status = "PROCESSING";
    this.updatedAt = now;
  }

  markExportReady(docId: string, now: Date) {
    this.status = "READY";
    this.resultDocumentId = docId;
    this.completedAt = now;
    this.updatedAt = now;
  }

  markErasureCompleted(reportId: string | null, now: Date) {
    this.status = "COMPLETED";
    this.resultReportDocumentId = reportId;
    this.completedAt = now;
    this.updatedAt = now;
  }

  markFailed(message: string, now: Date) {
    this.status = "FAILED";
    this.errorMessage = message;
    this.updatedAt = now;
  }
}
