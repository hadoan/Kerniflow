import { Injectable } from "@nestjs/common";
import { prisma } from "@kerniflow/data";
import { DocumentRepoPort } from "../../application/ports/document-repo.port";
import { DocumentAggregate } from "../../domain/document.aggregate";
import { FileEntity } from "../../domain/file.entity";
import { DocumentLinkEntityType, DocumentStatus, DocumentType } from "../../domain/document.types";

const mapFile = (row: any): FileEntity =>
  new FileEntity({
    id: row.id,
    tenantId: row.tenantId,
    documentId: row.documentId,
    kind: row.kind,
    storageProvider: row.storageProvider,
    bucket: row.bucket,
    objectKey: row.objectKey,
    contentType: row.contentType,
    sizeBytes: row.sizeBytes,
    sha256: row.sha256,
    createdAt: row.createdAt,
  });

const mapDocument = (row: any): DocumentAggregate =>
  new DocumentAggregate({
    id: row.id,
    tenantId: row.tenantId,
    type: row.type as DocumentType,
    status: row.status as DocumentStatus,
    title: row.title,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    errorMessage: row.errorMessage,
    files: (row.files ?? []).map(mapFile),
  });

@Injectable()
export class PrismaDocumentRepoAdapter implements DocumentRepoPort {
  async create(document: DocumentAggregate): Promise<void> {
    await prisma.document.create({
      data: {
        id: document.id,
        tenantId: document.tenantId,
        type: document.type as any,
        status: document.status as any,
        title: document.title,
        errorMessage: document.errorMessage,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      },
    });
  }

  async save(document: DocumentAggregate): Promise<void> {
    await prisma.document.update({
      where: { id: document.id },
      data: {
        status: document.status as any,
        title: document.title,
        errorMessage: document.errorMessage,
        updatedAt: document.updatedAt,
      },
    });
  }

  async findById(tenantId: string, documentId: string): Promise<DocumentAggregate | null> {
    const doc = await prisma.document.findFirst({
      where: { id: documentId, tenantId },
      include: { files: true },
    });
    if (!doc) return null;
    return mapDocument(doc);
  }

  async findByTypeAndEntityLink(
    tenantId: string,
    type: DocumentType,
    entityType: DocumentLinkEntityType,
    entityId: string
  ): Promise<DocumentAggregate | null> {
    const link = await prisma.documentLink.findFirst({
      where: { tenantId, entityType: entityType as any, entityId },
      include: { document: { include: { files: true } } },
    });
    if (!link || link.document.type !== type) {
      return null;
    }
    return mapDocument(link.document);
  }
}
