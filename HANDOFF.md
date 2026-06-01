# HANDOFF — auto-builder de CambiaLa

> Bitácora del auto-builder. Cada corrida agrega una entrada **ARRIBA** (más reciente primero).
> Claude Code lo lee al inicio de cada corrida para saber dónde seguir.

## 2026-06-01 — Corrida 25

- **Ítem**: RF-113 + RF-114 + RF-116 — Bio del partner visible, WhatsApp y toggle perfil público
- **Rama**: `claude/tender-archimedes-I34eF`
- **PR**: https://github.com/gonzalocvv/CambiaLa/pull/41
- **Estado**: ✅ completo, PR abierto con auto-merge (REBASE) solicitado

### Qué se hizo

- `src/lib/validations/settings.schema.ts`: `UpdateProfileSchema` extiende con `whatsapp` (regex `/^\+598\d{8}$/`, opcional) y `publicProfile` (boolean opcional). `GetSettingsResponseSchema` incluye `whatsapp: nullable` y `publicProfile: boolean`.
- `src/lib/validations/match.schema.ts`: `MatchPartnerSchema` incluye ahora `bio: z.string().nullable()`.
- `src/repositories/user.repository.ts`: `UpdateProfileData` agrega `whatsapp?: string` y `publicProfile?: boolean`. `findById` selecciona `whatsapp` y `publicProfile`. `updateProfile` persiste ambos con conditional spread (no sobreescribe si no vienen).
- `src/services/match.service.ts`: `getMatchDetailForUser` y `getActiveMatchesWithPartners` propagan `bio: partner.bio`.
- `src/app/settings/page.tsx`: pasa `initialWhatsapp` y `initialPublicProfile` a `SettingsForm`.
- `src/app/settings/SettingsForm.tsx`: campo WhatsApp (input type=tel + pre-check regex client-side) + toggle publicProfile (role=switch, aria-checked). Ambos dentro de la sección Perfil, se guardan con el mismo `PUT /api/settings`.
- `src/app/matches/[id]/page.tsx`: muestra `partner.bio` (line-clamp-2) en el header del partner, solo si no es null.
- `messages/es.json`: 6 claves nuevas en `Settings` — `whatsappLabel`, `whatsappPlaceholder`, `whatsappHint`, `whatsappError`, `publicProfileLabel`, `publicProfileSubtitle`.
- Tests: 216 tests (+8), branches 100%, lines 100%.
  - `user.repository.test.ts`: findById aserta nuevos campos; updateProfile: 4 tests nuevos.
  - `match.service.test.ts`: 1 test nuevo — bio forwarding en `getActiveMatchesWithPartners`.
  - `settings/__tests__/route.test.ts`: 3 tests nuevos (whatsapp inválido 400, whatsapp válido 200, publicProfile 200). `makeUserProfile` incluye nuevos campos.
  - `matches/*/*/__tests__/route.test.ts`: `bio: null` agregado al mock del partner.
- Gate: format ✅, lint ✅, type-check ✅, format:check ✅, prisma:generate ✅, test:coverage ✅ (216 tests, branches 100%, lines 100%), build ✅.

### Próximo paso

1. **RF-506** — Indicador de no leídos en el match card (S): `countUnread(matchId, userId)` en message repository + badge en MatchCard.
2. **RF-112** — Avatar upload ⚠️ pendiente decisión de Gonza sobre almacenamiento.
3. **RF-601–604** — Reseñas post-trade: ciclo completo match → chat → completar → reseña.
4. **RF-802–808** — Páginas estáticas SSG (100% autónomas): `/como-funciona`, `/privacidad`, `/terminos`, `/contacto`, `/precios`, `sitemap.xml`, `robots.txt`.

RF-506 es pequeño y completa el ciclo del chat. Las páginas estáticas (RF-802–808) son 100% autónomas y aportan SEO/credibilidad.

### ⚠️ Bloqueos conocidos

- RF-102 🔒 Google OAuth — requiere configurar el provider en el dashboard de Supabase.
- RF-307 🔒 Inngest — scheduling del job de cleanup.
- RF-406 🔒 Resend — email transaccional custom.
- RF-112 ⚠️ Avatar upload — pendiente de decisión: Supabase Storage vs URL externa (validar host del origen para evitar SSRF).

---

## 2026-06-01 — Corrida 24

- **Ítem**: RF-501 + RF-502 + RF-503 + RF-504 + RF-505 — Chat 1-a-1 completo
- **Rama**: `claude/tender-archimedes-YYojk`
- **PR**: (ver abajo)
- **Estado**: ✅ completo, PR abierto con auto-merge (REBASE) solicitado

### Qué se hizo

- `src/lib/validations/message.schema.ts`: Zod schemas — `MessageItemSchema`, `SendMessageSchema` (min 1, max 1000), `GetMessagesResponseSchema`, `SendMessageResponseSchema`.
- `src/repositories/message.repository.ts`: 3 métodos — `create(matchId, fromUserId, body)`, `findByMatch(matchId)` (ordenado por `createdAt asc`), `countByMatch(matchId)`.
- `src/services/message.service.ts`: `getMessages(matchId, userId)` y `sendMessage(matchId, fromUserId, body)` — ambos validan que el userId sea participante del match (via `matchRepository.findById`). `MatchNotFoundError` (match inexistente) y `MessageAccessError` (no es participante) para manejo de errores en el route.
- `GET /api/matches/[id]/messages` (**RF-502**): 401 sin sesión, 404 si no participante/match, 200 `{ messages }`.
- `POST /api/matches/[id]/messages` (**RF-503**): 401 sin sesión, 400 input inválido (Zod), 404 si no participante/match, 201 `{ message }`.
- `src/components/chat/chat-panel.tsx` (**RF-502/503/505**, client): mensaje burbuja (propio → derecha, ajeno → izquierda), scroll automático al último mensaje, polling `setInterval(10s)` con cleanup, textarea + botón enviar (Enter sin Shift), contador de caracteres restantes, estados de error. Tokens de color únicamente (sin hardcoding).
- `src/app/matches/[id]/page.tsx`: integra `ChatPanel` con `initialMessages` cargados en SSR (via `messageService.getMessages` en paralelo con `getMatchDetailForUser`). Fix secundario: `bg-slate-200/700` → `bg-muted` en el avatar del partner.
- `messages/es.json`: clave `chatTitle` en namespace `MatchDetail` + namespace `Chat` (5 claves: `empty`, `placeholder`, `send`, `sending`, `sendError`).
- Tests: 208 tests (+22), branches 100%, lines 100%.
  - 4 tests en `message.repository.test.ts`
  - 7 tests en `message.service.test.ts`
  - 9 tests en `api/matches/[id]/messages/__tests__/route.test.ts`
- Gate: format ✅, lint ✅, type-check ✅, format:check ✅, prisma:generate ✅, test:coverage ✅ (208 tests, lines 100%, branches 100%), build ✅ (`/api/matches/[id]/messages` como `ƒ Dynamic`).

### Próximo paso

