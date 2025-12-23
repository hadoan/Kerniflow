import { Injectable, NotFoundException } from "@nestjs/common";
import { PrivacyRequestRepoPort } from "../../ports/privacy-request-repo.port";

@Injectable()
export class GetPrivacyRequestStatusUseCase {
  constructor(private readonly repo: PrivacyRequestRepoPort) {}

  async execute(input: { tenantId: string; requestId: string }) {
    const req = await this.repo.findById(input.tenantId, input.requestId);
    if (!req) throw new NotFoundException("Privacy request not found");
    return {
      id: req.id,
      type: req.type,
      status: req.status,
      resultDocumentId: req.resultDocumentId ?? undefined,
      resultReportDocumentId: req.resultReportDocumentId ?? undefined,
      errorMessage: req.errorMessage ?? undefined,
    };
  }
}
