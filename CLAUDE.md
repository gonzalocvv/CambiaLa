# CLAUDE.md

> Contexto persistente del proyecto **CambiaLa**. Claude Code lo lee al inicio de **cada** sesión/corrida. Es la fuente de verdad de cómo se construye este repo. Si tomás una decisión importante, actualizá este archivo (y agregá un ADR en Notion 4.6).
>
> Regla base: **si algo está escrito acá, se cumple a rajatabla.** Si una regla te resulta cara o ambigua, documentá la duda en `HANDOFF.md` en vez de improvisar.

---

## 1. Qué es CambiaLa

Plataforma web **C2C** para que coleccionistas uruguayos intercambien figuritas del álbum **Panini Mundial 2026**.

- **Mercado**: Uruguay (sobre todo Montevideo). Idioma: español rioplatense.
- **Ciclo**: mayo–julio 2026 (durante el Mundial). Ventana corta → foco en MVP.
- **Branding**: nombre `CambiaLa` (camelCase, sin espacio). Tono cercano, informal, uruguayo ("vos", "tenés", "podés"). Nada corporativo.
- **Side project**, equipo chico, construido en gran parte por un agente autónomo (ver §4).

**Lo que hace:**

1. Cada usuario carga qué figuritas tiene, cuáles le faltan y cuáles tiene repetidas.
2. El sistema calcula automáticamente con quién puede intercambiar (match bidireccional).
3. Notifica cuando aparece un match.
4. Chat in-app para coordinar el cambio.
5. Reputación post-intercambio (reseñas).

**Lo que NO hace (fuera de scope MVP):** e-commerce, envíos, plata entre usuarios, app nativa, otros álbumes en la UI (el schema es multi-álbum, pero la UI solo expone Mundial 2026), otros países.

---

## 2. Estado actual y dónde está la verdad

Este repo se construye incrementalmente. **No te fíes de la memoria: comprobá contra la realidad** (la doc se desincronizó antes — ver auditoría).

Fuentes de verdad, por orden:

- **`BACKLOG.md`** (raíz del repo) — qué construir, ordenado por implementación. Ítems `[ ]` pendientes, `[x]` hechos, `🔒` bloqueados por credenciales, `⛔` por dependencia.
- **`HANDOFF.md`** (raíz) — bitácora: qué se hizo, dónde seguir, bloqueos.
- **`reports/audit-*.md`** — auditorías de estado real (DB, env, build).
- **Notion** — documentación completa del producto/arquitectura: `https://www.notion.so/36de548e6cdd81cda047e4a5c0f4ad91`. Si necesitás contexto profundo de un feature o decisión, consultá Notion. La página **"Estado de implementación"** resume lo realmente construido.

Snapshot (act. 2026-06-07): Sprints 0/1/2/3 muy avanzados. **Auth CERRADO y probado E2E** (RF-101..107: código OTP de 6 dígitos + magic link de respaldo + Google OAuth; `src/lib/auth.ts` `getSession()` es real con `@supabase/ssr`). Supabase migrado + seedeado (896 stickers). Match engine puro RF-301..306 con 100% cobertura. Persistencia + TTL de matches; lista/detalle de matches; chat; reseñas; notificaciones in-app; landing v2 mergeada. Auditoría gstack Etapa 0 hecha (`reports/gstack-audit-2026-06-06.md`).

**Camino crítico real (post-auditoría):** (1) **RF-320 — cablear el recompute de matches en runtime**: el match engine está implementado y testeado pero NINGÚN path lo invoca → la tabla `Match` nunca se escribe y `/matches` está vacío para usuarios reales. **Bloqueante #1 de launch.** (2) **RF-406 (código de email)**: Resend ya está configurado (key + dominio `cambiala.uy` verificado + SMTP propio en Supabase, E2E); falta solo el código de envío. Ver `BACKLOG.md` (sección auditoría: RF-320..337, D-001..003).

---

## 3. Stack confirmado (ver ADRs en Notion 4.6)

