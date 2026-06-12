import { fileURLToPath, URL } from 'url';

import { defineConfig } from 'vitest/config';

const alias = { '@': fileURLToPath(new URL('./src', import.meta.url)) };

// Dos proyectos: la mayoría de los tests (servicios/repos/lib) corren en `node`;
// los render tests de componentes de landing corren en `jsdom`. Se mantienen
// separados para no cargar el setup de jsdom (cleanup del DOM) en los tests node.
export default defineConfig({
  resolve: { alias },
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/types/**',
        'src/test/**',
        'src/**/*.d.ts',
        '**/__tests__/**',
        '**/*.{test,spec}.{ts,tsx}',
      ],
      thresholds: {
        'src/lib/match-engine.ts': {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
      },
    },
    projects: [
      {
        resolve: { alias },
        test: {
          name: 'node',
          environment: 'node',
          include: ['src/**/*.{test,spec}.{ts,tsx}'],
          exclude: [
            'src/components/landing/**',
            'src/components/pwa/**',
            'src/components/notifications/**',
            'src/components/album/**',
            'src/app/album/**',
            'src/app/auth/**',
            'src/components/chat/**',
            'e2e/**',
            'scripts/**',
            '**/node_modules/**',
          ],
        },
      },
      {
        resolve: { alias },
        test: {
          name: 'dom',
          environment: 'jsdom',
          setupFiles: ['./src/test/setup.ts'],
          include: [
            'src/components/landing/**/*.{test,spec}.{ts,tsx}',
            'src/components/pwa/**/*.{test,spec}.{ts,tsx}',
            'src/components/notifications/**/*.{test,spec}.{ts,tsx}',
            'src/components/album/**/*.{test,spec}.{ts,tsx}',
            'src/app/album/**/*.{test,spec}.{ts,tsx}',
            'src/app/auth/**/*.{test,spec}.{ts,tsx}',
            'src/components/chat/**/*.{test,spec}.{ts,tsx}',
          ],
        },
      },
    ],
  },
});
