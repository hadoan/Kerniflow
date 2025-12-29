import { type DocumentsPort } from "../../application/ports/documents.port";

export class FakeDocumentsPort implements DocumentsPort {
  exports: any[] = [];
  reports: any[] = [];
  async createPrivacyExport(args: {
    tenantId: string;
    subjectUserId: string;
    json: Record<string, unknown>;
  }) {
    this.exports.push(args);
    return { documentId: `doc-export-${this.exports.length}` };
  }

  async createErasureReport(args: {
    tenantId: string;
    subjectUserId: string;
    json: Record<string, unknown>;
  }) {
    this.reports.push(args);
    return { documentId: `doc-report-${this.reports.length}` };
  }
}
