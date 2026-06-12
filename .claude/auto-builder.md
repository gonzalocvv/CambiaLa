# Auto-builder de CambiaLa — prompt de la rutina

> **Runtime:** Claude Code corriendo el modelo **Fable 5** (alias `fable`) con **effort máximo**
> (`effortLevel: "xhigh"` en `settings.json` + `CLAUDE_CODE_EFFORT_LEVEL=max` en el runner).
>
> Este archivo es el **prompt** que ejecuta el auto-builder en cada corrida (lo referencian el
> workflow `.github/workflows/auto-builder.yml` y, opcionalmente, una Routine de claude.ai/code).
> Es la versión ejecutable de `CLAUDE.md` §4 (pipeline autónomo) y §13 (el GATE). Si algo acá
> contradice a `CLAUDE.md`, **manda `CLAUDE.md`**.

---

## Objetivo de una corrida

Shippear **un (1) ítem** del backlog por corrida, vía Pull Request contra `develop`, dejando el
repo en verde y la bitácora actualizada. Nada de medio-ítems sin documentar, nada de tocar
`develop` directo.

## Fuentes de verdad (leer al empezar, de arriba a abajo)

1. **`CLAUDE.md`** — reglas de oro, capas, colores, i18n, GATE. Fuente de verdad.
2. **`HANDOFF.md`** — bitácora; la entrada de arriba dice dónde se quedó la corrida anterior.
3. **`BACKLOG.md`** — qué construir, ordenado. Elegí el primer ítem accionable.
4. **Notion** (si hace falta contexto profundo): la página "Estado de implementación".

**No te fíes de la doc a ciegas: comprobá contra la realidad** (la DB, el código, el build).

## Reglas críticas (no negociables)

- **Un ítem por corrida.** Si es grande, un sub-pedazo coherente + el resto a `HANDOFF.md`.
- **Nunca pushees a `develop`.** Trabajá en una rama `claude/<rf>-<slug>`. PR contra `develop`.
- **Saltá los bloqueados:** `🔒` (credenciales/servicio externo), `⛔` (dependencia), y
  `⏸️ RESERVADO` (olas supervisadas — son de Gonza, no las tomes). Documentá el salto.
- **El GATE = CI es la barrera.** No abrís PR sin el gate verde local (ver abajo).
- **Diffs chicos y revisables.** Commits atómicos (Conventional Commits). Merge por **rebase**.
- **Capas + tokens + i18n a rajatabla** (`CLAUDE.md` §6/§7/§8). Cero colores crudos, cero
  strings de UI hardcodeados, cero `console.log`, cero `any` implícito.
- **Nunca leas/logues/commitees secretos.** `.env*` está fuera de git y fuera de tu alcance.

## Los 9 pasos de cada corrida

1. **Orientarte.** Leé `HANDOFF.md` (entrada de arriba) y `BACKLOG.md`. Confirmá el estado real
   (git, build) si hay dudas.
2. **Elegir el ítem.** El primer `[ ]` accionable del backlog (SPRINT 0 en adelante) que **no**
   esté `🔒`/`⛔`/`⏸️`. Si no hay ninguno, hacé una corrida de estado: verificá el gate,
   documentá que todo lo pendiente está bloqueado, y terminá.
3. **Planificar.** Verificá que el ítem esté en `BACKLOG.md` / Notion 2.1. Si no está, escribilo
   primero. Pensá tipos y schemas Zod antes del código.
4. **Rama.** `git switch -c claude/<rf>-<slug>` desde `develop` actualizado.
5. **Implementar.** Respetando capas, tokens, i18n. Módulos de 200–300 líneas. Tipos primero.
6. **Tests.** Match engine = 100% (TDD). Servicios críticos con tests. Donde aplique.
7. **GATE local** (idéntico al CI, ver abajo). Si algo falla y no lo cerrás: commit WIP **sin**
   auto-merge + bloqueo en `HANDOFF.md`. No abras PR en rojo.
8. **Bitácora.** Tildá `[x]` en `BACKLOG.md` (solo si quedó 100%). Agregá entrada **arriba** en
   `HANDOFF.md` (qué se hizo, rama, PR, próximo paso, bloqueos). Estos `.md` están en
   `.prettierignore`, no rompen `format:check`.
9. **PR.** Commits atómicos → push → abrir PR contra `develop` con la plantilla
   (`.github/PULL_REQUEST_TEMPLATE.md`). Ver política de auto-merge abajo.

## El GATE (corré TODO esto en verde antes de pushear)

```bash
pnpm install
pnpm format            # prettier --write (el CI corre format:check)
pnpm lint              # ESLint, incluye no-console
pnpm type-check        # tsc --noEmit, strict
pnpm format:check
pnpm prisma:generate
pnpm test:coverage     # Vitest; match engine 100%
# build con las MISMAS env mock que el CI (ver CLAUDE.md §13 para el bloque completo):
NEXT_PUBLIC_SUPABASE_URL='https://mock.supabase.co' NEXT_PUBLIC_SUPABASE_ANON_KEY='mock-key' \
SUPABASE_SERVICE_ROLE_KEY='mock-service-key' DATABASE_URL='postgresql://mock:mock@localhost:5432/mock' \
DIRECT_URL='postgresql://mock:mock@localhost:5432/mock' RESEND_API_KEY='mock-resend' \
RESEND_FROM_EMAIL='test@example.com' UNSUBSCRIBE_SECRET='mock-unsubscribe-secret' \
NEXT_PUBLIC_BASE_URL='http://localhost:3000' \
INNGEST_SIGNING_KEY='mock-inngest' INNGEST_EVENT_KEY='mock-event' pnpm build
```

## Formato del PR

- Usá `.github/PULL_REQUEST_TEMPLATE.md` tal cual (Qué hace / Cómo se probó / Trazabilidad).
- Título: Conventional Commit (`feat(activities): ...`).
- **Sin footers de atribución del agente ni links de sesión.** El PR es del proyecto.
- **Auto-merge:**
  - **Docs PRs** (solo `.md`/docs): auto-merge OK — entran solos con CI verde.
  - **Code PRs:** **NO** actives auto-merge. Los revisa Gonza (gstack + humano) antes de mergear.

## Identidad de commits del runner

El runner commitea como Gonza (lo setea el `SessionStart` hook / el workflow):

```bash
git config user.name "Gonzalo Cabrera"
git config user.email "gcabrera3210@gmail.com"
```

## Definition of Done (por ítem)

Implementado siguiendo capas + tokens + i18n · tests donde corresponde (engine 100%) · **gate
verde** · PR abierto (auto-merge solo si es docs) · `BACKLOG.md` tildado · `HANDOFF.md`
actualizado. Sin colores hardcodeados, sin strings sueltos, sin `console.log`/`TODO` colgados.

---

## Alternativa: Routines (web)

En vez del workflow de GitHub Actions, esta misma rutina puede correr como una **Routine** de
`claude.ai/code/routines` (config en la web, **no versionable** — por eso queda documentada acá):

- **Prompt:** "Leé `.claude/auto-builder.md` y seguí esa metodología para shippear el próximo
  ítem del backlog."
- **Trigger:** `Schedule` horario (cron `0 * * * *`).
- **Env:** `CLAUDE_CODE_EFFORT_LEVEL=max`.
- **Model:** `fable` (Fable 5).
- **Connector:** GitHub, con **unrestricted branch pushes** para ramas `claude/*`.

Las dos vías (Action y Routine) usan el **mismo prompt** (este archivo); elegí una, no las dos en
paralelo, para no duplicar corridas.
