# Auditoría del repo CambiaLa — 2026-06-06

- **Auditor**: Suite gstack multi-agente (Producto/CEO, Arquitectura, Testing, Seguridad, DevEx, Diseño/A11y)
- **Repo**: CambiaLa (`figus-uy`)
- **Rama auditada**: `feat/wrapping` (working tree limpio; develop = PRODUCCIÓN)
- **Fecha**: 2026-06-06
- **Alcance**: solo mapeo, sin tocar código (read-only; ningún archivo modificado).
- **Método**: verificación adversarial contra la realidad del código (lectura de cada archivo citado + grep exhaustivo), no contra lo que dicen CLAUDE.md / BACKLOG / HANDOFF.
- **Gate local (verificado en esta corrida)**: `lint` · `type-check` · `format:check` · `test:coverage` · `build` (env mock) → **todos en verde**. 330 tests / 35 archivos. Cobertura instrumentada: 98.85% stmts · 99.35% branch · 95.03% funcs · 99.27% lines (ver **M1**: v8 solo mide los archivos que algún test importa, no todo el repo; func-coverage baja en `settings/location` route 50%, `messages`/`ratings` routes 66%, `verify-otp` branch 85%).
- **Stats de la corrida**: 6 lentes (Producto/CEO, Arquitectura, Testing, Seguridad, DevEx, Diseño/A11y) · 36 hallazgos · 9 críticos/altos verificados adversarialmente, **0 refutados**.

---

> **⚠️ Addendum 2026-06-07 — correcciones de estado (config hecha fuera del repo, que la auditoría no vio):**
>
> - **Resend ya está configurado**: `RESEND_API_KEY` en `.env.local` + Vercel, dominio `cambiala.uy` **verificado**, SMTP propio en Supabase probado E2E (los códigos de login salen de `consultas@cambiala.uy`). → El hallazgo **A1** queda resuelto a nivel config: **RF-406 ya NO es bloqueante por credenciales**, falta solo el **código** de envío.
> - **Inngest**: `INNGEST_EVENT_KEY` + `INNGEST_SIGNING_KEY` cargadas (`.env.local` + Vercel). → **RF-307 ya NO está bloqueado por keys**; queda como optimización **post-RF-320**.
> - El resto del informe se mantiene como **foto al momento de la auditoría**. El bloqueante #1 (**C1 / RF-320** — el match engine no se ejecuta en runtime) sigue plenamente vigente.

## 1. Resumen ejecutivo

El proyecto está técnicamente sano en lo estructural pero tiene **un agujero de producto crítico que ningún test atrapa**: el match engine, el feature central de CambiaLa, **nunca se ejecuta en runtime**. `findMatchesForUser` y `matchService.saveMatchResult` están implementados con cobertura 100%, pero **no tienen un solo caller fuera de sus propios tests**. El PATCH de stickers solo hace `updateStickerCount` (upsert del count); `/api/matches` y `/matches` solo **leen** matches pre-computados de la tabla `Match`. Como nada escribe esa tabla, queda vacía y **`/matches` siempre muestra el estado vacío para usuarios reales**. No hay job, cron, script ni Inngest que lo dispare (`inngest` ni siquiera es dependencia — solo un script stub `inngest:dev`). Esto es el bloqueante #1 de launch.

El impacto es **real, no teórico**, porque Auth **sí** está implementado de verdad (getSession con `@supabase/ssr` resolviendo email→CUID; las rutas autenticadas devuelven 401/redirigen correctamente). Es decir: un usuario puede loguearse, cargar su álbum, y aun así **nunca verá un match** aunque exista una contraparte perfecta en la DB. La doc (CLAUDE.md §12) que aún llama a auth "stub return null / próximo gran hito" está desincronizada — agrava la confusión sobre cuál es el verdadero camino crítico.

La segunda barrera de launch es el **email transaccional (RF-406)**: Resend está bloqueado (`RESEND_API_KEY` vacía, sin dominio verificado) y el SMTP built-in de Supabase ya tropieza la cuota (`HTTP 429 over_email_send_rate_limit`, reproducido en HANDOFF). Sin email confiable, el login por mail tiene fricción real en prod y los avisos de nuevo match/mensaje que **la landing promete explícitamente** ("Te avisamos por mail cuando aparece un match") no salen — rompe el loop de retorno.

