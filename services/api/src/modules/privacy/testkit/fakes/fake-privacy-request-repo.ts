import { type PrivacyRequestRepoPort } from "../../application/ports/privacy-request-repository.port";
import { type PrivacyRequest } from "../../domain/privacy-request.entity";

export class FakePrivacyRequestRepo implements PrivacyRequestRepoPort {
  private requests = new Map<string, PrivacyRequest>();

  async create(request: PrivacyRequest): Promise<void> {
    this.requests.set(request.id, request);
  }

  async save(request: PrivacyRequest): Promise<void> {
    this.requests.set(request.id, request);
  }

  async findById(tenantId: string, id: string): Promise<PrivacyRequest | null> {
    const req = this.requests.get(id);
    if (!req || req.tenantId !== tenantId) {
      return null;
    }
    return req;
  }
}
