import { type AuditEntry, type AuditPort } from "../../ports/audit.port";

export class MockAuditPort implements AuditPort {
  public entries: AuditEntry[] = [];

  async write(entry: AuditEntry): Promise<void> {
    this.entries.push(entry);
  }
}