Lo que está bien, y conviene reconocerlo: **arquitectura en capas impecable** (verificados los 4 límites no-negociables: cero `@/lib/prisma` en Presentation, services sin `next/server`/Request/Response, repositories sin services, dominio puro sin I/O); **seguridad sólida en lo crítico** (todas las rutas autenticadas chequean sesión, autorización por participante/ownership → cero IDOR encontrado, cero SQL crudo / `dangerouslySetInnerHTML` / `eval` / `child_process`, secretos fuera de git, RLS habilitado); y la **suite pasa** (35 archivos, 330 tests verdes; el match engine cubre exhaustivamente los casos de borde de §11).

Los temas medios/bajos se concentran en tres frentes: (a) **test-infra** — la cobertura es engañosa (v8 sin `include`/`thresholds` solo mide lo que algún test importa, así que el "100% del engine" es honor-system, no lo garantiza el CI; además `--passWithNoTests` está activo), y los componentes client con lógica crítica (autosave optimista+debounce, máquina de estados OTP, polling) no tienen un solo test; (b) **defense-in-depth** — el middleware no protege rutas (solo refresca la cookie) y no hay rate limiting (ADR-016 sin implementar); (c) **diseño/a11y** — `text-accent` (naranja) sobre fondo claro falla WCAG AA (2.8:1), una clase cruda `bg-black/80` heredada de shadcn, tres aria-labels fuera de i18n, navbar autenticado que desborda en mobile (ya trackeado como RF-824), y ausencia de boundaries de ruta (`error.tsx`/`not-found.tsx`/`loading.tsx`).

Transversal a todo: **doc-drift severo**. La documentación que el builder autónomo lee en CADA corrida va por detrás de la realidad: CLAUDE.md declara auth como stub no implementado, el README es peligroso (manda deploy a `main` con squash cuando `develop`=prod con rebase; cita Next 14, scripts y docker-compose inexistentes), y CONTRIBUTING contradice ADR-021. Esto es lo que más riesgo le mete al pipeline autónomo: decisiones equivocadas a partir de fuentes de verdad falsas.

---

## 2. Hallazgos por severidad

### 🔴 Crítico

**C1 — El match engine nunca se ejecuta en producción; el core es un dead-end** · _Matchmaking_ · **[confirmado]**
`findMatchesForUser` (`src/lib/match-engine.ts:87`) y `matchService.saveMatchResult` (`src/services/match.service.ts:46`) están implementados con 100% de cobertura pero **sus únicos callers son los tests** (`src/lib/__tests__/match-engine.test.ts`, `src/services/__tests__/match.service.test.ts`). El PATCH de stickers (`src/app/api/album/stickers/[stickerId]/route.ts:25`) solo llama `stickerService.updateStickerCount` → `stickerRepository.upsertUserStickerCount`, sin disparar matchmaking. `/api/matches` (`route.ts:12`) y `/matches` (`src/app/matches/page.tsx`) solo **leen** vía `getActiveMatchesWithPartners`. No existe `/api/inngest`, ni definiciones de funciones Inngest, ni cron, ni script; `inngest` no está en dependencies (solo el script stub `inngest:dev` en `package.json:30`). Conclusión: **la tabla `Match` jamás se escribe fuera de tests → `/matches` siempre renderiza vacío para usuarios reales**. Como Auth ya funciona end-to-end, el impacto llega a usuarios reales. _(Re-verificado de forma independiente en esta sesión: `grep -rn "saveMatchResult\|findMatchesForUser" src` → cero callers fuera de `__tests__`; la única escritura a `Match` es `match.repository.ts:16` `prisma.match.upsert`, alcanzable solo desde `saveMatchResult`, que nadie llama.)_
**Recomendación**: cablear un recompute **síncrono** tras el flush del álbum (en el service del sticker, fuera del request crítico si se quiere, pero sin Inngest). Inngest queda como optimización F2 (RF-307, ya 🔒). Ver propuesta RF-320 abajo.

---

### 🟠 Alto

**A1 — El aviso por email no sale: Resend bloqueado y SMTP built-in topa cuota** · _Notificaciones_ · **[confirmado]**
La landing promete "te avisamos" (`messages/es.json:233` "Te avisamos por mail cuando aparece un match"; también :205/:277). Pero: no hay paquete `resend` ni `react-email` en `package.json`; `src/services/notification.service.ts` solo crea notificaciones in-app en DB (sin envío de mail); grep de `sendEmail`/`sendMail` en `src/` da cero. RF-406 sigue `[ ] 🔒` (`BACKLOG.md:169`, `RESEND_API_KEY` vacía + dominio sin verificar). El SMTP built-in ya tropieza la cuota: `POST .../auth/v1/otp → HTTP 429 over_email_send_rate_limit` (`HANDOFF.md:211-213`), y HANDOFF:231 confirma que "el login va a seguir topando la cuota del built-in" hasta configurar SMTP propio.
**Recomendación**: Resend = bloqueante de launch. Configurar key + dominio verificado antes de abrir el registro (decisión de owner; ligado al flag de naming/dominio §3). No es deuda nueva — RF-406 ya existe en BACKLOG.

