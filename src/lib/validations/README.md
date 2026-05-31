# Validations — `src/lib/validations/`

Zod schemas for API request validation and service-layer business rules.

## Rules

- Import schemas in API routes (request validation) and services (internal rules)
- Export inferred TypeScript types alongside each schema: `export type Foo = z.infer<typeof FooSchema>`
- Name files `<domain>.schema.ts` (e.g. `user.schema.ts`, `sticker.schema.ts`)