1. **RF-506** — Indicador de no leídos en el match card (S): contador de mensajes no leídos en la tarjeta de match. Requiere: `countUnread(matchId, userId)` en el repo (mensajes donde `fromUserId != userId` y `readAt IS NULL`).
2. **RF-112** — Avatar upload (JPG/PNG, máx 2MB, resize 200×200). ⚠️ Pendiente decisión de Gonza sobre almacenamiento (Supabase Storage vs URL externa).
3. **RF-113 + RF-114 + RF-116** — Nombre visible + bio / WhatsApp / Toggle perfil público: pueden ir juntos (todos son campos del User model, ya existe la settings page).
4. **RF-601–604** — Reseñas post-trade: el ciclo completo match → chat → completar → reseña.
5. **RF-802–808** — Páginas estáticas SSG (100% autónomas): `/como-funciona`, `/privacidad`, `/terminos`, `/contacto`, `/precios`, `sitemap.xml`, `robots.txt`.

RF-506 es pequeño y completaría el ciclo del chat. Las páginas estáticas (RF-802–808) son 100% autónomas y añaden mucho SEO/credibilidad.

### ⚠️ Bloqueos conocidos

- RF-102 🔒 Google OAuth — requiere configurar el provider en el dashboard de Supabase.
- RF-307 🔒 Inngest — scheduling del job de cleanup.
- RF-406 🔒 Resend — email transaccional custom.
- RF-112 ⚠️ Avatar upload — pendiente de decisión: Supabase Storage vs URL externa (validar host del origen para evitar SSRF).

---

## 2026-06-01 — Corrida 23

- **Ítem**: RF-404 + RF-405 + RF-409 — Badge campana de notificaciones + dropdown + trigger al crear match
- **Rama**: `claude/tender-archimedes-ltcOP`
- **PR**: (ver abajo)
- **Estado**: ✅ completo, PR abierto con auto-merge (REBASE) solicitado

### Qué se hizo

- `src/lib/auth.ts`: `getSession` envuelto con `React.cache()` para deduplicar llamadas concurrentes en el mismo request (AppNavbar + la página autenticada llaman getSession por separado).
- `src/services/match.service.ts` (**RF-409**): `saveMatchResult` ahora llama `matchRepository.findByUsers` antes del upsert para detectar si el match es nuevo. Si es nuevo, crea `new_match` para ambos participantes vía `notificationService.createNotification`. Fallo de notificación no falla el save del match (try/catch silencioso).
- `src/services/__tests__/match.service.test.ts`: 3 tests nuevos para RF-409 — (1) nuevo match crea 2 notificaciones, (2) match existente no crea notificaciones, (3) fallo de notificación no falla el save. Se agrega `findByUsers` al mock del repo y `mockNotificationService` hoisted.
- `src/components/notifications/notification-bell.tsx` (**RF-404**, client): `initialUnreadCount` prop (SSR), estado local, polling `setInterval(60s)`, badge naranja con count, toggle del dropdown, click-outside handler.
- `src/components/notifications/notification-dropdown.tsx` (**RF-405**, client): lista últimas 10 notificaciones, punto azul en no leídas, `PATCH /api/notifications/{id}` al hacer click + navega a `/matches/{matchId}` (o `/matches` como fallback). Fecha formateada en español uruguayo.
- `src/components/layout/app-navbar.tsx`: server component sticky con logo, links "Mi álbum"/"Mis matches", `NotificationBell` (con count inicial SSR), ícono ⚙️ → `/settings`.
- Páginas actualizadas con `<AppNavbar />`: `/album`, `/matches`, `/matches/[id]`, `/settings` (se eliminó el back-link redundante en settings).
- `messages/es.json`: namespaces `AppNav` (3 claves) + `Notifications` (13 claves con tipos y detalles).
- Tests: 186 tests (+3), branches 100%, lines 100%.
- Gate: format ✅, lint ✅, type-check ✅, format:check ✅, prisma:generate ✅, test:coverage ✅ (186 tests), build ✅ (todas las páginas como `ƒ Dynamic`).

### Próximo paso

1. **RF-112** — Avatar upload (JPG/PNG, máx 2MB, resize 200×200). Requiere decisión sobre almacenamiento: Supabase Storage (más integrado) vs URL externa. ⚠️ Necesita decisión de Gonza.
2. **RF-113** — Nombre visible + bio en perfil público — display en `/u/[username]` o en la página de match como mejora al partner header.
3. **RF-114** — Campo WhatsApp en settings (regex +598…) + **RF-116** toggle perfil público.
4. **Chat (RF-501–506)** — Chat 1-a-1 entre los dos usuarios de un match. Requiere modelo `Message` en Prisma + UI + polling 10s. Candidato ideal para la próxima corrida.

RF-501 (chat) es el siguiente hito más valioso: crea el ciclo completo de match → chat → completar cambio.

### ⚠️ Bloqueos conocidos

- RF-102 🔒 Google OAuth — requiere configurar el provider en el dashboard de Supabase.
- RF-307 🔒 Inngest — scheduling del job de cleanup.
- RF-406 🔒 Resend — email transaccional custom.
- RF-112 ⚠️ Avatar upload — pendiente de decisión: Supabase Storage vs URL externa (validar host del origen para evitar SSRF).

---

## 2026-06-01 — Corrida 22

- **Ítem**: RF-901 + RF-902 + RF-907 — Settings page (nombre/bio + ciudad/barrio + logout)
- **Rama**: `claude/tender-archimedes-4VRLA`
- **PR**: (ver abajo)
- **Estado**: ✅ completo, PR abierto con auto-merge (REBASE) solicitado

### Qué se hizo

- `src/lib/validations/settings.schema.ts`: schemas Zod — `UpdateProfileSchema` (name max 50, bio max 140, empty→null), `UpdateLocationSchema` (departamento + barrio condicional Montevideo), `GetSettingsResponseSchema`.
- `src/repositories/user.repository.ts`: métodos `findById()` (perfil completo), `updateProfile()` (name/bio con `|| null` para vacíos), `updateLocation()` (city + neighborhood con null por defecto). Tipos `UpdateProfileData` y `UpdateLocationData`.
- `src/services/user.service.ts`: `getUserProfile()`, `updateProfile()`, `updateLocation()` con `UserNotFoundError` (404 cuando el userId no existe en DB).
- `GET /api/settings`: 401 sin sesión, 200 con perfil del usuario.
- `PUT /api/settings`: 401/400/404/200 — actualiza name + bio.
- `PUT /api/settings/location`: 401/400/404/200 — actualiza city + neighborhood.
- `src/app/settings/page.tsx`: server component; redirige a `/auth/login` sin sesión, a `/onboarding` si onboarding incompleto; carga perfil y pasa props a `SettingsForm`.
- `src/app/settings/SettingsForm.tsx`: client component con 3 secciones: **Perfil** (name + bio con contador /140, autosave por sección con idle/saving/saved/error), **Ubicación** (city + barrio condicional, botón deshabilitado si Montevideo sin barrio), **Cuenta** (logout llama `POST /api/auth/logout` y redirige a `/`).
- `messages/es.json`: namespace `Settings` con 21 claves. Cero strings hardcodeados.
- Tests: 183 tests (+28), branches 100%, lines 100%.
  - 2 tests `user.repository.test.ts` (findById found/null)
  - 4 tests `user.repository.test.ts` (updateProfile + updateLocation)
  - 6 tests `user.service.test.ts` (getUserProfile, updateProfile, updateLocation × found/not found)
  - 7 tests `api/settings/__tests__/route.test.ts` (GET 401/200, PUT 401/400/400/400/200/404/rethrow)
  - 7 tests `api/settings/location/__tests__/route.test.ts` (PUT 401/400/400/200/200/404/rethrow)
