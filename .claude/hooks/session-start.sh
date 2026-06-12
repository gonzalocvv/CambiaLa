#!/usr/bin/env bash
# SessionStart hook del auto-builder de CambiaLa.
# Prepara el entorno y fija la identidad de commits del runner.
# Se ejecuta al arrancar una sesión de Claude Code (matcher "startup").
# Idempotente y tolerante: no debe abortar la sesión si un paso opcional falla.
set -uo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$PROJECT_DIR" || exit 0

echo "[session-start] CambiaLa auto-builder — preparando entorno en $PROJECT_DIR"

# 1) Identidad de commits del runner (CLAUDE.md §4). Local al repo, no global.
git config user.name "Gonzalo Cabrera" || true
git config user.email "gcabrera3210@gmail.com" || true

# 2) pnpm vía corepack (Node 20, pnpm 10).
if command -v corepack >/dev/null 2>&1; then
  corepack enable >/dev/null 2>&1 || true
fi

# 3) Dependencias reproducibles (igual que el CI).
if command -v pnpm >/dev/null 2>&1; then
  pnpm install --frozen-lockfile || pnpm install || true
  # Prisma Client disponible para type-check/build.
  pnpm prisma:generate || true
else
  echo "[session-start] aviso: pnpm no está en PATH; salteo install."
fi

echo "[session-start] listo."
exit 0
