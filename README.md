# CambiaLa

> Cambiá las figuritas que te faltan. Sin caos.
> Plataforma web para que coleccionistas uruguayos intercambien figuritas del Mundial 2026.
> Cargá tu álbum, te avisamos cuando aparece alguien de tu barrio con las que necesitás.

## Stack

- **Framework**: Next.js 14 (App Router) + TypeScript strict
- **UI**: Tailwind CSS + shadcn/ui
- **DB**: PostgreSQL via Supabase + Prisma ORM
- **Auth**: Supabase Auth (magic link + Google OAuth)
- **Jobs**: Inngest (matchmaking, notificaciones)
- **Email**: Resend (React Email)
- **Hosting**: Vercel
- **Monitoring**: Sentry + PostHog

## Setup local rápido

```bash
# 1. Clonar y entrar
git clone https://github.com/[org]/figus-uy.git
cd figus-uy

# 2. Instalar dependencias (Node 20+)
pnpm install

# 3. Variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales (pedirlas al equipo)

# 4. DB local con Docker
docker compose up -d

# 5. Migraciones + seed
pnpm prisma migrate dev
pnpm db:seed         # Carga las ~900 figuritas del Mundial 2026

# 6. Correr en dev
pnpm dev             # http://localhost:3000

# 7. Inngest local (en otra terminal)
pnpm inngest:dev     # http://localhost:8288
```

## Scripts disponibles

| Comando              | Qué hace                         |
| -------------------- | -------------------------------- |
| `pnpm dev`           | Dev server con hot reload        |
| `pnpm build`         | Build de producción              |
| `pnpm start`         | Servir el build                  |
| `pnpm lint`          | ESLint                           |
| `pnpm type-check`    | TypeScript sin emit              |
| `pnpm test`          | Vitest unit tests                |
| `pnpm test:e2e`      | Playwright E2E                   |
| `pnpm db:seed`       | Cargar álbum Mundial 2026        |
| `pnpm db:reset`      | Reset DB local (CUIDADO en prod) |
| `pnpm prisma studio` | UI para inspeccionar DB          |

## Estructura del proyecto

```
src/
├── app/                    # Next.js App Router
│   ├── [locale]/
│   │   ├── (marketing)/    # Landing y páginas estáticas (SSG)
│   │   ├── (app)/          # Rutas autenticadas
│   │   └── u/[username]/   # Perfiles públicos (SSR)
│   └── api/                # API Routes
├── components/             # React components (album/, match/, chat/, ui/)
├── hooks/                  # Custom hooks (useAlbum, useMatches)
├── services/               # Service Layer (lógica de negocio)
├── repositories/           # Repository Layer (único acceso a Prisma)
├── lib/
│   ├── match-engine.ts     # Algoritmo de matchmaking (funciones puras)
│   ├── prisma.ts
│   ├── supabase/
│   ├── inngest/
│   ├── email/
│   └── validations/        # Schemas Zod
├── types/                  # Tipos del dominio
└── middleware.ts           # Auth guard + i18n routing

prisma/
├── schema.prisma
├── migrations/
└── seed.ts

messages/                   # i18n: es.json, en.json
public/                     # Assets estáticos, manifest, iconos
```

Detalle completo en la documentación de Notion: sección **4.9 Diagrama de Paquetes**.

## Documentación

Toda la documentación del producto, arquitectura, decisiones, requerimientos y plan vive en **Notion**:

📚 [App TBD] — Documentación Completa del Proyecto: https://www.notion.so/36de548e6cdd81cda047e4a5c0f4ad91

Páginas clave para arrancar:

- **2.1 Requerimientos Funcionales** — qué hace el producto
- **4.2 Arquitectura de Software** — cómo está organizado el código
- **4.3 Modelo de Datos** — schema Prisma comentado
- **4.4 Algoritmo de Matchmaking** — core del producto
- **4.6 ADRs** — por qué se eligió cada cosa del stack
- **4.7 Contrato de API** — endpoints
- **8.9 Pasos para Arrancar** — checklist de bootstrap

## Convenciones

- **Archivos**: `kebab-case` (ej: `match-card.tsx`, `sticker.service.ts`)
- **Componentes**: `PascalCase`, default export
- **Funciones**: `camelCase`
- **Constantes globales**: `SCREAMING_SNAKE_CASE`
- **Imports**: absolutos con `@/` (ej: `@/services/match.service`)
- **TypeScript**: strict mode, cero `any`
- **Estilo**: ESLint + Prettier en pre-commit (Husky)

Más detalle en `CONTRIBUTING.md` y en la sección **8.8 Proceso de Trabajo** de Notion.

## Flujo de trabajo

1. Sacar issue de GitHub Projects (o de la matriz de trazabilidad 2.5).
2. Crear branch: `feat/[id]-descripcion`, `fix/[id]-descripcion`, etc.
3. Hacer commits siguiendo Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`).
4. Abrir PR usando la plantilla `.github/PULL_REQUEST_TEMPLATE.md`.
5. CI debe pasar (lint + type-check + tests).
6. Code review obligatorio de al menos otra persona.
7. Squash & merge a `main`.
8. Deploy automático a producción.

Detalle en **7.3 Git Workflow y Branching** de Notion.

## Testing

- **Unit**: Vitest. Match engine al 100%.
- **Integration**: Vitest + DB de test en Docker.
- **E2E**: Playwright para flujos críticos.
- **Performance**: Lighthouse CI por PR.

```bash
pnpm test:watch              # Unit en modo watch
pnpm test:integration        # Tests de integración con DB
pnpm test:e2e                # E2E con Playwright
pnpm test:coverage           # Coverage report
```

Detalle en **7.2 Plan de Testing Detallado**.

## Seguridad

- Variables sensibles solo en `.env.local` (gitignored) o Vercel dashboard.
- Nunca commitear secretos. Si pasó, rotar inmediatamente.
- Cualquier cambio de auth/RLS requiere review extra.
- Si encontrás una vulnerabilidad, contactar al maintainer **en privado**.

Detalle en **5.1 Seguridad y Auth** y **5.2 Threat Model**.

## Para devs nuevos

1. Leer este README completo.
2. Setear ambiente local (los pasos de arriba).
3. Leer en Notion: 1.1 Visión, 4.2 Arquitectura, 4.6 ADRs.
4. Hacer un "onboarding PR" pequeño (typo, mejora visual menor) para validar el flujo.
5. Pedir un walkthrough de 30min con el founder para preguntas.

## Despliegue

- **Producción**: `main` deploya automáticamente a Vercel.
- **Preview**: cada PR genera URL preview de Vercel.
- **Rollback**: Vercel dashboard → Deployments → "Promote to Production" en versión estable anterior.

Detalle en **8.10 Runbook de Incidentes** para emergencias.

## Licencia

Propiedad conjunta del equipo. Ver acuerdo en **8.11 Acuerdo de Equipo**.

## Soporte y contacto

- **Issues técnicos**: GitHub Issues con plantilla.
- **Bugs en producción**: ver Runbook en Notion.
- **Contacto general**: `contacto@figus.uy` (configurar).

---

Hecho con ♥ en Uruguay 🇺🇾
