# Contribuir a CambiaLa

Guía rápida para los devs del equipo (y para el agente autónomo). Si sos nuevo, leé esto **y `CLAUDE.md`** antes del primer PR. `CLAUDE.md` es la fuente de verdad; si algo de acá la contradice, manda `CLAUDE.md`.

## Setup inicial

Ver `README.md` para el setup completo de ambiente local.

## Convenciones del proyecto

Detalle completo en `CLAUDE.md` (§6 capas, §7 colores, §8 i18n, §9 convenciones). Resumen mínimo:

- **TypeScript strict**: cero `any` implícito. Schemas Zod antes de implementar endpoints.
- **Archivos** en kebab-case (`match-card.tsx`). **Componentes** en PascalCase, default export. **Funciones** camelCase.
- **Imports** absolutos con `@/`.
- **Arquitectura en capas**: Presentation → Service → Repository → Domain. Sin cruces (ADR-008).
- **Colores SOLO por tokens** del design system; **cero strings de UI hardcodeados** (todo por next-intl).
- **Tests** obligatorios en el match engine (100%) y en servicios críticos.

## Flujo de trabajo (ADR-021)

### Branches

- `develop` — **rama default y PRODUCCIÓN**. Vercel deploya prod desde `develop`. **Nunca pushear directo.**
- `claude/<rf>-<slug>` — trabajo del agente autónomo (ej. `claude/RF-320-matching-runtime`).
- `feat/<slug>` — features manuales. `fix/<slug>`, `chore/<slug>`, `docs/<slug>` para lo demás.
- `main` **no se usa para deploy** (no hay flujo de release a `main`).

### Commits — Conventional Commits, atómicos

Commits chicos por paso lógico (la estrategia de merge es **rebase**, así que se preservan en `develop`).

```
feat(album): autosave on sticker mark
fix(matchmaking): handle zero-score correctly
chore(deps): upgrade prisma to 6.x
docs(backlog): add RF-320..337 from gstack audit
refactor(services): extract notification logic
test(match-engine): add edge cases for empty sets
perf(album): bulk upsert sticker counts
```

### Pull Requests

1. Crear branch desde `develop`.
2. Commits atómicos (Conventional Commits).
3. **Gate verde local** (`CLAUDE.md` §13) antes de pushear.
4. Abrir PR contra `develop` con la plantilla (`.github/PULL_REQUEST_TEMPLATE.md`).
5. **CI verde** requerido: `lint` + `type-check` + `format:check` + `test:coverage` + `build`. La branch protection en `develop` lo exige.
6. **Merge por rebase** (no squash).
7. Review:
   - **Docs PRs** (solo `.md`/docs): auto-merge OK — entran solos con CI verde.
   - **Code PRs**: **NO** activar auto-merge — los revisa Gonza (gstack + humano) antes de mergear.

> No corre Lighthouse en el gate (el workflow existe pero está deshabilitado). No hay tests de integración con Docker.

## Code review etiquette

Prefijos en comentarios de PR:

- `nit:` cosa menor opcional (no bloquea merge)
- `question:` pregunta para entender
- `suggestion:` propuesta no obligatoria
- `must:` requerido antes de merge
- `blocker:` no se mergea hasta resolver

## Antes de abrir un PR

Checklist en `.github/PULL_REQUEST_TEMPLATE.md`. Lo importante (= el gate):

- [ ] `pnpm format` corrido (y `pnpm format:check` verde)
- [ ] `pnpm lint` sin warnings
- [ ] `pnpm type-check` sin errores
- [ ] `pnpm prisma:generate`
- [ ] `pnpm test:coverage` pasa (match engine 100%)
- [ ] `build` con env mock (`CLAUDE.md` §13)
- [ ] Sin `console.log`, `debugger`, ni `TODO`/`FIXME` colgados
- [ ] Sin colores crudos ni strings de UI hardcodeados
- [ ] Variables nuevas en `.env.example`
- [ ] `BACKLOG.md` tildado + `HANDOFF.md` actualizado (entrada nueva arriba)
- [ ] Self-review del propio PR

## Cómo hacer preguntas

- **Específica del proyecto** (qué es un match, cómo funciona el algoritmo): consultá `CLAUDE.md` y Notion primero, después al equipo.
- **De código** (cómo hago X en TypeScript): preguntale a Claude/Cursor primero, después al equipo.
- **De decisiones de producto**: discusión con Gonza.

## Reportar bugs

Usar `.github/ISSUE_TEMPLATE/bug_report.md`. Incluir severidad, pasos para reproducir y contexto técnico. Si es **crítico en producción**: avisar de inmediato a Gonza.