**A2 — README masivamente desactualizado: stack, deploy y scripts contradicen la realidad y los ADRs** · _Doc-drift_ · **[confirmado]**
Seis sub-claims verificados, todos exactos: (1) README:9 "Next.js 14" vs `package.json:43` `next: 16.2.6`; (2) README:132 "Squash & merge a `main`" y :172 "`main` deploya automáticamente" — directamente contra ADR-021/CLAUDE.md §4 ("develop = PRODUCCIÓN", rebase, nunca push directo) → **guía de deploy activamente peligrosa**; (3) README:33 `docker compose up -d` sin docker-compose.\* ni Dockerfile en el repo; (4) README:37,57 `pnpm db:seed` no existe (el real es `prisma:seed`), README:146 `pnpm test:integration` no existe; (5) README:120 "pre-commit (Husky)" sin `.husky/`; (6) README:142 "Lighthouse CI por PR" deshabilitado (`HANDOFF.md:27`).
**Recomendación**: reescribir el README contra la realidad. Es doc-only (no rompe runtime/CI), pero el item de deploy es peligroso y los scripts fallan de inmediato a un dev nuevo. Va como item de docs, no como bug de código.

**A3 — CLAUDE.md declara Auth como stub no implementado, pero está 100% construido** · _Doc-drift / fuente de verdad del builder_ · **[confirmado]**
`src/lib/auth.ts:14-28` es una implementación real de `getSession()` con `@supabase/ssr` (`createClient` → `supabase.auth.getUser()` → `userRepository.findByEmail`, envuelta en `cache()`), **no** `return null`. CLAUDE.md la contradice textualmente en tres lugares: §2 (l.41 "Camino crítico pendiente: Auth ... getSession() es stub return null"), §12 (l.234,237 "Hoy ... es un stub return null → toda ruta autenticada da 401") y §22 (l.357 "Auth como próximo gran hito"). BACKLOG.md:60-68 marca RF-101..107 todos `[x]` (incl. RF-102 Google OAuth "Probado E2E por Gonza"). Es el peor doc-drift: el routine lee CLAUDE.md en cada corrida y la línea del snapshot es justo la que orienta el "próximo gran hito".
**Recomendación**: actualizar CLAUDE.md §2/§12/§22 — Auth está cerrado (magic link + OTP 6 dígitos + Google OAuth); el camino crítico real es C1 (cablear el recompute) + RF-406. Va como item de docs.

---

### 🟡 Medio

**M1 — La cobertura reportada es engañosa: el 100% del match engine NO está enforced por CI** · _Test-infra_ · **[confirmado]**
`vitest.config.ts:13-15` define `coverage: { provider: 'v8' }` sin `all`, sin `include`, sin `thresholds`. Con v8 así, el reporte solo cuenta archivos que algún test importa — por eso el summary dice "All files 98.85%" listando ~5 archivos, dejando fuera `match-engine.ts`, AlbumClient, LoginForm, 6 schemas, etc. (verificado corriendo `pnpm test:coverage`). Como no hay `thresholds`, CLAUDE.md §11 ("match engine 100% obligatorio antes de mergear") **no lo garantiza el gate**: una regresión a 80% mantendría el CI verde. Además `test:coverage` usa `--passWithNoTests` (`package.json:23`).
**Recomendación**: agregar `coverage.include: ['src/**/*.{ts,tsx}']` (+ exclude de tipos/index) y un `coverage.thresholds` per-file de 100% sobre `src/lib/match-engine.ts`. Ver RF-321.

**M2 — Componentes client con lógica crítica sin un solo test** · _Presentation / client logic_ · **[confirmado]**
`AlbumClient.tsx` (285 líneas): estado optimista de counts, debounce por figurita con `setTimeout`, PATCH + rollback en `catch` (el patrón "Optimistic UI + debounce" que CLAUDE.md §14/§17 marca crítico, y que **RF-213 va a reescribir sin red de seguridad**). `LoginForm.tsx` (244): máquina de estados del OTP (email→code, fetch a verify-otp), testeada solo server-side. `chat-panel.tsx`: polling cada 10s (`setInterval`). OnboardingForm, notification-dropdown, SettingsForm también sin tests. Toolchain ya disponible (`@testing-library/react`, `user-event`, `jest-dom`, `jsdom` en deps), pero el project `dom` de `vitest.config.ts:32` limita el `include` a `src/components/landing/**`.
**Recomendación**: priorizar tests de AlbumClient (optimistic+debounce+rollback con fake timers) y LoginForm (transición email→code, éxito y código inválido); ampliar el `include` del project `dom`. Ver RF-322.

