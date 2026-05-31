# Service Layer — `src/services/`

Business logic lives here. Services orchestrate domain operations.

## Rules

- May import from `@/repositories/*`, `@/types/*`, `@/lib/*`
- Must **NOT** import from `@/app/`, `@/components/`, or `@/hooks/`
- Must **NOT** import `next/headers`, `Request`, or `Response` — no HTTP awareness
- Pattern: validate input → call repository → return result or throw domain error
- Name files `<domain>.service.ts` (e.g. `user.service.ts`, `match.service.ts`)
