## Soft Delete & Archive Best Practices

- Prefer soft delete (archive) for business entities; set `archivedAt` (and optionally `archivedByUserId`) instead of hard deletes.
- Repository defaults: all `getById`/`list` methods exclude archived rows unless `includeArchived=true` is explicitly passed.
- Endpoints: expose `POST /<entity>/:id/archive` and `POST /<entity>/:id/unarchive` instead of destructive DELETE.
- Domain helpers: entities provide idempotent `archive(now, userId)` and `unarchive()` methods.
- Queries: listings and lookups must filter `archivedAt: null` by default; include archived only when explicitly requested.
- Tests: cover archive/unarchive flows, ensure updates are rejected when archived, verify lists exclude archived by default, and enforce tenant scoping.
