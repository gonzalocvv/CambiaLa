import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseTranslations = vi.hoisted(() => vi.fn(() => (key: string) => key));

vi.mock('next-intl', () => ({ useTranslations: mockUseTranslations }));
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

import ErrorPage from '../error';

beforeEach(() => vi.clearAllMocks());

describe('ErrorPage', () => {
  const defaultProps = { error: new Error('test error'), reset: vi.fn() };

  it('renderiza el título y subtítulo de error', () => {
    const html = renderToStaticMarkup(React.createElement(ErrorPage, defaultProps));
    expect(html).toContain('errorTitle');
    expect(html).toContain('errorSubtitle');
  });

  it('tiene botón de reintentar', () => {
    const html = renderToStaticMarkup(React.createElement(ErrorPage, defaultProps));
    expect(html).toContain('errorRetry');
  });

  it('tiene CTA que lleva al inicio (/)', () => {
    const html = renderToStaticMarkup(React.createElement(ErrorPage, defaultProps));
    expect(html).toContain('href="/"');
  });

  it('usa el namespace ErrorPages', () => {
    renderToStaticMarkup(React.createElement(ErrorPage, defaultProps));
    expect(mockUseTranslations).toHaveBeenCalledWith('ErrorPages');
  });
});