- Gate: format ✅, lint ✅, type-check ✅, format:check ✅, prisma:generate ✅, test:coverage ✅ (183 tests), build ✅ (`/settings` como `ƒ Dynamic`).

### Nota sobre RF-901 (avatar)

RF-901 cubre nombre + bio. La parte de avatar (upload) es RF-112 (JPG/PNG, resize 200×200 server-side) — queda pendiente porque requiere: (a) lógica de subida de archivos, (b) resize server-side, (c) validar/allowlistear host de la URL (§15 CLAUDE.md). La settings page muestra el campo name y bio únicamente; avatar se agrega cuando se implemente RF-112.

### Próximo paso

1. **RF-112** — Perfil avatar (JPG/PNG, máx 2MB, resize 200×200 server-side). Puede implementarse como upload a Supabase Storage o como URL externa validada.
2. **RF-113** — Nombre visible + bio en perfil público (display, no edición — la edición ya está).
3. **RF-404 + RF-405** — Badge campana en navbar con contador no leídas (refresh 60s) + dropdown. El notification service ya existe.
4. **RF-409** — Trigger de notificación al crear match nuevo.

RF-404+RF-405 son los más valiosos para UX inmediata (el usuario ya puede editar su perfil; ahora necesita ver sus notificaciones).

### ⚠️ Bloqueos conocidos

- RF-102 🔒 Google OAuth — requiere configurar el provider en el dashboard de Supabase.
- RF-307 🔒 Inngest — scheduling del job de cleanup.
- RF-406 🔒 Resend — email transaccional custom.
- RF-112 — Avatar upload: pendiente de decisión sobre dónde almacenar (Supabase Storage vs URL externa).

---

## 2026-06-01 — Corrida 21

- **Ítem**: RF-204 + RF-205 — Filtros del álbum + búsqueda por número/nombre
- **Rama**: `claude/rf204-rf205-album-filters-search`
- **PR**: (ver abajo)
- **Estado**: ✅ completo, PR abierto con auto-merge (REBASE) solicitado

### Qué se hizo

- `messages/es.json`: 10 nuevas claves en namespace `Album` — `filterAll`, `filterMissing`, `filterHave`, `filterDuplicates`, `filterSpecials`, `searchPlaceholder`, `searchClear`, `teamFilterAll`, `emptyFilter`, `resultsCount`.
- `src/app/album/AlbumClient.tsx`: 3 nuevos estados (`activeFilter`, `selectedTeam`, `searchQuery`) + lógica de filtrado client-side:
  - **RF-204** — Pills scrollables (Todas / Me faltan / Tengo / Repetidas / Especiales) + select de equipo con todos los equipos del álbum en orden de aparición (FWC primero, luego los 48 países).
  - **RF-205** — Input de búsqueda case-insensitive por número (`URU9`) o nombre (`SUÁREZ`); botón ✕ para limpiar.
  - `filteredStickers`: useMemo que combina los 3 filtros antes de agrupar por equipo.
  - Estado vacío ("No hay figuritas…") cuando ningún sticker pasa el filtro.
  - Contador de resultados cuando hay filtro activo.
  - Botón "Todas ✕" para limpiar todos los filtros a la vez.
  - Stats bar y progress bar muestran totales globales (no filtrados) — comportamiento esperado.
- Gate: format ✅, lint ✅ (0 errores), type-check ✅, format:check ✅, prisma:generate ✅, test:coverage ✅ (155 tests, 100%), build ✅ (`/album` como `ƒ Dynamic`).

### Próximo paso

1. **RF-404 + RF-405** — Badge campana en navbar con contador no leídas (refresh 60s) + dropdown de últimas 10. El servicio de notificaciones ya existe (RF-401/402/403). Falta el componente UI del header.
2. **RF-409** — Trigger de notificación al crear match nuevo (ambas partes): llamar `notificationService.createNotification` desde `matchService.saveMatchResult`.
3. **RF-901/902/907** — Settings básico: editar username/ciudad/barrio + logout desde settings.

RF-404 + RF-405 son buena próxima corrida: el navbar ya existe, solo hay que agregar el ícono de campana con polling.

### ⚠️ Bloqueos conocidos

- RF-102 🔒 Google OAuth — requiere configurar el provider en el dashboard de Supabase.
- RF-307 🔒 Inngest — scheduling del job de cleanup.
- RF-406 🔒 Resend — email transaccional custom.

---

## 2026-06-01 — Corrida 20

- **Ítem**: RF-203 + RF-206 + RF-207 + RF-208 + RF-209 + RF-210 + RF-211 — Vista de mi álbum completa
- **Rama**: `claude/tender-archimedes-Jxujd`
- **PR**: (ver abajo)
- **Estado**: ✅ completo, PR abierto con auto-merge (REBASE) solicitado

### Qué se hizo

- `src/app/globals.css`: nuevo token `--special` / `--special-foreground` (dorado amber: `#D97706` light / `#FBBF24` dark) + entrada en `@theme inline` (`--color-special`, `--color-special-foreground`). Se usa para el ring dorado de figuritas especiales.
- `src/lib/validations/sticker.schema.ts`: Zod schemas — `StickerRaritySchema`, `StickerWithCountSchema`, `AlbumStatsSchema`, `GetAlbumResponseSchema`, `UpdateStickerCountSchema` + tipos inferidos.
- `src/repositories/sticker.repository.ts`: `getAlbumWithUserCounts(userId)` — álbum mundial-2026 con todos los stickers y counts del usuario (via include + where); `upsertUserStickerCount(userId, stickerId, count)` — upsert idempotente; `getStickerById(stickerId)` — valida existencia.
- `src/services/sticker.service.ts`: `getUserAlbum(userId)` — retorna álbum + stats calculados; `updateStickerCount(userId, stickerId, count)` — valida existencia y delega al repo. `StickerNotFoundError` para 404.
- `GET /api/album`: 401 sin sesión, 404 si álbum no encontrado, 200 con `{ albumId, stickers, stats }`.
- `PATCH /api/album/stickers/[stickerId]`: 401 sin sesión, 400 input inválido (Zod), 404 sticker no existe, 200 `{ ok: true, count }`.
- `src/components/album/sticker-cell.tsx`: celda de figurita (client); click → cicla 0→1→2…→99→0; onContextMenu → decrementa; color por estado: muted (falta) / primary/10 (tengo) / accent/10 (repetida); ring dorado para isSpecial.
- `src/app/album/AlbumClient.tsx`: client component con estado local de counts (optimista), autosave debounce 500ms, saveState (idle/saving/saved/error), floating toast; stats y progress bar en vivo; stickers agrupados por equipo; `FWC` → "Copa del Mundo" via i18n.
- `src/app/album/page.tsx`: server component; redirige a `/auth/login` sin sesión; carga álbum y pasa `stickers` + `initialStats` a AlbumClient; H1 con i18n.
- `messages/es.json`: namespace `Album` con 11 claves (title, statsHave, statsMissing, statsDuplicates, statsPercent, progressLabel, clickHint, teamFWC, saving, saved, saveError).
- Tests: 155 tests (24 nuevos), 100% cobertura (stmts/branches/funcs/lines).
  - 7 tests en `sticker.repository.test.ts`
  - 7 tests en `sticker.service.test.ts`
  - 3 tests en `api/album/__tests__/route.test.ts`
  - 7 tests en `api/album/stickers/[stickerId]/__tests__/route.test.ts`
