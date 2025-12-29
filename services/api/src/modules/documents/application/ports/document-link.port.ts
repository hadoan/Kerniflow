import { type DocumentLinkEntityType } from "../../domain/document.types";

export interface DocumentLinkRepoPort {
  createLink(params: {
    tenantId: string;
    documentId: string;
    entityType: DocumentLinkEntityType;
    entityId: string;
  }): Promise<void>;

  findDocumentIds(params: {
    tenantId: string;
    entityType: DocumentLinkEntityType;
    entityId: string;
  }): Promise<string[]>;
}
