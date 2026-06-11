import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const path = vi.hoisted(() => ({ current: '/album' }));

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('next/navigation', () => ({ usePathname: () => path.current }));
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
    'aria-current': ariaCurrent,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
    'aria-current'?: string;
  }) => React.createElement('a', { href, className, 'aria-current': ariaCurrent }, children),
}));

import { BottomTabBar, isActive } from '../bottom-tab-bar';

describe('isActive (RF-824)', () => {
  it('marca activo el href exacto', () => {
    expect(isActive('/matches', '/matches')).toBe(true);
    expect(isActive('/album', '/album')).toBe(true);
  });

  it('marca activo en una sub-ruta del tab', () => {
    expect(isActive('/matches/123', '/matches')).toBe(true);
    expect(isActive('/conversations/abc', '/conversations')).toBe(true);
  });

  it('no marca activo otro tab', () => {
    expect(isActive('/album', '/matches')).toBe(false);
    expect(isActive('/matches/123', '/album')).toBe(false);
  });

  it('no confunde prefijos parciales (/match vs /matches)', () => {
    expect(isActive('/matchesfoo', '/matches')).toBe(false);
  });
});

describe('BottomTabBar', () => {
  it('renderiza los 4 tabs', () => {
    path.current = '/album';
    const html = renderToStaticMarkup(React.createElement(BottomTabBar));
    expect(html).toContain('href="/album"');
    expect(html).toContain('href="/matches"');
    expect(html).toContain('href="/conversations"');
    expect(html).toContain('href="/settings"');
  });

  it('resalta solo el tab de la ruta actual (incluida sub-ruta)', () => {
    path.current = '/matches/123';
    const html = renderToStaticMarkup(React.createElement(BottomTabBar));
    // exactamente un tab activo
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    // y es el de matches
    expect(html).toMatch(/href="\/matches"[^>]*aria-current="page"/);
  });
});
