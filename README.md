# CambiaLa

> **Te encontramos con quién cambiar tus figuritas del Mundial 2026.**
> Plataforma web **C2C** para que coleccionistas uruguayos intercambien figuritas del álbum Panini Mundial 2026.
> Cargá tu álbum y te avisamos cuando alguien de tu barrio tiene las que te faltan — y quiere las que te sobran.

**Producción**: https://cambia-la.vercel.app · **Dominio**: `cambiala.uy`

> ℹ️ La fuente de verdad de **cómo se construye este repo** es [`CLAUDE.md`](./CLAUDE.md) (arquitectura en capas, design tokens, i18n, el gate). Qué construir y en qué orden está en [`BACKLOG.md`](./BACKLOG.md); la bitácora, en [`HANDOFF.md`](./HANDOFF.md).

## Stack

- **Framework**: Next.js 16 (App Router) + React 19, TypeScript strict
- **UI**: Tailwind CSS v4 + shadcn/ui — colores **solo por tokens** (ver `CLAUDE.md` §7)
- **DB**: PostgreSQL en Supabase + Prisma 6
- **Auth**: Supabase Auth — código OTP de 6 dígitos + magic link de respaldo + Google OAuth (✅ implementado y probado E2E)
- **Jobs async**: Inngest (matchmaking, notificaciones, crons) — keys cargadas, código pendiente (RF-307)
- **Email**: Resend (React Email) — configurado (dominio `cambiala.uy` verificado), código pendiente (RF-406)
- **Validación**: Zod (client + server)
- **Estado client**: TanStack Query + useState/useReducer
- **i18n**: next-intl (locale `es`, mono-idioma en el MVP)
- **Hosting**: Vercel · **Monitoring**: Sentry + PostHog (pendientes de keys)
- **Runtime**: Node 20 (`.nvmrc`) · pnpm 10 (`packageManager: pnpm@10.34.1`, vía corepack)

## Setup local

```bash
git clone https://github.com/gonzalocvv/CambiaLa.git
cd CambiaLa            # el directorio local del repo es figus-uy

corepack enable        # respeta pnpm 10 (campo packageManager)
pnpm install

cp .env.example .env.local
# Completar .env.local con las credenciales (pedírselas a Gonza).
# Sin ellas, varias features quedan no-op.

pnpm prisma:generate
pnpm dev               # http://localhost:3000
```

> La DB es **Supabase (cloud)** — no hay Postgres local con Docker. Las **migraciones y el seed contra la DB real las corre Gonza** (no el agente autónomo), para no tocar datos de producción (ver `CLAUDE.md` §10). Cuando exista RF-307, el matchmaking local se prueba con `pnpm inngest:dev`.

## Scripts

| Comando                | Qué hace                                   |
| ---------------------- | ------------------------------------------ |
| `pnpm dev`             | Dev server con Turbopack (hot reload)      |
| `pnpm build`           | Build de producción                        |
| `pnpm start`           | Servir el build                            |
| `pnpm lint`            | ESLint (incluye `no-console`)              |
| `pnpm lint:fix`        | ESLint con autofix                         |
| `pnpm type-check`      | `tsc --noEmit` (strict)                    |
| `pnpm format`          | Prettier `--write`                         |
| `pnpm format:check`    | Prettier `--check` (lo corre el CI)        |
| `pnpm test`            | Vitest (unit)                              |
| `pnpm test:watch`      | Vitest en watch                            |
| `pnpm test:coverage`   | Vitest + coverage (match engine 100%)      |
| `pnpm test:e2e`        | Playwright E2E                             |
| `pnpm prisma:generate` | Generar Prisma Client                      |
| `pnpm prisma:migrate`  | `prisma migrate dev` (local)               |
| `pnpm prisma:studio`   | UI para inspeccionar la DB                 |
| `pnpm prisma:seed`     | Cargar el álbum Mundial 2026 (idempotente) |
| `pnpm db:reset`        | Reset de la DB (⚠️ jamás en prod)          |
| `pnpm inngest:dev`     | Inngest local (cuando exista RF-307)       |

## El GATE (idéntico al CI) — antes de pushear

```bash
pnpm format && pnpm lint && pnpm type-check && pnpm format:check && pnpm prisma:generate && pnpm test:coverage
# + build con las MISMAS env mock que el CI (ver CLAUDE.md §13)
```