**M3 — El middleware no protege rutas: solo refresca la cookie** · _Auth / defense-in-depth_ · **[incierto — no verificado adversarialmente, severidad por convención]**
`middleware.ts` corre en (casi) todas las rutas pero su único efecto es `supabase.auth.getUser()` (refresh) + `return response`; no hay `NextResponse.redirect` ni guard de rutas protegidas (`middleware.ts:4-30`, el `getUser()` en :27 sin guard). Toda la protección depende de que CADA page y CADA route llame `getSession()` por su cuenta (hoy bien hecho, ej. `src/app/matches/page.tsx`). Es un gap de defensa-en-profundidad, no una brecha activa: el día que se agregue una page/route protegida y se olviden el chequeo, queda abierta sin red de seguridad.
**Recomendación**: centralizar el redirect a `/auth/login` para no-autenticados en rutas privadas en el middleware, manteniendo los chequeos por route/page como segunda capa. Ver RF-323.

**M4 — No existe rate limiting propio en ninguna API route (ADR-016 sin implementar)** · _Abuse / DoS / brute-force_ · **[incierto — no verificado adversarialmente]**
ADR-016 define rate limit in-memory para el MVP, pero no hay nada: grep de `rateLimit`/`rate.limit` en `src/` solo arroja el manejo del 429 ajeno de Supabase en `LoginForm.tsx:87`. Quedan sin throttle propio: `POST /api/auth/verify-otp` (fuerza bruta del OTP de 6 dígitos), `POST /api/matches/[id]/messages` (spam), `GET /api/onboarding/check-username` (enumeración), y los PATCH masivos del álbum (RF-213 documenta ~40 requests por ráfaga). No es brecha de datos, pero es superficie de abuso sin freno.
**Recomendación**: implementar el rate limit in-memory de ADR-016 al menos en verify-otp, messages y check-username (helper por IP+userId con ventana fija); documentar migración a Redis en F2. Ver RF-324.

**M5 — El logger estructurado obligatorio (src/lib/logger.ts) no se usa en ningún lado** · _Observabilidad_ · **[confirmado]**
CLAUDE.md §9 obliga a usar `src/lib/logger.ts` y prohíbe `console.log`. El archivo existe y exporta `logger` (`src/lib/logger.ts:59`), pero grep de `lib/logger` sobre todo `src/` (tests incluidos) da **CERO imports** (verificado). Es código muerto mandado por la doc. Los `catch` de las routes (ej. `src/app/api/settings/route.ts:35-38`) devuelven JSON sin loguear → en prod no hay rastro estructurado de fallos. (`console.log` sí está limpio: 0 en `src/` fuera de tests.)
**Recomendación**: decidir — adoptar el logger en los `catch` de services/routes (al menos 500 inesperados), o borrar el archivo y relajar la regla. Ver RF-325.

**M6 — Tests directos faltantes en 6 de 7 schemas Zod** · _Validations_ · **[incierto — no verificado adversarialmente]**
Solo `match.schema.ts` se importa desde tests. message/notification/onboarding/rating/settings/sticker no se importan en ningún test — su cobertura de bordes (min/max, regex de username, count 0-99, longitud de mensaje, rango de rating) depende 100% de que el happy-path de la route correspondiente los ejercite, justo donde un off-by-one se escapa. CLAUDE.md §5.3/§5.4 los pone como contrato autoritativo. (RF-213 bulk aún no existe, no aplica.)
**Recomendación**: tests unitarios por schema (acepta válidos / rechaza fuera de rango), empezando por sticker/onboarding/rating. Funciones puras de dominio, baratas. Ver RF-326.

