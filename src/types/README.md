# Types — `src/types/`

Shared TypeScript types and interfaces across the application.

## Rules

- No imports from other `src/` layers — types only, zero runtime code
- Component-scoped types stay in their own file, not here
- Name files `<domain>.types.ts` (e.g. `match.types.ts`, `user.types.ts`)
