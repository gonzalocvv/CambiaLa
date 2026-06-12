import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockRepo = vi.hoisted(() => ({
  create: vi.fn(),
  findByUserId: vi.fn(),
  countByUserId: vi.fn(),
  countUnreadByUserId: vi.fn(),
  findById: vi.fn(),
  markRead: vi.fn(),
}));

const mockUserRepo = vi.hoisted(() => ({
  findEmailRecipient: vi.fn(),
  updateNotifications: vi.fn(),
  findUsersForMatchDigest: vi.fn(),
  findById: vi.fn().mockResolvedValue({ emailFrequency: 'instant' }),
}));

const mockEmailService = vi.hoisted(() => ({
  sendEmail: vi.fn(),
}));

// RF-307: el cliente Inngest se usa en createNotification para encolar el email async.
const mockInngest = vi.hoisted(() => ({
  send: vi.fn().mockResolvedValue(undefined),
}));

const mockLogger = vi.hoisted(() => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@/repositories/notification.repository', () => ({
  notificationRepository: mockRepo,
}));
vi.mock('@/repositories/user.repository', () => ({ userRepository: mockUserRepo }));
vi.mock('@/services/email.service', () => ({ emailService: mockEmailService }));
vi.mock('@/inngest/client', () => ({ inngest: mockInngest }));
vi.mock('@/lib/logger', () => ({ logger: mockLogger }));

import { signResubscribeToken, signUnsubscribeToken } from '@/lib/email/unsubscribe';

import { notificationService } from '../notification.service';

const NOW = new Date('2026-06-01T12:00:00Z');
const NOW_ISO = NOW.toISOString();
const ORIGINAL_SECRET = process.env.UNSUBSCRIBE_SECRET;
const ORIGINAL_BASE = process.env.NEXT_PUBLIC_BASE_URL;

function makeDbNotification(overrides: object = {}) {
  return {
    id: 'notif-1',
    userId: 'user-a',
    type: 'new_match',
    payload: { matchId: 'match-1' },
    readAt: null,
    createdAt: NOW,
    ...overrides,
  };
}

function makeRecipient(overrides: object = {}) {
  return {
    id: 'user-a',
    email: 'gonza@example.com',
    name: 'Gonza',
    username: 'gonza',
    emailFrequency: 'instant',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.UNSUBSCRIBE_SECRET = 'test-secret';
  process.env.NEXT_PUBLIC_BASE_URL = 'https://cambia-la.vercel.app';
  mockRepo.create.mockResolvedValue(makeDbNotification());
  mockUserRepo.findEmailRecipient.mockResolvedValue(makeRecipient());
  mockEmailService.sendEmail.mockResolvedValue(undefined);
  mockInngest.send.mockResolvedValue(undefined);
});

afterEach(() => {
  process.env.UNSUBSCRIBE_SECRET = ORIGINAL_SECRET;
  process.env.NEXT_PUBLIC_BASE_URL = ORIGINAL_BASE;
});

describe('notificationService.createNotification', () => {
  it('creates the in-app notification and returns a NotificationItem', async () => {
    const result = await notificationService.createNotification('user-a', 'new_match', {
      matchId: 'match-1',
    });

    expect(mockRepo.create).toHaveBeenCalledWith({
      userId: 'user-a',
      type: 'new_match',
      payload: { matchId: 'match-1' },
    });
    expect(result.id).toBe('notif-1');
    expect(result.type).toBe('new_match');
    expect(result.readAt).toBeNull();
    expect(result.createdAt).toBe(NOW_ISO);
  });

  // RF-307: createNotification ya no llama emailService directamente; en su lugar encola
  // el evento 'notification/email' en Inngest para que el email ocurra fuera del request.
  it('enqueues notification/email Inngest event for an emailable type', async () => {
    await notificationService.createNotification('user-a', 'new_match', { matchId: 'match-1' });

    expect(mockInngest.send).toHaveBeenCalledOnce();
    expect(mockInngest.send).toHaveBeenCalledWith({
      name: 'notification/email',
      data: { userId: 'user-a', type: 'new_match', payload: { matchId: 'match-1' } },
    });
  });

  it('does NOT enqueue for a non-emailable type', async () => {
    await notificationService.createNotification('user-a', 'trade_completed', { matchId: 'm1' });
    expect(mockInngest.send).not.toHaveBeenCalled();
  });

  it('swallows inngest.send failure (logs it) but still returns the notification', async () => {
    mockInngest.send.mockRejectedValue(new Error('inngest down'));

    const result = await notificationService.createNotification('user-a', 'new_match', {
      matchId: 'match-1',
    });

    expect(result.id).toBe('notif-1');
    expect(mockLogger.error).toHaveBeenCalledWith(
      'inngest send notification/email failed',
      expect.objectContaining({ userId: 'user-a', type: 'new_match', error: 'inngest down' }),
    );
  });
});