**M7 — PNPM_VERSION: 9 en CI vs pnpm@10.34.1 declarado — drift de versión** · _Gate / reproducibilidad_ · **[incierto — no verificado adversarialmente]**
`.github/workflows/ci.yml:17` setea `PNPM_VERSION: 9` y los 3 jobs hacen `pnpm install --frozen-lockfile` con esa versión. Pero `package.json:10` declara `"packageManager": "pnpm@10.34.1"` y CLAUDE.md §3 dice pnpm 10. El lockfile es `lockfileVersion: '9.0'` (compartido entre 9 y 10, evita rotura inmediata), pero un dev local con corepack usa pnpm 10 y el CI pnpm 9: cualquier cambio de resolución entre majors puede generar un lockfile que el otro entorno rechace con `--frozen-lockfile`, rompiendo el gate de forma confusa.
**Recomendación**: subir `PNPM_VERSION` a 10 (o quitar el override y respetar `packageManager`). Va como item de CI/infra. Ver RF-327.

**M8 — CONTRIBUTING.md describe flujo de PR contrario al pipeline real** · _Doc-drift_ · **[incierto — no verificado adversarialmente]**
Título "Contribuir a Figus Mundial" (marca vieja). CONTRIBUTING:51 "Squash & merge a develop" vs ADR-021 (rebase + commits atómicos); :49 "CI debe pasar (lint + type-check + tests + lighthouse)" pero ci.yml no corre lighthouse; :50 "Code review obligatorio de otra persona", incompatible con auto-merge del agente.
**Recomendación**: alinear con ADR-021 (rebase no squash, sin lighthouse, marca CambiaLa). Va como item de docs.

**M9 — No existen error.tsx / not-found.tsx / loading.tsx en el App Router** · _Estados error/loading / UX_ · **[incierto — no verificado adversarialmente]**
Las pantallas client tienen sus estados loading/error/empty internos bien hechos, pero a nivel de ruta del App Router no hay ningún boundary (ni `error.tsx`, ni `global-error.tsx`, ni `not-found.tsx`, ni `loading.tsx` en todo `src/app`). Varias páginas hacen `notFound()` (ej. `src/app/matches/[id]/page.tsx:38`) y caen al 404 por defecto de Next (sin branding ni i18n); si un Server Component falla, el usuario ve la pantalla de error genérica. Tampoco hay `loading.tsx` para las páginas server async (matches/conversations/album hacen `await` sin skeleton de ruta). Esperable de S3.2 (loading/error en todas las pantallas).
**Recomendación**: agregar al menos `not-found.tsx` + `error.tsx` branded (tokens + i18n + CTA) y `loading.tsx` con skeleton. Ver RF-328.

**M10 — text-accent (naranja) sobre fondo claro falla contraste WCAG AA** · _Accesibilidad_ · **[confirmado]**
El token `--accent: #f97316` (`globals.css:22`) sobre `--background: #ffffff` (`:9`) da **2.80:1** (recalculado con la fórmula oficial) → falla AA para texto normal (4.5) y grande (3.0). Peor sobre fondos reales: `text-accent` sobre `bg-accent/10` = 2.53:1 (`sticker-cell.tsx:32`, contador chico), sobre `bg-accent/5` = 2.67:1 (`ScrollHint.tsx:21`, text-sm), y `text-accent text-2xl` en `AlbumClient.tsx:155` = 2.8:1. Solo afecta light (en dark da 6.8:1, ok). El badge `bg-accent`+`accent-foreground` SÍ pasa (6.61:1) — el problema es naranja como **texto** sobre claro.
**Recomendación**: definir un token `--accent-text` más oscuro (~`#c2410c` ≈ 4.5:1 sobre blanco) para usos de naranja como foreground sobre claro, o reservar naranja solo para `bg-accent`+`accent-foreground`. Ver RF-329.

**M11 — Color crudo bg-black/80 en el overlay del Dialog** · _Design system / tokens_ · **[incierto — no verificado adversarialmente]**
Es la única clase de color cruda real en todo `src/` (verificado con grep exhaustivo de `bg-slate/zinc/gray/neutral/black`, `text-white`, etc.). `src/components/ui/dialog.tsx:24` incluye `bg-black/80` en el `DialogOverlay`, heredado del template shadcn — viola la regla 6 no-negociable de tokens. El Dialog se usa en flujos reales (rating-modal). En dark, `bg-black/80` además se confunde con el fondo grafito, perdiendo el scrim.
**Recomendación**: reemplazar por `bg-foreground/60` o agregar un token `--overlay` (light+dark) y consumirlo. Ver RF-330.

---

### 🟢 Bajo

