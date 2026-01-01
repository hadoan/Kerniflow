import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

/**
 * @CurrentUser() decorator
 * Extracts current user from request context
 */
export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});

/**
 * @CurrentTenant() decorator
 * Extracts current tenant from request context
 */
export const CurrentTenant = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.tenantId;
});

/**
 * @CurrentUserId() decorator
 */
export const CurrentUserId = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.user?.userId;
});

/**
 * @CurrentTenantId() decorator
 */
export const CurrentTenantId = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.tenantId;
});

/**
 * @CurrentRoleIds decorator
 * Returns the resolved roles for the current user/tenant context.
 */
export const CurrentRoleIds = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.roleIds ?? [];
});

/**
 * @CurrentWorkspaceId decorator
 * Extracts current workspace ID from request context
 */
export const CurrentWorkspaceId = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.workspaceId;
});
