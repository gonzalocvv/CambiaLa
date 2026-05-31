# Repository Layer — `src/repositories/`

Single point of access to the database via Prisma.

## Rules

- May import `@/lib/prisma` and `@/types/*`
- Must **NOT** import from `@/services/*`
- No business logic — only CRUD and query methods
- All DB access goes through here; no raw Prisma calls in services or components
- Name files `<domain>.repository.ts` (e.g. `user.repository.ts`)