**B1 — 5 componentes en src/app usan PascalCase, rompiendo kebab-case** · _Convenciones_ · **[incierto]**
CLAUDE.md §9 manda kebab-case. Todo `src/components/**` lo cumple, pero `src/app/settings/SettingsForm.tsx`, `src/app/album/AlbumClient.tsx`, `src/app/onboarding/OnboardingForm.tsx`, `src/app/auth/login/LoginForm.tsx` y `src/components/coming-soon/ScrollHint.tsx` usan PascalCase. Inconsistente con el resto del repo y con la regla escrita.
**Recomendación**: renombrar a kebab-case + actualizar imports; idealmente regla de lint `unicorn/filename-case`. Ver RF-331.

**B2 — SettingsForm.tsx excede el límite de 200-300 líneas** · _Convenciones / tamaño de módulo_ · **[incierto]**
CLAUDE.md §9 fija 200-300 líneas máx. `src/app/settings/SettingsForm.tsx` tiene 326. AlbumClient (285) y LoginForm (244) están dentro pero cerca. Solo SettingsForm lo supera hoy.
**Recomendación**: extraer sub-componentes o un hook de form (que además poblaría `src/hooks`). Ver RF-332.

**B3 — POST /api/auth/verify-otp valida input a mano en vez de con Zod** · _Validación / consistencia de API_ · **[confirmado]**
CLAUDE.md §5/§9/§14 piden Zod para parsear input en cada route. `verify-otp` lee `request.json()` y valida con checks manuales (`typeof`, `.trim()`, `cleanToken.length < 6` — `route.ts:19-25`), sin schema. No hay schema de auth/otp en `src/lib/validations/`. La validación manual es segura (try/catch, 400), por eso es bajo — es desviación de consistencia. El resto de routes con body sí usan Zod.
**Recomendación**: crear `src/lib/validations/auth.schema.ts` (email + token 6 dígitos) y `safeParse`. Ver RF-333.

**B4 — auth/logout/route.ts es la única API route sin test** · _API / auth_ · **[incierto]**
De las 17 routes en `src/app/api/**/route.ts`, todas tienen `__tests__` excepto `auth/logout` (`route.ts:1-9`: `signOut()` → redirect 303 a `/`). Simple y de bajo riesgo, pero rompe la simetría del flujo de sesión (callback y verify-otp sí tienen test).
**Recomendación**: test mínimo (assert `auth.signOut()` + redirect a `${origin}/` con 303). Ver RF-334.

**B5 — PATCH del álbum lee req.json() sin guard → 500 ante body inválido** · _Robustez_ · **[incierto]**
`src/app/api/album/stickers/[stickerId]/route.ts:18` hace `const body = await req.json();` sin try/catch ni `.catch(() => null)`. Un JSON malformado lanza → 500, en vez del 400 que dan las demás routes (messages `:32`, onboarding `:11-15` usan el patrón correcto). Inconsistencia de manejo de errores; un atacante puede forzar 500s triviales.
**Recomendación**: alinear con `const body = await req.json().catch(() => null);` y dejar que el safeParse devuelva 400. Ver RF-335.

**B6 — `--passWithNoTests` en CI enmascara suites vacías** · _Test-infra_ · **[incierto]**
`test` y `test:coverage` usan `--passWithNoTests` (`package.json:21,23`). Hoy no hay suites vacías, así que no es problema actual. El riesgo es a futuro: si por un merge/rebase un test queda sin casos o un glob se rompe, el runner pasa en verde. En un pipeline autónomo con auto-merge esa protección silenciosa conviene evitarla.
**Recomendación**: quitar `--passWithNoTests` del CI (salvo razón concreta de globs). Ver RF-336.

**B7 — Dropdown de notificaciones sin Escape ni aria-expanded/haspopup** · _Accesibilidad / teclado_ · **[incierto]**
La campana cierra solo con `mousedown` afuera; no hay handler de Escape, y el botón no expone `aria-expanded`/`aria-haspopup` (`notification-bell.tsx:42-49,73-77`). Un usuario de teclado/lector no sabe que abre un menú ni puede cerrarlo con Escape. Parte de WCAG AA (CLAUDE.md §17).
**Recomendación**: agregar `aria-expanded={isOpen}` + `aria-haspopup="menu"` + handler de Escape (con focus return). Ver RF-337.

**B8 — Tres strings de UI hardcodeados fuera de i18n (aria-labels)** · _i18n / a11y_ · **[confirmado]**
CLAUDE.md regla 7 es no-negociable. Aparecen literales: `aria-label="Cerrar"` (`notification-dropdown.tsx:39`, el archivo usa `useTranslations` en lo demás), `aria-label="Footer"` (`site-footer.tsx:12`), y `aria-label={...cantidad: ${count}}` con el literal español "cantidad:" (`sticker-cell.tsx:42`). Son los únicos del repo (el resto es disciplinado). aria-label es texto leído por lectores de pantalla.
**Recomendación**: mover a `messages/es.json` y consumir vía `t()` (sticker-cell recibe el label por props desde el padre que sí tiene `t`). Cubierto por la regla general de i18n; fix trivial.

