import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRepo = vi.hoisted(() => ({
  create: vi.fn(),
  findByUserId: vi.fn(),
  countByUserId: vi.fn(),
  countUnreadByUserId: vi.fn(),
  findById: vi.fn(),
  markRead: vi.fn(),
}));

vi.mock('@/repositories/notification.repository', () => ({
  notificationRepository: mockRepo,
}));

import { notificationService } from '../notification.service';

const NOW = new Date('2026-06-01T12:00:00Z');
const NOW_ISO = NOW.toISOString();

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

beforeEach(() => vi.clearAllMocks());

describe('notificationService.createNotification', () => {
  it('delegates to repository and returns a NotificationItem', async () => {
    mockRepo.create.mockResolvedValue(makeDbNotification());

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