- **Framework**: Next.js **16** (App Router) + React 19, TypeScript **strict**.
- **Estilos**: Tailwind CSS **v4** + shadcn/ui. Tokens de color en `src/app/globals.css` (ver §7).
- **DB**: PostgreSQL en **Supabase**. **ORM**: Prisma 6.
- **Auth**: Supabase Auth (magic link + Google OAuth).
- **Jobs async**: Inngest (matchmaking, notificaciones, crons). **Keys ya cargadas** (`.env.local` + Vercel, 2026-06-06); falta solo el código (RF-307, optimización post-RF-320).
- **Email**: Resend (React Email). **Configurado** (`RESEND_API_KEY` + dominio `cambiala.uy` verificado + SMTP propio en Supabase, probado E2E; remitente `consultas@cambiala.uy`); falta solo el código de envío (RF-406).
- **Validación**: Zod (client y server).
- **Estado client**: TanStack Query + useState/useReducer. Sin Redux/Zustand salvo que crezca mucho.
- **i18n**: next-intl (locale `es`).
- **Hosting**: Vercel. **Monitoring**: Sentry + PostHog (🔒 pendientes de keys).
- **Runtime**: Node 20 (`.nvmrc`), package manager **pnpm 10** vía corepack.

---

## 4. Cómo se construye este repo (pipeline autónomo)

El MVP lo construye un agente autónomo (routine de Claude Code en la nube, ~1 corrida/hora) + intervención humana puntual. Reglas del flujo (ver ADR-021):

- **`develop` = PRODUCCIÓN.** Vercel deploya producción desde `develop` (no `main`). Todo merge a `develop` sale a `cambia-la.vercel.app`.
- **Nunca pushees a `develop` directo.** Trabajá en una rama `claude/<rf>-<slug>` (o `feat/<slug>` si es manual). Abrí PR con **auto-merge**, que entra **solo si el CI pasa**.
- **Estrategia de merge: rebase** (preserva commits en develop). Hacé **commits atómicos** por paso lógico (conventional commits: `feat:`, `test:`, `refactor:`, `fix:`, `chore:`, `docs:`).
- **Un ítem por corrida.** Si es grande (ej. match engine), un sub-pedazo coherente + documentar el resto en HANDOFF.
- **Saltá los `🔒`** (necesitan credenciales/servicios que el agente no tiene). Documentá el bloqueo.
- Al terminar: actualizá `BACKLOG.md` (tildá `[x]` solo si quedó 100%) y `HANDOFF.md` (entrada nueva arriba). `BACKLOG.md`/`HANDOFF.md` están en `.prettierignore`, no rompen `format:check`.

---

## 5. Reglas de oro (no negociables)

1. **Hiperfoco MVP.** Features de F2/F3 no se construyen hasta tener MVP estable.
2. **Mobile-first siempre.** 70%+ del tráfico es celular. Soporte desde 320px. PWA instalable.
3. **Tipos primero, código después.** Cero `any` implícito. Schemas Zod antes de implementar endpoints.
4. **Validación server-side autoritativa.** El cliente valida para UX; el servidor por seguridad.
5. **Arquitectura en capas estricta** (§6). No la rompas "para ahorrar tiempo".
6. **Colores SOLO por tokens** (§7). Prohibido hardcodear.
7. **Cero strings hardcodeados en JSX** (§8). Todo por i18n.
8. **Match engine con tests 100%** antes de mergear (§11).
9. **Verificá con el GATE = CI antes de pushear** (§13).
10. **Nunca imprimas, loguees ni commitees secretos** (§15). `.env*` fuera de git.

---

## 6. Arquitectura en capas (cumplimiento obligatorio — ADR-008)

```
Presentation   → src/app/ (UI + API routes), src/components/, src/hooks/
       ↓
Service        → src/services/        (lógica de negocio)
       ↓
Repository     → src/repositories/    (ÚNICO acceso a Prisma)
       ↓
Domain (puro)  → src/lib/, src/types/, src/lib/validations/
```

Reglas de import (unidireccionales, las inferiores no importan de las superiores):

- **Presentation** NO importa Prisma directo. Siempre vía Service.
- **Services** NO importan `next/server` ni Request/Response. No saben de HTTP.
- **Repositories** NO importan Services. Solo Prisma (`@/lib/prisma`) y tipos.
- **Domain** (`src/lib/match-engine.ts`, validations, types) NO importa nada con I/O. Funciones puras.
- Singleton de Prisma en `src/lib/prisma.ts` (guard de hot-reload). Importarlo SOLO desde repositories.
- **Nota de deuda conocida**: evitar acoplar el Service a tipos de Prisma; preferí tipos de dominio propios para los DTOs.

---

# Branding y colores — pegar en `figus-uy/CLAUDE.md`

