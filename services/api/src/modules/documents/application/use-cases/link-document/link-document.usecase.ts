import type { LinkDocumentInput, LinkDocumentOutput } from "@corely/contracts";
import { BaseUseCase, ValidationError, NotFoundError, err, ok } from "@corely/kernel";
import type { LoggerPort, Result, UseCaseContext, UseCaseError } from "@corely/kernel";
import type { DocumentLinkRepoPort } from "../../ports/document-link.port";
import type { DocumentRepoPort } from "../../ports/document-repository.port";

type Deps = {
  logger: LoggerPort;
  documentRepo: DocumentRepoPort;
  linkRepo: DocumentLinkRepoPort;
};

export class LinkDocumentUseCase extends BaseUseCase<LinkDocumentInput, LinkDocumentOutput> {
  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: useCaseDeps.logger });
  }

  protected validate(input: LinkDocumentInput): LinkDocumentInput {
    if (!input.documentId) {
      throw new ValidationError("documentId is required");
    }
    if (!input.entityId) {
      throw new ValidationError("entityId is required");
    }
    return input;
  }

  protected async handle(
    input: LinkDocumentInput,
    ctx: UseCaseContext
  ): Promise<Result<LinkDocumentOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const document = await this.useCaseDeps.documentRepo.findById(ctx.tenantId, input.documentId);
    if (!document) {
      return err(new NotFoundError("Document not found"));
    }

    await this.useCaseDeps.linkRepo.createLink({
      tenantId: ctx.tenantId,
      documentId: document.id,
      entityType: input.entityType,
      entityId: input.entityId,
    });

    return ok({
      documentId: document.id,
      entityType: input.entityType,
      entityId: input.entityId,
    });
  }
}
