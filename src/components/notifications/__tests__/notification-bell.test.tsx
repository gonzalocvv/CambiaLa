import { fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/test/render-intl';

import { NotificationBell } from '../notification-bell';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ notifications: [], unreadCount: 0 }),
    }),
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function getBellButton() {
  return screen.getByRole('button', { name: /notificaciones/i });
}

describe('NotificationBell — aria y teclado (RF-337)', () => {
  it('el botón-campana tiene aria-haspopup="menu"', () => {
    renderWithIntl(<NotificationBell initialUnreadCount={0} />);
    expect(getBellButton()).toHaveAttribute('aria-haspopup', 'menu');
  });

  it('aria-expanded es "false" cuando el dropdown está cerrado', () => {
    renderWithIntl(<NotificationBell initialUnreadCount={0} />);
    expect(getBellButton()).toHaveAttribute('aria-expanded', 'false');
  });

  it('aria-expanded es "true" tras abrir el dropdown', () => {
    renderWithIntl(<NotificationBell initialUnreadCount={0} />);
    fireEvent.click(getBellButton());
    expect(getBellButton()).toHaveAttribute('aria-expanded', 'true');
  });

  it('Escape cierra el dropdown (aria-expanded vuelve a "false")', () => {
    renderWithIntl(<NotificationBell initialUnreadCount={0} />);
    fireEvent.click(getBellButton());
    expect(getBellButton()).toHaveAttribute('aria-expanded', 'true');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(getBellButton()).toHaveAttribute('aria-expanded', 'false');
  });

  it('Escape devuelve el foco al botón-campana', () => {
    renderWithIntl(<NotificationBell initialUnreadCount={0} />);
    const btn = getBellButton();
    fireEvent.click(btn);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.activeElement).toBe(btn);
  });
});
