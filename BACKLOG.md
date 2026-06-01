# BACKLOG — CambiaLa (orden de implementación)

> Fuente de verdad: **2.1 Requerimientos Funcionales** y **8.2 Roadmap** de Notion.
> Este archivo es el que lee el auto-builder en cada corrida.

## Cómo se usa (para el auto-builder)

1. Leé este archivo y el `HANDOFF.md` de arriba a abajo.
2. Elegí el **primer ítem `[ ]` sin tildar de la sección SPRINT 0 en adelante** (la sección "Estado actual" es informativa, NO son tareas). Respetá el orden y las dependencias marcadas con ⛔.
3. Si un ítem está marcado 🔒 **(requiere credenciales/servicio externo)**, NO lo hagas solo: documentá el bloqueo en `HANDOFF.md` y pasá al siguiente ítem autónomo.
4. Implementá UN solo ítem por corrida (o un sub-pedazo si es grande, ej. el match engine). Seguí las convenciones de `figus-uy/CLAUDE.md` (arquitectura en capas, kebab-case, Zod primero, tests del engine).
5. Verificá antes de cerrar: `pnpm type-check && pnpm lint && pnpm test`. Si no pasa, arreglá o dejá la rama como WIP sin tildar.
6. Tildá el ítem `[x]` acá y actualizá `HANDOFF.md`.

Prioridad MoSCoW: **M** Must · **S** Should · **C** Could. Fase: MVP / F2 / F3.

---

## Estado actual del repo (al 31/05/2026) — _informativo, no son tareas_

> 🔍 **Auditoría 2026-06-01** (ver `reports/audit-2026-06-01.md`): Supabase verificado **provisionado + migrado + seedeado** (896 stickers, 1 álbum; `migrate status` al día; RLS on). Ítems de config liberados abajo. Sigue 🔒 por credenciales/dashboard: **Inngest, Resend, Sentry, PostHog, Google OAuth, email del magic link**.