> Pegá la sección de abajo dentro de `figus-uy/CLAUDE.md` (idealmente como una sección propia, ej. `## Estilos y colores`). Es lo que lee el routine en cada corrida: con esto deja de hardcodear y respeta la paleta navy + celeste + naranja.

---

## Estilos y colores (OBLIGATORIO)

La paleta vive en `src/app/globals.css` como **tokens** (shadcn / Tailwind v4, light + dark). Componentes y páginas **consumen SOLO tokens semánticos**, nunca colores crudos.

**Tokens a usar** (clases Tailwind): `bg-background` · `text-foreground` · `bg-card` / `text-card-foreground` · `bg-popover` · `bg-primary` / `text-primary-foreground` · `text-brand` (wordmark) · `bg-secondary` / `text-secondary-foreground` · `bg-muted` / `text-muted-foreground` · `bg-accent` / `text-accent-foreground` · `border-border` · `ring-ring` · `bg-destructive`.

**Identidad CambiaLa:**

- **Wordmark "Cambia" = token `brand`** (light `#1E3A8A` azul profundo, dark `#ECF2FB` casi-blanco apenas celeste). La "La" = `accent` (naranja). El logo en navbar y hero usa `text-brand` + `text-accent`, NUNCA `text-primary` para el wordmark.
- **Acento de marca = celeste** → token `primary` (light `#0284C7`, dark `#38BDF8`): eyebrows, stats, estados hover/focus.
- **Acento cálido = naranja** `#F97316` → token `accent` (CTAs, badge en dark). Texto sobre naranja = oscuro `#1A1206` (`accent-foreground`, WCAG AA).
- **Badge "Mundial 2026"**: celeste en light (`bg-secondary text-secondary-foreground`), naranja en dark (`dark:bg-accent/10 dark:text-accent`).
- **Light**: hero con celeste muy suave (`bg-secondary/40`), wordmark navy, acentos celeste, CTA naranja. **Dark**: fondo **grafito neutro** `#0F0F11` (NO azul marino), wordmark casi-blanco, acentos celeste, CTA naranja.

**PROHIBIDO** en JSX/componentes/páginas:

- Clases de color crudas: `bg-slate-*`, `bg-zinc-*`, `bg-gray-*`, `bg-neutral-*`, `text-white`, `bg-black`, `text-orange-*`, `bg-blue-*`, `bg-sky-*`, etc.
- Hex o arbitrarios: `text-[#0F172A]`, `bg-[#111]`.
- Simular el theme con `dark:` + colores hardcodeados.

```tsx
// ❌ MAL (hardcodeado, ignora el design system)
<section className="bg-slate-950 text-white">
  <h1 className="text-orange-500">CambiaLa</h1>
</section>

// ✅ BIEN (tokens; light/dark salen solos)
<section className="bg-background text-foreground">
  <h1 className="text-brand">Cambia<span className="text-accent">La</span></h1>
</section>
```

**Dark mode lo manejan los tokens automáticamente.** Si usás tokens, no necesitás `dark:` para los colores (única excepción válida: cuando un elemento debe cambiar a propósito entre modos, como el badge celeste→naranja, usando `dark:` con OTRO token, nunca con un color crudo). Si te falta un color, **agregalo primero a `globals.css`** (light + dark) y consumilo por token. Antes de cerrar cualquier UI: que se vea bien en light y dark **solo cambiando el theme**, sin una sola clase de color cruda.

---

## Referencia: valores de los tokens en `src/app/globals.css`

`:root` (light):

```css
--background: #ffffff;
--foreground: #0f172a;
--primary: #0284c7; /* celeste = acento de marca */
--primary-foreground: #ffffff;
--brand: #1e3a8a; /* wordmark "Cambia" (azul profundo) */
--secondary: #e8f3fb; /* celeste claro (badge) */
--secondary-foreground: #0c4a6e;
--accent: #f97316; /* naranja = acento (CTA) */
--accent-foreground: #1a1206;
```

`.dark` (y el bloque `@media (prefers-color-scheme: dark)`):

```css
--background: #0f0f11; /* grafito neutro, NO azul marino */
--foreground: #ededee;
--primary: #38bdf8; /* celeste claro */
--primary-foreground: #0b1220;
--brand: #ecf2fb; /* wordmark "Cambia" (casi-blanco apenas celeste) */
--secondary: #26262a;
--secondary-foreground: #ededee;
--accent: #f97316; /* naranja */
--accent-foreground: #1a1206;
```