// RF-307: maybeSendEmail es llamado por la función Inngest 'notification-email'.
// Estos tests verifican el gating de emailFrequency, el build del template y el envío real.
describe('notificationService.maybeSendEmail', () => {
  it('sends email when emailFrequency is instant', async () => {
    await notificationService.maybeSendEmail('user-a', 'new_match', { matchId: 'match-1' });

    expect(mockEmailService.sendEmail).toHaveBeenCalledOnce();
    const arg = mockEmailService.sendEmail.mock.calls[0][0];
    expect(arg.to).toBe('gonza@example.com');
    expect(arg.subject).toContain('match');
    expect(arg.html).toContain('cambia-la.vercel.app/matches/match-1');
    expect(arg.html).toContain('/api/unsubscribe?token=');
    expect(arg.text).toContain('https://cambia-la.vercel.app');
  });

  it('does NOT send when emailFrequency is never', async () => {
    mockUserRepo.findEmailRecipient.mockResolvedValue(makeRecipient({ emailFrequency: 'never' }));
    await notificationService.maybeSendEmail('user-a', 'new_match', { matchId: 'match-1' });
    expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
  });

  it('does NOT send when emailFrequency is daily or weekly (digest handles these)', async () => {
    mockUserRepo.findEmailRecipient.mockResolvedValue(makeRecipient({ emailFrequency: 'daily' }));
    await notificationService.maybeSendEmail('user-a', 'new_match', { matchId: 'match-1' });
    expect(mockEmailService.sendEmail).not.toHaveBeenCalled();

    mockUserRepo.findEmailRecipient.mockResolvedValue(makeRecipient({ emailFrequency: 'weekly' }));
    await notificationService.maybeSendEmail('user-a', 'new_match', { matchId: 'match-1' });
    expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
  });

  it('does NOT send when the recipient has no email', async () => {
    mockUserRepo.findEmailRecipient.mockResolvedValue(makeRecipient({ email: null }));
    await notificationService.maybeSendEmail('user-a', 'rating_received', { stars: 5 });
    expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
  });

  it('swallows an email failure (logs it) without throwing', async () => {
    mockEmailService.sendEmail.mockRejectedValue(new Error('resend down'));

    // should not throw
    await expect(
      notificationService.maybeSendEmail('user-a', 'new_match', { matchId: 'match-1' }),
    ).resolves.toBeUndefined();

    expect(mockLogger.error).toHaveBeenCalledWith(
      'notification email failed',
      expect.objectContaining({ userId: 'user-a', type: 'new_match', error: 'resend down' }),
    );
  });

  it('routes rating_received CTA to the profile by username', async () => {
    await notificationService.maybeSendEmail('user-a', 'rating_received', { stars: 4 });
    const arg = mockEmailService.sendEmail.mock.calls[0][0];
    expect(arg.html).toContain('cambia-la.vercel.app/u/gonza');
  });

  it('skips (fail-safe) when NEXT_PUBLIC_BASE_URL is unset', async () => {
    delete process.env.NEXT_PUBLIC_BASE_URL;
    await notificationService.maybeSendEmail('user-a', 'new_match', { matchId: 'match-1' });
    expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'email skipped: NEXT_PUBLIC_BASE_URL not set',
      expect.objectContaining({ type: 'new_match' }),
    );
  });

  it('skips (fail-safe) when UNSUBSCRIBE_SECRET is unset', async () => {
    delete process.env.UNSUBSCRIBE_SECRET;

    await notificationService.maybeSendEmail('user-a', 'new_match', { matchId: 'match-1' });

    expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalledWith(
      'notification email failed',
      expect.objectContaining({
        userId: 'user-a',
        type: 'new_match',
        error: 'UNSUBSCRIBE_SECRET is not set',
      }),
    );
  });
});

