# Menu API

## Endpoints

- `GET /menu?scope=web|pos` - returns the composed menu tree for the current tenant and user. The controller validates `scope` via `GetMenuQuerySchema`, resolves `roleIds` from the JWT (through `AuthGuard` + `@CurrentRoleIds`), fetches grants through `IdentityModule`’s `ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN`, and forwards the computed permissions to `ComposeMenuUseCase`.
- `PUT /menu/overrides?scope=web|pos` - updates tenant-level overrides. The request body must match `UpdateMenuOverridesInputSchema` (which includes the `overrides` payload defined in `MenuOverridesSchema`). Invalid payloads or scopes result in `400 Bad Request`.
- `DELETE /menu/overrides?scope=web|pos` - resets overrides for the tenant and scope. Scope is validated via `GetMenuQuerySchema`.

## Authorization notes

- The controller relies on the Identity module to provide `roleIds` in the JWT payload (via the updated `AuthGuard`/`TokenService`). These role IDs are used to batch-fetch grants through `RolePermissionGrantRepositoryPort`.
- Effective permissions are built by `shared/permissions/effective-permissions.ts`: `DENY` overrides `ALLOW`, duplicates are folded away, and `*` (allow-all) still respects explicit denies. The resulting string array is what `MenuComposerService` uses.
- The DI token `ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN` lives in `IdentityModule` (surface through `identity.tokens.ts`), so `PlatformModule` just imports `IdentityModule` instead of re-declaring the token.
