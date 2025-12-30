/**
 * Shared DI tokens for the Identity module.
 * Keeping tokens centralized in one file prevents accidental string duplicates
 * when other modules import identity services.
 */
export const ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN = Symbol(
  "identity/role-permission-grant-repository"
);
