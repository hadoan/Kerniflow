# Corely — Module Template

Use this lightweight template when adding a new backend module. Keep it small and evolve incrementally.

## Backend module (services/api/src/modules/<module>)

```
<module>/
  adapters/
    http/
      <module>.controller.ts
  application/
    ports/
      <module>-repository.port.ts
      <module>-query.port.ts
    use-cases/
      create-<entity>.usecase.ts
      update-<entity>.usecase.ts
  domain/
    <entity>.aggregate.ts
    <entity>.types.ts
  infrastructure/
    adapters/
      prisma-<entity>-repository.adapter.ts
  <module>.module.ts
  index.ts
```

Guidelines:

- `domain/` has no Nest/Prisma imports.
- `application/` depends on ports only.
- `infrastructure/` implements ports and talks to Prisma.
- `adapters/http` calls use cases and maps HTTP DTOs.

## Frontend module (apps/web/src/modules/<module>)

```
<module>/
  components/
  hooks/
  screens/
  routes.tsx
  index.ts
```

Guidelines:

- Export only public screens/routes/hooks from `index.ts`.
- Keep module-specific components inside the module.
- Promote to `shared/` only when used by 2+ modules.
