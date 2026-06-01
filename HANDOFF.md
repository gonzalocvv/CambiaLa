# HANDOFF — auto-builder de CambiaLa

> Bitácora del auto-builder. Cada corrida agrega una entrada **ARRIBA** (más reciente primero).
> Claude Code lo lee al inicio de cada corrida para saber dónde seguir.

## 2026-06-01 — Corrida 10

- **Ítem**: RF-308 — Persistencia del match en DB (schema Zod + repository + service)
- **Rama**: `claude/rf308-match-persistence`
- **PR**: (ver abajo)
- **Estado**: ✅ completo, PR abierto con auto-merge habilitado

### Qué se hizo

- `src/lib/validations/match.schema.ts`: Zod schemas — `MatchStatusSchema`, `UpsertMatchSchema`, `UpdateMatchStatusSchema` con tipos inferidos.
- `src/repositories/match.repository.ts`: capa de acceso a datos para `Match`:
  - `upsert(data)` — upsert idempotente por `@@unique([userAId, userBId])`, siempre reactiva el status a `active`.
  - `findById(id)`, `findByUsers(userAId, userBId)`, `findActiveByUser(userId)` ordenado por score desc, `updateStatus(id, status)`.
- `src/services/match.service.ts`: capa de negocio:
  - `MatchRecord` — tipo con `aToB`/`bToA` ya tipados como `string[]` (vs `JsonValue` de Prisma).
  - `saveMatchResult(result)` — normaliza el par de usuarios (sort lexicográfico) antes de llamar al repo, garantizando idempotencia sin importar qué lado inició el cómputo.
  - `getMatchById`, `getActiveMatchesForUser`, `completeMatch`, `markMatchInactive`.
- Tests con `vi.hoisted()` para mocks correctamente hoisteados:
  - `src/repositories/__tests__/match.repository.test.ts` — 10 tests, 100% coverage del repo.
  - `src/services/__tests__/match.service.test.ts` — 7 tests, 100% coverage del service (incluye test de normalización bidireccional).
- Gate: format ✅, lint ✅, type-check ✅, format:check ✅, prisma:generate ✅, test:coverage ✅ (100% stmts/branches/funcs/lines, 51 tests), build ✅

### Próximo paso

Próximo ítem autónomo recomendado:
- **RF-309** — TTL de matches: `markMatchInactive` cuando un participante no se loguea en 30 días + job de limpieza. La función `markMatchInactive` ya existe en el service; falta el job de limpieza (batch update en repository) y los tests. No requiere Supabase.
- **O bien RF-802 a RF-808** — Páginas estáticas SSG (`/como-funciona`, `/precios`, `/privacidad`, `/terminos`, `/contacto`): 100% autónomas, no requieren credenciales.

### ⚠️ Bloqueos conocidos

- RF-307 🔒 Inngest — requiere credenciales reales.
- S0.7 🔒 Supabase — toda la capa de Auth (Sprint 1) bloqueada.

---

## 2026-05-31 — Corrida 9

- **Ítem**: RF-301/302/303/304/305/306 — Motor de matches (función pura + TDD 100%)
- **Rama**: `claude/rf301-match-engine`
- **PR**: #23
- **Estado**: ✅ completo, PR abierto con auto-merge habilitado

### Qué se hizo

- **Acción previa**: PR #22 (`claude/s06-seed-script`) tenía conflictos con `develop` porque su contenido fue squash-mergeado vía PR #21. Se cerró como superseded.
- `src/types/match.ts`: tipos de dominio (`UserCollectionInput`, `MatchResult`, `MatchRadius`, `FindMatchesOptions`) — sin deps de Prisma.
- `src/lib/match-engine.ts`: motor puro, cero side effects:
  - `computeMatch(userA, userB)` — RF-301 + RF-306: sticker ausente de una lista = count 0 implícito.
  - `isActiveUser(user, opts)` — RF-303: ventana de 30 días inyectable para tests.
  - `isSameLocation(a, b, radius)` — RF-302: soporta `neighborhood | department | country`.
  - `findMatchesForUser(target, pool, opts)` — aplica RF-302/303/304 + ordena por score desc.
  - RF-305: `offerUniques=false` → sólo count >= 2; `true` → count >= 1.
  - RF-306: sin ponderación de rareza.