- [x] Next.js 16 + React 19 + TypeScript strict + Tailwind 4 (bootstrap, PR #1)
- [x] Prisma + schema inicial (PR #8)
- [x] CI en GitHub Actions (lint / type-check / test / build)
- [x] Vitest + Playwright + ESLint + Prettier configurados
- [x] Coming soon page en producción (`/`, develop = prod)
- [x] Supabase project + env vars (Supabase URL/keys, DATABASE_URL) — _(config verificada OK 2026-06-01: `ANON`/`SERVICE_ROLE`/`DATABASE_URL`/`DIRECT_URL` presentes en `.env.local`; `prisma migrate status` al día)_
- [ ] 🔒 Resend / Sentry / PostHog / Inngest keys — **requiere credenciales** _(auditoría 2026-06-01: VACÍAS en `.env.local` → `RESEND_API_KEY`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`, `NEXT_PUBLIC_POSTHOG_KEY`, `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`. Placeholders presentes pero sin secreto: `SENTRY_ORG/PROJECT`, `NEXT_PUBLIC_POSTHOG_HOST`, `RESEND_FROM_EMAIL`)_
- [x] shadcn/ui base instalado y configurado _(verificado OK 2026-06-01: `src/components/ui/{button,input,label,card,badge,dialog}.tsx` + `components.json`)_
- [x] next-intl (`es`) configurado _(verificado OK 2026-06-01: `src/i18n/request.ts` + `messages/es.json`)_
- [x] Seed script del álbum Mundial 2026 (~900 figuritas) — ⛔ **bloqueo LEVANTADO** _(verificado OK 2026-06-01: 896 stickers + 1 álbum en la DB de Supabase)_

---

## SPRINT 0 — Setup y andamiaje

- [x] **S0.1** shadcn/ui base: init, theme tokens (azul `#1E3A8A` + naranja `#F97316`), modo claro/oscuro, componentes base (button, input, dialog, card, badge). (M)
- [x] **S0.1b** Polish de los componentes base (de la review de gstack del PR #13): (M)
  - Instalar `tw-animate-css` e importarlo en `globals.css` (las animaciones de los componentes están muertas sin esto).
  - Sacar las clases `ring-offset-*` muertas de los 4 componentes (focus rings rotos).
  - Agregar la fuente **Geist** vía `next/font` en `layout.tsx`.
  - Arreglar el contraste de `accent-foreground` (texto blanco sobre naranja → texto oscuro).
  - `ThemeProvider` (next-themes): NO implementado (opcional según review, ítem separado si se necesita).
- [x] **S0.2** next-intl con locale `es` (uruguayo) + estructura de `messages/`. Cero strings hardcodeados en JSX. (M)
- [x] **S0.3** Estructura de capas: crear carpetas `src/services/`, `src/repositories/`, `src/lib/`, `src/types/`, `src/lib/validations/` con README de capa y singleton de PrismaClient (`src/lib/prisma.ts`). (M)
- [x] **S0.4** Logger estructurado (`src/lib/logger.ts`), cero `console.log`. (S)
- [x] **S0.5** Catálogo Mundial 2026: definir dataset de ~900 figuritas (número, nombre opcional, equipo, rareza, is_special) como JSON versionado en `prisma/data/`. (M) ⛔ base de RF-201/202
- [x] **S0.6** Seed script `prisma/seed.ts` que carga el catálogo (idempotente). (M) — **RF-202** ⛔ bloqueante
- [x] **S0.7** Supabase + migrations corriendo + `.env.local` real. (M) — _(config verificada OK 2026-06-01: `migrate status` = "Database schema is up to date!" (`20260531135853_init` aplicada); `.env.local` real → Supabase `aws-1-sa-east-1`; seed corrido (896 stickers); RLS habilitado en las 8 tablas)_

---

## SPRINT 1 — Auth + Onboarding + Álbum

### Auth (módulo 100)

- [x] **RF-101** Login con magic link (email → link de un solo uso, válido 10 min). (M) — _Corrida 18: `@supabase/ssr` + `getSession()` real + página `/auth/login` + callback route_
- [ ] **RF-102** Login con Google OAuth (un click). (M) 🔒 — _(auditoría 2026-06-01: requiere configurar el provider Google (client ID/secret) en el dashboard de Supabase — NO verificable desde el repo — + implementar el código)_
- [x] **RF-103** Registro automático en primer login (sin form de signup). (M) — _Corrida 18: `userRepository.upsertByEmail()` en el auth callback_
- [x] **RF-104** Verificación de email implícita (magic link / Google). (M) — _Corrida 18: Supabase maneja el OTP; el magic link es el mecanismo de verificación_
- [x] **RF-105** Sesión persistente (cookie HTTPOnly+Secure+SameSite=Lax). (M) — _Corrida 18: middleware.ts con `@supabase/ssr` refresca cookies automáticamente_
- [x] **RF-106** Logout (invalida cookies). (M) — _Corrida 18: POST `/api/auth/logout` llama `supabase.auth.signOut()`_
- [x] **RF-107** Recuperación de cuenta (nuevo magic link). (M) — _Corrida 18: mismo flujo de magic link (Supabase re-envía el OTP si se pide desde la misma página)_

### Onboarding (módulo 100)

- [x] **RF-108** Onboarding — elegir username único (3-20 chars, alfanumérico). (M) — _Corrida 19: /onboarding + POST /api/onboarding + GET check-username_
- [x] **RF-109** Onboarding — elegir ciudad (lista fija). (M) — _Corrida 19: 19 departamentos de Uruguay_
- [x] **RF-110** Onboarding — barrio (si Montevideo, lista finita). (M) — _Corrida 19: 46 barrios de Montevideo, condicional_
- [x] **RF-111** Saltear onboarding (bloquea vista de matches hasta completarlo). (S) — _Corrida 19: /matches redirige a /onboarding si !onboardingDoneAt_

### Álbum (módulo 200) — ⛔ depende del seed (S0.6)

- [x] **RF-203** Vista de mi álbum: grid responsive, celda con número/nombre/color de estado/badge cantidad/dorado especial. (M) — _Corrida 20: /album con AlbumClient, sticker-cell, grupos por equipo_
- [x] **RF-206** Marcar figurita con click: cicla falta→tengo 1→2→3→falta (máx 99). (M) — _Corrida 20: handleUpdate + optimistic UI_
- [x] **RF-207** Marcado reverso con long press (mobile) / click derecho (desktop). (S) — _Corrida 20: onContextMenu (funciona con long press en mobile y right-click en desktop)_
- [x] **RF-208** Autosave con debounce 500ms al server (sin botón guardar). (M) — _Corrida 20: debounce en AlbumClient + PATCH /api/album/stickers/[id]_
- [x] **RF-209** Indicador "Guardando…" / "Guardado". (S) — _Corrida 20: floating toast con saveState_
- [x] **RF-204** Filtros del álbum: todas / me faltan / tengo / repetidas / especiales + por equipo. (M) — _Corrida 21: client-side en AlbumClient, pills scrollables + select de equipo_
- [x] **RF-205** Búsqueda por número (URU9) o nombre (SUÁREZ), case-insensitive. (S) — _Corrida 21: input de búsqueda client-side en AlbumClient_
- [x] **RF-210** Stats del álbum: tengo (X/900), faltan, repetidas, % completado, barra de progreso en vivo. (M) — _Corrida 20: stats live en AlbumClient (react state)_
- [x] **RF-211** Schema multi-álbum (modelo `Album`), MVP expone solo Mundial 2026. (M) — _ya implementado en el schema Prisma inicial; stickerRepository usa slug 'mundial-2026'_

### Settings básico + Landing

- [x] **RF-901** Editar nombre y bio en `/settings`. (M) — _Corrida 22: /settings + SettingsForm + PUT /api/settings (avatar pendiente en RF-112)_
- [x] **RF-902** Editar ciudad/barrio. (M) — _Corrida 22: sección ubicación en /settings + PUT /api/settings/location_
- [x] **RF-907** Logout desde settings. (M) — _Corrida 22: botón logout en sección cuenta de /settings_
- [ ] **RF-112** Perfil — avatar (JPG/PNG, máx 2MB, resize 200x200 server-side). (M)
- [x] **RF-113** Perfil — nombre visible + bio (máx 140 chars). (M) — _Corrida 25: bio del partner en match detail header; bio ya editable desde RF-901_
- [x] **RF-114** Perfil — WhatsApp opcional (regex +598…). (S) — _Corrida 25: campo +598 en settings + validación_
- [x] **RF-116** Toggle perfil público/privado. (M) — _Corrida 25: toggle en settings, persistido en User.publicProfile_
- [x] **RF-801** Landing `/` funcional (hero, cómo funciona en 3 pasos, casos de uso, CTA registro, footer). (M) — _ya hay coming soon, evolucionarla_

---

## SPRINT 2 — Matchmaking + Chat + Notificaciones + Reseñas

### Match engine (módulo 300) — **TDD obligatorio, cobertura 100%** (RF-301 es pura lógica, ideal autónomo)

- [x] **RF-301** Motor de matches: `A.tiene ∩ B.necesita ≠ ∅ Y B.tiene ∩ A.necesita ≠ ∅`, score = `min(|A→B|, |B→A|)`. Función pura en `src/lib/match-engine.ts` + tests. (M)
- [x] **RF-306** Sin ponderación por rareza en el cálculo (rareza solo visual). (M)
- [x] **RF-305** Opción no ofrecer únicas (`offerUniques=false` default → no figuritas count=1). (M)
- [x] **RF-302** Filtro por departamento por default (configurable a todo Uruguay / mismo barrio). (M)
- [x] **RF-303** Filtro de usuarios activos (`lastSeenAt < 30 días`). (M)
- [x] **RF-304** Filtro de participación (`participatesInMatchmaking=true`). (M)
- [ ] **RF-307** 🔒 Recalcular matches via job Inngest al actualizar sticker (no en request HTTP). (M) — _(auditoría 2026-06-01: sigue 🔒 — `INNGEST_EVENT_KEY`/`INNGEST_SIGNING_KEY` vacías; requiere cuenta Inngest + keys)_
- [x] **RF-308** Persistencia del match en DB (`aToB`, `bToA` JSON arrays, `score`). (M)
- [x] **RF-309** TTL de matches: `inactive` si un participante no se loguea en 30 días + job de limpieza diario. (M) — lógica pura implementada; scheduling via Inngest 🔒 _(auditoría 2026-06-01: lógica pura OK; el scheduling sigue pendiente por keys de Inngest vacías)_
- [x] **RF-310** Lista de mis matches activos ordenados por score desc. (M)
- [x] **RF-311** Match card: avatar/username del otro, barrio, distancia (si geo), score, "te da X / le das Y". (M)
- [x] **RF-312** Detalle de match: dos columnas "lo que te ofrece" / "lo que le das". (M)
- [x] **RF-313** Marcar match `completed` (cualquiera de las dos partes). (M)

### Chat (módulo 500)

- [x] **RF-501** Chat 1-a-1 solo entre los dos usuarios de un match. (M) — _Corrida 24: messageService + acceso restringido a participantes_
- [x] **RF-502** Lista cronológica de mensajes, scroll al último. (M) — _Corrida 24: ChatPanel con scroll-to-bottom en useEffect_
- [x] **RF-503** Input + envío (máx 1000 chars). (M) — _Corrida 24: textarea + POST /api/matches/[id]/messages + Enter para enviar_
- [x] **RF-504** Persistencia de mensajes en DB asociados al match. (M) — _Corrida 24: messageRepository.create + findByMatch_
- [x] **RF-505** Polling cada 10s para mensajes nuevos. (M) — _Corrida 24: setInterval en ChatPanel_
- [x] **RF-506** Indicador de no leídos en el match card. (S) — _Corrida 26: countUnread en messageRepository + unreadCount en ActiveMatchItem + badge naranja en MatchCard_
- [ ] **RF-511** Vista "Conversaciones" — lista todos los chats del usuario (matches con ≥1 mensaje), incluidos inactivos, por último mensaje. (S) — falta UI; data lista.
- [ ] **RF-512** Conversación persistente entre rematches — chat por par de usuarios, sobrevive a match inactivo; leer + escribir aunque no haya match activo; 404 solo si nunca matchearon. Refina RF-501. (M) — sin cambio de schema.
- [ ] **RF-513** Señal de confianza — "ya hablaron · última vez X", "se conocen desde X" (Match.createdAt) + reputación/estrellas. (S) — data lista (mensajes, Rating, reputation).

### Reseñas (módulo 600)

- [ ] **RF-601** Reseña post-trade (1-5 estrellas + comentario opcional máx 200). (M)
- [ ] **RF-602** Una reseña por usuario por match (`@@unique([matchId, raterId])`). (M)
- [ ] **RF-603** Cálculo de reputación = promedio de stars. (M)
- [ ] **RF-604** Display reputación: `X.X ⭐ · Y cambios`. <5 reseñas → "nuevo coleccionista". (M)

### Notificaciones (módulo 400)

- [x] **RF-401** Tabla `Notification` (tipo + payload JSON): `new_match`, `new_message`, `trade_completed`, `rating_received`. (M)
- [x] **RF-402** `GET /api/notifications` con paginación. (M)
- [x] **RF-403** `PATCH /api/notifications/[id]` marcar leída (`readAt`). (M)
- [x] **RF-404** Badge campana en header con contador no leídas (refresh 60s). (M) — _Corrida 23: NotificationBell client component con polling 60s en AppNavbar_
- [x] **RF-405** Dropdown con últimas 10, click navega y marca leída. (M) — _Corrida 23: NotificationDropdown con mark-as-read + navegación por tipo_
- [x] **RF-409** Trigger automático de notificación al crear match nuevo (ambas partes). (M) — _Corrida 23: matchService.saveMatchResult crea new_match para ambos si es match nuevo_
- [ ] **RF-406** 🔒 Email transaccional via Resend (magic link, nuevo match, mensaje, reseña). (M) — _(auditoría 2026-06-01: sigue 🔒 — `RESEND_API_KEY` vacía; requiere cuenta Resend + verificación del dominio figus.uy. `RESEND_FROM_EMAIL` ya seteado)_
- [ ] **RF-407** Frecuencia de email configurable (instant / daily / weekly / never). (M)
- [ ] **RF-408** Unsubscribe en footer (`emailFrequency=never`). (M)

---

## SPRINT 3 — Perfil público + SEO + PWA + Admin + Compliance + Polish

### Perfil público (módulo 700)

- [ ] **RF-701** `/u/[username]` SSR (si `publicProfile=true`). (M)
- [ ] **RF-702** Datos visibles: avatar, nombre, barrio, bio, reputación, fecha de inicio. (M)
- [ ] **RF-703** Resumen del álbum público (X% completo, Y tiene, Z repetidas). (M)
- [ ] **RF-704** Lista pública de repetidas (default on). (S)
- [ ] **RF-705** Lista pública de faltantes. (S)
- [ ] **RF-706** CTA "Mandale mensaje" (requiere login del visitante). (M)
- [ ] **RF-707** Compartir perfil (copia URL al portapapeles). (M)
- [ ] **RF-708** Open Graph tags (preview lindo WhatsApp/Twitter). (M)
- [ ] **RF-709** Perfil privado → `/u/[username]` devuelve 404. (M)

### Páginas estáticas + SEO (módulo 800) — muy autónomo, no requiere servicios

- [ ] **RF-802** `/como-funciona` (SSG). (M)
- [ ] **RF-803** `/precios` (free vs Pro, SSG). (M)
- [ ] **RF-804** `/privacidad` (Ley 18.331, SSG). (M)
- [ ] **RF-805** `/terminos` (edad mínima 13, SSG). (M)
- [ ] **RF-806** `/contacto` (email + form simple, SSG). (M)
- [ ] **RF-807** `sitemap.xml` autogenerado en build. (M)
- [ ] **RF-808** `robots.txt` (bloquea rutas auth/API). (M)
- [ ] **RF-810** Canonical URLs en páginas indexables. (M)
- [ ] **RF-809** Schema.org JSON-LD (Person en perfiles, WebSite/Organization en landing). (S)

### PWA

- [ ] **S3.1** Manifest + service worker + instalable. (M)

### Admin (módulo 1000)

- [ ] **RF-1001** `/admin` solo con `role=admin`. (M)
- [ ] **RF-1002** Lista de usuarios con búsqueda (email/username), tabla paginada. (M)
- [ ] **RF-1003** Ver perfil completo (datos privados). (M)
- [ ] **RF-1004** Suspender usuario (soft delete `isSuspended`). (M)
- [ ] **RF-1005** Link al dashboard de Sentry. (S)

### Settings completo + Geo + Compliance

- [ ] **RF-905** Config de notificaciones (email frequency, notify on new match, push). (M)
- [ ] **RF-906** Config de matchmaking (participar, radio, ofrecer únicas, aceptar desequilibrados). (M)
- [ ] **RF-903** Editar WhatsApp con validación. (S)
- [ ] **RF-904** Toggle perfil público en settings. (M)
- [ ] **RF-115** Geo opt-in con granularidad (ninguna / barrio / exacta, default ninguna). (C)
- [ ] **RF-119 / RF-908** Borrado de cuenta con doble confirmación + cascade real (Ley 18.331). (M) — **crítico compliance**

### Polish

- [ ] **S3.2** Loading / empty / error states en todas las pantallas, microcopy uruguayo, animaciones sutiles. (M)

---

## F2 (post-MVP, NO construir hasta MVP estable)

RF-117, RF-118 (cuentas), RF-212/213/214 (multi-álbum UI, import por foto/CSV), RF-314/315/316 (hint de valor, packs, mapa), RF-410 (Web Push), RF-507/508/509 (chat realtime, typing, read receipts), RF-605/606 (reportes, moderación), RF-811/812 (blog, páginas por álbum), RF-1006/1007/1008 (cola reportes, flagged, métricas), RF-1101–1106 (Plan Pro / monetización).

## F3 (experimental)

RF-317 (triángulos), RF-411 (WhatsApp deep link), RF-510 (foto al chat), RF-1107 (listings destacados), app nativa, API pública, kioskos.

## Won't have (fuera de scope, NO implementar)

E-commerce, envíos, cobro por intercambio, pagos entre usuarios, app nativa en MVP, álbumes no-Panini, operación fuera de Uruguay, API pública para terceros, afiliados con incentivo monetario.