**B9 — avatarUrl inyectado sin sanitizar en CSS url(...)** · _XSS / CSS injection_ · **[incierto]**
`src/app/u/[username]/page.tsx:88` y `src/app/matches/[id]/page.tsx:62-63` construyen `style={{ backgroundImage: url(${avatarUrl}) }}` sin validar host. Mitigante fuerte: hoy `avatarUrl` solo viene de `user_metadata.avatar_url` del OAuth (Google); el usuario no lo setea (`UpdateProfileSchema` no lo incluye). Riesgo real bajo. **Pero cuando se implemente RF-112 (subida de avatar) el vector pasa a ser controlable** — CLAUDE.md §15 ya lo flaggea para ese RF.
**Recomendación**: al cerrar RF-112, allowlistear el host (lh3.googleusercontent.com / Supabase Storage) o usar `next/image` con `remotePatterns`. Ya trackeado vía CLAUDE.md §15 / RF-112; no es deuda nueva.

**B10 — Navbar autenticado desborda en mobile (RF-824)** · _Mobile-first / layout_ · **[confirmado — ya trackeado]**
`app-navbar.tsx:27` es `<nav className="flex items-center gap-1">` con 5 hijos (3 Link de texto + campana + engranaje) sin un solo breakpoint responsive; no existe bottom-nav en todo `src/` (grep). Contradice CLAUDE.md §17 ("bottom nav en mobile") y desborda a 320px. **Ya está en BACKLOG.md:215 como RF-824** (con captura de Gonza, pendiente). No es deuda nueva — solo se confirma.

---

### Acoplamiento Service↔Prisma (deuda conocida, no hallazgo nuevo)

Los 4 services de dominio importan model types de `@prisma/client` y derivan sus DTOs (`match.service.ts:1,10` define `MatchRecord = Omit<Match, ...>`; message/notification/rating igual). **Es la deuda explícitamente reconocida en CLAUDE.md §6**, acotada al boundary (las firmas públicas devuelven DTOs, no `Match` crudo). No es violación nueva.

---

## 3. Desincronización de documentación (CLAUDE.md / BACKLOG / HANDOFF vs realidad)

El doc-drift es el riesgo transversal más serio para un pipeline autónomo que lee estas fuentes en cada corrida. Verificado contra el código:

| Doc                                               | Dice                                                                                                       | Realidad                                                                                    | Acción                                                    |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| CLAUDE.md §2 (l.41), §12 (l.234,237), §22 (l.357) | Auth es "stub return null / próximo gran hito"                                                             | `src/lib/auth.ts:14-28` es implementación real con `@supabase/ssr`; RF-101..107 todos `[x]` | Corregir: Auth cerrado; camino crítico = C1 + RF-406      |
| CLAUDE.md §2 (snapshot jun 2026)                  | "Camino crítico pendiente: Auth"                                                                           | El verdadero pendiente es **cablear el recompute de matches** (C1)                          | Reescribir el snapshot                                    |
| CLAUDE.md §21 (l.348)                             | nit "back-link a /matches (listado no existe)"                                                             | `src/app/matches/page.tsx` SÍ existe; back-links funcionan (`matches/[id]/page.tsx:51`)     | Tachar el nit (resuelto)                                  |
| CLAUDE.md §21 (l.348)                             | nit "bump postcss ≥ 8.5.10"                                                                                | `pnpm-lock.yaml` resuelve `postcss@8.5.15` (satisfecho)                                     | Tachar el nit (resuelto)                                  |
| README.md                                         | Next 14, deploy a `main` + squash, `pnpm db:seed`/`test:integration`, docker-compose, Husky, Lighthouse CI | Next 16; develop=prod+rebase; scripts y archivos inexistentes                               | Reescribir README (A2)                                    |
| CONTRIBUTING.md                                   | "Figus Mundial", squash a develop, lighthouse en CI, review humano obligatorio                             | CambiaLa; rebase; sin lighthouse; auto-merge del agente                                     | Alinear con ADR-021 (M8)                                  |
| CLAUDE.md §9                                      | "Usá el logger estructurado de src/lib/logger.ts"                                                          | 0 imports del logger en todo `src/` (código muerto)                                         | Adoptarlo o relajar la regla (M5)                         |
| `.env.example` / README / CONTRIBUTING            | `figus.uy`, "Figus Mundial", `figus-uy`                                                                    | Marca real CambiaLa (`cambia-la.vercel.app`)                                                | Decisión de owner (ya flag §21); unificar antes de Resend |

