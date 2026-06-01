import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockNotificationPrisma = vi.hoisted(() => ({
  create: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: { notification: mockNotificationPrisma },
}));

import { notificationRepository } from '../notification.repository';

const NOW = new Date('2026-06-01T12:00:00Z');

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

describe('notificationRepository.create', () => {
  it('creates a notification with the given data', async () => {
    const db = makeDbNotification();
    mockNotificationPrisma.create.mockResolvedValue(db);

    const result = await notificationRepository.create({
      userId: 'user-a',
      type: 'new_match',
      payload: { matchId: 'match-1' },
    });

    expect(mockNotificationPrisma.create).toHaveBeenCalledWith({
      data: { userId: 'user-a', type: 'new_match', payload: { matchId: 'match-1' } },
    });
    expect(result).toEqual(db);
  });
});

describe('notificationRepository.findByUserId', () => {
  it('queries by userId with skip/take ordered by createdAt desc', async () => {
    const notifications = [makeDbNotification(), makeDbNotification({ id: 'notif-2' })];
    mockNotificationPrisma.findMany.mockResolvedValue(notifications);

    const result = await notificationRepository.findByUserId('user-a', 0, 20);

    expect(mockNotificationPrisma.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-a' },
      orderBy: { createdAt: 'desc' },
      skip: 0,
      take: 20,
    });
    expect(result).toHaveLength(2);
  });

  it('returns empty array when user has no notifications', async () => {
    mockNotificationPrisma.findMany.mockResolvedValue([]);
    const result = await notificationRepository.findByUserId('user-x', 0, 20);
    expect(result).toEqual([]);
  });
});

describe('notificationRepository.countByUserId', () => {
  it('returns the total count for a user', async () => {
    mockNotificationPrisma.count.mockResolvedValue(5);
    const result = await notificationRepository.countByUserId('user-a');
    expect(mockNotificationPrisma.count).toHaveBeenCalledWith({ where: { userId: 'user-a' } });
    expect(result).toBe(5);
  });
});

describe('notificationRepository.countUnreadByUserId', () => {
  it('counts only notifications with readAt null', async () => {
    mockNotificationPrisma.count.mockResolvedValue(3);
    const result = await notificationRepository.countUnreadByUserId('user-a');
    expect(mockNotificationPrisma.count).toHaveBeenCalledWith({
      where: { userId: 'user-a', readAt: null },
    });
    expect(result).toBe(3);
  });
});

describe('notificationRepository.findById', () => {
  it('returns the notification when found', async () => {
    const db = makeDbNotification();
    mockNotificationPrisma.findUnique.mockResolvedValue(db);

    const result = await notificationRepository.findById('notif-1');
    expect(mockNotificationPrisma.findUnique).toHaveBeenCalledWith({ where: { id: 'notif-1' } });
    expect(result).toEqual(db);
  });

  it('returns null when not found', async () => {
    mockNotificationPrisma.findUnique.mockResolvedValue(null);
    const result = await notificationRepository.findById('nonexistent');
    expect(result).toBeNull();
  });
});

describe('notificationRepository.markRead', () => {
  it('sets readAt to the current date', async () => {
    const db = makeDbNotification({ readAt: NOW });
    mockNotificationPrisma.update.mockResolvedValue(db);

    const result = await notificationRepository.markRead('notif-1');

    const call = mockNotificationPrisma.update.mock.calls[0][0];
    expect(call.where).toEqual({ id: 'notif-1' });
    expect(call.data.readAt).toBeInstanceOf(Date);
    expect(result.readAt).toEqual(NOW);
  });
});
