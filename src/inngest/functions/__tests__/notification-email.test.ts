import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockNotificationService = vi.hoisted(() => ({
  maybeSendEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/services/notification.service', () => ({
  notificationService: mockNotificationService,
}));
vi.mock('@/inngest/client', () => ({ inngest: { createFunction: vi.fn() } }));

import { handleNotificationEmail } from '../notification-email';

const ORIGINAL_SECRET = process.env.UNSUBSCRIBE_SECRET;
const ORIGINAL_BASE = process.env.NEXT_PUBLIC_BASE_URL;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.UNSUBSCRIBE_SECRET = 'test-secret';
  process.env.NEXT_PUBLIC_BASE_URL = 'https://cambia-la.vercel.app';
});

afterEach(() => {
  process.env.UNSUBSCRIBE_SECRET = ORIGINAL_SECRET;
  process.env.NEXT_PUBLIC_BASE_URL = ORIGINAL_BASE;
});

describe('handleNotificationEmail', () => {
  it('calls maybeSendEmail with the event data', async () => {
    await handleNotificationEmail({
      userId: 'user-a',
      type: 'new_match',
      payload: { matchId: 'match-1' },
    });

    expect(mockNotificationService.maybeSendEmail).toHaveBeenCalledOnce();
    expect(mockNotificationService.maybeSendEmail).toHaveBeenCalledWith('user-a', 'new_match', {
      matchId: 'match-1',
    });
  });

  it('propagates errors so Inngest can retry', async () => {
    mockNotificationService.maybeSendEmail.mockRejectedValue(new Error('mail down'));
    await expect(
      handleNotificationEmail({ userId: 'u', type: 'new_match', payload: {} }),
    ).rejects.toThrow('mail down');
  });
});
