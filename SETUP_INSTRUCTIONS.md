# Setup del repositorio

> Estos pasos los hacés UNA SOLA VEZ para terminar el setup. Después podés borrar este archivo.

## Paso 1 — Terminar el `git init` desde tu terminal Mac

Cowork dejó todos los archivos del repo pero no pudo hacer el `git commit` final por restricciones de permisos. Ejecutá esto en tu terminal:

```bash
cd /Users/gonzalocabrera/Desktop/FigusMundial/figus-uy
bash FINALIZAR_REPO.sh
```

El script:
- Limpia el `.git/` anterior (corrupto por el sandbox)
- Hace `git init -b develop` limpio (rama default: `develop`)
- Hace primer commit con conventional commits
- Crea la rama `main` (para releases)

Cuando termina te muestra el estado del repo.

## Paso 2 — (Opcional) Crear remoto en GitHub

Si tenés `gh` CLI instalado (GitHub CLI):

```bash
cd /Users/gonzalocabrera/Desktop/FigusMundial/figus-uy

# Crear repo privado
gh repo create figus-uy --private --source=. --remote=origin

# Push de ambas ramas
git push -u origin develop
git push origin main
```

Si no tenés `gh`, instalalo con `brew install gh` o creá el repo manualmente en https://github.com/new y agregás el remote después:

```bash
git remote add origin git@github.com:[tu-usuario]/figus-uy.git
git push -u origin develop
git push origin main
```

## Paso 3 — Configurar GitHub

Una vez creado el repo remoto, configurá esto desde la web (Settings):

### Default branch

Settings → Branches → Default branch → cambiar a `develop`.

### Branch protection rules

**Branch `develop`** (Settings → Branches → Branch protection rules → Add):
- Require a pull request before merging
- Require approvals: 1
- Require status checks to pass before merging
- Require branches to be up to date before merging
- Do not allow bypassing the above settings

**Branch `main`** (mismo):
- Require a pull request before merging
- Require approvals: 1 (si solo sos vos por ahora, podés desactivarlo)
- Require status checks to pass
- Require linear history
- Lock branch: NO (para poder hacer releases)

### Settings adicionales

- Settings → General → Pull Requests → desmarcar "Allow merge commits" y "Allow rebase merging"
- Mantener solo "Allow squash merging"
- Settings → General → Pull Requests → marcar "Automatically delete head branches"

### Secrets para CI (cuando haya CI)

Settings → Secrets and variables → Actions → New secret:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `DATABASE_URL` (para tests con DB)

## Paso 4 — Limpieza

```bash
rm FINALIZAR_REPO.sh
rm SETUP_INSTRUCTIONS.md
```

Y commit el cambio:

```bash
git add -A
git commit -m "chore: remove setup scripts"
git push
```

## Listo

Después de esto el repo está completamente configurado. Para empezar a desarrollar:

```bash
# Crear branch de feature
git checkout -b feat/RF-XXX-descripcion

# ... codear ...

git add .
git commit -m "feat(scope): descripción"
git push -u origin feat/RF-XXX-descripcion

# Abrir PR contra develop desde GitHub
```

Cualquier duda del flow: ver `CONTRIBUTING.md`.
