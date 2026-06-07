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
            'src/app/album/**',
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
            'src/app/album/**/*.{test,spec}.{ts,tsx}',
          ],
        },
      },
    ],
  },
});
