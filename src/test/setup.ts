import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Solo lo carga el proyecto `dom` (jsdom). Desmonta el árbol entre tests.
afterEach(() => {
  cleanup();
});
