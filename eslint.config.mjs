import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

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
]);

export default eslintConfig;
