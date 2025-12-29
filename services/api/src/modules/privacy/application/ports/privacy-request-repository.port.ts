import { type PrivacyRequest } from "../../domain/privacy-request.entity";

export interface PrivacyRequestRepoPort {
  create(request: PrivacyRequest): Promise<void>;
  save(request: PrivacyRequest): Promise<void>;
  findById(tenantId: string, id: string): Promise<PrivacyRequest | null>;
}
