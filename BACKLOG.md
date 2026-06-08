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

> 🔍 **Auditoría 2026-06-01** (ver `reports/audit-2026-06-01.md`): Supabase verificado **provisionado + migrado + seedeado** (896 stickers, 1 álbum; `migrate status` al día; RLS on). Ítems de config liberados abajo. **Act. 2026-06-06**: Inngest + Resend + Google OAuth **ya configurados** (ver `reports/gstack-audit-2026-06-06.md` y la línea de keys abajo); siguen 🔒 solo **Sentry y PostHog**.

- [x] Next.js 16 + React 19 + TypeScript strict + Tailwind 4 (bootstrap, PR #1)
- [x] Prisma + schema inicial (PR #8)
- [x] CI en GitHub Actions (lint / type-check / test / build)
- [x] Vitest + Playwright + ESLint + Prettier configurados
- [x] Coming soon page en producción (`/`, develop = prod)
- [x] Supabase project + env vars (Supabase URL/keys, DATABASE_URL) — _(config verificada OK 2026-06-01: `ANON`/`SERVICE_ROLE`/`DATABASE_URL`/`DIRECT_URL` presentes en `.env.local`; `prisma migrate status` al día)_
- [x] **Hotfix 2026-06-01 (Corrida 31)**: `src/lib/prisma.ts` fuerza `pgbouncer=true` contra el pooler de transacción de Supabase (`:6543`) → corrige el 500 intermitente `prepared statement "sN" does not exist` en `/album` y `/matches`. Pendiente que Gonza verifique el `DATABASE_URL` de Vercel (ver HANDOFF Corrida 31).
- [x] **Fix 2026-06-01 (Corrida 32)**: login mostraba "Algo salió mal" al pedir el magic link → era `429 over_email_send_rate_limit` (cuota del SMTP built-in de Supabase). `LoginForm` ahora muestra mensaje específico ante 429. ⚠️ Fix de capacidad real = configurar SMTP propio (Resend) en Supabase → ✅ **HECHO 2026-06-06**: SMTP propio (Resend, dominio `cambiala.uy`) configurado en Supabase y probado E2E; los códigos de login salen de `consultas@cambiala.uy`.
- [x] ✅ **Resend + Inngest keys cargadas (2026-06-06)** — `RESEND_API_KEY`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` en `.env.local` + Vercel. Resend con dominio `cambiala.uy` verificado + SMTP propio en Supabase (probado E2E). Falta solo el **código** de envío (RF-406) y el de matchmaking Inngest (RF-307, post-RF-320).
- [ ] 🔒 Sentry / PostHog keys — **requiere credenciales** _(siguen VACÍAS: `NEXT_PUBLIC_POSTHOG_KEY`, `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`; placeholders sin secreto: `SENTRY_ORG/PROJECT`, `NEXT_PUBLIC_POSTHOG_HOST`)_
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
- [x] **RF-101b** 🐛 **Arreglar auth/login — magic link da "inválido" al confirmar el correo.** (M) — _CERRADO 2026-06-06 (sesión manual Gonza+Claude, rama `feat/google-oauth-codigo-otp`): el login por mail ahora manda un **código OTP de 6 dígitos** (ver RF-101c) que se tipea en cualquier dispositivo → elimina el problema cross-device de raíz. El link sigue como respaldo (PKCE + token-hash ya soportados en el callback). Template de email actualizado en el dashboard con `{{ .Token }}` + diseño de marca._
- [x] **RF-101c** Login por **código OTP de 6 dígitos** (reemplaza al magic link como método principal). (M) — _2026-06-06, rama `feat/google-oauth-codigo-otp`: `LoginForm` en dos pasos (email → código), `POST /api/auth/verify-otp` (verifyOtp type email + alta vía `resolveDestinationForUser`), helper compartido `src/lib/auth/resolve-destination.ts`, tests de ruta y helper. ⚠️ Config dashboard: **Email OTP Length = 6** (estaba en 8) en Authentication → Providers → Email._
- [x] **RF-102** Login con Google OAuth (un click). (M) — _CERRADO 2026-06-06 (sesión manual Gonza+Claude, rama `feat/google-oauth-codigo-otp`): botón "Continuar con Google" en `LoginForm` (`signInWithOAuth`), callback PKCE ya existente reutilizado, provider configurado en Google Cloud Console + Supabase. **Probado E2E por Gonza: funciona.** Pendiente cosmético: branding del consent screen (ver CONFIG-GONZA)._
- [x] **RF-103** Registro automático en primer login (sin form de signup). (M) — _Corrida 18: `userRepository.upsertByEmail()` en el auth callback_
- [x] **RF-104** Verificación de email implícita (magic link / Google). (M) — _Corrida 18: Supabase maneja el OTP; el magic link es el mecanismo de verificación_
- [x] **RF-105** Sesión persistente (cookie HTTPOnly+Secure+SameSite=Lax). (M) — _Corrida 18: middleware.ts con `@supabase/ssr` refresca cookies automáticamente_
- [x] **RF-106** Logout (invalida cookies). (M) — _Corrida 18: POST `/api/auth/logout` llama `supabase.auth.signOut()`_
- [x] **RF-107** Recuperación de cuenta (nuevo magic link). (M) — _Corrida 18: mismo flujo de magic link (Supabase re-envía el OTP si se pide desde la misma página)_
- [x] **RF-120** 🆕 **Destino post-login = `/album` (no `/matches`)**. (M) — _Corrida 37 (2026-06-07): `resolveDestinationForUser` default `/album`; `GET /api/auth/callback` fallback `/album`; `OnboardingForm` → `router.push('/album')`; `onboarding/page` redirect → `/album`. Tests actualizados._
- [x] **RF-121** 🆕 **Logo "CambiaLa" del navbar navega a `/album` cuando hay sesión**. (M) — _Corrida 37 (2026-06-07): `AppNavbar` wordmark `href="/album"`. `AppNavbar` solo se monta en páginas autenticadas (verificado). Test en `src/components/layout/__tests__/app-navbar.test.tsx`._

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
- [ ] **RF-214b** 🆕 ⚠️ **Auditar catálogo vs álbum oficial.** (M) — _detectado 6-jun: fuentes de prensa indican que el álbum Panini 2026 tiene **980 figuritas**; nuestro seed tiene **896**. Verificar contra el álbum físico/fuentes oficiales: cantidad total, numeración por equipo, especiales/extras. Si faltan, ampliar `prisma/data/` + seed idempotente + migración segura (NO romper álbumes de usuarios existentes: solo agregar, nunca renumerar). Documentar la fuente usada en el commit._ **⛔ Bloqueado — el agente autónomo no tiene acceso confiable al checklist oficial del álbum Panini 2026 (knowledge cutoff pre-torneo). Requiere que Gonza lo consiga del álbum físico y lo pase al agente.**
  - _Fuente de verificación: el checklist oficial del álbum Panini 2026 (se publica abiertamente; los códigos de equipo y la numeración son datos fácticos). Verificar equipo por equipo cantidad y numeración. NO copiar textos descriptivos ni fotos de Panini — solo los datos código/número/nombre de jugador._
- [x] **RF-215** 🆕 **Nombres de país en los headers del álbum.** (M) — _Corrida 38 (2026-06-07): `src/lib/team-names.ts` con los 49 códigos del catálogo → nombre completo en español + bandera emoji. `getTeamDisplay('URU')` → "🇺🇾 Uruguay · URU". AlbumClient usa `getTeamDisplay` en headers y dropdown. 368 tests verdes._
- [x] **RF-213** 🆕 ⚡ **Guardado del álbum en bulk** — un solo request/query por ráfaga de clicks (hoy: 1 PATCH por figurita ≈ 40 clicks = 40 requests × ~3 queries c/u; medido 700-900ms por PATCH). (M) — _pedido por Gonza 2026-06-06 tras ver los logs._ — **HECHO** (rama `feat/album-bulk`, 2026-06-07): endpoint `PATCH /api/album/stickers` (bulk) → `stickerService.bulkUpdateCounts` (dedupe + `{applied, ignored}`) → `stickerRepository.bulkUpsertCounts` (1 `$executeRaw` `unnest` + `ON CONFLICT`, ids con `@paralleldrive/cuid2`). `AlbumClient` con buffer compartido + 1 timer global 800ms + guard `isFlushing` + flush en `visibilitychange`/`pagehide` (keepalive). Endpoint per-figurita y código muerto borrados. 343 tests verdes. ⚠️ La query raw está testeada a nivel de parámetros (mock), falta validarla 1 vez contra Supabase real (sin DB en CI).
  - **Endpoint nuevo**: `PATCH /api/album/stickers` (sin `[stickerId]`) con body `{ changes: [{ stickerId: string, count: number }] }`. Límites: 1-200 ítems, `count` entero 0-99 (misma semántica que `updateStickerCount`: 0 = me falta). Schema Zod `BulkUpdateStickersSchema` en `src/lib/validations/sticker.schema.ts`.
  - **Repository**: `stickerRepository.bulkUpsertCounts(userId, changes)` → **UNA sola query** con `prisma.$executeRaw` + `INSERT ... SELECT ... FROM unnest($ids::text[], $counts::int[]) ON CONFLICT (user_id, sticker_id) DO UPDATE SET count = EXCLUDED.count` (mirar nombres reales de tabla/columnas/constraint en `schema.prisma` — debe existir el unique compuesto). NADA de loops de upserts.
  - **Service**: `stickerService.bulkUpdateCounts(userId, changes)` — deduplicar `stickerId`s repetidos quedándose con el último, ignorar ids que no existan en el catálogo (devolver `{ applied, ignored }`), reusar la lógica/errores de `updateStickerCount` donde aplique.
  - **Cliente** (`AlbumClient.tsx`): reemplazar el timer-por-figurita actual por **un buffer compartido** (`Map<stickerId, count>`, última cuenta gana) + **un solo timer global** de ~800ms que se reinicia con cada click; al vencer → un solo PATCH bulk con todo el buffer. Flush extra en `visibilitychange`/`pagehide` (no perder cambios al cerrar). Mantener UI optimista y el toast "Guardando…/Guardado ✓" (uno por flush, no por figurita). Si el flush falla: reintentar 1 vez, después estado de error sin vaciar el buffer.
  - **Borrar** el endpoint viejo `PATCH /api/album/stickers/[stickerId]` y sus tests (no tiene otros consumidores) — verificar con grep antes.
  - **TDD (en este orden)**: (1) tests del schema Zod: rechaza array vacío, >200, count fuera de rango/no entero, stickerId no-string; (2) tests del repository con mock de `$executeRaw` (verifica que es UNA llamada y los arrays van bien formados); (3) tests del service: dedupe, ignorados, happy path; (4) tests de la ruta: 401 sin sesión, 400 inválido, 200 con `{ ok, applied, ignored }`; (5) recién después la implementación del cliente.
  - **Criterio de aceptación**: clickear N figuritas en ráfaga → exactamente 1 request HTTP y 1 query SQL de escritura; el indicador muestra un solo ciclo "Guardando… → Guardado ✓".

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
- [x] **RF-307** 🔼 ~~PRIORIDAD ELEVADA~~ ✅ · Mover recompute + envío de email a job Inngest (fuera del request HTTP). (M) — _2026-06-08, rama `claude/gallant-sagan-Gdrxn`: `stickerService.bulkUpdateCounts` encola `match/recompute`; `notificationService.createNotification` encola `notification/email`; cron `digest-matches` (9am UTC, weekly solo lunes). Inngest fns: match-recompute, notification-email, digest-matches. `sendMatchDigest` + `maybySendEmail` en notificationService. `findUsersForMatchDigest` en userRepository. `/api/inngest` route. 609 tests verdes, gate completo._
- [x] **RF-308** Persistencia del match en DB (`aToB`, `bToA` JSON arrays, `score`). (M)
- [x] **RF-309** TTL de matches: `inactive` si un participante no se loguea en 30 días + job de limpieza diario. (M) — _2026-06-08, rama `claude/gallant-sagan-sde1gg`: `cleanupMatchesFn` (Inngest, cron `0 3 * * *`) llama `matchService.cleanupExpiredMatches(30)`. Registrado en `/api/inngest/route.ts`. 4 tests TDD en `cleanup-matches.test.ts`. 691 tests verdes._
- [x] **RF-310** Lista de mis matches activos ordenados por score desc. (M)
- [x] **RF-311** Match card: avatar/username del otro, barrio, distancia (si geo), score, "te da X / le das Y". (M)
- [x] **RF-312** Detalle de match: dos columnas "lo que te ofrece" / "lo que le das". (M)
- [x] **RF-313** Marcar match `completed` (cualquiera de las dos partes). (M)
- [x] **RF-318** 🆕 **Fallback de ubicación: sin barrio ⇒ todo el departamento.** (M) — _Ola A (2026-06-07, rama `feat/matching-runtime`): el engine ya implementaba el fallback (`isSameLocation`: radius `department` matchea por ciudad sin mirar barrio). Entregado vía candidate-pool por depto + pasar el `matchRadius` del target a `findMatchesForUser`. **Sin tocar `match-engine.ts`** (preserva 100% cobertura RF-321). Los 5 casos (a-e) cubiertos en tests de `recomputeForUser`. Refina RF-302._
  - Regla: si el usuario **no seteó barrio** (`neighborhood = null`, ej. salteó el onboarding o no es de Montevideo), matchea contra **todo su departamento**. Si seteó barrio y su config es "mismo barrio", solo se restringe cuando **ambos** lados tienen barrio; un usuario sin barrio NUNCA queda excluido del pool departamental.
  - Nadie debe quedar con 0 matches por no haber elegido barrio — es el caso típico del interior (depto sin lista de barrios) y del que saltea pasos.
  - **TDD**: casos en los tests del candidate-pool: (a) ambos con barrio igual → match; (b) ambos con barrio distinto, config barrio → no match; (c) uno sin barrio, mismo depto → match; (d) ambos sin barrio, mismo depto → match; (e) deptos distintos → no match (salvo config "todo Uruguay").

### Chat (módulo 500)

- [x] **RF-501** Chat 1-a-1 solo entre los dos usuarios de un match. (M) — _Corrida 24: messageService + acceso restringido a participantes_
- [x] **RF-502** Lista cronológica de mensajes, scroll al último. (M) — _Corrida 24: ChatPanel con scroll-to-bottom en useEffect_
- [x] **RF-503** Input + envío (máx 1000 chars). (M) — _Corrida 24: textarea + POST /api/matches/[id]/messages + Enter para enviar_
- [x] **RF-504** Persistencia de mensajes en DB asociados al match. (M) — _Corrida 24: messageRepository.create + findByMatch_
- [x] **RF-505** Polling cada 10s para mensajes nuevos. (M) — _Corrida 24: setInterval en ChatPanel_
- [x] **RF-506** Indicador de no leídos en el match card. (S) — _Corrida 26: countUnread en messageRepository + unreadCount en ActiveMatchItem + badge naranja en MatchCard_
- [x] **RF-511** Vista "Conversaciones" — lista todos los chats del usuario (matches con ≥1 mensaje), incluidos inactivos, por último mensaje. (S) — _Corrida 28: /conversations + ConversationCard + GET /api/conversations + navbar link_
- [x] **RF-512** Conversación persistente entre rematches — chat por par de usuarios, sobrevive a match inactivo; leer + escribir aunque no haya match activo; 404 solo si nunca matchearon. Refina RF-501. (M) — _Corrida 30: badge "Inactivo" + nota en match detail; tests documentan que assertParticipant no filtra por status (read+write funcionan en inactive y completed)._
- [x] **RF-513** Señal de confianza — "ya hablaron · última vez X", "se conocen desde X" (Match.createdAt) + reputación/estrellas. (S) — _Corrida 33: formatRelativeDate puro + trust signal section en match detail_

### Reseñas (módulo 600)

- [x] **RF-601** Reseña post-trade (1-5 estrellas + comentario opcional máx 200). (M) — _Corrida 27: ratingRepository + ratingService + POST /api/matches/[id]/ratings_
- [x] **RF-602** Una reseña por usuario por match (`@@unique([matchId, raterId])`). (M) — _Corrida 27: validado en DB (constraint) y en service (AlreadyRatedError → 409)_
- [x] **RF-603** Cálculo de reputación = promedio de stars. (M) — _Corrida 27: getReputationStats + userRepository.updateReputation tras cada rating_
- [x] **RF-604** Display reputación: `X.X ⭐ · Y cambios`. <5 reseñas → "nuevo coleccionista". (M) — _Corrida 27: RatingModal en match detail (completed + !hasRated)_

### Notificaciones (módulo 400)

- [x] **RF-401** Tabla `Notification` (tipo + payload JSON): `new_match`, `new_message`, `trade_completed`, `rating_received`. (M)
- [x] **RF-402** `GET /api/notifications` con paginación. (M)
- [x] **RF-403** `PATCH /api/notifications/[id]` marcar leída (`readAt`). (M)
- [x] **RF-404** Badge campana en header con contador no leídas (refresh 60s). (M) — _Corrida 23: NotificationBell client component con polling 60s en AppNavbar_
- [x] **RF-405** Dropdown con últimas 10, click navega y marca leída. (M) — _Corrida 23: NotificationDropdown con mark-as-read + navegación por tipo_
- [x] **RF-409** Trigger automático de notificación al crear match nuevo (ambas partes). (M) — _Corrida 23: matchService.saveMatchResult crea new_match para ambos si es match nuevo_
- [x] **RF-406** Email transaccional via Resend (nuevo match, mensaje, reseña — el de login ya sale por SMTP de Supabase, NO se duplica). (M) — _Ola B (2026-06-07, rama `feat/emails`, PR SIN auto-merge): dep `resend`; `emailService.sendEmail` (único módulo que toca Resend, no-op sin API key, timeout 4s); templates puros `src/lib/email/templates.ts` (estética del mail de login, tablas inline, entidades, lang/charset/viewport/role=presentation/preheader, parte text/plain, escape de valores dinámicos); orquestado en `notificationService.createNotification` (la campanita se crea SIEMPRE primero; el mail es side-effect en try/catch+logger, nunca rompe el flujo). Triggers: `new_match` (ya existía), `rating_received` (en `ratingService.createRating`), `new_message` (en `sendMessage`, anti-spam por primer no-leído). Remitente `CambiaLa <consultas@cambiala.uy>`. 558 tests; gate OK. Falta E2E manual (Gonza)._
- [x] **RF-407** Frecuencia de email configurable (instant / daily / weekly / never). (M) — _Ola B: gating en `notificationService.maybeSendEmail` — solo `instant` manda mail al toque; `never` no manda; `daily`/`weekly` persisten la preferencia y NO mandan instant (el digest queda **pendiente de RF-307/Inngest** — sin crons caseros). La campanita in-app se crea siempre, así que daily/weekly no pierden nada. Conectado al toggle de /settings (RF-905). new_match además ya viene gateado por `notifyOnMatch`; message/review solo por `emailFrequency` (no hay toggle por tipo aún — RF-344)._
- [x] **RF-408** Unsubscribe en footer (`emailFrequency=never`). (M) — _Ola B: footer con link de baja en cada mail → `GET /api/unsubscribe?token=...` muestra una confirmación (NO muta, para que el prefetch de los clientes de mail no dé de baja sin querer) y el `POST` ejecuta la baja. Token firmado HMAC (`src/lib/email/unsubscribe.ts`, `UNSUBSCRIBE_SECRET`): no forjable ni enumerable, comparación timing-safe. `Referrer-Policy: no-referrer` para no filtrar el token._

---

## SPRINT 3 — Perfil público + SEO + PWA + Admin + Compliance + Polish

### Perfil público (módulo 700)

- [x] **RF-701** `/u/[username]` SSR (si `publicProfile=true`). (M) — _Corrida 35_
- [x] **RF-702** Datos visibles: avatar, nombre, barrio, bio, reputación, fecha de inicio. (M) — _Corrida 35_
- [x] **RF-703** Resumen del álbum público (X% completo, Y tiene, Z repetidas). (M) — _Corrida 35_
- [x] **RF-704** Lista pública de repetidas (default on). (S) — _Corrida 35_
- [x] **RF-705** Lista pública de faltantes. (S) — _Corrida 35_
- [x] **RF-706** CTA "Mandale mensaje" (requiere login del visitante). (M) — _Corrida 35_
- [x] **RF-707** Compartir perfil (copia URL al portapapeles). (M) — _Corrida 35_
- [x] **RF-708** Open Graph tags (preview lindo WhatsApp/Twitter). (M) — _Corrida 35_
- [x] **RF-709** Perfil privado → `/u/[username]` devuelve 404. (M) — _Corrida 35_

### Páginas estáticas + SEO (módulo 800) — muy autónomo, no requiere servicios

- [x] **RF-802** `/como-funciona` (SSG). (M) — _Corrida 34_
- [x] **RF-803** `/precios` (free vs Pro, SSG). (M) — _Corrida 34_
- [x] **RF-804** `/privacidad` (Ley 18.331, SSG). (M) — _Corrida 34_
- [x] **RF-805** `/terminos` (edad mínima 13, SSG). (M) — _Corrida 34_
- [x] **RF-806** `/contacto` (email + form simple, SSG). (M) — _Corrida 34_
- [x] **RF-807** `sitemap.xml` autogenerado en build. (M) — _Corrida 34_
- [x] **RF-808** `robots.txt` (bloquea rutas auth/API). (M) — _Corrida 34_
- [x] **RF-810** Canonical URLs en páginas indexables. (M) — _Corrida 36_
- [x] **RF-809** Schema.org JSON-LD (Person en perfiles, WebSite/Organization en landing). (S) — _Corrida 39 (2026-06-07): `src/lib/json-ld.ts` con `buildWebSiteJsonLd`, `buildOrganizationJsonLd`, `buildPersonJsonLd`, `toJsonLdString` (escapa <, >, & para prevenir inyección). Landing: 2 scripts (WebSite + Organization). `/u/[username]`: Person con url/name/bio/city. 377 tests verdes._

### 🔥 Landing v2 — reposicionamiento (agregado 6-jun, PRIORIDAD ALTA: aparecieron 3 competidores)

> **Contexto**: salieron Cambio Figus (genérico, con ads), Figuri.App y está Figuritas App (2M usuarios, modelo amigos/QR). El diferencial de CambiaLa es el **descubrimiento**: match automático con desconocidos confiables del barrio. La landing tiene que gritar eso, no "coleccioná" (esa batalla ya tiene dueño). Mantener TODO con design tokens (`branding` en CLAUDE.md) — PROHIBIDO colores crudos, incluso si se toma inspiración de componentes de 21st.dev (vienen con `bg-slate-*` etc., adaptar siempre).

- [x] **RF-820** 🆕 **Hero nuevo — el match es el héroe.** (M) — _rama `feat/landing-v2`: hero a dos columnas, H1 value-prop (t.rich) + `match-card-mock` 1:1 con MatchCard como desenlace de la animación; render test._
  - H1: **"Te encontramos con quién cambiar tus figuritas"**. Subtítulo: **"Cargá tu álbum del Mundial 2026 y te avisamos cuando alguien de tu barrio tiene las que te faltan — y quiere las que te sobran."** CTA primario "Registrate" (ya existe la key), secundario "¿Cómo funciona?".
  - **Mock de tarjeta de match** visible en el hero (componente estático, no screenshot): avatar + "Juan de Pocitos" + "te da 5 / le das 3" + "⭐ 4.8 · 12 cambios". Reusar la estética real de `MatchCard` para que landing y app sean coherentes.
  - **TDD**: primero las claves i18n nuevas en `Home.hero` (title, subtitle, matchMock.*), después el componente con test de render (asserts de los textos clave).
- [x] **RF-821** 🆕 **Animación "el intercambio"** — decorativa, detrás/junto al hero. (S) — _rama `feat/landing-v2`: escena 3D CSS (aria-hidden), loop 100% CSS solo transform/opacity, reduced-motion = estado final, pausa offscreen. Sin Motion (se quitó por LCP/TBT); reveal al scroll con CSS+IntersectionObserver. Lighthouse Perf 97._
  - Dos mini-álbumes estilizados, una figurita sale de cada uno, se cruzan en el aire y cada una **encaja en el hueco del álbum opuesto**. Loop suave (~6-8s con pausa).
  - **Stack de animación**: CSS transforms/keyframes para el loop decorativo + **Motion (framer-motion) permitido y recomendado** para springs, stagger y reveals al scroll (el "encaje" con spring físico, la match card del hero que se arma escalonada). PROHIBIDO en el MVP: canvas/WebGL/Three.js/GSAP (peso y jank en gama media; revisitar post-launch solo como detalle puntual, ej. shader de brillo en la figurita dorada).
  - Reglas duras: `aria-hidden="true"` en lo decorativo, respetar **`prefers-reduced-motion`** (estado estático con las dos figuritas ya encajadas), no degradar LCP (decorativo, sin imágenes pesadas; SVG/divs).
  - **Figuritas genéricas estilizadas** (número + colores por token, ej. celeste/naranja) — NUNCA imágenes reales del álbum Panini (IP de terceros).
  - Inspiración permitida: componentes de animación de 21st.dev, adaptados a tokens. (Si está instalada una skill de UI/UX en el entorno, usarla para refinar.)
- [ ] **RF-824** ⏸️ **RESERVADO** (ola supervisada — no tomar por el routine) · 🆕 📱 **Navbar mobile: bottom tab bar** — el nav actual desborda en mobile. (M) — _reportado por Gonza 6-jun con captura: "Mi álbum"/"Mis matches" quiebran en dos líneas y el header ocupa demasiado alto._
  - En viewport `< md`: header reducido a **logo + campanita de notificaciones**; navegación principal pasa a **bottom tab bar fija** (4 tabs: Mi álbum, Matches, Chats, Ajustes) con ícono + label corto, área táctil ≥ 44px, `safe-area-inset-bottom` (iPhone), estado activo con token `primary`.
  - En `≥ md` queda el navbar horizontal actual.
  - El badge de no-leídos de la campanita y el de chats sin leer deben verse en los tabs correspondientes.
  - **Criterio de aceptación (anotado en review Ola B)**: hoy los labels "Mi Álbum"/"Mis Matches" de la navbar mobile se ven **enormes y wrapean en dos líneas**; el tab bar (ícono + label corto, área táctil ≥ 44px) debe resolverlo. Verificar visualmente en mobile (≥320px) que **ningún tab quiebra en dos líneas**.
  - **TDD**: test de render del tab bar (4 links con href correcto + aria-current en el activo). Verificar que ninguna página tape contenido detrás del tab bar (padding-bottom en el layout).
- [x] **RF-822** 🆕 **Sección "¿Por qué CambiaLa?"** — 3 diferenciales en cards. (M) — _rama `feat/landing-v2`: 3 cards (barrio / reputación / gratis), íconos lucide, render test._
  - 1) **Match automático por barrio**: "No buscás vos — nosotros te avisamos cuando hay cambio posible cerca tuyo." 2) **Reputación real**: "Reseñas y estrellas después de cada cambio. Cambiá con desconocidos sin miedo." 3) **Gratis y sin publicidad**: "Sin banners, sin sponsors, sin vender tus datos."
  - Sin nombrar competidores. i18n primero, test de render.
- [x] **RF-823** 🆕 **SEO on-page del reposicionamiento.** (M) — _rama `feat/landing-v2`: title/description al reposicionamiento + OpenGraph/Twitter, H1/H2 con keywords (cambiar figuritas / Mundial 2026 / Uruguay / barrio), `/como-funciona` con el matching de protagonista. Lighthouse A11y 95._
  - `Metadata.title` → incluir la frase de búsqueda real: ej. "CambiaLa — Cambiar figuritas del Mundial 2026 en Uruguay". `Metadata.description` alineada al posicionamiento (match por barrio).
  - H1/H2 de la landing deben contener naturalmente "cambiar figuritas", "Mundial 2026", "Uruguay", "barrio". Revisar OG tags.
  - Actualizar también `/como-funciona` para reflejar el matching como protagonista.

- [ ] **RF-825** ⏸️ **RESERVADO** (ola supervisada — no tomar por el routine) · 🆕 🎨 **Animación v2 — más sharp/realista** (polish del hero). (S) — _feedback de Gonza post-landing: subir realismo SIN imágenes ni IP de Panini, manteniendo composite-only (solo transform/opacity)._
  - **Álbumes → páginas de álbum reales**: fondo con tinte papel (token, no blanco puro), header de página con banda de equipo (código + franja de color), celdas como espacios impresos (marco fino + número de figurita impreso en gris claro dentro del hueco vacío). Opcional: doble página con lomo central.
  - **Figuritas → stickers troquelados**: borde blanco grueso (4-5px), menos radius, marco interior fino, contraste más alto (tonos plenos de los tokens, no `/10`), número dorsal grande + código de equipo, dorada plena (`special`) para la especial. Al encajar debe "tapar" el espacio impreso con su mismo número.
  - 🎨: `/design-consultation` antes de diseñar; loop de screenshots Playwright (390/1440 × light/dark) antes de cerrar.

### PWA

- [x] **S3.1** Manifest + service worker + instalable. (M) — _Corrida 40 (2026-06-07): `src/app/manifest.ts` (Next.js MetadataRoute.Manifest → `/manifest.webmanifest`), `src/app/icon.tsx` + `apple-icon.tsx` (ImageResponse 192×192 / 180×180 → `/icon.png` / `/apple-icon.png`), `public/sw.js` (cache-first para `_next/static`, network-first para páginas, skip `/api/` y `/auth/`), `src/components/pwa/sw-register.tsx` (client + useEffect). Rutas ○ Static en build. 386 tests verdes._

### Admin (módulo 1000)

- [x] **RF-1001** `/admin` solo con `role=admin`. (M) — _Corrida 48 (2026-06-07): middleware `/admin` en PROTECTED_PATHS; `AdminLayout` redirige a `/album` si `session.role !== 'admin'`; `Session` ahora incluye `role`. 472 tests verdes._
- [x] **RF-1002** Lista de usuarios con búsqueda (email/username), tabla paginada. (M) — _Corrida 48 (2026-06-07): `GET /api/admin/users` + `findAllForAdmin` (repo) + `listUsersForAdmin` (service) + `/admin/page.tsx` con searchParams, tabla, paginación._
- [x] **RF-1003** Ver perfil completo (datos privados). (M) — _Corrida 48 (2026-06-07): `GET /api/admin/users/[id]` + `findByIdForAdmin` (repo) + `getUserDetailForAdmin` (service) + `/admin/users/[id]/page.tsx` con todos los campos privados._
- [x] **RF-1004** Suspender usuario (soft delete `isSuspended`). (M) — _Corrida 48 (2026-06-07): `PATCH /api/admin/users/[id]` + `updateSuspension` (repo) + `toggleSuspension` (service) + `SuspendButton` client component con confirm() + router.refresh()._
- [ ] **RF-1005** Link al dashboard de Sentry. (S)

### Settings completo + Geo + Compliance

- [x] **RF-905** Config de notificaciones (email frequency, notify on new match, push). (M) — _Corrida 46 (2026-06-07): sección Notificaciones en /settings (notifyOnMatch toggle, emailFrequency select, pushEnabled toggle) + PUT /api/settings/notifications + service/repo. 435 tests verdes._
- [x] **RF-906** Config de matchmaking (participar, radio, ofrecer únicas, aceptar desequilibrados). (M) — _Corrida 46 (2026-06-07): sección Matchmaking en /settings (participatesInMatchmaking, matchRadius, offerUniques, acceptUnbalanced) + PUT /api/settings/matchmaking + service/repo. 435 tests verdes._
- [x] **RF-903** Editar WhatsApp con validación. (S) — _ya implementado desde RF-114 (Corrida 25): campo en SettingsForm con normalización y validación de celular uruguayo; marcado [x]._
- [x] **RF-904** Toggle perfil público en settings. (M) — _ya implementado desde RF-901 (Corrida 22); marcado [x]._
- [ ] **RF-115** Geo opt-in con granularidad (ninguna / barrio / exacta, default ninguna). (C)
- [x] **RF-119 / RF-908** Borrado de cuenta con doble confirmación + cascade real (Ley 18.331). (M) — **crítico compliance** — _Corrida 47 (2026-06-07): `userRepository.deleteUserCascade` (borra ratings → matches → messages → user en orden FK-safe); `userService.deleteAccount`; `DELETE /api/settings/account` (session → delete DB → signOut Supabase → best-effort admin delete auth user); "Zona de peligro" en SettingsForm con modal de doble confirmación. 443 tests verdes._

### Polish

- [x] **S3.2** Loading / empty / error states en todas las pantallas, microcopy uruguayo, animaciones sutiles. (M) — _Corrida 49 (2026-06-07): empty states con CTA en /matches (🤝 → "Cargar mi álbum") y /conversations (💬 → "Ver mis matches"); loading.tsx para /settings y /admin. loading.tsx de album/matches/conversations ya existían desde RF-328. 472 tests verdes._

---

## 🔍 Deuda y hallazgos — Auditoría gstack 2026-06-06

> Generado por la suite gstack multi-agente (6 lentes: Producto/CEO, Arquitectura, Testing, Seguridad, DevEx, Diseño/A11y). 36 hallazgos, 9 críticos/altos verificados adversarialmente (0 refutados). **Informe completo: `reports/gstack-audit-2026-06-06.md`.**
> **Prioridad de launch: RF-320 es el bloqueante #1** — el match engine (core del producto) está implementado y testeado pero NINGÚN path lo invoca en runtime → `/matches` siempre vacío para usuarios reales. Tratarlo antes que el resto de esta sección. El gate quedó verde y la arquitectura/seguridad en lo crítico, sólidas.

### Must (M)

- [x] **RF-320** 🆕 🔥 **Cablear el recompute de matches en runtime — el engine existe pero NINGÚN path lo invoca.** (M) — _Ola A (2026-06-07, rama `feat/matching-runtime`, PR SIN auto-merge): recompute SÍNCRONO colgado de `stickerService.bulkUpdateCounts` (único punto de escritura del álbum, guardado por `applied > 0`, en try/catch → no rompe el guardado). Orquestador `matchService.recomputeForUser(userId, now?)` (Service); pool en `matchRepository.findCandidatePool` + `findMatchmakingProfile` (una query con include, sin N+1); `findMatchesForUser` puro intacto; persiste vía `saveMatchResult` (upsert idempotente RF-308 + notificación `new_match` RF-409 a ambas partes solo en match nuevo). Sin Inngest (eso es RF-307). 514 tests verdes; gate completo OK. Falta E2E manual (Gonza). M7 (plegar `getExistingStickerIds` al INSERT) **diferido** (cambia semántica applied/ignored)._
  - **Disparador**: tras persistir cambios del álbum del usuario (en `stickerService.updateStickerCount` y, cuando exista, en el bulk de RF-213), recalcular matches para ese usuario de forma **SÍNCRONA** (sin Inngest — Inngest queda para RF-307, optimización post-RF-320; sus keys ya están cargadas). Para no inflar el request del PATCH por figurita, disparar el recompute en el flush bulk (RF-213) o, si RF-213 aún no está, hacerlo con dedupe/debounce a nivel service.
  - **Flujo**: cargar el pool de candidatos activos del mismo depto/filtros desde el repository (NO en el dominio) → llamar `findMatchesForUser` (función pura, intacta) → por cada resultado, `matchService.saveMatchResult` (que ya hace upsert idempotente + dispara la notificación `new_match` de RF-409 si es nuevo).
  - **Capas**: el orquestador vive en Service (ej. `matchService.recomputeForUser(userId)`); el armado del pool de candidatos vive en `matchRepository`/`stickerRepository` (único acceso a Prisma). El engine sigue puro. NO meter Prisma en `src/lib/match-engine.ts`.
  - **Idempotencia/TTL**: respetar RF-308 (upsert por par) y RF-309 (no recrear matches inactivos sin razón). Recompute debe ser seguro de correr N veces.
  - **TDD (en este orden)**: (1) test del service `recomputeForUser` con repos mockeados — verifica que arma el pool, llama al engine y persiste cada match vía `saveMatchResult`; (2) test de que un usuario sin contraparte no crea filas; (3) test de que tras el flush del álbum se llama el recompute (mock); (4) test de que un match nuevo dispara la notificación a ambas partes (RF-409 ya existe, asegurar el wiring).
  - **Criterio de aceptación**: dos usuarios del mismo depto con sets complementarios cargan sus álbumes → la tabla `Match` se puebla y ambos ven el match en `/matches` SIN ningún job/cron/Inngest corriendo.

- [x] **RF-321** 🆕 **Enforced coverage — el 100% del match engine NO está garantizado por el CI.** (M) — _Corrida 41 (2026-06-07): `coverage.include: ['src/**/*.{ts,tsx}']` + `coverage.exclude` (tipos/test/d.ts) + `coverage.thresholds['src/lib/match-engine.ts']` 100% en statements/branches/functions/lines. Removido `--passWithNoTests` de `test` y `test:coverage`. Verificado: introducir un `_neverCalled()` en el engine → exit code 1 + ERROR de threshold. 386 tests verdes._
  - Agregar a `vitest.config.ts`: `coverage.include: ['src/**/*.{ts,tsx}']` con `exclude` de tipos/`index`/`*.d.ts`/configs, para que el reporte muestre la cobertura real del repo.
  - Agregar `coverage.thresholds` con un override per-file de **100%** sobre `src/lib/match-engine.ts` (statements/branches/functions/lines) → el CI rompe si baja.
  - Quitar `--passWithNoTests` de `test:coverage` (ver RF-336) para que un glob roto no pase en verde.
  - **Criterio**: bajar a propósito un test del engine hace fallar `pnpm test:coverage` (y por ende el job `test` del CI).

- [x] **RF-323** 🆕 **Proteger rutas privadas en el middleware — hoy solo refresca la cookie.** (M) — _Corrida 43 (2026-06-07): `middleware.ts` — `isProtectedPath` (exact + startsWith) sobre `/album`,`/matches`,`/conversations`,`/settings`,`/onboarding`; si `!user` → `NextResponse.redirect` a `/auth/login?next=<path>` (307). Rutas públicas y `/u/*` intactas. 16 tests en `src/__tests__/middleware.test.ts`. 411 tests verdes._ — _detectado 6-jun: `middleware.ts` llama `supabase.auth.getUser()` y devuelve `response` sin ningún `redirect`/guard; toda la protección depende de que CADA page/route llame `getSession()` por su cuenta (hoy bien hecho, pero frágil ante un olvido futuro)._
  - En `middleware.ts`: si no hay `user` y la ruta es protegida (`/album`, `/matches`, `/conversations`, `/settings`, `/onboarding`, y `/u/[username]` solo si es el propio), redirigir a `/auth/login?next=<path>` (el `?next` ya lo respeta `resolveDestinationForUser`).
  - Mantener los chequeos `getSession()` por page/route como **segunda capa** (no quitarlos).
  - No tocar las rutas públicas (`/`, `/como-funciona`, `/precios`, `/privacidad`, `/terminos`, `/contacto`, `/auth/*`, `/u/[username]` público).
  - **TDD**: tests del middleware — usuario sin sesión en ruta protegida → 307/302 a `/auth/login`; usuario con sesión → pasa; ruta pública sin sesión → pasa.

- [x] **RF-324** 🆕 **Rate limiting in-memory (ADR-016) — hoy no existe ninguno.** (M) — _Corrida 44 (2026-06-07): `src/lib/rate-limit.ts` (ventana fija, Map en memoria, cleanup periódico, `getClientIp`). Aplicado en: `POST /api/auth/verify-otp` (10/15min por IP+email), `POST /api/matches/[id]/messages` (60/min por userId), `GET /api/onboarding/check-username` (20/min por userId), `PATCH /api/album/stickers` (30/min por userId). 429 `{error:"rate_limited"}`. `LoginForm.verifyCode` maneja 429 → `errorRateLimited`. i18n `Errors.rateLimited`. 422 tests verdes._

- [x] **RF-328** 🆕 **No existen error.tsx / not-found.tsx / loading.tsx en el App Router.** (M) — _Corrida 42 (2026-06-07): `not-found.tsx` (server, async, branded, i18n, CTA /album + /); `error.tsx` (client, branded, i18n, reintentar + volver); `global-error.tsx` (client, último recurso fuera del provider — strings hardcodeados, excepción documentada); `loading.tsx` skeletons en `/album`, `/matches`, `/conversations` (animate-pulse, tokens, aria-busy). 394 tests verdes._

### Should (S)

- [x] **RF-322** 🆕 **Tests de componentes client con lógica de verdad.** (S) — _Corrida 51 (2026-06-07): `vitest.config.ts` dom project ampliado a `src/app/auth/**` + `src/components/chat/**`; `LoginForm.test.tsx` (8 tests: email→code, verifyCode éxito/400/429/short, backToEmail); `chat-panel.test.tsx` (8 tests: render, polling 10s con fake timers, cleanup unmount, envío). AlbumClient ya tenía tests completos desde RF-213. 489 tests verdes._
  - Ampliar el `include` del project `dom` en `vitest.config.ts` (ej. `src/components/**` + `src/app/**/*{Client,Form}.tsx`) o crear un project jsdom dedicado para `app/`.
  - **AlbumClient**: con fake timers — update optimista del count, flush del debounce dispara el PATCH, rollback + estado de error si el PATCH falla. (Ojo: si se hace junto a RF-213, testear el buffer compartido + flush único.)
  - **LoginForm**: transición email→code, éxito (verify-otp 200 → redirect), código inválido (muestra error sin avanzar).
  - **chat-panel**: con fake timers — el polling dispara fetch cada 10s; cleanup del interval en unmount.
  - **TDD**: escribir los tests, verlos fallar/pasar; usar `vi.useFakeTimers()` para debounce/poll.

- [x] **RF-325** 🆕 **El logger estructurado obligatorio no se usa en ningún lado.** (S) — _Corrida 52 (2026-06-07): Decisión A adoptada — `logger.error('Unhandled error', { error: ... })` añadido en los 9 `catch` de API routes que hacían `throw err` o `return 500` silenciosamente (admin/users/[id], matches/[id]/messages, matches/[id]/ratings, onboarding, settings, settings/account, settings/location, settings/matchmaking, settings/notifications). Test spy en `PUT /api/settings`. 490 tests verdes._
  - Decisión A (recomendada): adoptar `logger.error(...)` en los `catch` de services/routes para errores 500 inesperados (sin loguear secretos ni PII — CLAUDE.md §15). Empezar por los `catch` que hoy hacen `throw`/`return 500` mudos.
  - Decisión B: si se decide no usarlo en el MVP, borrar `src/lib/logger.ts` y relajar la regla en CLAUDE.md §9 para que no quede deuda mandada por doc.
  - **TDD**: si A, test de que un 500 inesperado en una route llama `logger.error` (spy).

- [x] **RF-326** 🆕 **Tests directos de schemas Zod — 6 de 7 sin test propio.** (S) — _Corrida 2026-06-08: tests para `onboarding.schema.ts` (UsernameSchema + CompleteOnboardingSchema), `rating.schema.ts` (CreateRatingSchema), `message.schema.ts` (SendMessageSchema). `sticker.schema.ts` ya tenía tests. 595 tests verdes._

- [x] **RF-327** 🆕 **CI usa pnpm 9 pero el repo declara pnpm@10.34.1 — drift de versión.** (S) — _Corrida 45 (2026-06-07): `PNPM_VERSION: 9` → `10` en `ci.yml`. Lockfile 9.0 compatible con pnpm v10 sin cambios._ — _detectado 6-jun: `.github/workflows/ci.yml:17` setea `PNPM_VERSION: 9` y los 3 jobs hacen `--frozen-lockfile`, pero `package.json:10` declara `pnpm@10.34.1` y CLAUDE.md §3 dice pnpm 10; el lockfile `9.0` lo salva hoy, pero un cambio de resolución entre majors puede romper el gate con --frozen-lockfile._
  - Subir `PNPM_VERSION` a `10` en `ci.yml` (o quitar el override y dejar que `pnpm/action-setup` respete el campo `packageManager`).
  - Verificar que `pnpm install --frozen-lockfile` sigue verde en CI tras el cambio.
  - **Criterio**: CI, corepack local y `package.json` apuntan a la misma major de pnpm.

- [x] **RF-329** 🆕 **`text-accent` (naranja) sobre fondo claro falla WCAG AA (2.8:1).** (S) — _Corrida 50 (2026-06-07): token `--accent-text: #c2410c` (light, ≈4.5:1 sobre blanco) + `#f97316` (dark) en `globals.css`; `--color-accent-text` en `@theme inline`. `text-accent-text` en sticker-cell (repes), ScrollHint, AlbumClient (stat duplicates), page.tsx (H1 highlight), rating-modal (estrellas). Wordmark "La" y elementos aria-hidden decorativos mantienen text-accent (tradeoff de marca). 472 tests verdes._ — _detectado 6-jun: `--accent #f97316` sobre `--background #ffffff` da 2.80:1 (falla AA normal 4.5 y grande 3.0); peor sobre bg-accent/10 (2.53:1, sticker-cell count) y bg-accent/5 (2.67:1, ScrollHint). Solo afecta light (dark da 6.8:1). El badge bg-accent+accent-foreground SÍ pasa — el problema es naranja como TEXTO sobre claro._
  - Agregar a `globals.css` un token tipo `--accent-text` más oscuro (~`#c2410c`, ≈4.5:1 sobre blanco) para light, y su par en dark; exponerlo en `@theme inline` (`--color-accent-text`).
  - Reemplazar `text-accent` por `text-accent-text` en usos de naranja como foreground sobre fondos claros: `sticker-cell.tsx:32` (contador de repes), `ScrollHint.tsx:21`, `AlbumClient.tsx:155` (stat), eyebrows en naranja.
  - Verificar que dark sigue OK y que el badge/bg-accent no cambia.
  - **Criterio**: contraste ≥ 4.5:1 (texto normal) en todos los usos de naranja como texto sobre claro.

- [x] **RF-330** 🆕 **Color crudo `bg-black/80` en el overlay del Dialog.** (S) — _Corrida 45 (2026-06-07): agregado token `--overlay: #0f172a` en `globals.css` (siempre oscuro, no flip en dark mode) + `--color-overlay` en `@theme inline`. `dialog.tsx` usa `bg-overlay/80`. Grep limpio: cero clases de color crudas en `src/`._ — _detectado 6-jun: es la ÚNICA clase de color cruda real en todo `src/` (grep exhaustivo); `dialog.tsx:24` la trae heredada del template shadcn, viola la regla 6 no-negociable de tokens. El Dialog se usa en el rating-modal. En dark, bg-black/80 se confunde con el fondo grafito y pierde el scrim._
  - Reemplazar `bg-black/80` por `bg-foreground/60` (token), o agregar un `--overlay` a `globals.css` (light+dark) y consumirlo.
  - Verificar el scrim en light y dark (que se vea el oscurecido sobre el fondo grafito en dark).
  - **Criterio**: cero clases de color crudas en `src/` (grep limpio); overlay visible en ambos modos.

### Could (C)

- [x] **RF-331** 🆕 **5 componentes en `src/app` usan PascalCase, rompiendo kebab-case (§9).** (C) — _detectado 6-jun: `SettingsForm.tsx`, `AlbumClient.tsx`, `OnboardingForm.tsx`, `LoginForm.tsx` y `components/coming-soon/ScrollHint.tsx` usan PascalCase; todo `src/components/**` cumple kebab-case._ — _2026-06-08, rama `claude/gallant-sagan-VHKoN`: renombrados 5 source files + 2 test files a kebab-case; imports actualizados; regla `local/kebab-case-filename` inline en `eslint.config.mjs` (sin dependencia nueva). `pnpm lint` ahora falla ante cualquier archivo PascalCase nuevo en `src/`._
  - Renombrar a `settings-form.tsx`, `album-client.tsx`, `onboarding-form.tsx`, `login-form.tsx`, `scroll-hint.tsx` y actualizar todos los imports.
  - Agregar regla de lint (`unicorn/filename-case` con `kebabCase`) para que el CI lo atrape y no vuelva a divergir.
  - **Criterio**: `pnpm lint` falla ante un archivo PascalCase nuevo; build/type-check verdes tras el rename.

- [x] **RF-332** 🆕 **`SettingsForm.tsx` excede el límite de 200-300 líneas (§9).** (C) — _detectado 6-jun: 326 líneas, por encima del techo; AlbumClient (285) y LoginForm (244) están cerca pero dentro._ — _2026-06-08 (rama `claude/gallant-sagan-UUn9f`): extraídas 5 secciones (`profile-section.tsx` ~176L, `location-section.tsx` ~119L, `notifications-section.tsx` ~110L, `matchmaking-section.tsx` ~129L, `account-section.tsx` ~101L); `settings-form.tsx` → orquestador de ~55L. 609 tests verdes._
  - Extraer sub-componentes por sección (perfil / ubicación / cuenta) y/o un hook de form (que además poblaría `src/hooks`, hoy solo `.gitkeep`).
  - Mantener tokens + i18n; no cambiar comportamiento.
  - **Criterio**: ningún módulo > 300 líneas; tests/verde.

- [x] **RF-333** 🆕 **`POST /api/auth/verify-otp` valida a mano en vez de con Zod.** (C) — _2026-06-08, rama `claude/gallant-sagan-56W50`: `src/lib/validations/auth.schema.ts` con `VerifyOtpSchema` (email + trim/lowercase + pipe email(); token + remove-spaces + pipe regex `^\d{6}$`); route usa `safeParse` → 400 en vez de checks manuales. 11 tests de schema + 1 test de route (token no-numérico). 621 tests verdes._ — _detectado 6-jun: `route.ts:19-25` lee `request.json()` y valida email/token con checks manuales (typeof/.trim()/length<6) sin schema; no hay schema de auth/otp en `src/lib/validations/`. El resto de routes con body usan Zod._
  - Crear `src/lib/validations/auth.schema.ts` con `VerifyOtpSchema` (email válido + token de 6 dígitos numéricos).
  - Usar `safeParse` en la route → 400 ante input inválido, alineando con el patrón session→Zod→Service→JSON.
  - **TDD**: tests del schema (acepta válido, rechaza email malo/token corto/no numérico) + la route devuelve 400.

- [x] **RF-334** 🆕 **`auth/logout` es la única API route sin test.** (C) — _2026-06-08, rama `claude/gallant-sagan-D6Eka`: `src/app/api/auth/logout/__tests__/route.test.ts` — 2 tests: `signOut()` llamado + redirect `${origin}/` status 303. 623 tests verdes._
  - Agregar `src/app/api/auth/logout/__tests__/route.test.ts` mockeando `createClient`: assert que se llama `auth.signOut()` y que el redirect apunta a `${origin}/` con status 303.
  - **Criterio**: ~15 líneas; cierra la simetría del flujo de auth.

- [x] **RF-335** 🆕 **PATCH `/api/album/stickers/[stickerId]` da 500 ante body malformado.** (C) — _fix ya incluido en el endpoint bulk de RF-213: `req.json().catch(() => null)` + test de body malformado → 400 (verificado en `__tests__/route.test.ts`)._

- [x] **RF-336** 🆕 **`--passWithNoTests` activo enmascara suites vacías.** (C) — _ya removido por RF-321 (Corrida 41): `pnpm test` y `pnpm test:coverage` en `package.json` no tienen `--passWithNoTests`._ — _detectado 6-jun: `test` y `test:coverage` (`package.json:21,23`) usan `--passWithNoTests`; hoy no hay suites vacías, pero en un pipeline con auto-merge un glob roto o una suite vaciada pasaría en verde._
  - Quitar `--passWithNoTests` de `test:coverage` (y de `test` salvo razón concreta de globs que matcheen vacío legítimamente).
  - **Criterio**: un archivo de test sin casos `it()/test()` hace fallar el CI.

- [x] **RF-337** 🆕 **Dropdown de notificaciones sin Escape ni aria-expanded/haspopup.** (C) — _2026-06-08, rama `claude/gallant-sagan-ZSTdS`: `buttonRef` + `aria-haspopup="menu"` + `aria-expanded={isOpen}` en el botón-campana; handler `keydown Escape` → `setIsOpen(false)` + `buttonRef.current?.focus()` (devuelve foco al cerrar). `@testing-library/jest-dom/vitest` en setup; 5 tests TDD. 628 tests verdes._

### Follow-ups del review de RF-213 (PR #68) — ítems nuevos

- [x] **RF-338** 🆕 **Scoping de la existence-check de stickers por álbum activo.** (S) — _2026-06-08, rama `claude/gallant-sagan-Qndkx`: `getExistingStickerIds` ahora filtra `where: { id: { in: ids }, album: { slug: 'mundial-2026' } }` — Prisma relation filter, 1 sola query. PRE-F2: impide que sticker IDs de un futuro 2do álbum pasen la existence-check. 643 tests verdes._
- [x] **RF-339** 🆕 **Perf de render del álbum (medir con profiler primero).** (C) — _2026-06-08, rama `claude/rf339-album-render-perf`: `StickerCell` envuelto con `React.memo` + `count` extraído como prop primitivo (el sticker ref es estable → solo re-renderiza la celda tocada). `grouped` ya no incluye `currentCount` ni depende de `counts` → recalcula solo cuando cambia el set visible. `displayStats` reemplaza la comparación por índice frágil con flag `hasInteracted` (más simple y correcto). 6 tests de `StickerCell` + 2 tests de `displayStats` + vitest dom project ampliado a `src/components/album/**`. 687 tests verdes. ⚠️ Impacto real medible en React Profiler en el browser (no en CI)._
- [x] **RF-340** 🆕 **Persistir el buffer del álbum en `localStorage` + rehidratar al volver.** (C) — _detectado en la validación manual de RF-213 (2026-06-07): cerrar la pestaña **inmediatamente** tras clickear (antes del debounce de 800ms / flush) puede perder esos clicks — el `pagehide`+keepalive no siempre llega a salvarlos (visto en dev). Cierra la ventana de pérdida del cierre inmediato: escribir el buffer pendiente en `localStorage` en cada cambio (o en `pagehide`) y rehidratarlo al montar `AlbumClient`, reintentando el flush. **Limitación conocida y aceptada en el MVP** (ventana <800ms; el camino mobile común va por `visibilitychange`, que sí flushea)._

- [x] **RF-342** 🆕 **Pruning de matches fantasma tras un recompute.** (S) — _2026-06-08, rama `claude/gallant-sagan-qfueq`: `matchRepository.pruneStaleForUser(userId, freshPartnerIds)` marca `inactive` los matches `active` cuyo contraparte NO está en `freshPartnerIds` (patrón two-step igual que `markInactiveByLastSeen`; solo `active`, `completed`/`trading` intactos; chat preservado). `matchService.recomputeForUser` recoge los partner IDs de los resultados tras el persist loop y llama prune en try/catch (fallo no-fatal). 651 tests verdes._

- [x] **RF-343** 🆕 **Read-tracking de mensajes + re-notificación.** (M) — _2026-06-08, rama `claude/gallant-sagan-xfAJe`: `messageRepository.markMessagesRead(matchId, userId)` (updateMany readAt); `messageService.markRead(matchId, userId)` (assertParticipant + markMessagesRead); `PATCH /api/matches/[id]/messages/read` (401/404/200); `ChatPanel` llama PATCH /read en mount (useEffect). countUnread vuelve a 0 al abrir la conversación → el anti-spam 0→1 de sendMessage re-notifica de verdad. 639 tests verdes._
- [ ] **RF-344** 🆕 **Toggles de email por tipo (mensaje / reseña).** (S, requiere migración) — _review Ola B: hoy el único toggle por tipo es `notifyOnMatch`; los mails de `new_message` y `rating_received` se gobiernan SOLO por `emailFrequency` global (la única forma de cortarlos es `never`, que apaga todo, matches incluidos). Agregar `notifyOnMessage`/`notifyOnReview` (Boolean, migración de Prisma — dominio de Gonza) + exponerlos en /settings + gatearlos en `maybeSendEmail`. MVP defendible sin esto; mejora de control fino._
- [x] **RF-345** 🆕 **Expiry + re-suscripción del token de baja.** (S) — _2026-06-08, rama `claude/gallant-sagan-f2mra`: token de baja ahora incluye expiración (30d TTL); tokens viejos (2 partes) rechazados. Token de reactivación firmado (HMAC, contexto "resub:", 7d TTL) embebe `userId + prevFreq`: tras la baja, la página de confirmación muestra "Reactivar notificaciones" con el token oculto en un form; POST `action=resubscribe` restaura la frecuencia previa. No requiere migración de DB. 671 tests verdes._
- [x] **RF-346** 🆕 **Personalizar el mail de mensaje con el nombre del remitente.** (XS) — _2026-06-08, rama `claude/gallant-sagan-obttph`: `messageService.sendMessage` carga `userRepository.findById(fromUserId)` (name ?? username ?? null) dentro del bloque `countUnread===1` (try/catch existente). `buildNotificationEmail` para `new_message` lee `payload.fromName` → subject "X te escribió en CambiaLa", heading/body personalizados; fallback genérico si ausente. XSS seguro (escaping en `layout()`). 5 tests nuevos (templates + service). 676 tests verdes._
- [x] **RF-347** 🆕 **Modo registro en `/auth/login` — entrar por "Registrate" cae en una pantalla titulada "Iniciá sesión".** (S) — _2026-06-08, rama `claude/gallant-sagan-twDER`: `LoginForm` acepta prop `mode?: 'login'|'signup'`; en signup muestra "Creá tu cuenta" + link "¿Ya tenés cuenta?"; en login muestra "¿Primera vez? Creá tu cuenta" → `?mode=signup`. `login/page.tsx` lee `searchParams.mode` y condicionala el título, subtítulo y metadatos. Navbar CTA + hero CTA + finalCta de landing apuntan a `?mode=signup`. Flujo OTP intacto (sin bifurcación de backend). 3 tests nuevos. 642 tests verdes._

### Documentación (doc-drift, no es código)

- [x] **D-001** 🆕 📝 **CLAUDE.md declara Auth como stub no implementado, pero está 100% cerrado.** (M) — _detectado 6-jun: `src/lib/auth.ts:14-28` es `getSession()` real con `@supabase/ssr`; CLAUDE.md §2 (l.41), §12 (l.234,237) y §22 (l.357) siguen diciendo 'stub return null' / 'toda ruta da 401' / 'Auth como próximo gran hito'; BACKLOG RF-101..107 todos [x]._ — _✅ resuelto (verificado en drift-sweep 2026-06-07): CLAUDE.md ya dice "Auth CERRADO" en §2/§12/§22, sin "stub"/"401"; checkbox quedó sin tildar._
  - §2 (snapshot): cambiar 'Camino crítico pendiente: Auth ... stub return null' por el verdadero pendiente → **cablear el recompute de matches (RF-320)** + email (RF-406). Reflejar que Auth (magic link + OTP 6 dígitos + Google OAuth) está implementado.
  - §12: reescribir — `getSession()` ya es real con `@supabase/ssr`; describir el flujo actual (middleware refresh, callback PKCE+token-hash, verify-otp, logout).
  - §22 (última actualización): quitar 'Auth como próximo gran hito'.
  - Tachar también de §21 los nits ya resueltos: back-link a `/matches` (la página existe) y bump postcss (lock resuelve 8.5.15).

- [x] **D-002** 🆕 📝 **README masivamente desactualizado y con guía de deploy peligrosa.** (S) — _detectado 6-jun, 6 sub-claims verificados: (1) 'Next.js 14' vs `next 16.2.6`; (2) 'Squash & merge a main' / 'main deploya automáticamente' vs ADR-021 develop=prod+rebase; (3) `docker compose up -d` sin docker-compose en el repo; (4) `pnpm db:seed` (real: `prisma:seed`) y `pnpm test:integration` (no existe); (5) 'pre-commit (Husky)' sin `.husky/`; (6) 'Lighthouse CI por PR' deshabilitado._ — _✅ resuelto (verificado en drift-sweep 2026-06-07): README reescrito (Next 16, develop=prod+rebase, sin docker/Husky/test:integration, `prisma:seed`, lighthouse marcado deshabilitado); checkbox quedó sin tildar._
  - Corregir stack a Next 16. Reescribir la sección de deploy: **develop = PRODUCCIÓN, merge por rebase, nunca push directo, nunca squash a main**.
  - Corregir nombres de scripts (`prisma:seed`, `db:reset`), quitar `test:integration`.
  - Quitar el paso de docker-compose (o agregar el archivo) y las menciones a Husky/Lighthouse-CI (o marcarlas como no implementadas).
  - Unificar la marca a CambiaLa (ligado al flag de naming §21).

- [x] **D-003** 🆕 📝 **CONTRIBUTING describe un flujo de PR contrario al pipeline real.** (C) — _detectado 6-jun: título 'Contribuir a Figus Mundial' (marca vieja); :51 'Squash & merge a develop' vs ADR-021 (rebase); :49 'CI ... + lighthouse' (ci.yml no corre lighthouse); :50 'Code review obligatorio de otra persona' (incompatible con auto-merge del agente)._ — _✅ resuelto (verificado en drift-sweep 2026-06-07): CONTRIBUTING dice "Contribuir a CambiaLa", merge por rebase, lighthouse deshabilitado, code PRs sin auto-merge; checkbox quedó sin tildar._
  - Alinear con ADR-021: merge por rebase (no squash), reflejar el flujo auto-merge, quitar 'lighthouse' del gate descrito, actualizar la marca a CambiaLa.
  - Tachar de CLAUDE.md §21 los nits ya cerrados (back-link a `/matches`, postcss ≥ 8.5.10) — dejar solo los vigentes (naming/dominio, catálogo sintético).

---

## F2 (post-MVP, NO construir hasta MVP estable)

RF-117, RF-118 (cuentas), RF-212/213/214 (multi-álbum UI, import por foto/CSV), RF-314/315/316 (hint de valor, packs, mapa), RF-410 (Web Push), RF-507/508/509 (chat realtime, typing, read receipts), RF-605/606 (reportes, moderación), RF-811/812 (blog, páginas por álbum), RF-1006/1007/1008 (cola reportes, flagged, métricas), RF-1101–1106 (Plan Pro / monetización).

## F3 (experimental)

RF-317 (triángulos), RF-411 (WhatsApp deep link), RF-510 (foto al chat), RF-1107 (listings destacados), app nativa, API pública, kioskos.

## Won't have (fuera de scope, NO implementar)

E-commerce, envíos, cobro por intercambio, pagos entre usuarios, app nativa en MVP, álbumes no-Panini, operación fuera de Uruguay, API pública para terceros, afiliados con incentivo monetario.
