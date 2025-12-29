import { type DocumentLinkRepoPort } from "../../application/ports/document-link.port";
import { type DocumentLinkEntityType } from "../../domain/document.types";
import { type InMemoryDocumentRepo } from "./in-memory-document-repo";

export class InMemoryDocumentLinkRepo implements DocumentLinkRepoPort {
  links: Array<{
    tenantId: string;
    documentId: string;
    entityType: DocumentLinkEntityType;
    entityId: string;
  }> = [];

  constructor(private readonly documentRepo: InMemoryDocumentRepo) {}

  async createLink(params: {
    tenantId: string;
    documentId: string;
    entityType: DocumentLinkEntityType;
    entityId: string;
  }): Promise<void> {
    if (
      this.links.some(
        (link) =>
          link.tenantId === params.tenantId &&
          link.documentId === params.documentId &&
          link.entityType === params.entityType &&
          link.entityId === params.entityId
      )
    ) {
      return;
    }
    this.links.push(params);
    this.documentRepo.registerLink(
      params.tenantId,
      params.entityType,
      params.entityId,
      params.documentId
    );
  }

  async findDocumentIds(params: {
    tenantId: string;
    entityType: DocumentLinkEntityType;
    entityId: string;
  }): Promise<string[]> {
    return this.links
      .filter(
        (link) =>
          link.tenantId === params.tenantId &&
          link.entityType === params.entityType &&
          link.entityId === params.entityId
      )
      .map((link) => link.documentId);
  }
}