describe('notificationService.sendMatchDigest', () => {
  it('calls emailService for each user with unread match notifications', async () => {
    mockUserRepo.findUsersForMatchDigest.mockResolvedValue([
      { id: 'u1', email: 'a@x.com', name: 'Ana', username: 'ana', matchCount: 3 },
      { id: 'u2', email: 'b@x.com', name: null, username: 'bob', matchCount: 1 },
    ]);

    const result = await notificationService.sendMatchDigest('daily', 'https://cambiala.uy');

    expect(mockEmailService.sendEmail).toHaveBeenCalledTimes(2);
    const firstCall = mockEmailService.sendEmail.mock.calls[0][0];
    expect(firstCall.to).toBe('a@x.com');
    expect(firstCall.subject).toContain('3');
    expect(result.sent).toBe(2);
  });

  it('returns sent=0 when no users need digest', async () => {
    mockUserRepo.findUsersForMatchDigest.mockResolvedValue([]);
    const result = await notificationService.sendMatchDigest('weekly', 'https://cambiala.uy');
    expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
    expect(result.sent).toBe(0);
  });

  it('logs errors per user and keeps sending to others', async () => {
    mockUserRepo.findUsersForMatchDigest.mockResolvedValue([
      { id: 'u1', email: 'a@x.com', name: 'Ana', username: 'ana', matchCount: 2 },
      { id: 'u2', email: 'b@x.com', name: null, username: 'bob', matchCount: 1 },
    ]);
    mockEmailService.sendEmail
      .mockRejectedValueOnce(new Error('bounce'))
      .mockResolvedValueOnce(undefined);

    const result = await notificationService.sendMatchDigest('daily', 'https://cambiala.uy');

    expect(result.sent).toBe(1);
    expect(mockLogger.error).toHaveBeenCalledWith(
      'digest email failed',
      expect.objectContaining({ userId: 'u1', error: 'bounce' }),
    );
  });
});

describe('notificationService.unsubscribeByToken', () => {
  it('sets emailFrequency=never and returns prevFreq for a valid token', async () => {
    mockUserRepo.findById.mockResolvedValue({ emailFrequency: 'weekly' });
    const token = signUnsubscribeToken('user-z');
    const result = await notificationService.unsubscribeByToken(token);
    expect(result).toEqual({ ok: true, prevFreq: 'weekly' });
    expect(mockUserRepo.updateNotifications).toHaveBeenCalledWith('user-z', {
      emailFrequency: 'never',
    });
  });

  it('returns {ok:false} and mutates nothing for an invalid token', async () => {
    const result = await notificationService.unsubscribeByToken('user-z.deadbeef');
    expect(result).toEqual({ ok: false });
    expect(mockUserRepo.updateNotifications).not.toHaveBeenCalled();
  });

  it('returns {ok:false} (graceful, no throw) when the update fails — e.g. deleted user', async () => {
    const token = signUnsubscribeToken('ghost');
    mockUserRepo.updateNotifications.mockRejectedValueOnce(new Error('Record not found'));

    const result = await notificationService.unsubscribeByToken(token);

    expect(result).toEqual({ ok: false });
    expect(mockLogger.error).toHaveBeenCalledWith(
      'unsubscribe update failed',
      expect.objectContaining({ error: 'Record not found' }),
    );
  });
});