CI (`.github/workflows/ci.yml`): jobs `lint-and-type`, `test`, `build` (este con env mock). La branch protection en `develop` exige el check verde para el auto-merge. Existe un `lighthouse.yml` pero está **deshabilitado** (necesita preview de Vercel + secrets).

## Estructura del proyecto

```
src/
├── app/                 # Next.js App Router (UI + API routes). Locale `es`, sin segmento [locale].
│   ├── album/  matches/  conversations/  settings/  onboarding/  u/[username]/  ...
│   ├── como-funciona/  precios/  privacidad/  terminos/  contacto/   # estáticas
│   └── api/             # REST API routes (no Server Actions — ADR-018)
├── components/          # React components (album/, chat/, matches/, notifications/, profile/, landing/, layout/, ui/)
├── services/            # Service Layer (lógica de negocio; sin HTTP)
├── repositories/        # Repository Layer (ÚNICO acceso a Prisma)
├── lib/
│   ├── match-engine.ts  # Algoritmo de matchmaking (función pura, sin I/O)
│   ├── prisma.ts        # Singleton de PrismaClient
│   ├── logger.ts        # Logger estructurado
│   ├── auth/  supabase/  validations/   # auth helpers, clientes Supabase, schemas Zod
├── types/               # Tipos del dominio
├── i18n/                # config next-intl
└── middleware.ts        # refresh de cookie de sesión (@supabase/ssr)

prisma/    schema.prisma · migrations/ · seed.ts · data/mundial-2026.json
messages/  es.json        # i18n (mono-idioma; estructura lista para `en` en F2)
```

Detalle de arquitectura y decisiones en Notion (4.2 Arquitectura, 4.6 ADRs).

## Flujo de trabajo (resumen)

- **`develop` = PRODUCCIÓN.** Vercel deploya prod desde `develop` (no `main`). **Nunca pushear directo.**
- Rama `claude/<rf>-<slug>` (agente autónomo) o `feat/<slug>` (manual) desde `develop` → PR contra `develop` → CI verde → **merge por rebase** (commits atómicos).
- **Docs PRs**: auto-merge OK. **Code PRs**: NO auto-merge — los revisa Gonza (gstack + humano) antes de mergear.
- Detalle en [`CONTRIBUTING.md`](./CONTRIBUTING.md) y `CLAUDE.md` §4.

## Testing

- **Unit**: Vitest. Match engine al 100% (regla no-negociable, `CLAUDE.md` §11).
- **E2E**: Playwright (`pnpm test:e2e`) para flujos críticos.
- **Coverage**: `pnpm test:coverage`.

```bash
pnpm test:watch       # unit en watch
pnpm test:e2e         # Playwright
pnpm test:coverage    # coverage report
```

## Documentación

- [`CLAUDE.md`](./CLAUDE.md) — cómo se construye el repo (capas, tokens, i18n, gate, ADRs resumidos).
- [`BACKLOG.md`](./BACKLOG.md) — qué construir, en orden. [`HANDOFF.md`](./HANDOFF.md) — bitácora.
- [`reports/`](./reports) — auditorías de estado real.
- **Notion** — doc completa de producto/arquitectura/ADRs: https://www.notion.so/36de548e6cdd81cda047e4a5c0f4ad91

## Seguridad

- Variables sensibles solo en `.env.local` (gitignored) o en Vercel. **Nunca** commitear secretos; si pasó, rotar de inmediato.
- RLS habilitado en todas las tablas; el acceso va por Prisma server-side. Cualquier cambio de auth/RLS requiere review extra.
- Vulnerabilidades: contactar al maintainer **en privado**.

## Despliegue

- **Producción**: cada merge a `develop` deploya a Vercel (`cambia-la.vercel.app`).
- **Preview**: cada PR genera una URL preview de Vercel.
- **Rollback**: Vercel dashboard → Deployments → "Promote to Production" en una versión estable anterior.

## Soporte y contacto

- **Issues técnicos**: GitHub Issues con plantilla (`.github/ISSUE_TEMPLATE/`).
- **Contacto**: `consultas@cambiala.uy`.

---

Hecho con ♥ en Uruguay 🇺🇾
