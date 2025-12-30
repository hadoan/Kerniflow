import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import { DocumentLinkRepoPort } from "../../application/ports/document-link.port";
import { DocumentLinkEntityType } from "../../domain/document.types";

@Injectable()
export class PrismaDocumentLinkAdapter implements DocumentLinkRepoPort {
  constructor(private readonly prisma: PrismaService) {}

  async createLink(params: {
    tenantId: string;
    documentId: string;
    entityType: DocumentLinkEntityType;
    entityId: string;
  }): Promise<void> {
    const existing = await this.prisma.documentLink.findFirst({
      where: {
        tenantId: params.tenantId,
        documentId: params.documentId,
        entityType: params.entityType,
        entityId: params.entityId,
      },
    });
    if (existing) {
      return;
    }
    await this.prisma.documentLink.create({
      data: {
        tenantId: params.tenantId,
        documentId: params.documentId,
        entityType: params.entityType,
        entityId: params.entityId,
      },
    });
  }

  async findDocumentIds(params: {
    tenantId: string;
    entityType: DocumentLinkEntityType;
    entityId: string;
  }): Promise<string[]> {
    const rows = await this.prisma.documentLink.findMany({
      where: {
        tenantId: params.tenantId,
        entityType: params.entityType,
        entityId: params.entityId,
      },
    });
    return rows.map((row) => row.documentId);
  }
}