- `src/lib/__tests__/match-engine.test.ts`: 34 tests, 100% coverage (stmts/branches/funcs/lines).
- `vitest.config.ts`: alias `@/` → `src/` para resolución de imports en tests.
- Gate: format ✅, lint ✅ (0 errores 0 warnings), type-check ✅, format:check ✅, prisma:generate ✅, test:coverage ✅ (100%), build ✅

### Próximo paso

RF-307 🔒 (Inngest job) y Sprint 1 completo dependen de Supabase 🔒.

Próximo ítem autónomo recomendado: **RF-308** — persistencia del match en DB (`src/repositories/match.repository.ts` + `src/services/match.service.ts`). Requiere mock de Prisma pero no Supabase real. O bien las **páginas estáticas RF-801/802/803/804/805** (100% autónomas, SSG, no requieren credenciales).

### ⚠️ Bloqueos conocidos

- RF-307 🔒 Inngest — requiere credenciales reales.
- S0.7 🔒 Supabase — toda la capa de Auth (Sprint 1) bloqueada.

---

## 2026-05-31 — Corrida 8

- **Ítem**: S0.6 — Seed script `prisma/seed.ts` (carga catálogo idempotente)
- **Rama**: `claude/s06-seed-script`
- **PR**: #22 (cerrado, superseded por PR #21)
- **Estado**: ✅ completo

### Qué se hizo

- `prisma/seed.ts`: script TypeScript ejecutable con `tsx` que lee `prisma/data/mundial-2026.json` y hace upsert idempotente del `Album` + 896 `Sticker` en lotes de 100 dentro de `$transaction`. Usa el logger estructurado. No usa `console.log`.
- `package.json`: agregada clave `"prisma": { "seed": "tsx prisma/seed.ts" }` para que `prisma db seed` lo encuentre automáticamente.
- Gate completo: format ✅, lint ✅, type-check ✅, format:check ✅, prisma:generate ✅, test:coverage ✅, build ✅

### Próximo paso

**RF-301** — Motor de matches: función pura en `src/lib/match-engine.ts` con TDD obligatorio, cobertura 100%. Es 100% autónomo (lógica pura, sin Supabase, sin DB real).

### ⚠️ Bloqueos conocidos

- S0.7 🔒 (Supabase + DATABASE_URL real) — bloqueado hasta que Gonza cree el proyecto en Supabase.
- Sprint 1 completo depende del seed corriendo contra una DB real (S0.7).

---

## 2026-05-31 — Corrida 7

- **Ítem**: S0.5 — Catálogo Mundial 2026 (~900 figuritas en JSON)
- **Rama**: `claude/s05-catalog-mundial-2026`
- **PR**: (ver abajo)
- **Estado**: ✅ completo, auto-merge habilitado (esperando CI)

### Qué se hizo

- `prisma/data/generate-mundial-2026.mjs`: script generador idempotente (Node.js ESM), define las 48 selecciones + sección FWC y sus jugadores
- `prisma/data/mundial-2026.json`: catálogo versionado con **896 figuritas**
  - FWC: 80 stickers (trofeo, sedes, grupos, estrellas foil)
  - 48 selecciones × 17 stickers = 816 (escudo isSpecial + foto grupal + 15 jugadores)
  - Raridades: especial=97, muy_dificil=26, dificil=143, comun=630
  - 0 duplicados, 0 campos inválidos
- Gate completo: format ✅, lint ✅, type-check ✅, format:check ✅, prisma:generate ✅, test:coverage ✅, build ✅

### Próximo paso

**S0.6** — Seed script `prisma/seed.ts` que lee `prisma/data/mundial-2026.json` y popula `Album` + `Sticker` de forma idempotente (upsert por slug/number). No requiere Supabase real — el script puede correr con cualquier DB Postgres.

### ⚠️ Bloqueos conocidos

- Ítems 🔒 (Supabase, Resend, Inngest, Sentry, PostHog) requieren credenciales que tiene que crear Gonza.

---

## 2026-05-31 — Corrida 6

- **Ítem**: S0.4 — Logger estructurado + ESLint no-console
- **Rama**: `feat/s04-logger`
- **PR**: https://github.com/gonzalocvv/CambiaLa/pull/18
- **Estado**: ✅ completo, auto-merge habilitado (esperando CI)

### Qué se hizo