describe('notificationService.resubscribeByToken', () => {
  it('restores the previous emailFrequency for a valid resubscribe token', async () => {
    const token = signResubscribeToken('user-z', 'daily');
    const ok = await notificationService.resubscribeByToken(token);
    expect(ok).toBe(true);
    expect(mockUserRepo.updateNotifications).toHaveBeenCalledWith('user-z', {
      emailFrequency: 'daily',
    });
  });

  it('returns false for an invalid resubscribe token', async () => {
    const ok = await notificationService.resubscribeByToken('bad.token');
    expect(ok).toBe(false);
    expect(mockUserRepo.updateNotifications).not.toHaveBeenCalled();
  });

  it('returns false (graceful) when the update fails', async () => {
    const token = signResubscribeToken('ghost', 'weekly');
    mockUserRepo.updateNotifications.mockRejectedValueOnce(new Error('User gone'));
    const ok = await notificationService.resubscribeByToken(token);
    expect(ok).toBe(false);
    expect(mockLogger.error).toHaveBeenCalledWith(
      'resubscribe update failed',
      expect.objectContaining({ error: 'User gone' }),
    );
  });
});

describe('notificationService.getNotificationsForUser', () => {
  it('returns paginated notifications with total and unreadCount', async () => {
    const notifications = [makeDbNotification(), makeDbNotification({ id: 'notif-2' })];
    mockRepo.findByUserId.mockResolvedValue(notifications);
    mockRepo.countByUserId.mockResolvedValue(10);
    mockRepo.countUnreadByUserId.mockResolvedValue(4);

    const result = await notificationService.getNotificationsForUser('user-a', 1, 20);

    expect(mockRepo.findByUserId).toHaveBeenCalledWith('user-a', 0, 20);
    expect(mockRepo.countByUserId).toHaveBeenCalledWith('user-a');
    expect(mockRepo.countUnreadByUserId).toHaveBeenCalledWith('user-a');
    expect(result.notifications).toHaveLength(2);
    expect(result.total).toBe(10);
    expect(result.unreadCount).toBe(4);
  });

  it('calculates skip correctly for page > 1', async () => {
    mockRepo.findByUserId.mockResolvedValue([]);
    mockRepo.countByUserId.mockResolvedValue(0);
    mockRepo.countUnreadByUserId.mockResolvedValue(0);

    await notificationService.getNotificationsForUser('user-a', 3, 10);
    expect(mockRepo.findByUserId).toHaveBeenCalledWith('user-a', 20, 10);
  });
});

describe('notificationService.markNotificationRead', () => {
  it('returns null when notification is not found', async () => {
    mockRepo.findById.mockResolvedValue(null);
    const result = await notificationService.markNotificationRead('notif-x', 'user-a');
    expect(result).toBeNull();
    expect(mockRepo.markRead).not.toHaveBeenCalled();
  });

  it('returns null when notification belongs to a different user', async () => {
    mockRepo.findById.mockResolvedValue(makeDbNotification({ userId: 'user-b' }));
    const result = await notificationService.markNotificationRead('notif-1', 'user-a');
    expect(result).toBeNull();
    expect(mockRepo.markRead).not.toHaveBeenCalled();
  });

  it('returns current state without calling markRead when already read', async () => {
    const db = makeDbNotification({ readAt: NOW });
    mockRepo.findById.mockResolvedValue(db);

    const result = await notificationService.markNotificationRead('notif-1', 'user-a');

    expect(mockRepo.markRead).not.toHaveBeenCalled();
    expect(result).not.toBeNull();
    expect(result!.readAt).toBe(NOW_ISO);
  });

  it('marks unread notification as read and returns updated item', async () => {
    const unread = makeDbNotification();
    const read = makeDbNotification({ readAt: NOW });
    mockRepo.findById.mockResolvedValue(unread);
    mockRepo.markRead.mockResolvedValue(read);

    const result = await notificationService.markNotificationRead('notif-1', 'user-a');

    expect(mockRepo.markRead).toHaveBeenCalledWith('notif-1');
    expect(result).not.toBeNull();
    expect(result!.readAt).toBe(NOW_ISO);
  });
});