- Gate: format ✅, lint ✅ (0 errores), type-check ✅, format:check ✅, prisma:generate ✅, test:coverage ✅ (155 tests, 100%), build ✅ (`/album` como `ƒ Dynamic`).

### Próximo paso

1. **RF-204** — Filtros del álbum (todas / me faltan / tengo / repetidas / especiales + por equipo): lógica de filtrado client-side en `AlbumClient`. Sin nuevas API routes.
2. **RF-205** — Búsqueda por número o nombre (case-insensitive): también client-side en `AlbumClient`.
3. **RF-404 + RF-405** — Badge campana en navbar + dropdown de notificaciones.
4. **RF-409** — Trigger de notificación al crear match nuevo.

RF-204 + RF-205 son 100% client-side y se pueden implementar juntos en la próxima corrida.

### ⚠️ Bloqueos conocidos

- RF-102 🔒 Google OAuth — requiere configurar el provider en el dashboard de Supabase.
- RF-307 🔒 Inngest — scheduling del job de cleanup.
- RF-406 🔒 Resend — email transaccional custom.

---

## 2026-06-01 — Corrida 19

- **Ítem**: RF-108 + RF-109 + RF-110 + RF-111 — Onboarding completo (username + ciudad + barrio + guard)
- **Rama**: `claude/tender-archimedes-bFF1Y`
- **PR**: https://github.com/gonzalocvv/CambiaLa/pull/35
- **Estado**: ✅ completo, PR abierto con auto-merge (REBASE) solicitado

### Qué se hizo

- `src/lib/locations.ts`: 19 departamentos de Uruguay + 46 barrios de Montevideo (`as const`, tipados).
- `src/lib/validations/onboarding.schema.ts`: Zod schemas — `UsernameSchema` (3-20 chars, alfanumérico+_), `CompleteOnboardingSchema` (requiere neighborhood si city=Montevideo), `CheckUsernameQuerySchema`.
- `src/repositories/user.repository.ts`: métodos `isUsernameAvailable()` + `updateOnboarding()`.
- `src/services/user.service.ts`: métodos `checkUsernameAvailability()` + `completeOnboarding()` + `UsernameConflictError` (409).
- `src/lib/auth.ts`: `Session` type agrega `onboardingDoneAt: Date | null` (sin query extra — `findByEmail` ya lo seleccionaba).
- `POST /api/onboarding`: 401/400/409/200.
- `GET /api/onboarding/check-username`: 401/400/200 `{available}`.
- `src/app/onboarding/page.tsx` (server): redirige a `/auth/login` sin sesión, a `/matches` si ya onboardeado.
- `src/app/onboarding/OnboardingForm.tsx` (client): 2 pasos — paso 1 username con debounce 500ms y feedback inline; paso 2 departamento + barrio condicional. Skip → `/`.
- Auth callback actualizado: redirige a `/onboarding` si `!user.onboardingDoneAt`.
- `/matches` actualizado: redirige a `/onboarding` si `!session.onboardingDoneAt` (RF-111).
- `messages/es.json`: namespace `Onboarding` con 20 claves.
- Tests: 131 tests (21 nuevos), 100% cobertura.
- Gate: format ✅, lint ✅, type-check ✅, format:check ✅, prisma:generate ✅, test:coverage ✅ (131 tests, 100%), build ✅.

### Nota de arquitectura

`OnboardingForm.tsx` usa estado derivado (no `setState` en el body del `useEffect`) para cumplir con `react-hooks/set-state-in-effect`: `lastChecked` guarda el resultado del check asíncrono; `displayState` se deriva de `username` + `syncError` + `lastChecked` sin efectos secundarios síncronos.

### Próximo paso

Con onboarding completo, el MVP tiene Auth + Onboarding funcionales. Los próximos ítems lógicos:

1. **RF-203** — Vista de mi álbum: grid responsive con estado de figuritas. Es el núcleo del producto.
2. **RF-404 + RF-405** — Badge campana + dropdown de notificaciones en el navbar.
3. **RF-802–RF-808** — Páginas estáticas SSG (100% autónomas, sin credenciales).

RF-203 es el más valioso para el MVP (sin álbum no hay matches). Depende de que el usuario esté logueado + onboardeado (ambos ahora funcionan).

### ⚠️ Bloqueos conocidos

- RF-102 🔒 Google OAuth — requiere configurar el provider en el dashboard de Supabase.
- RF-307 🔒 Inngest — scheduling del job de cleanup.
- RF-406 🔒 Resend — email transaccional custom.

---

## 2026-06-01 — Corrida 18

- **Ítem**: RF-101 + RF-103 + RF-104 + RF-105 + RF-106 + RF-107 — Auth foundation con magic link
- **Rama**: `claude/rf101-auth-foundation`
- **PR**: (ver abajo)
- **Estado**: ✅ completo, PR abierto con auto-merge solicitado

### Qué se hizo

- `package.json`: instalados `@supabase/supabase-js` y `@supabase/ssr`.
- `src/lib/supabase/server.ts`: `createClient()` async con cookie store server-side (Next.js `cookies()` await).
- `src/lib/supabase/client.ts`: `createBrowserClient()` para componentes `'use client'`.
- `middleware.ts` (raíz): refresca la cookie de sesión de Supabase en cada request (patrón oficial `@supabase/ssr`).
- `src/lib/auth.ts`: reemplazado el stub `return null` por implementación real — llama `supabase.auth.getUser()` y resuelve el CUID de Prisma con un lookup por email (índice único; un query por request). Documentado como tech debt para F2 (agregar `supabaseId` al schema y eliminar el lookup).
- `src/repositories/user.repository.ts`: `findByEmail` y `upsertByEmail` (crea User en Prisma en el primer login, actualiza `lastSeenAt` en los siguientes).
- `src/services/user.service.ts`: `getOrCreate` y `findByEmail` — delega al repo.
- `src/app/api/auth/callback/route.ts`: `GET /api/auth/callback` — intercambia el `code` de Supabase por sesión, crea/actualiza el User en Prisma (RF-103), redirige a `/matches`.
- `src/app/api/auth/logout/route.ts`: `POST /api/auth/logout` — `supabase.auth.signOut()` + redirect a `/`.
- `src/app/auth/login/page.tsx` + `LoginForm.tsx`: página de login con magic link (server + client components). Sin strings hardcodeados.
- `messages/es.json`: namespace `Auth.login` con 11 claves i18n.
- Tests: 7 nuevos (4 en `user.repository.test.ts`, 3 en `user.service.test.ts`). Total: 110 tests, 100% coverage.
- Gate: format ✅, lint ✅, type-check ✅, format:check ✅, prisma:generate ✅, test:coverage ✅ (110 tests, 100%), build ✅.

