import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import { DocumentRepoPort } from "../../application/ports/document-repository.port";
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
    archivedAt: row.archivedAt,
    archivedByUserId: row.archivedByUserId,
    files: (row.files ?? []).map(mapFile),
  });

@Injectable()
export class PrismaDocumentRepoAdapter implements DocumentRepoPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(document: DocumentAggregate): Promise<void> {
    await this.prisma.document.create({
      data: {
        id: document.id,
        tenantId: document.tenantId,
        type: document.type as any,
        status: document.status as any,
        title: document.title,
        errorMessage: document.errorMessage,
        archivedAt: document.archivedAt,
        archivedByUserId: document.archivedByUserId,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      } as any,
    });
  }

  async save(document: DocumentAggregate): Promise<void> {
    await this.prisma.document.update({
      where: { id: document.id },
      data: {
        status: document.status as any,
        title: document.title,
        errorMessage: document.errorMessage,
        archivedAt: document.archivedAt,
        archivedByUserId: document.archivedByUserId,
        updatedAt: document.updatedAt,
      } as any,
    });
  }

  async findById(
    tenantId: string,
    documentId: string,
    opts?: { includeArchived?: boolean }
  ): Promise<DocumentAggregate | null> {
    const doc = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        tenantId,
        ...(opts?.includeArchived ? {} : { archivedAt: null }),
      } as any,
      include: { files: true },
    } as any);
    if (!doc) {
      return null;
    }
    return mapDocument(doc);
  }

  async findByTypeAndEntityLink(
    tenantId: string,
    type: DocumentType,
    entityType: DocumentLinkEntityType,
    entityId: string
  ): Promise<DocumentAggregate | null> {
    const link = await this.prisma.documentLink.findFirst({
      where: { tenantId, entityType: entityType as any, entityId },
      include: { document: { include: { files: true } } },
    });
    if (!link || link.document.type !== type || (link.document as any).archivedAt) {
      return null;
    }
    return mapDocument(link.document);
  }
}
