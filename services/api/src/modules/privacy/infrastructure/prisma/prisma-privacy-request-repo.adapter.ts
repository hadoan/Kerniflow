import { Injectable } from "@nestjs/common";
import type { PrismaService } from "@corely/data";
import type { PrivacyRequestRepoPort } from "../../application/ports/privacy-request-repository.port";
import { PrivacyRequest } from "../../domain/privacy-request.entity";

const mapRequest = (row: any): PrivacyRequest =>
  new PrivacyRequest(
    row.id,
    row.tenantId,
    row.subjectUserId,
    row.requestedByUserId,
    row.type,
    row.status,
    row.resultDocumentId ?? null,
    row.resultReportDocumentId ?? null,
    row.errorMessage ?? null,
    row.createdAt,
    row.updatedAt,
    row.completedAt ?? null
  );

@Injectable()
export class PrismaPrivacyRequestRepoAdapter implements PrivacyRequestRepoPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(request: PrivacyRequest): Promise<void> {
    await (this.prisma as any).privacyRequest.create({
      data: {
        id: request.id,
        tenantId: request.tenantId,
        subjectUserId: request.subjectUserId,
        requestedByUserId: request.requestedByUserId,
        type: request.type,
        status: request.status,
        resultDocumentId: request.resultDocumentId ?? undefined,
        resultReportDocumentId: request.resultReportDocumentId ?? undefined,
        errorMessage: request.errorMessage ?? undefined,
        completedAt: request.completedAt ?? undefined,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt,
      } as any,
    });
  }

  async save(request: PrivacyRequest): Promise<void> {
    await (this.prisma as any).privacyRequest.update({
      where: { id: request.id },
      data: {
        status: request.status,
        resultDocumentId: request.resultDocumentId ?? undefined,
        resultReportDocumentId: request.resultReportDocumentId ?? undefined,
        errorMessage: request.errorMessage ?? undefined,
        completedAt: request.completedAt ?? undefined,
        updatedAt: request.updatedAt,
      } as any,
    });
  }

  async findById(tenantId: string, id: string): Promise<PrivacyRequest | null> {
    const row = await (this.prisma as any).privacyRequest.findFirst({ where: { id, tenantId } });
    return row ? mapRequest(row) : null;
  }
}