### Nota de arquitectura

`src/lib/auth.ts` usa `userRepository` (que usa Prisma), lo cual viola "Domain puro sin I/O". Es una excepción aceptada para auth (middleware de infraestructura). En F2: agregar campo `supabaseId String @unique` al User y eliminar el lookup por email de `getSession()`.

### Próximo paso

Con Auth implementado, el camino crítico del MVP continúa con:
- **RF-108** — Onboarding: elegir username único (3-20 chars alfanumérico). El callback ya redirige a `/matches`; cuando onboarding exista, redirigir allí si `!user.onboardingDoneAt`.
- **RF-404 + RF-405** — Badge campana y dropdown de notificaciones en el navbar (ahora que hay sesión real).
- **RF-404** es bueno como próxima corrida: el Navbar puede mostrar el estado de auth (usuario logueado vs. no logueado) y la campana.
- Nit pendiente: RF-802 a RF-808 (páginas estáticas SSG) — 100% autónomas.

### ⚠️ Requiere acción de Gonza antes de probar en prod

1. ✅ **HECHO (2026-06-01)** — **Dashboard de Supabase → Auth → URL Configuration**: Site URL (`https://cambia-la.vercel.app`) + Redirect URLs (`https://cambia-la.vercel.app/api/auth/callback` y `http://localhost:3000/api/auth/callback`) cargadas por Gonza.
2. **Email Settings** del dashboard: Supabase usa su propio servicio de email en dev (funcional sin configuración). Para prod con dominio propio, configurar SMTP custom o Resend (🔒).

### 📋 Config manual de Supabase Auth (checklist de referencia)