`@theme inline` (para que existan las utilities Tailwind): incluir `--color-brand: var(--brand);` además de los `--color-*` ya presentes.

## 8. i18n (ADR-012)

- next-intl, locale **`es`** (uruguayo). MVP mono-idioma; la estructura queda lista para sumar `en` en F2.
- **Cero strings de UI hardcodeados en JSX.** Todo texto visible sale de `messages/es.json` vía `useTranslations()` / `getTranslations()`.
- Para texto con formato (links, color en una palabra): `t.rich(...)`.
- Al agregar UI: agregá las keys a `messages/es.json` con un namespace coherente; nunca pongas el literal en el componente.

```tsx
// ❌ MAL
<span>{partner.username ?? "Usuario"}</span>
// ✅ BIEN
<span>{partner.username ?? t("unknownUser")}</span>
```

---

## 9. Convenciones de código

- Archivos: `kebab-case` (`match-card.tsx`, `sticker.service.ts`).
- Componentes: `PascalCase`, default export. Funciones: `camelCase`. Constantes globales: `SCREAMING_SNAKE_CASE`.
- Imports absolutos con `@/` (ej. `@/services/match.service`).
- Tipos compartidos en `src/types/`; tipos de un componente, en su archivo. Schemas Zod en `src/lib/validations/`.
- **REST API Routes** en MVP (no Server Actions — ADR-018). Cada route: validar Zod (input) → llamar Service → responder JSON.
- Cero `console.log` (hay regla ESLint `no-console`). Usá el logger estructurado de `src/lib/logger.ts`.
- Módulos de 200–300 líneas máx. Sin `TODO`/`FIXME`/`HACK` colgados.

---

## 10. Datos (Prisma + Supabase)

- **Todo cambio de schema va por migración de Prisma**, nunca a mano.
- IDs: **CUIDs** (`@default(cuid())`) — ADR-014.
- Schema **multi-álbum** desde el día 1 (modelo `Album`), pero la UI MVP solo expone Mundial 2026.
- El catálogo del álbum vive en `prisma/data/mundial-2026.json`; el seed (`prisma/seed.ts`, idempotente) lo carga. **Nota**: el catálogo actual es generado/sintético — antes de lanzar hay que reemplazarlo por el checklist real de Panini.
- Las migraciones y el seed contra la DB real **los corre Gonza** (no el agente autónomo), para no tocar datos de prod.
- **Glosario de dominio**: Match = dos usuarios que pueden intercambiar ≥1 figurita en cada dirección. Score = `min(|A→B|, |B→A|)`. Repe = count ≥ 2. Falta = count 0. Activo = `lastSeenAt < 30 días`.

---

## 11. Match engine (ADR-007, ADR-010 — crítico)

- Vive en `src/lib/match-engine.ts` como **función pura** (sin Prisma, sin I/O).
- Regla: hay match si `A.tiene ∩ B.necesita ≠ ∅` **Y** `B.tiene ∩ A.necesita ≠ ∅`. Score = `min(|A→B|, |B→A|)`.
- **Sin ponderación por rareza** — la economía del cambio se negocia en el chat.
- **Cobertura 100% obligatoria**, TDD: el test se escribe antes/junto al cambio. No se mergea código del engine sin test.

---

## 12. Auth (ADR-013) — CERRADO ✅

- Supabase Auth, **implementado y probado E2E** (RF-101..107). `src/lib/auth.ts` `getSession()` es **real**: `@supabase/ssr` (`createClient` → `supabase.auth.getUser()` → `userRepository.findByEmail`, envuelto en `cache()`). Las rutas autenticadas chequean sesión y dan 401/redirect sin ella.
- Métodos: **código OTP de 6 dígitos** (principal, `POST /api/auth/verify-otp`) + **magic link** de respaldo (callback PKCE + token-hash) + **Google OAuth** (`signInWithOAuth`, provider configurado en Google Cloud + Supabase, probado E2E). Registro automático en primer login (`userRepository.upsertByEmail`), sesión persistente vía cookie (middleware `@supabase/ssr`), logout (`POST /api/auth/logout`).
- **Config de dashboard ya hecha** (Gonza): Email OTP Length = 6, SMTP propio (Resend) para que los códigos no topen la cuota del built-in. Google OAuth: solo queda lo cosmético (branding del consent screen).
- **Endurecimiento pendiente** (no bloquea, detectado en la auditoría): protección de rutas en el middleware (RF-323) y rate limiting del OTP (RF-324).

