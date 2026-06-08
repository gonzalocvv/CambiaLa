import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import { basename } from 'path';

// Next.js file-system routing reserves these names — exempt from kebab-case rule.
const NEXT_RESERVED = new Set([
  'page',
  'layout',
  'loading',
  'error',
  'not-found',
  'global-error',
  'route',
  'middleware',
  'manifest',
  'icon',
  'apple-icon',
  'instrumentation',
  'template',
  'default',
  'sitemap',
  'robots',
  'opengraph-image',
  'twitter-image',
  'sw',
  'globals',
]);

// Inline rule — no extra dependency.
const kebabCaseFilenameRule = {
  meta: {
    type: 'suggestion',
    messages: { notKebab: 'Filename "{{name}}" must use kebab-case (§9).' },
  },
  create(context) {
    return {
      Program() {
        const raw = basename(context.filename);
        // Strip .test/.spec and extensions to get the stem.
        const stem = raw.replace(/\.(?:test|spec)\.(?:[jt]sx?)$/, '').replace(/\.(?:[jt]sx?)$/, '');
        if (NEXT_RESERVED.has(stem)) return;
        if (/[A-Z]/.test(stem)) {
          context.report({
            loc: { line: 1, column: 0 },
            messageId: 'notKebab',
            data: { name: raw },
          });
        }
      },
    };
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Generated directories:
    'coverage/**',
  ]),
  {
    rules: {
      // Use logger from @/lib/logger instead of console.log.
      'no-console': ['error', { allow: ['warn', 'error', 'info', 'debug'] }],
    },
  },
  {
    // Enforce kebab-case filenames for all TS/TSX source files (§9).
    files: ['src/**/*.{ts,tsx}'],
    plugins: { local: { rules: { 'kebab-case-filename': kebabCaseFilenameRule } } },
    rules: { 'local/kebab-case-filename': 'error' },
  },
]);

export default eslintConfig;