> Lo que NO vive en el repo y hay que setear a mano en [app.supabase.com](https://app.supabase.com) → proyecto CambiaLa. Para que no se pierda entre corridas.

| # | Dónde (dashboard) | Qué setear | Estado |
| - | ----------------- | ---------- | ------ |
| 1 | **Authentication → URL Configuration → Site URL** | `https://cambia-la.vercel.app` | ✅ hecho 2026-06-01 |
| 2 | **Authentication → URL Configuration → Redirect URLs** | `https://cambia-la.vercel.app/api/auth/callback` + `http://localhost:3000/api/auth/callback` (opcional: wildcards `https://*.vercel.app/api/auth/callback` para preview deploys) | ✅ hecho 2026-06-01 |
| 3 | **Authentication → Email Templates → Magic Link** | El template default funciona; usa `{{ .ConfirmationURL }}` que respeta el `redirectTo`. No tocar salvo branding. | ⬜ opcional |
| 4 | **Authentication → Rate Limits / OTP expiry** | RF-101 pide OTP válido 10 min; el default es 60 min. Ajustar si se quiere cumplir literal (no bloquea MVP). | ⬜ pendiente (no bloqueante) |
| 5 | **Authentication → Providers → Google** | Client ID/Secret de Google Cloud para RF-102 (Google OAuth). | 🔒 pendiente |
| 6 | **Authentication → SMTP Settings** | SMTP propio / Resend para emails de prod con dominio (en dev alcanza el built-in de Supabase, con rate limit bajo). | 🔒 pendiente (depende de Resend) |

Por qué importa el #2: `LoginForm` manda `emailRedirectTo: ${origin}/api/auth/callback`; Supabase **rechaza** cualquier `redirectTo` fuera de la allowlist (anti-open-redirect). Sin la URL en la lista, el magic link cae en la Site URL o da error.

### ⚠️ Bloqueos conocidos

- RF-102 🔒 Google OAuth — requiere configurar el provider en el dashboard de Supabase.
- RF-307 🔒 Inngest — scheduling del job de cleanup.
- RF-406 🔒 Resend — email transaccional custom.

---

## 2026-06-01 — Auditoría del repo (no es corrida del auto-builder)

- **Quién**: auditor (rol read-only; solo editó `BACKLOG.md`, `HANDOFF.md` y `reports/audit-2026-06-01.md`).
- **Reporte completo**: `reports/audit-2026-06-01.md`.

### 🔴 Corrección importante — el bloqueo de Supabase/S0.7 es STALE

Todas las entradas de abajo (Corridas 8–17) dicen `S0.7 🔒 Supabase — toda la capa de Auth bloqueada`. **Eso ya no es cierto y nunca se actualizó.** Verificado contra la realidad:

- `npx prisma migrate status` → **"Database schema is up to date!"** (migración `20260531135853_init` aplicada).
- DB de Supabase real (`aws-1-sa-east-1.pooler...`), **896 stickers + 1 álbum seedeados**.
- `.env.local` con `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY`/`SERVICE_ROLE_KEY`/`DATABASE_URL`/`DIRECT_URL` **presentes**.
- RLS habilitado en las 8 tablas (deny-all sin políticas → seguro porque todo el acceso va por Prisma server-side).

→ El auto-builder lleva ~9 corridas evitando el camino crítico del MVP (Auth) por un bloqueo inexistente. **Próxima corrida debería atacar Auth.**

### Gate verificado (verde de verdad)

`lint` ✅ · `format:check` ✅ · `type-check` ✅ · `test:coverage` ✅ (**103 tests / 100%**) · `build` (env mock CI) ✅.

### Ítems liberados en el BACKLOG (config verificada OK 2026-06-01)

- **S0.7** (Supabase + migrations + `.env.local`) → ✅ desbloqueado.
- "Supabase project + env vars" (informativo) → ✅.
- "shadcn/ui base", "next-intl `es`", "Seed del álbum (⛔)" (informativos, estaban sin tildar pero ya hechos) → ✅. El ⛔ del seed queda LEVANTADO.

### Sigue 🔒 (credenciales/dashboard — NO autónomo)

- **RF-307 / RF-309** Inngest — `INNGEST_EVENT_KEY`/`INNGEST_SIGNING_KEY` **vacías**.
- **RF-406** Resend — `RESEND_API_KEY` **vacía** + verificar dominio figus.uy.
- **RF-102** Google OAuth — provider en dashboard de Supabase (no verificable desde repo).
- **RF-101** magic link — Supabase ya existe; falta código + settings de email/SMTP en dashboard.
- Sentry (`SENTRY_DSN`) y PostHog (`NEXT_PUBLIC_POSTHOG_KEY`) **vacías** → monitoreo/analytics son no-op en prod.

### Próximo paso recomendado para el auto-builder

1. **Auth foundation** (ahora desbloqueado): reemplazar el stub `src/lib/auth.ts` (`getSession()` devuelve `null`) por `@supabase/ssr`, e implementar RF-103/104/105/106/107 + RF-101 (magic link con email built-in de Supabase). RF-102 (Google) queda pendiente de config de dashboard.
2. Nits de la auditoría: string hardcodeado `'Usuario'` en `src/app/matches/[id]/page.tsx:31` (usar i18n como `match-card.tsx`); back-link muerto a `/matches` (listado no existe); bump `postcss` ≥ 8.5.10.

---

## 2026-06-01 — Corrida 17

- **Ítem**: RF-801 — Landing `/` funcional (hero + CTA + stats + casos de uso + CTA final)
- **Rama**: `claude/rf801-landing-funcional`
- **PR**: (ver abajo)
- **Estado**: ✅ completo, PR abierto con auto-merge solicitado

### Qué se hizo

- `src/components/layout/navbar.tsx`: Navbar sticky con logo CambiaLa (azul/naranja), link "Iniciá sesión" y botón "Empezar gratis" → `/auth/login`. Server component con labels vía props (i18n).
- `src/app/page.tsx`: Landing evolucionada de coming-soon a página de producto completa:
  - **Hero**: badge "🇺🇾 Mundial 2026 · Uruguay", H1 "CambiaLa", subtitle, CTA doble (botón primario "Empezar gratis →" + link secundario "¿Cómo funciona?"), ScrollHint.
  - **Stats bar**: ~900 figuritas / Gratis / 🇺🇾 Uruguay — 3 valores con label.
  - **Cómo funciona** (existente): 3 pasos, conservado sin cambios.
  - **Casos de uso**: nueva sección con 3 cards (repetidas sin destino, faltan específicas, cerca de casa).
  - **CTA final**: H2 + subtitle + botón "Empezar gratis →".
  - **Footer**: igual al anterior.
- `messages/es.json`: nuevos namespaces `Home.nav`, `Home.stats`, `Home.useCases`, `Home.finalCta`; hero actualizado (badge, cta, ctaSecondary, scrollHint); eliminados `descriptionLine1`/`descriptionLine2` obsoletos.
- Gate: format ✅, lint ✅ (0 errores), type-check ✅, format:check ✅, prisma:generate ✅, test:coverage ✅ (103 tests, 100%), build ✅ (`/` como `○ Static`).

### Próximo paso

Próximos ítems autónomos (sin credenciales):
- **RF-404** — Badge campana en header con contador no leídas (refresh 60s). Requiere header compartido (navbar podría evolucionar) + `useQuery` / polling.
- **RF-405** — Dropdown con últimas 10, click navega y marca leída. Componente client.
- **RF-409** — Trigger automático de notificación al crear match nuevo (ambas partes). Llama `notificationService.createNotification` desde `matchService.saveMatchResult`.
- **RF-802–RF-808** — Páginas estáticas SSG (`/como-funciona`, `/precios`, `/privacidad`, `/terminos`, `/contacto`): 100% autónomas.

### ⚠️ Bloqueos conocidos

- RF-307 🔒 Inngest — scheduling del job de cleanup.
- RF-406 🔒 Resend — email transaccional.
- S0.7 🔒 Supabase — toda la capa de Auth (Sprint 1) bloqueada.

---

## 2026-06-01 — Corrida 16

- **Ítem**: RF-401 + RF-402 + RF-403 — Notification service: schemas Zod, repository, service, `GET /api/notifications` (paginado), `PATCH /api/notifications/[id]` (marcar leída)
- **Rama**: `claude/lucid-bell-A8p8r`
- **PR**: (ver abajo)
- **Estado**: ✅ completo, PR abierto con auto-merge solicitado

### Qué se hizo

- `src/lib/validations/notification.schema.ts`: schemas Zod para `NotificationType`, `NotificationItem`, `GetNotificationsQuery` (page + limit con defaults), `GetNotificationsResponse`, `CreateNotification`.
- `src/repositories/notification.repository.ts`: 6 métodos — `create`, `findByUserId` (skip/take), `countByUserId`, `countUnreadByUserId`, `findById`, `markRead`.
- `src/services/notification.service.ts`: 3 métodos — `createNotification`, `getNotificationsForUser` (pagina + cuenta total + unread en paralelo), `markNotificationRead` (401 si no existe/distinto user, idempotente si ya leída).
- `src/app/api/notifications/route.ts`: `GET /api/notifications` — 401 sin sesión, 400 con params inválidos (Zod), 200 con `{ notifications, total, unreadCount }`.
- `src/app/api/notifications/[id]/route.ts`: `PATCH /api/notifications/[id]` — 401 sin sesión, 404 si no encontrada o de otro usuario, 200 `{ ok: true }`.
- Tests: 103 tests (+22 vs corrida anterior), 100% coverage (stmts/branches/funcs/lines).
  - 7 tests en `notification.repository.test.ts`
  - 7 tests en `notification.service.test.ts`
  - 4 tests en `api/notifications/__tests__/route.test.ts`
  - 3 tests en `api/notifications/[id]/__tests__/route.test.ts`
- Gate: format ✅, lint ✅ (0 errores), type-check ✅, format:check ✅, prisma:generate ✅, test:coverage ✅ (103 tests, 100%), build ✅ (`/api/notifications` y `/api/notifications/[id]` como `ƒ Dynamic`).

### Fix de tipos

- Zod v4: `z.record()` requiere 2 args → `z.record(z.string(), z.unknown())`.
- Prisma JSON field: cast explícito `data.payload as InputJsonValue` (importado de `@prisma/client/runtime/library`).

### Próximo paso

Próximos ítems autónomos (sin credenciales):
- **RF-404** — Badge campana en header con contador no leídas (refresh 60s). Requiere componente UI del header + polling con TanStack Query o `setInterval`.
- **RF-405** — Dropdown con últimas 10, click navega y marca leída. Componente UI client.
- **RF-409** — Trigger automático de notificación al crear match nuevo (ambas partes). Llama `notificationService.createNotification` desde el service/repo de match.
- **RF-802–RF-808** — Páginas estáticas SSG (`/como-funciona`, `/precios`, `/privacidad`, `/terminos`, `/contacto`): 100% autónomas.

### ⚠️ Bloqueos conocidos

- RF-307 🔒 Inngest — scheduling del job de cleanup.
- RF-406 🔒 Resend — email transaccional.
- S0.7 🔒 Supabase — toda la capa de Auth (Sprint 1) bloqueada.

---

## 2026-06-01 — Corrida 15

- **Ítem**: RF-313 — Marcar match `completed` (cualquiera de las dos partes)
- **Rama**: `claude/rf313-complete-match`
- **PR**: (ver abajo)
- **Estado**: ✅ completo, PR abierto con auto-merge solicitado

### Qué se hizo

- `src/app/api/matches/[id]/complete/route.ts`: `PATCH /api/matches/[id]/complete`
  - 401 si no autenticado.
  - Usa `getMatchDetailForUser` para verificar existencia y participación (404 si nulo).
  - 409 si `status !== 'active'` (ya completado o inactivo).
  - Llama `matchService.completeMatch(id)` y devuelve `{ ok: true }`.
- `src/components/matches/complete-match-button.tsx`: client component `'use client'`
  - Props: `matchId: string`.
  - `useState` para `loading` y `done`.
  - Llama `PATCH /api/matches/[matchId]/complete`; en éxito → `router.refresh()` + muestra confirmación.
- `src/app/matches/[id]/page.tsx`: updated con:
  - Botón `CompleteMatchButton` visible cuando `match.status === 'active'`.
  - Badge "Completado" cuando `match.status === 'completed'`.
- `messages/es.json`: 5 nuevas claves en namespace `MatchDetail` (`markCompleted`, `completing`, `completedConfirmation`, `completeHint`, `statusCompleted`).
- Tests: 81 tests (+5 vs corrida anterior), 100% coverage.
  - 5 tests en `src/app/api/matches/[id]/complete/__tests__/route.test.ts` (401, 404, 409 completed, 409 inactive, 200).
- Gate: format ✅, lint ✅ (0 errores), type-check ✅, format:check ✅, prisma:generate ✅, test:coverage ✅ (81 tests, 100%), build ✅ (`/api/matches/[id]/complete` como `ƒ Dynamic`).

### Próximo paso

Próximos ítems autónomos (sin credenciales):
- **RF-401** — Tabla `Notification` + API routes `GET /api/notifications` y `PATCH /api/notifications/[id]`: pura lógica DB + Zod. El modelo `Notification` ya existe en el schema de Prisma.
- **RF-802–RF-808** — Páginas estáticas SSG (`/como-funciona`, `/precios`, `/privacidad`, `/terminos`, `/contacto`): 100% autónomas.

### ⚠️ Bloqueos conocidos

- RF-307 🔒 Inngest — scheduling del job de cleanup.
- S0.7 🔒 Supabase — toda la capa de Auth (Sprint 1) bloqueada. `getSession()` retorna null hasta que esté listo.

---

## 2026-06-01 — Corrida 14

- **Ítem**: RF-312 — Detalle de match: página `/matches/[id]` con dos columnas "lo que te ofrece" / "lo que le das"
- **Rama**: `claude/rf312-match-detail`
- **PR**: (ver abajo)
- **Estado**: ✅ completo, PR abierto con auto-merge solicitado

### Qué se hizo

- `src/lib/validations/match.schema.ts`: nuevo schema `GetMatchDetailResponseSchema` / tipo `GetMatchDetailResponse`.
- `src/repositories/match.repository.ts`: nuevo método `findByIdWithPartners(id)` — `findUnique` con `include: { userA: true, userB: true }`.
- `src/services/match.service.ts`: nuevo método `getMatchDetailForUser(id, userId)` — devuelve `ActiveMatchItem | null` desde la perspectiva del usuario solicitante; retorna `null` si el match no existe o el usuario no es participante.
- `src/app/api/matches/[id]/route.ts`: `GET /api/matches/[id]` — 401 sin sesión, 404 si no encontrado/no participante, 200 con `{ match }`.
- `src/app/matches/[id]/page.tsx`: server component con:
  - Header de partner (avatar con fallback a iniciales, nombre/username, ubicación, reputación).
  - Badge de score.
  - Dos columnas (grid responsive 1→2 col): "Lo que te ofrece" / "Lo que le das", cada una con `StickerGrid` de badges monoespaciados.
  - Manejo de no-auth: mensaje i18n en lugar de crash.
  - Link de vuelta a `/matches`.
- `messages/es.json`: namespace `MatchDetail` con 8 claves (cero strings hardcodeados en JSX).
- Tests: 76 tests (+9 vs corrida anterior), 100% coverage (stmts/branches/funcs/lines).
  - 2 tests nuevos en `match.repository.test.ts` (findByIdWithPartners: found, null)
  - 4 tests nuevos en `match.service.test.ts` (getMatchDetailForUser: user-a, user-b, not found, not participant)
  - 3 tests nuevos en `src/app/api/matches/[id]/__tests__/route.test.ts` (401, 200, 404)
- Gate: format ✅, lint ✅ (0 errores), type-check ✅, format:check ✅, prisma:generate ✅, test:coverage ✅ (76 tests, 100%), build ✅ (`/api/matches/[id]` y `/matches/[id]` como `ƒ Dynamic`).

### ⚠️ Nota sobre navegación

- El back-link apunta a `/matches` — ruta que aún no existe como página (la API existe pero no el listado UI). Se construirá cuando se implemente el listado de matches en Sprint 3.
- La autenticación es stub (siempre null) hasta S0.7 🔒; la página muestra un mensaje i18n al no-autenticado en lugar de redirigir.

### Próximo paso

Próximos ítems autónomos (sin credenciales):
- **RF-313** — Marcar match `completed` (cualquiera de las partes): `PATCH /api/matches/[id]/complete` + botón en la página de detalle. El service `completeMatch` ya existe, falta el endpoint REST y el botón UI.
- **RF-401** — Tabla `Notification` + API routes `GET /api/notifications` y `PATCH /api/notifications/[id]`: pura lógica DB + Zod.
- **RF-802–RF-808** — Páginas estáticas SSG (`/como-funciona`, `/precios`, `/privacidad`, `/terminos`, `/contacto`): 100% autónomas.

### ⚠️ Bloqueos conocidos

- RF-307 🔒 Inngest — scheduling del job de cleanup.
- S0.7 🔒 Supabase — toda la capa de Auth (Sprint 1) bloqueada. `getSession()` retorna null hasta que esté listo.

---

## 2026-06-01 — Corrida 13

- **Ítem**: RF-311 — Match card: componente UI (avatar/username, barrio, score, "te da X / le das Y")
- **Rama**: `claude/rf311-match-card`
- **PR**: (ver abajo)
- **Estado**: ✅ completo, PR abierto con auto-merge solicitado

### Qué se hizo

- `src/components/matches/match-card.tsx`: server component async que recibe `ActiveMatchItem` y renderiza la tarjeta de match:
  - Avatar: si hay `avatarUrl` → div con `background-image` CSS (evita `@next/next/no-img-element`); si no → círculo con iniciales sobre `bg-primary`.
  - Nombre/username del partner (fallback `"Usuario"` vía i18n) + ubicación (barrio, si no ciudad).
  - Badge de score con variante `accent`.
  - Línea "te da {N} / le das {M}" con las longitudes de `youGet` / `youGive`.
  - Reputación: si `tradesCompleted < 5` → "Coleccionista nuevo"; si no → `X.X ⭐ · Y cambios` (ICU plural en i18n).
  - Toda la tarjeta es un `<Link href="/matches/{id}">` para navegación.
- `messages/es.json`: namespace `MatchCard` con 5 claves (`unknownUser`, `newCollector`, `scoreLabel`, `stickersExchange`, `trades`). Cero strings hardcodeados en JSX.
- Gate: format ✅, lint ✅ (0 errores), type-check ✅, format:check ✅, prisma:generate ✅, test:coverage ✅ (67 tests, 100% stmts/branches/funcs/lines), build ✅ (componente compilado sin errores).

### ⚠️ Nota sobre navegación

El componente enlaza a `/matches/${match.id}`, ruta que aún no existe. Se construirá al implementar RF-312 (detalle de match). El build no falla porque Next.js no valida hrefs en tiempo de build.

### Próximo paso

Próximos ítems autónomos (sin credenciales):
- **RF-312** — Detalle de match: página `/matches/[id]` con dos columnas "lo que te ofrece" / "lo que le das". Requiere crear `src/app/matches/[id]/page.tsx` + reutiliza `ActiveMatchItem` de RF-310.
- **RF-313** — Marcar match `completed`: `PATCH /api/matches/[id]/complete` + botón en UI.
- **RF-401** — Tabla `Notification` + API routes `GET /api/notifications` y `PATCH /api/notifications/[id]`.
- **RF-802–RF-808** — Páginas estáticas SSG (`/como-funciona`, `/precios`, `/privacidad`, `/terminos`, `/contacto`): 100% autónomas.

### ⚠️ Bloqueos conocidos

- RF-307 🔒 Inngest — scheduling del job de cleanup.
- S0.7 🔒 Supabase — toda la capa de Auth (Sprint 1) bloqueada. `getSession()` retorna null hasta que esté listo.

---

## 2026-06-01 — Corrida 12

- **Ítem**: RF-310 — `GET /api/matches`: lista de matches activos para el usuario autenticado, ordenados por score desc
- **Rama**: `claude/rf310-matches-list-api`
- **PR**: (ver abajo)
- **Estado**: ✅ completo, PR abierto con auto-merge solicitado

### Qué se hizo

- `src/lib/auth.ts`: stub `getSession(): Promise<Session | null>` — retorna `null` hasta que Supabase esté listo (🔒 S0.7). Permite escribir y testear la API route sin credenciales reales.
- `src/lib/validations/match.schema.ts`: nuevos schemas Zod — `MatchPartnerSchema`, `ActiveMatchItemSchema` (con `youGive`/`youGet` ya desde la perspectiva del usuario), `GetMatchesResponseSchema`.
- `src/repositories/match.repository.ts`: nuevo método `findActiveByUserWithPartners(userId)` — `findMany` con `include: { userA: true, userB: true }` + tipo `MatchWithPartners = Prisma.MatchGetPayload<{include: {userA: true; userB: true}}>`.
- `src/services/match.service.ts`: nuevo método `getActiveMatchesWithPartners(userId)` — normaliza perspectiva: si el usuario es A → `youGive=aToB, youGet=bToA`, si es B → inverso. Extrae campos públicos del partner.
- `src/app/api/matches/route.ts`: `GET` handler — llama `getSession()`, devuelve 401 si null, 200 con `{ matches }` si autenticado.
- Tests: 67 tests (+11 vs corrida anterior), 100% coverage (stmts/branches/funcs/lines).
  - 2 tests nuevos en `match.repository.test.ts` (findActiveByUserWithPartners)
  - 5 tests nuevos en `match.service.test.ts` (getActiveMatchesWithPartners)
  - 4 tests nuevos en `route.test.ts` (GET /api/matches: 401, 200, vacío, orden)
- Gate: format ✅, lint ✅, type-check ✅, format:check ✅, prisma:generate ✅, test:coverage ✅, build ✅ (ruta `/api/matches` aparece como `ƒ Dynamic` en el build output)

### ⚠️ Nota sobre autenticación

`src/lib/auth.ts` siempre retorna `null` hasta que Supabase esté disponible (S0.7 🔒). Cuando se integre Supabase Auth, reemplazar el cuerpo de `getSession()` con la llamada `createServerClient` de `@supabase/ssr`.

### Próximo paso

Próximos ítems autónomos (sin credenciales):
- **RF-311** — Match card: componente UI (avatar/username del otro, barrio, score, "te da X / le das Y"). Puede implementarse como componente puro ya que la forma de los datos viene definida por `ActiveMatchItem` de RF-310.
- **RF-802 a RF-808** — Páginas estáticas SSG (`/como-funciona`, `/precios`, `/privacidad`, `/terminos`, `/contacto`): 100% autónomas.
- **RF-401** — Tabla `Notification` + API routes `GET /api/notifications` y `PATCH /api/notifications/[id]`: pura lógica DB + Zod, similar en estructura a RF-310.

### ⚠️ Bloqueos conocidos

- RF-307 🔒 Inngest — scheduling del job de cleanup.
- S0.7 🔒 Supabase — toda la capa de Auth (Sprint 1) bloqueada. `getSession()` retorna null hasta que esté listo.

---

## 2026-06-01 — Corrida 11

- **Ítem**: RF-309 — TTL de matches: batch cleanup (repository + service + tests)
- **Rama**: `claude/rf309-match-ttl`
- **PR**: (ver abajo)
- **Estado**: ✅ completo, PR abierto con auto-merge solicitado

### Qué se hizo

- `src/repositories/match.repository.ts`: nuevo método `markInactiveByLastSeen(cutoffDate: Date): Promise<number>` — enfoque de dos pasos (Prisma 6 no soporta relation filters en `updateMany`):
  1. `findMany` con `status: 'active'` + `OR [userA.lastSeenAt < cutoff, userB.lastSeenAt < cutoff]` + `select: { id: true }`
  2. `updateMany` con `id IN [...]` → `status: 'inactive'`
  - Cortocircuita y retorna `0` si no hay matches a marcar (evita `updateMany` vacío).
- `src/services/match.service.ts`: nuevo método `cleanupExpiredMatches(inactiveDays = 30): Promise<number>` — calcula cutoff como `now - inactiveDays * 24h` y delega al repo.
- Tests:
  - `match.repository.test.ts`: 2 tests nuevos (happy path con 2 stale matches + skip de updateMany cuando array vacío). Mock extendido con `updateMany`.
  - `match.service.test.ts`: 3 tests nuevos para `cleanupExpiredMatches` (default 30 días, custom 7 días, retorna count). Usa `vi.useFakeTimers()` para tiempo determinístico. Mock extendido con `markInactiveByLastSeen`.
- Gate: format ✅, lint ✅, type-check ✅, format:check ✅, prisma:generate ✅, test:coverage ✅ (100% stmts/branches/funcs/lines, **56 tests**), build ✅

### ⚠️ Nota sobre el job de limpieza diario (Inngest)

El scheduling del job (`cleanupExpiredMatches` en cron diario) no se implementó porque requiere Inngest 🔒. La función está lista para ser llamada desde un Inngest handler cuando las credenciales estén disponibles.

### Próximo paso

Próximos ítems autónomos (sin credenciales):
- **RF-310** — Lista de mis matches activos (GET /api/matches — API route + service ya existe): falta el endpoint REST + Zod schema de respuesta.
- **RF-802 a RF-808** — Páginas estáticas SSG (`/como-funciona`, `/privacidad`, `/terminos`, `/contacto`, `/precios`): 100% autónomas, sin credenciales.
- **RF-401** — Tabla `Notification` + API routes `GET /api/notifications` y `PATCH /api/notifications/[id]`: pura lógica DB + Zod, sin Inngest.

### ⚠️ Bloqueos conocidos

- RF-307 🔒 Inngest — scheduling del job de cleanup.
- S0.7 🔒 Supabase — toda la capa de Auth (Sprint 1) bloqueada.

---

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