Nota positiva: HANDOFF.md y BACKLOG.md están **frescos** (última entrada 2026-06-06), `.env` nunca se commiteó (gitignored), y el gate local mapea fielmente al CI (mismas env mock).

---

## 4. Items propuestos para BACKLOG

| RF sugerido      | Prioridad | Una línea                                                                                                                                                                            |
| ---------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **RF-320**       | M (must)  | Cablear recompute de matches en runtime (sin Inngest) tras el flush del álbum — el engine existe pero ningún path lo invoca → `/matches` siempre vacío. **Bloqueante #1 de launch.** |
| **RF-321**       | M         | Enforced coverage: `coverage.include` + threshold per-file 100% en `match-engine.ts` en `vitest.config.ts` (hoy §11 es honor-system).                                                |
| **RF-322**       | S         | Tests de client components con lógica — AlbumClient (optimistic+debounce+rollback), LoginForm (OTP step machine), chat-panel (polling); ampliar el `include` del project `dom`.      |
| **RF-323**       | M         | Protección de rutas en middleware: redirect a `/auth/login` para no-autenticados en rutas privadas (defense-in-depth; hoy solo refresca cookie).                                     |
| **RF-324**       | M         | Rate limiting in-memory (ADR-016) en verify-otp / messages / check-username — hoy no existe ninguno.                                                                                 |
| **RF-325**       | S         | Adoptar `src/lib/logger.ts` en los `catch` de routes/services (hoy 0 imports) o quitar el mandato de CLAUDE.md §9.                                                                   |
| **RF-326**       | S         | Tests unitarios de schemas Zod — bordes de sticker/onboarding/rating/message/settings/notification.                                                                                  |
| **RF-327**       | S         | Alinear pnpm en CI a v10 (`PNPM_VERSION:9` → respetar `packageManager pnpm@10`) para evitar drift de lockfile.                                                                       |
| **RF-328**       | M         | Boundaries de ruta App Router — `error.tsx` + `not-found.tsx` + `loading.tsx` branded (tokens+i18n) para 404/500/loading.                                                            |
| **RF-329**       | S         | Token foreground oscuro para naranja sobre claro (contraste AA) — aplicar en stats, sticker-cell count, ScrollHint.                                                                  |
| **RF-330**       | S         | Reemplazar `bg-black/80` del Dialog overlay por token (`bg-foreground/60` o `--overlay`).                                                                                            |
| **RF-331**       | C         | Renombrar 5 componentes a kebab-case (settings/album/onboarding/auth-login + ScrollHint) + regla de lint `filename-case`.                                                            |
| **RF-332**       | C         | Partir `SettingsForm.tsx` (326 líneas) en sub-componentes/hook.                                                                                                                      |
| **RF-333**       | C         | Zod schema en POST `/api/auth/verify-otp` (`auth.schema.ts` + route).                                                                                                                |
| **RF-334**       | C         | Test de POST `/api/auth/logout` (signOut + redirect 303).                                                                                                                            |
| **RF-335**       | C         | PATCH album/stickers: `req.json().catch(() => null)` para devolver 400 (hoy 500) ante body malformado.                                                                               |
| **RF-336**       | C         | Quitar `--passWithNoTests` del CI para no enmascarar suites vacías.                                                                                                                  |
| **RF-337**       | C         | A11y dropdown notificaciones: Escape para cerrar + `aria-expanded`/`aria-haspopup` + focus return.                                                                                   |
| **D-001 (docs)** | M         | Sincronizar CLAUDE.md §2/§12/§22 con el estado real de Auth (cerrado, no stub) + reapuntar el "camino crítico" a RF-320/RF-406.                                                      |
| **D-002 (docs)** | S         | Reescribir README contra la realidad (Next 16, develop=prod/rebase, scripts reales, sin docker-compose/Husky/Lighthouse inexistentes).                                               |
| **D-003 (docs)** | C         | Alinear CONTRIBUTING.md con ADR-021 (rebase no squash, sin lighthouse, marca CambiaLa) + tachar nits resueltos de CLAUDE.md §21.                                                     |

> Items ya trackeados, **no** se re-proponen: RF-406 (email Resend), RF-824 (navbar mobile), RF-307 (Inngest recompute), RF-112 (avatar sanitization vía CLAUDE.md §15), RF-213 (bulk álbum).
