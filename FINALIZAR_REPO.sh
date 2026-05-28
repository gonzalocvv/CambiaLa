#!/bin/bash
# =====================================================
# FINALIZAR_REPO.sh
# =====================================================
# Script para terminar el setup del repo figus-uy.
#
# Por qué hace falta: Cowork creó los archivos correctamente
# pero el sandbox no pudo hacer el `git init` final ni escribir
# en carpetas protegidas como .vscode/ y .idea/ por
# restricciones de permisos cross-mount.
#
# Este script termina el job en tu terminal Mac nativa.
#
# Uso:
#   cd /Users/gonzalocabrera/Desktop/FigusMundial/figus-uy
#   bash FINALIZAR_REPO.sh
#
# Después podés borrar este archivo: rm FINALIZAR_REPO.sh
# =====================================================

set -e  # exit on first error

echo "=== Paso 1: Limpiando .git anterior (si existe) ==="
rm -rf .git

echo ""
echo "=== Paso 2: Creando configuración de VS Code ==="
mkdir -p .vscode

cat > .vscode/settings.json << 'VSCODE_SETTINGS_EOF'
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "explicit"
  },
  "editor.tabSize": 2,
  "editor.insertSpaces": true,
  "editor.rulers": [100],
  "files.eol": "\n",
  "files.insertFinalNewline": true,
  "files.trimTrailingWhitespace": true,
  "files.trimFinalNewlines": true,
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "typescript.preferences.importModuleSpecifier": "non-relative",
  "typescript.updateImportsOnFileMove.enabled": "always",
  "typescript.suggest.autoImports": true,
  "typescript.inlayHints.parameterNames.enabled": "literals",
  "javascript.updateImportsOnFileMove.enabled": "always",
  "[typescript]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[typescriptreact]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[json]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[jsonc]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[prisma]": { "editor.defaultFormatter": "Prisma.prisma" },
  "[markdown]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "files.trimTrailingWhitespace": false
  },
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cn\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ],
  "tailwindCSS.includeLanguages": {
    "typescript": "javascript",
    "typescriptreact": "javascript"
  },
  "eslint.workingDirectories": [{ "mode": "auto" }],
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "search.exclude": {
    "**/node_modules": true,
    "**/.next": true,
    "**/dist": true,
    "**/coverage": true,
    "**/pnpm-lock.yaml": true,
    "**/.turbo": true
  },
  "git.autofetch": true,
  "git.confirmSync": false,
  "git.enableSmartCommit": true,
  "errorLens.enabledDiagnosticLevels": ["error", "warning"]
}
VSCODE_SETTINGS_EOF

cat > .vscode/extensions.json << 'VSCODE_EXT_EOF'
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "Prisma.prisma",
    "eamodio.gitlens",
    "usernamehw.errorlens",
    "yoavbls.pretty-ts-errors",
    "streetsidesoftware.code-spell-checker",
    "mikestead.dotenv",
    "bierner.markdown-mermaid",
    "GitHub.copilot",
    "GitHub.copilot-chat",
    "anthropic.claude-code"
  ],
  "unwantedRecommendations": [
    "octref.vetur",
    "hookyqr.beautify"
  ]
}
VSCODE_EXT_EOF

echo ""
echo "=== Paso 3: Creando configuración de WebStorm (.idea/) ==="
mkdir -p .idea/codeStyles .idea/inspectionProfiles .idea/jsLinters

cat > .idea/prettier.xml << 'IDEA_PRETTIER_EOF'
<?xml version="1.0" encoding="UTF-8"?>
<project version="4">
  <component name="PrettierConfiguration">
    <option name="myConfigurationMode" value="AUTOMATIC" />
    <option name="myRunOnSave" value="true" />
    <option name="myRunOnReformat" value="true" />
    <option name="myFilesPattern" value="{**/*,*}.{js,ts,jsx,tsx,mjs,cjs,json,jsonc,md,mdx,html,css,scss,yaml,yml}" />
  </component>
</project>
IDEA_PRETTIER_EOF

cat > .idea/jsLinters/eslint.xml << 'IDEA_ESLINT_EOF'
<?xml version="1.0" encoding="UTF-8"?>
<project version="4">
  <component name="EslintConfiguration">
    <option name="fix-on-save" value="true" />
    <files-pattern value="{**/*,*}.{js,ts,jsx,tsx,vue,html,mjs,cjs}" />
  </component>
</project>
IDEA_ESLINT_EOF

cat > .idea/codeStyles/codeStyleConfig.xml << 'IDEA_CS_CONFIG_EOF'
<component name="ProjectCodeStyleConfiguration">
  <state>
    <option name="USE_PER_PROJECT_SETTINGS" value="true" />
  </state>
</component>
IDEA_CS_CONFIG_EOF

