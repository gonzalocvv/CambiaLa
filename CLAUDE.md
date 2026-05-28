# CLAUDE.md

Este archivo es el contexto persistente que Claude Code lee al iniciar cada sesión sobre este proyecto. Mantenelo actualizado cuando tomes decisiones importantes.

## Qué es este proyecto

**Figus Mundial** — plataforma web C2C para que coleccionistas uruguayos intercambien figuritas del álbum Panini Mundial 2026.

- Mercado: Uruguay (Montevideo principalmente).
- Ciclo principal: mayo-julio 2026 (durante el Mundial).
- Multi-álbum desde el día 1 a nivel schema (Copa América 2027, Libertadores, etc.).
- Side project con equipo de 3 personas part-time.

**Lo que hace**:
- Cada usuario carga qué figuritas tiene y cuáles le faltan.
- El sistema calcula automáticamente con quién puede cambiar.
- Notifica al instante cuando aparece un match.
- Chat in-app para coordinar.
- Sistema de reputación post-intercambio.

**Lo que NO hace**: cero e-commerce, cero envíos, cero plata entre usuarios, cero app nativa en MVP.

## Documentación de referencia

**TODA la documentación del producto, arquitectura y plan vive en Notion**: https://www.notion.so/36de548e6cdd81cda047e4a5c0f4ad91

Si necesitás contexto profundo sobre cualquier feature o decisión, consultar Notion primero. La documentación está organizada en 9 bloques temáticos (0 a 8):
- **Bloque 0**: Glosario.
- **Bloque 1**: Visión, mercado, personas, journey.
- **Bloque 2**: Requerimientos funcionales/no funcionales, user stories, casos de uso, matriz de trazabilidad.
- **Bloque 3**: Diseño, pantallas, sitemap.
- **Bloque 4**: Stack, arquitectura, datos, diagramas, ADRs, API, patrones.
- **Bloque 5**: Seguridad, compliance.
- **Bloque 6**: Notificaciones, i18n.
- **Bloque 7**: Testing, Git, Docker, performance.
- **Bloque 8**: Fases, roadmap, monetización, riesgos, proceso, acuerdo de equipo, runbook.

## Stack confirmado (ver ADR-001 a ADR-006)

- **Framework**: Next.js 14 App Router con TypeScript strict.
- **Estilos**: Tailwind CSS + shadcn/ui.
- **DB**: PostgreSQL en Supabase.
- **ORM**: Prisma.
- **Auth**: Supabase Auth (magic link + Google OAuth).
- **Jobs**: Inngest para matchmaking async y notificaciones.
- **Email**: Resend con React Email templates.
- **Validación**: Zod en client y server.
- **Estado client**: TanStack Query + useState/useReducer. Sin Redux/Zustand a menos que crezca mucho.
- **Hosting**: Vercel.
- **Monitoring**: Sentry + PostHog.

## Filosofía de desarrollo

- **Hiperfoco MVP**. Features de F2/F3 no se construyen hasta tener MVP estable. Ver 8.1 Fases.
- **Mobile-first siempre**. 70%+ del tráfico será celular. PWA instalable.
- **Tipos primero, código después**. Cero `any` implícito. Schemas Zod antes de implementar.
- **Validación server-side autoritativa**. El cliente valida para UX, el servidor por seguridad.
- **No reinventar la rueda**. shadcn/ui, Supabase, Vercel — no tunear infra a mano.
- **Arquitectura en capas estricta**. Presentation → Service → Repository → Domain. Ver 4.2.

## Arquitectura en capas (cumplimiento obligatorio)

```
Presentation Layer    → src/app/, src/components/, src/hooks/
        ↓
Service Layer         → src/services/  (lógica de negocio)
        ↓
Repository Layer      → src/repositories/  (único acceso a Prisma)
        ↓
Domain Layer (puro)   → src/lib/match-engine.ts, src/types/, src/lib/validations/
```

**Reglas**:
- Presentation NO importa Prisma directamente. Siempre via Service.
- Services NO importan Request/Response. No saben de HTTP.
- Repositories NO importan Services. Solo Prisma y tipos.
- Domain Layer NO importa NADA. Funciones puras.

## Convenciones de código

- Archivos: `kebab-case` (`match-card.tsx`, `sticker.service.ts`).
- Componentes: `PascalCase`, default export.
- Funciones: `camelCase`.
- Constantes globales: `SCREAMING_SNAKE_CASE`.
- Imports absolutos con `@/` (ej: `@/services/match.service`).
- Tipos compartidos en `src/types/`. Tipos de un componente quedan en su archivo.
- Schemas Zod en `src/lib/validations/`.
- REST API Routes en MVP (no Server Actions todavía, ver ADR-018).
- Cada API route: validar Zod → llamar Service → responder JSON.
- Cero `console.log` en producción. Logger estructurado.

## Reglas de oro al construir features

1. **Antes de codear**, verificar que el RF está en `2.1 Requerimientos Funcionales` de Notion. Si no, escribirlo primero.
2. **Cada cambio en DB** va por migration de Prisma. Nunca a mano.
3. **Cada endpoint nuevo** define schema Zod input + output antes de implementar.
4. **Match engine** tiene tests 100%. No se mergea código del engine sin test.
5. **Optimistic UI** para acciones que afectan UX (marcar figurita, mandar mensaje).
6. **Cada PR actualiza** la matriz de trazabilidad (2.5) si agrega RF/pantalla/endpoint.

