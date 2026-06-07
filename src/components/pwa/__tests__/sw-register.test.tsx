// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SwRegister } from '../sw-register';

describe('SwRegister', () => {
  let originalSW: ServiceWorkerContainer | undefined;

  beforeEach(() => {
    originalSW = navigator.serviceWorker;
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: originalSW,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  it('renderiza null (sin nodo en el DOM)', () => {
    const { container } = render(<SwRegister />);
    expect(container.firstChild).toBeNull();
  });

  it('registra /sw.js cuando serviceWorker está disponible', async () => {
    const register = vi.fn().mockResolvedValue({} as ServiceWorkerRegistration);
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { register },
      configurable: true,
    });

    render(<SwRegister />);

    await vi.waitFor(() => {
      expect(register).toHaveBeenCalledWith('/sw.js');
    });
  });

  it('no lanza cuando serviceWorker no está disponible', () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: undefined,
      configurable: true,
    });

    expect(() => render(<SwRegister />)).not.toThrow();
  });
});
