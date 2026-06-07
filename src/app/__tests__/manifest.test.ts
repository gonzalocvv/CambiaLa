import { describe, expect, it } from 'vitest';

import manifest from '../manifest';

describe('manifest()', () => {
  const m = manifest();

  it('tiene los campos requeridos por la spec PWA', () => {
    expect(m.name).toBeTruthy();
    expect(m.short_name).toBeTruthy();
    expect(m.start_url).toBe('/album');
    expect(m.display).toBe('standalone');
    expect(m.background_color).toBeTruthy();
    expect(m.theme_color).toBeTruthy();
  });

  it('tiene al menos un ícono de 192x192', () => {
    const sizes = m.icons?.map((i) => i.sizes) ?? [];
    expect(sizes).toContain('192x192');
  });

  it('los íconos tienen src y type definidos', () => {
    expect(m.icons?.length).toBeGreaterThan(0);
    m.icons?.forEach((icon) => {
      expect(icon.src).toBeTruthy();
      expect(icon.type).toBeTruthy();
    });
  });

  it('el tema usa el celeste de marca', () => {
    expect(m.theme_color).toBe('#0284c7');
    expect(m.background_color).toBe('#ffffff');
  });

  it('el idioma es español', () => {
    expect(m.lang).toBe('es');
  });

  it('el short_name es CambiaLa', () => {
    expect(m.short_name).toBe('CambiaLa');
  });
});
