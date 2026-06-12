import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetTranslations = vi.hoisted(() => vi.fn(async () => (key: string) => key));

vi.mock('next-intl/server', () => ({ getTranslations: mockGetTranslations }));
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => React.createElement('a', { href, className }, children),
}));

import NotFound from '../not-found';

beforeEach(() => vi.clearAllMocks());

describe('NotFound', () => {
  it('renderiza el título 404 y el subtítulo', async () => {
    const el = await NotFound();
    const html = renderToStaticMarkup(el as React.ReactElement);
    expect(html).toContain('notFoundTitle');
    expect(html).toContain('notFoundSubtitle');
  });

  it('tiene CTA que lleva a /album', async () => {
    const el = await NotFound();
    const html = renderToStaticMarkup(el as React.ReactElement);
    expect(html).toContain('href="/album"');
  });

  it('tiene CTA alternativo que lleva a /', async () => {
    const el = await NotFound();
    const html = renderToStaticMarkup(el as React.ReactElement);
    expect(html).toContain('href="/"');
  });

  it('solicita el namespace ErrorPages', async () => {
    await NotFound();
    expect(mockGetTranslations).toHaveBeenCalledWith('ErrorPages');
  });
});
