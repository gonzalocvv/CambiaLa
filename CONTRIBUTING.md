# Contribuir a Figus Mundial

Guía rápida para los devs del equipo. Si sos nuevo, leé esto antes del primer PR.

## Setup inicial

Ver `README.md` para el setup completo de ambiente local.

## Convenciones del proyecto

La documentación completa de convenciones vive en Notion (**7.6 Guía de Clean Code y Buenas Prácticas**). Resumen mínimo:

- **TypeScript strict**: cero `any` implícito.
- **Archivos** en kebab-case (`match-card.tsx`).
- **Componentes** en PascalCase, default export.
- **Imports** absolutos con `@/`.
- **Arquitectura en capas**: Presentation → Service → Repository → Domain. Sin cruces.
- **Tests** obligatorios en match engine y servicios críticos.

## Flujo de trabajo

### Branches

- `develop` — **rama default**, donde se mergea el día a día.
- `main` — **solo releases**. Cada deploy a producción es un merge `develop → main`.
- `feat/[id]-descripcion` — features nuevas (ej. `feat/RF-301-match-engine`).
- `fix/[id]-descripcion` — bugfixes.
- `chore/descripcion` — mantenimiento (deps, config).
- `docs/descripcion` — solo docs.

### Commits — Conventional Commits

```
feat(album): autosave on sticker mark
fix(matchmaking): handle zero-score correctly
chore(deps): upgrade prisma to 5.10
docs(notion): update RF-301 acceptance criteria
refactor(services): extract notification logic
test(match-engine): add edge cases for empty sets
perf(album): virtualize grid for 900 stickers
```

### Pull Requests

1. Sacar issue de GitHub Projects.
2. Crear branch desde `develop`: `git checkout -b feat/RF-XXX-descripcion`.
3. Hacer commits atómicos siguiendo Conventional Commits.
4. Abrir PR contra `develop` usando la plantilla.
5. CI debe pasar (lint + type-check + tests + lighthouse).
6. Code review obligatorio de **otra persona del equipo**.
7. Squash & merge a `develop`.

### Release a `main`

1. Cuando hay un set de features listas para producción, crear PR `develop → main`.
2. Tag de versión semver (`v0.1.0`, `v0.2.0`, etc.).
3. Vercel deploya `main` automáticamente.
4. Si algo se rompe en prod: rollback en Vercel + hotfix branch desde `main` que mergea a `main` y a `develop`.

## Code review etiquette

Prefijos en comentarios de PR:

- `nit:` cosa menor opcional (no bloquea merge)
- `question:` pregunta para entender
- `suggestion:` propuesta no obligatoria
- `must:` requerido antes de merge
- `blocker:` no se mergea hasta resolver

## Antes de abrir un PR

Checklist en `.github/PULL_REQUEST_TEMPLATE.md`. Lo importante:

- [ ] `pnpm lint` sin warnings
- [ ] `pnpm type-check` sin errores
- [ ] `pnpm test` pasa
- [ ] Sin `console.log`, `debugger`, ni TODO sin issue
- [ ] Documentación de Notion actualizada si aplica
- [ ] Variables nuevas en `.env.example`
- [ ] Self-review del propio PR

## Cómo hacer preguntas

- **Específica del proyecto** (qué es un match, cómo funciona el algoritmo): consultá Notion primero, después preguntá en el canal del equipo.
- **De código** (cómo hago X en TypeScript): preguntale a Claude/Cursor primero, después al equipo.
- **De decisiones de producto**: discusión en el canal del equipo o en la reunión semanal.

## Reportar bugs

Usar `.github/ISSUE_TEMPLATE/bug_report.md`. Incluir severidad (P0-P3), pasos para reproducir, contexto técnico.

Si es **P0 en producción**: avisar inmediatamente en el canal del equipo + seguir el Runbook de Incidentes (sección 8.10 en Notion).

## Ámbito del Acuerdo de Equipo

Los miembros del equipo firmaron el documento `8.11 Acuerdo de Equipo` en Notion. Si tenés dudas sobre roles, equity, decisiones o salidas, consultá ese documento.
