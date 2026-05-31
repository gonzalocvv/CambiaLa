# Domain Library — `src/lib/`

Pure functions, utilities, and infrastructure singletons.

## Contents

- **`prisma.ts`** — PrismaClient singleton. Import only from `@/repositories/*`.
- **`utils.ts`** — Framework-agnostic helpers (`cn()` etc.).
- **`logger.ts`** — Structured logger. Use instead of `console.log` everywhere. JSON output in production, readable in dev.
- **`match-engine.ts`** — Pure match logic (zero external imports). 100% test coverage required.
- **`validations/`** — Zod schemas. See its own README.

## Rules

- Logic files (`match-engine.ts`, etc.) must be pure: no side effects, no DB calls, no HTTP.
- No imports from `@/services/*` or `@/repositories/*`.
