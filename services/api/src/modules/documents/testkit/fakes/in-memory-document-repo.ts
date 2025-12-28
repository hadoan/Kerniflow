import { type DocumentRepoPort } from "../../application/ports/document-repository.port";
import { type DocumentAggregate } from "../../domain/document.aggregate";
import { type DocumentLinkEntityType, type DocumentType } from "../../domain/document.types";

export class InMemoryDocumentRepo implements DocumentRepoPort {
  documents = new Map<string, DocumentAggregate>();
  links = new Map<string, string>();

  async create(document: DocumentAggregate): Promise<void> {
    this.documents.set(document.id, document);
  }

  async save(document: DocumentAggregate): Promise<void> {
    this.documents.set(document.id, document);
  }

  async findById(
    tenantId: string,
    documentId: string,
    opts?: { includeArchived?: boolean }
  ): Promise<DocumentAggregate | null> {
    const doc = this.documents.get(documentId);
    if (!doc || doc.tenantId !== tenantId) {
      return null;
    }
    if (!opts?.includeArchived && doc.archivedAt) {
      return null;
    }
    return doc;
  }

  async findByTypeAndEntityLink(
    tenantId: string,
    type: DocumentType,
    entityType: DocumentLinkEntityType,
    entityId: string
  ): Promise<DocumentAggregate | null> {
    const key = this.buildLinkKey(tenantId, entityType, entityId);
    const docId = this.links.get(key);
    if (!docId) {
      return null;
    }
    const doc = this.documents.get(docId);
    if (!doc || doc.type !== type || doc.archivedAt) {
      return null;
    }
    return doc;
  }

  registerLink(
    tenantId: string,
    entityType: DocumentLinkEntityType,
    entityId: string,
    documentId: string
  ) {
    const key = this.buildLinkKey(tenantId, entityType, entityId);
    this.links.set(key, documentId);
  }

  private buildLinkKey(tenantId: string, entityType: DocumentLinkEntityType, entityId: string) {
    return `${tenantId}:${entityType}:${entityId}`;
  }
}
