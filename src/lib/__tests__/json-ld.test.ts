import { describe, expect, it } from 'vitest';
import {
  buildWebSiteJsonLd,
  buildOrganizationJsonLd,
  buildPersonJsonLd,
  toJsonLdString,
} from '@/lib/json-ld';

const BASE = 'https://cambia-la.vercel.app';

describe('buildWebSiteJsonLd', () => {
  it('devuelve type WebSite con url y potentialAction', () => {
    const result = buildWebSiteJsonLd(BASE);
    expect(result['@type']).toBe('WebSite');
    expect(result.name).toBe('CambiaLa');
    expect(result.url).toBe(BASE);
    expect(result.potentialAction).toBeDefined();
  });

  it('el target de la SearchAction apunta a /u/{username}', () => {
    const result = buildWebSiteJsonLd(BASE);
    const action = result.potentialAction as Record<string, string>;
    expect(action.target).toContain('/u/{username}');
  });
});

describe('buildOrganizationJsonLd', () => {
  it('devuelve type Organization con nombre y url', () => {
    const result = buildOrganizationJsonLd(BASE);
    expect(result['@type']).toBe('Organization');
    expect(result.name).toBe('CambiaLa');
    expect(result.url).toBe(BASE);
    expect(typeof result.description).toBe('string');
  });
});

describe('buildPersonJsonLd', () => {
  it('construye Person con todos los campos', () => {
    const result = buildPersonJsonLd({
      username: 'juan',
      name: 'Juan Pérez',
      bio: 'Mi bio',
      city: 'Montevideo',
      baseUrl: BASE,
    });
    expect(result['@type']).toBe('Person');
    expect(result.name).toBe('Juan Pérez');
    expect(result.url).toBe(`${BASE}/u/juan`);
    expect(result.description).toBe('Mi bio');
    const addr = result.address as Record<string, string>;
    expect(addr.addressLocality).toBe('Montevideo');
    expect(addr.addressCountry).toBe('UY');
  });

  it('omite description y address cuando no se proveen', () => {
    const result = buildPersonJsonLd({ username: 'ana', name: 'Ana', baseUrl: BASE });
    expect(result['@type']).toBe('Person');
    expect(result.description).toBeUndefined();
    expect(result.address).toBeUndefined();
  });

  it('omite description si bio es null', () => {
    const result = buildPersonJsonLd({ username: 'pepe', name: 'Pepe', bio: null, baseUrl: BASE });
    expect(result.description).toBeUndefined();
  });
});

describe('toJsonLdString', () => {
  it('serializa un objeto a JSON válido', () => {
    const data = { '@type': 'WebSite', name: 'CambiaLa' };
    const str = toJsonLdString(data);
    expect(() => JSON.parse(str)).not.toThrow();
    expect(JSON.parse(str).name).toBe('CambiaLa');
  });

  it('escapa < > & para prevenir inyección en script tag', () => {
    const data = { description: '</script><script>alert(1)</script>' };
    const str = toJsonLdString(data);
    expect(str).not.toContain('</script>');
    expect(str).not.toContain('<script>');
    // sigue siendo parseable
    expect(() => JSON.parse(str)).not.toThrow();
  });

  it('escapa & en valores de usuario', () => {
    const data = { name: 'Tom & Jerry' };
    const str = toJsonLdString(data);
    expect(str).not.toContain('&');
    expect(JSON.parse(str).name).toBe('Tom & Jerry');
  });
});