- `src/lib/logger.ts`: logger isomorfo sin deps externas, niveles debug/info/warn/error, JSON en producción y texto legible en dev
- `eslint.config.mjs`: regla `no-console` (prohíbe `console.log`; permite warn/error/info/debug) + `coverage/**` en globalIgnores (eliminaba un warning preexistente)
- `src/lib/README.md`: entrada de logger.ts documentada
- Gate completo: format ✅, lint ✅ (0 errores, 0 warnings), type-check ✅, format:check ✅, test:coverage ✅, build ✅

### Próximo paso

Siguiente ítem libre: **S0.5** — Catálogo Mundial 2026: definir dataset de ~900 figuritas como JSON versionado en `prisma/data/`. Es 100% autónomo (solo JSON + lógica, no requiere Supabase).

### ⚠️ Bloqueos conocidos

- Ítems 🔒 (Supabase, Resend, Inngest, Sentry, PostHog) requieren credenciales que tiene que crear Gonza.

---

## 2026-05-31 — Corrida 5

- **Ítem**: fix CI del PR #17 (S0.3)
- **Rama**: `feat/s03-layer-structure`
- **PR**: https://github.com/gonzalocvv/CambiaLa/pull/17
- **Estado**: 🚧 fix pusheado, esperando CI — intentos: 1/3

### Qué se hizo

- CI rojo: `error TS2305: Module '"@prisma/client"' has no exported member 'PrismaClient'` — el Job 1 de Lint & Type Check no corría `prisma generate` antes del `type-check`.
- Fix: agregado `"postinstall": "prisma generate"` en `package.json` (para Vercel/local) + paso explícito `pnpm prisma:generate` en el job lint-and-type del CI workflow.
- Gate local completo: format ✅, lint ✅ (1 warning preexistente, 0 errores), type-check ✅, format:check ✅, test:coverage ✅, build ✅

### Próximo paso

Esperar que CI pase en PR #17. Si pasa: mergea y la próxima corrida arranca **S0.4** (logger estructurado). Si falla de nuevo (intento 2/3), revisar qué nuevo error apareció.

### ⚠️ Bloqueos conocidos

- Ítems 🔒 (Supabase, Resend, Inngest, Sentry, PostHog) requieren credenciales que tiene que crear Gonza.

---

## 2026-05-31 — Corrida 4

- **Ítem**: S0.3 — Estructura de capas + singleton PrismaClient
- **Rama**: `feat/s03-layer-structure`
- **PR**: https://github.com/gonzalocvv/CambiaLa/pull/17
- **Estado**: ✅ completo, auto-merge habilitado (esperando CI)

### Qué se hizo

- `src/lib/prisma.ts`: singleton PrismaClient con guard de hot-reload (`globalThis` en dev, nueva instancia en prod)
- READMEs en `src/services/`, `src/repositories/`, `src/lib/`, `src/types/`, `src/lib/validations/` documentando reglas de cada capa e imports permitidos
- Borrados archivos `.next/types/*.d 2.ts` (duplicados macOS que rompían `tsc --noEmit`)
- Gate completo: format ✅, lint ✅ (2 warnings preexistentes en coverage, no errores), type-check ✅, prisma:generate ✅, test:coverage ✅, build ✅

### Próximo paso

Siguiente ítem libre: **S0.4** — Logger estructurado (`src/lib/logger.ts`), cero `console.log`. Después S0.5/S0.6 (catálogo + seed — autónomos, no requieren Supabase para escribir el JSON/script).

### ⚠️ Bloqueos conocidos

- Ítems 🔒 (Supabase, Resend, Inngest, Sentry, PostHog) requieren credenciales que tiene que crear Gonza.

---

## Formato de cada entrada

- **Fecha/hora**
- **Ítem** trabajado (RF-id / Sx.y)
- **Rama** + **PR** (URL)
- **Estado**: ✅ hecho / 🚧 WIP / ⛔ bloqueado
- **Próximo paso**: dónde sigue la próxima corrida
- **⚠️ Necesita decisión** (si aplica)

---

## 2026-05-31 — Corrida 3

- **Ítem**: S0.2 — next-intl locale `es` + estructura `messages/`
- **Rama**: `feat/s02-next-intl`
- **PR**: https://github.com/gonzalocvv/CambiaLa/pull/16
- **Estado**: ✅ completo, auto-merge habilitado (esperando CI)

