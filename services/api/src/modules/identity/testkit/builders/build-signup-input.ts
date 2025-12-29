import { type SignUpInput } from "../../application/use-cases/sign-up.usecase";
import { buildRequestContext } from "../../../../shared/context/request-context";

export const buildSignUpInput = (overrides: Partial<SignUpInput> = {}): SignUpInput => {
  return {
    email: "user@example.com",
    password: "password123",
    tenantName: "Acme Inc",
    idempotencyKey: "idem-1",
    context: buildRequestContext({ tenantId: undefined, actorUserId: undefined }),
    ...overrides,
  };
};