---

## 13. El GATE (idéntico al CI — `.github/workflows/ci.yml`)

Antes de pushear, TODO esto tiene que estar en verde. Si algo falla y no lo podés cerrar, dejá commit WIP (sin auto-merge) y documentá el bloqueo.

```bash
pnpm install
pnpm format            # prettier --write (clave: el CI corre format:check)
pnpm lint              # ESLint (incluye no-console)
pnpm type-check        # tsc --noEmit, strict
pnpm format:check
pnpm prisma:generate
pnpm test:coverage     # Vitest; match engine 100%
# build con las MISMAS env mock que el CI:
NEXT_PUBLIC_SUPABASE_URL='https://mock.supabase.co' NEXT_PUBLIC_SUPABASE_ANON_KEY='mock-key' \
SUPABASE_SERVICE_ROLE_KEY='mock-service-key' DATABASE_URL='postgresql://mock:mock@localhost:5432/mock' \
DIRECT_URL='postgresql://mock:mock@localhost:5432/mock' RESEND_API_KEY='mock-resend' \
RESEND_FROM_EMAIL='test@example.com' NEXT_PUBLIC_BASE_URL='http://localhost:3000' \
INNGEST_SIGNING_KEY='mock-inngest' INNGEST_EVENT_KEY='mock-event' pnpm build
```

CI: job `lint-and-type` (lint + type-check + format:check), `test` (prisma:generate + test:coverage), `build` (con env mock). Branch protection en `develop` exige el check verde para el auto-merge.

---

## 14. API routes y patrones (ver 4.11 en Notion)

- Cada endpoint: `session → Zod (parse input) → Service → JSON`. Status codes correctos.
- Patrones aplicados: Repository Pattern, Service Layer, Singleton de Prisma, Optimistic UI + debounce (autosave del álbum), Cache-Aside con TanStack Query, Idempotency en operaciones críticas, Retry con backoff en jobs, TTL de matches inactivos (30 días).
- Optimistic UI para acciones que afectan UX (marcar figurita, mandar mensaje).

---

## 15. Seguridad y secretos

- **RLS habilitado** en todas las tablas (deny-all sin políticas → seguro porque el acceso va por Prisma server-side con conexión privilegiada). Si en algún momento se usa el cliente Supabase directo a tablas, **escribir políticas RLS** (ADR-015).
- **Nunca** imprimas/logues/commitees secretos. `.env`, `.env.local` están en `.gitignore`; solo `.env.example` se trackea.
- **Sin SQL crudo** (`$queryRaw`/`$executeRaw`) — todo Prisma tipado. Sin `dangerouslySetInnerHTML`, `eval`, `child_process`.
- Cuando se implemente subida de avatar (RF-112), validar/allowlistear el host de la URL antes de usarla en `url(...)`.

---

## 16. Servicios externos y variables de entorno

`.env.example` lista todas. Estado actual:

- **Supabase**: ✅ configurado (URL, anon, service role, DATABASE_URL, DIRECT_URL). Migrado y seedeado.
- **Resend**: ✅ configurado (2026-06-06) — `RESEND_API_KEY` en `.env.local` + Vercel, dominio `cambiala.uy` verificado, SMTP propio cableado en Supabase y probado E2E (los códigos de login salen de `consultas@cambiala.uy`). Falta solo el **código** de envío de transaccionales (RF-406).
- **Inngest**: ✅ keys cargadas (2026-06-06) — `INNGEST_EVENT_KEY` + `INNGEST_SIGNING_KEY` en `.env.local` + Vercel. Falta solo el **código** (RF-307, optimización post-RF-320).
- **🔒 pendientes (keys vacías → el feature es no-op hasta cargarlas):** Sentry (`SENTRY_DSN`), PostHog (`NEXT_PUBLIC_POSTHOG_KEY`).
- Las claves reales las carga Gonza en `.env.local` + secrets de Vercel/CI. El agente codea asumiendo que existen; el gate usa env mock.

---

## 17. Performance, mobile y accesibilidad

- Mobile-first, ≥320px. Bottom nav en mobile, top navbar en desktop.
- Feedback < 200ms (optimistic UI donde aplique). Autosave del álbum (debounce).
- Estados vacíos con CTA claro; loading/error states en todas las pantallas.
- **WCAG AA**: contraste mínimo, navegación por teclado, labels en todos los inputs. Microcopy en uruguayo.