## Patrones aplicados (ver 4.11)

- Layered Architecture (estricta).
- Repository Pattern.
- Service Layer Pattern.
- Data-driven Design — para multi-álbum.
- Event-Driven via Inngest.
- Singleton de PrismaClient.
- Optimistic UI + Debounce en autosave.
- Cache-Aside con TanStack Query.
- Idempotency en operaciones críticas.
- Retry con backoff exponencial en jobs.
- TTL para matches inactivos (30 días).

## Decisiones tomadas (no re-discutir)

Ver **4.6 ADRs** en Notion. Resumen:

| Decisión | Razón |
|---|---|
| Next.js 14 App Router | SSR + RSC + ecosistema + facilidad para Claude |
| Supabase | Auth + DB + Storage + RLS en uno |
| Prisma | Tipado fuerte, migraciones excelentes, DX |
| Inngest | Jobs async sin gestionar Redis |
| Magic link + Google OAuth | Sin passwords, baja fricción |
| PWA, no app nativa en MVP | Ciclo del Mundial es corto |
| Polling 10s en chat (MVP) | Simple. Realtime en F2 |
| Solo Mundial 2026 en MVP (UI) | Foco. Schema soporta multi |
| Sin ponderación por rareza | La economía del cambio se negocia en chat |
| CUIDs sobre UUIDs | Más cortos, URL-safe |
| RLS de Supabase activo | Defense in depth |
| Rate limit in-memory (MVP) → Redis (F2) | Pragmático |

## Features prioritarias del MVP (orden de implementación)

Ver **8.2 Roadmap y Cronograma**. Resumen:

- **Sprint 0** (1 sem): setup + seed del álbum.
- **Sprint 1** (2 sem): Auth + Onboarding + Álbum + Marcado.
- **Sprint 2** (2 sem): Match engine + Inngest + Chat polling + Notificaciones + Reseñas.
- **Sprint 3** (2 sem): Perfil público + Páginas estáticas + PWA + Polish + Admin.
- **Semana 7**: Soft launch invite-only.
- **Semana 8**: Public launch.

Total: 6-7 semanas con equipo de 3 part-time.

## Lo que NO se hace en MVP

Features explícitamente fuera de scope MVP (ver 2.1 sección "Won't have"):
- App nativa (PWA es suficiente).
- Mapa de coleccionistas → F2.
- Matches indirectos / triángulos → F3.
- Multi-álbum UI (schema lo soporta, UI solo expone Mundial 2026).
- Plan Pro / monetización → F2.
- Web Push → F2.
- Chat realtime con Supabase Realtime → F2.
- Verificación de identidad → F2 (ver 5.3).
- Bulk import por foto / IA → F2.
- Reconocimiento de figuritas por Claude Vision → F2.
- Soporte de otros países → no se hace.

## Variables de entorno necesarias

Ver `.env.example` (después de bootstrap del repo). Las críticas:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # NUNCA exponer al cliente

# DB direct (para Prisma migrations)
DATABASE_URL=
DIRECT_URL=

# Email
RESEND_API_KEY=
RESEND_FROM_EMAIL="hola@figus.uy"

# App
NEXT_PUBLIC_BASE_URL=https://figus.uy

# Monitoring
SENTRY_DSN=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=

# Inngest
INNGEST_SIGNING_KEY=
INNGEST_EVENT_KEY=

# Admin (provisional)
ADMIN_USER_IDS=                   # Lista separada por coma

# Web Push (F2)
# VAPID_PUBLIC_KEY=
# VAPID_PRIVATE_KEY=
```

## Cómo usar Claude eficientemente

- **Antes de pedirle algo**, asegurate que la spec esté en Notion. Si no, escribila primero.
- **Sesiones de 90-120 min** son más eficientes que maratones de 4 horas.
- **Modularizar** archivos en 200-300 líneas max para que Claude no cargue archivos enormes.
- **Match engine y arquitectura**: Sonnet/Opus.
- **Tareas mecánicas** (boilerplate, migrations): Haiku.
- **Cuando hagas una decisión importante**, actualizar este CLAUDE.md y agregar un ADR en Notion (4.6).

## Anti-patrones a evitar

- Hacer "branches" del flujo principal por features de F2 antes de tener MVP.
- Optimización prematura (cache complejo, queues, microservicios).
- Agregar dependencias por features pequeñas. Si es simple, escribirlo.
- Romper la arquitectura en capas por "ahorrar tiempo".
- Server Actions sin discutirlo primero (ver ADR-018).
- Mensajes hardcoded en JSX (usar i18n).

## Glosario rápido

Ver **0.1 Glosario del Dominio** en Notion para versión completa.

- **Match**: dos usuarios que pueden intercambiar al menos 1 figurita en cada dirección.
- **Score**: `min(|A→B|, |B→A|)`, cantidad máxima intercambiable.
- **Repe / repetida**: figurita con count >= 2.
- **Falta**: figurita con count = 0.
- **Activo**: usuario con lastSeenAt < 30 días.
- **MVP**: Minimum Viable Product. Las 90 RF marcadas como Must.
- **F2/F3**: fases siguientes al MVP.

## Última actualización

Mayo 2026 — proyecto en fase de definición. Cuando empiece el código, actualizar fechas y hitos.