cat > .idea/codeStyles/Project.xml << 'IDEA_CS_PROJECT_EOF'
<component name="ProjectCodeStyleConfiguration">
  <code_scheme name="Project" version="173">
    <JSCodeStyleSettings version="0">
      <option name="FORCE_SEMICOLON_STYLE" value="true" />
      <option name="USE_DOUBLE_QUOTES" value="false" />
      <option name="FORCE_QUOTE_STYlE" value="true" />
      <option name="ENFORCE_TRAILING_COMMA" value="WhenMultiline" />
      <option name="SPACES_WITHIN_OBJECT_LITERAL_BRACES" value="true" />
      <option name="SPACES_WITHIN_IMPORTS" value="true" />
    </JSCodeStyleSettings>
    <TypeScriptCodeStyleSettings version="0">
      <option name="FORCE_SEMICOLON_STYLE" value="true" />
      <option name="USE_DOUBLE_QUOTES" value="false" />
      <option name="FORCE_QUOTE_STYlE" value="true" />
      <option name="ENFORCE_TRAILING_COMMA" value="WhenMultiline" />
      <option name="SPACES_WITHIN_OBJECT_LITERAL_BRACES" value="true" />
      <option name="SPACES_WITHIN_IMPORTS" value="true" />
    </TypeScriptCodeStyleSettings>
    <codeStyleSettings language="JavaScript">
      <option name="RIGHT_MARGIN" value="100" />
      <indentOptions>
        <option name="INDENT_SIZE" value="2" />
        <option name="CONTINUATION_INDENT_SIZE" value="2" />
        <option name="TAB_SIZE" value="2" />
      </indentOptions>
    </codeStyleSettings>
    <codeStyleSettings language="TypeScript">
      <option name="RIGHT_MARGIN" value="100" />
      <indentOptions>
        <option name="INDENT_SIZE" value="2" />
        <option name="CONTINUATION_INDENT_SIZE" value="2" />
        <option name="TAB_SIZE" value="2" />
      </indentOptions>
    </codeStyleSettings>
    <codeStyleSettings language="JSON">
      <indentOptions>
        <option name="INDENT_SIZE" value="2" />
        <option name="CONTINUATION_INDENT_SIZE" value="2" />
        <option name="TAB_SIZE" value="2" />
      </indentOptions>
    </codeStyleSettings>
  </code_scheme>
</component>
IDEA_CS_PROJECT_EOF

cat > .idea/vcs.xml << 'IDEA_VCS_EOF'
<?xml version="1.0" encoding="UTF-8"?>
<project version="4">
  <component name="VcsDirectoryMappings">
    <mapping directory="$PROJECT_DIR$" vcs="Git" />
  </component>
</project>
IDEA_VCS_EOF

cat > .idea/inspectionProfiles/Project_Default.xml << 'IDEA_INSPECT_EOF'
<component name="InspectionProjectProfileManager">
  <profile version="1.0">
    <option name="myName" value="Project Default" />
    <inspection_tool class="ES6PreferShortImport" enabled="true" level="WARNING" enabled_by_default="true" />
    <inspection_tool class="JSUnusedLocalSymbols" enabled="true" level="WARNING" enabled_by_default="true" />
    <inspection_tool class="TypeScriptCheckImport" enabled="true" level="ERROR" enabled_by_default="true" />
    <inspection_tool class="TypeScriptUnresolvedReference" enabled="true" level="ERROR" enabled_by_default="true" />
    <inspection_tool class="TypeScriptValidateTypes" enabled="true" level="ERROR" enabled_by_default="true" />
    <inspection_tool class="UnnecessaryLocalVariableJS" enabled="true" level="WARNING" enabled_by_default="true" />
    <inspection_tool class="MissingRequiredEnvVariable" enabled="true" level="WARNING" enabled_by_default="true" />
  </profile>
</component>
IDEA_INSPECT_EOF

echo ""
echo "=== Paso 4: Inicializando git con branch develop como default ==="
git init -b develop

echo ""
echo "=== Paso 5: Configurando git user ==="
git config user.name "Gonzalo Cabrera"
git config user.email "gcabrera3210@gmail.com"

echo ""
echo "=== Paso 6: Agregando todos los archivos ==="
git add -A

echo ""
echo "=== Paso 7: Primer commit ==="
git commit -m "chore: initial repo scaffold with docs, IDE configs and base structure

- README.md with stack, setup, scripts and project structure
- CLAUDE.md as persistent context for AI coding assistants
- CONTRIBUTING.md with workflow and conventions
- .github templates for issues (bug/feature) and PRs
- .gitignore for Next.js + TypeScript + Prisma stack
- .env.example with all required variables documented
- .editorconfig for consistent formatting across editors
- .nvmrc with Node 20
- .prettierrc.json and .prettierignore
- package.json with scripts placeholder
- .vscode/ shared config (settings + extensions)
- .idea/ shared config (Prettier, ESLint, code style, inspections)
- Base folder structure: src/{app,components,services,repositories,lib,types,hooks}
- Empty prisma/, messages/, public/icons/, docs/

Default branch: develop. main reserved for releases.

Refs: Notion 8.1 Fases de Desarrollo, 7.3 Git Workflow, 8.8 Proceso de Trabajo"

echo ""
echo "=== Paso 8: Creando branch main (reservada para releases) ==="
git branch main

echo ""
echo "✅ Repo listo. Estado actual:"
echo ""
git status
echo ""
echo "--- Commits ---"
git log --oneline
echo ""
echo "--- Branches ---"
git branch
echo ""
echo "============================================"
echo "PRÓXIMOS PASOS:"
echo "============================================"
echo ""
echo "1. Borrar este script y las instrucciones (ya no se necesitan):"
echo "   rm FINALIZAR_REPO.sh SETUP_INSTRUCTIONS.md"
echo ""
echo "2. Crear repo remoto en GitHub (opción A: GitHub CLI):"
echo "   gh repo create figus-uy --private --source=. --remote=origin"
echo "   git push -u origin develop"
echo "   git push origin main"
echo ""
echo "   Opción B (manual): crear repo vacío en github.com/new y:"
echo "   git remote add origin git@github.com:USUARIO/figus-uy.git"
echo "   git push -u origin develop"
echo "   git push origin main"
echo ""
echo "3. En GitHub Settings → Branches:"
echo "   - Default branch: develop"
echo "   - Branch protection para develop y main (ver SETUP_INSTRUCTIONS.md)"
echo ""
echo "4. Abrir WebStorm: File → Open → seleccionar esta carpeta"
echo "   La config de .idea/ se aplica automáticamente."
echo ""
echo "5. Instalar dependencies cuando esté el package.json definitivo:"
echo "   pnpm install"
echo ""
