import { type SignInInput } from "../../application/use-cases/sign-in.usecase";
import { buildRequestContext } from "../../../../shared/context/request-context";

export const buildSignInInput = (overrides: Partial<SignInInput> = {}): SignInInput => {
  return {
    email: "user@example.com",
    password: "password123",
    tenantId: undefined,
    idempotencyKey: "signin-1",
    context: buildRequestContext({ tenantId: overrides.tenantId, actorUserId: undefined }),
    ...overrides,
  };
};