---

## 18. Definition of Done (por ítem)

Un ítem está "hecho" solo si: implementado siguiendo capas + tokens + i18n · tests donde corresponde (engine = 100%) · **gate verde** (§13) · PR abierto con auto-merge · `BACKLOG.md` tildado · `HANDOFF.md` actualizado (qué se hizo, rama, PR, próximo paso, bloqueos). Sin colores hardcodeados ni strings sueltos.

---

## 19. Decisiones tomadas (no re-discutir — ADRs en Notion 4.6)

| Decisión                                                           | Resumen                                   |
| ------------------------------------------------------------------ | ----------------------------------------- |
| Next 16 App Router · Supabase · Prisma · Inngest · Resend · Vercel | ADR-001..006                              |
| Match engine puro + 100% tests                                     | ADR-007                                   |
| Capas estrictas                                                    | ADR-008                                   |
| Matchmaking incremental (no batch)                                 | ADR-009                                   |
| Sin ponderación por rareza                                         | ADR-010                                   |
| PWA, no app nativa en MVP                                          | ADR-011                                   |
| i18n listo, solo `es` activo                                       | ADR-012                                   |
| Magic link + Google OAuth                                          | ADR-013                                   |
| CUIDs                                                              | ADR-014 · RLS defense-in-depth ADR-015    |
| Rate limit in-memory MVP → Redis F2                                | ADR-016                                   |
| Chat polling 10s (MVP)                                             | ADR-017 · REST, no Server Actions ADR-018 |
| Free tier de todo en MVP                                           | ADR-019 · Mercado Pago F2 ADR-020         |
| **`develop` = prod + pipeline autónomo + rebase**                  | **ADR-021**                               |

Decisiones recientes que viven acá: **paleta celeste(light)/grafito(dark)+naranja** (§7); **merge por rebase + commits atómicos** (§4).

---

## 20. Anti-patrones a evitar

- **Hardcodear colores** (clases crudas / hex / `dark:` con colores) en vez de tokens. (Esto pasó y hubo que corregirlo — no lo repitas.)
- Strings de UI hardcodeados en JSX (usar i18n).
- Romper la arquitectura en capas "para ahorrar tiempo".
- Construir features de F2/F3 antes de tener MVP estable.
- Server Actions sin discutirlo (ADR-018).
- Optimización prematura (cache complejo, queues, microservicios).
- Agregar dependencias por features chicas (si es simple, escribilo).
- Pushear directo a `develop` o saltear el gate.
- Confiar en lo que dice el HANDOFF/BACKLOG sin verificar contra la realidad cuando haya dudas.

---

## 21. Flags / decisiones pendientes del owner

- **Naming/dominio**: **dominio decidido = `cambiala.uy`** (verificado en Resend; mails desde `consultas@cambiala.uy`). Marca = `CambiaLa` (prod `cambia-la.vercel.app`). Pendiente menor: actualizar referencias viejas a `figus.uy` en el env (`RESEND_FROM_EMAIL`, `NEXT_PUBLIC_BASE_URL`) y limpiar menciones residuales.
- Reemplazar el catálogo sintético de figuritas por el checklist real de Panini antes del launch.
- ✅ Nits ya resueltos (auditoría Etapa 0, `reports/gstack-audit-2026-06-06.md`): back-link a `/matches` (la página existe), bump `postcss` (el lock resuelve 8.5.15). La deuda nueva detectada vive en `BACKLOG.md` (sección "Auditoría gstack 2026-06-06": RF-320..337, D-001..003).

---

## 22. Cómo usar Claude eficientemente

- Antes de construir un RF, verificá que esté en `BACKLOG.md` / `2.1 Requerimientos Funcionales` de Notion. Si no está, escribilo primero.
- Modularizá (200–300 líneas/archivo). Diffs chicos y revisables.
- Cuando tomes una decisión importante: actualizá este `CLAUDE.md` y agregá un ADR en Notion 4.6.
- **Última actualización**: 2026-06-07 — Auth CERRADO + Landing v2 mergeada + Auditoría gstack Etapa 0 hecha. **Próximo gran hito: RF-320** (cablear el recompute de matches en runtime — el core no se ejecuta hoy). Ver `BACKLOG.md` (sección auditoría) y `reports/gstack-audit-2026-06-06.md`.
