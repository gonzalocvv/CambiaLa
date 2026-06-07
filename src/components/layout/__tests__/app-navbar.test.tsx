import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetTranslations = vi.hoisted(() => vi.fn(async () => (key: string) => key));
const mockGetSession = vi.hoisted(() =>
  vi.fn(async () => ({
    userId: 'user-1',
    email: 'test@example.com',
    onboardingDoneAt: new Date(),
  })),
);
const mockGetNotificationsForUser = vi.hoisted(() =>
  vi.fn(async () => ({ unreadCount: 0, notifications: [], total: 0 })),
);

vi.mock('next-intl/server', () => ({ getTranslations: mockGetTranslations }));
vi.mock('@/lib/auth', () => ({ getSession: mockGetSession }));
vi.mock('@/services/notification.service', () => ({
  notificationService: { getNotificationsForUser: mockGetNotificationsForUser },
}));
vi.mock('@/components/notifications/notification-bell', () => ({
  NotificationBell: () => null,
}));
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
    'aria-label': ariaLabel,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
    'aria-label'?: string;
  }) => React.createElement('a', { href, className, 'aria-label': ariaLabel }, children),
}));

import { AppNavbar } from '../app-navbar';

beforeEach(() => vi.clearAllMocks());

describe('AppNavbar', () => {
  it('el wordmark navega a /album (RF-121)', async () => {
    const element = await AppNavbar();
    const html = renderToStaticMarkup(element as React.ReactElement);
    // The logo link must point to /album, not to the landing /
    expect(html).toContain('href="/album"');
    expect(html).not.toContain('href="/"');
  });
});