### Qué se hizo

- Instalado `next-intl 4.13.0`
- `src/i18n/request.ts`: config del servidor, locale fijo `es`, sin i18n routing (MVP mono-idioma)
- `messages/es.json`: todos los strings de la landing extraídos (namespaces `Metadata` y `Home`)
- `next.config.ts`: envuelto con `createNextIntlPlugin`
- `layout.tsx`: async + `NextIntlClientProvider` + `generateMetadata` via `getTranslations`
- `page.tsx`: async server component, cero strings hardcodeados, footer usa `t.rich()` para el corazón coloreado
- Build, type-check, lint, format:check y tests: todos ✅

### Próximo paso

Siguiente ítem libre: **S0.3** — Estructura de capas: crear `src/services/`, `src/repositories/`, `src/lib/`, `src/types/`, `src/lib/validations/` con README de capa y singleton de PrismaClient (`src/lib/prisma.ts`). Las carpetas `services/`, `repositories/`, `lib/` y `types/` ya existen vacías; hay que agregar el README de capa y `prisma.ts`.

### ⚠️ Bloqueos conocidos

- Ítems 🔒 (Supabase, Resend, Inngest, Sentry, PostHog) requieren credenciales que tiene que crear Gonza.

---

## 2026-05-31 — Corrida 2

- **Ítem**: S0.1b — Polish componentes base shadcn/ui
- **Rama**: `feat/s01b-component-polish`
- **PR**: https://github.com/gonzalocvv/CambiaLa/pull/15
- **Estado**: ✅ completo, auto-merge habilitado (esperando CI)

### Qué se hizo

- Instalado `tw-animate-css` + importado en `globals.css` → animaciones de Dialog/Overlay vivas
- Fuente Geist agregada vía `next/font/google` en `layout.tsx` con variables `--font-geist-sans`/`--font-geist-mono`
- Eliminadas clases `ring-offset-*` de button, input, badge y dialog (no funcionan en Tailwind v4)
- `accent-foreground` corregido: texto oscuro `#1e293b` sobre naranja `#f97316` (WCAG AA ✅)
- `ThemeProvider` (next-themes) NO implementado — la review lo marcó como opcional; queda pendiente si se decide en el futuro

### Próximo paso

Siguiente ítem libre: **S0.2** — next-intl con locale `es` + estructura `messages/`. Instalar `next-intl`, configurar `i18n/routing.ts`, crear `messages/es.json`, envolver el layout con el provider.

### ⚠️ Bloqueos conocidos

- Ítems 🔒 (Supabase, Resend, Inngest, Sentry, PostHog) requieren credenciales que tiene que crear Gonza.

---

## 2026-05-31 — Corrida 1

- **Ítem**: S0.1 — shadcn/ui base
- **Rama**: `feat/s01-shadcn-base`
- **PR**: https://github.com/gonzalocvv/CambiaLa/pull/13
- **Estado**: ✅ completo, auto-merge habilitado (esperando CI)

### Qué se hizo

- Instaladas deps: `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `@radix-ui/react-slot`, `@radix-ui/react-dialog`, `@radix-ui/react-label`
- `components.json` configurado para shadcn/ui con Tailwind v4
- `globals.css` reescrito: tokens CSS con paleta CambiaLa (azul `#1E3A8A` + naranja `#F97316`), dark mode via `@custom-variant dark` (class-based), `@theme inline` para utilities Tailwind v4
- `src/lib/utils.ts` con `cn()` helper
- Componentes en `src/components/ui/`: button, input, label, card, badge, dialog

### Próximo paso

Siguiente ítem libre: **S0.2** — next-intl con locale `es` + estructura `messages/`. Instalar `next-intl`, configurar `i18n/routing.ts`, crear `messages/es.json` vacío, envolver el layout con el provider.

### ⚠️ Bloqueos conocidos

- Ítems 🔒 (Supabase, Resend, Inngest, Sentry, PostHog) requieren credenciales/servicios que tiene que crear Gonza.
- Auto-merge del PR #13: si el repo no tiene habilitado el auto-merge en Settings, Gonza debe habilitarlo una vez en Settings → General → Allow auto-merge.

---

## (historial)

**Primera corrida:** S0.1 shadcn/ui base (esta entrada arriba).
