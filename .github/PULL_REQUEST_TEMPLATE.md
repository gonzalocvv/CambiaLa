## ¿Qué hace este PR?

Descripción concisa del cambio. 1-3 párrafos.

## Tipo de cambio

- [ ] 🐛 Bug fix (cambio que arregla un issue)
- [ ] ✨ Feature nueva (cambio que agrega funcionalidad)
- [ ] 💥 Breaking change (fix o feature que cambia comportamiento existente)
- [ ] 📝 Documentación
- [ ] ♻️ Refactor (sin cambio de funcionalidad)
- [ ] ⚡ Performance
- [ ] ✅ Tests
- [ ] 🔧 Configuración / Chore

## Trazabilidad

- **Issue / RF**: closes #XX, implementa RF-XXX
- **User Story**: US-XXX
- **Pantalla(s)** afectada(s): P-XXX
- **Endpoint(s)** afectado(s): EP-XXX
- **ADR** (si decisión arquitectónica): ADR-XXX

## ¿Cómo se probó?

Describir el testing que hiciste. Ejemplos:

- [ ] Tests unitarios nuevos / actualizados
- [ ] Tests de integración nuevos / actualizados
- [ ] Tests E2E nuevos / actualizados
- [ ] Probado manualmente en preview (URL: \_\_\_)
- [ ] Lighthouse audit corrido
- [ ] Probado en mobile real (iOS / Android)

## Screenshots / Video (si aplica)

Antes / Después para cambios de UI.

## Checklist de calidad (Definition of Done)

- [ ] Mi código sigue las convenciones del proyecto
- [ ] Hice self-review del código antes de pedir review
- [ ] El código está comentado donde es complejo
- [ ] No hay `console.log`, `debugger`, ni `// TODO` sin issue
- [ ] No hay `any` en TypeScript (excepto justificado)
- [ ] Tests pasan localmente (`pnpm test`)
- [ ] Type check pasa (`pnpm type-check`)
- [ ] Lint pasa sin warnings (`pnpm lint`)
- [ ] Documentación de Notion actualizada si corresponde (RFs, matriz, ADRs)
- [ ] Eventos de PostHog instrumentados si aplica
- [ ] Variables nuevas agregadas a `.env.example`

## Checklist de seguridad (si aplica)

- [ ] Sin secretos hardcoded
- [ ] Validación Zod en todo input externo
- [ ] Auth check en endpoints protegidos
- [ ] RLS actualizado si hay tabla nueva
- [ ] No PII en logs nuevos
- [ ] Rate limit donde corresponde

## Checklist de performance (si aplica)

- [ ] Bundle size no aumenta más de 10KB
- [ ] Lighthouse score no baja
- [ ] Queries DB optimizadas (sin N+1)
- [ ] Imágenes optimizadas (Next/Image, WebP)

## ¿Requiere migración de DB?

- [ ] No
- [ ] Sí — incluye migration de Prisma, revisar carefully

## ¿Requiere acción post-deploy?

- [ ] No
- [ ] Sí: describir qué (ej. correr seed, actualizar env vars, comunicar a usuarios)

## Notas para el reviewer

Cualquier contexto que ayude a la revisión. Áreas donde quieras feedback específico.
