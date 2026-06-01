import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPrisma = vi.hoisted(() => ({
  message: {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { messageRepository } from '../message.repository';

const NOW = new Date('2026-06-01T12:00:00Z');

function makeMessage(overrides = {}) {
  return {
    id: 'msg-1',
    matchId: 'match-1',
    fromUserId: 'user-a',
    body: 'Hola',
    createdAt: NOW,
    readAt: null,
    ...overrides,
  };
}

beforeEach(() => vi.clearAllMocks());

describe('messageRepository.create', () => {
  it('creates a message with the given fields', async () => {
    const msg = makeMessage();
    mockPrisma.message.create.mockResolvedValue(msg);

    const result = await messageRepository.create('match-1', 'user-a', 'Hola');

    expect(mockPrisma.message.create).toHaveBeenCalledWith({
      data: { matchId: 'match-1', fromUserId: 'user-a', body: 'Hola' },
    });
    expect(result.id).toBe('msg-1');
  });
});

describe('messageRepository.findByMatch', () => {
  it('returns messages ordered by createdAt asc', async () => {
    const msgs = [makeMessage(), makeMessage({ id: 'msg-2', body: 'Hola de nuevo' })];
    mockPrisma.message.findMany.mockResolvedValue(msgs);

    const result = await messageRepository.findByMatch('match-1');

    expect(mockPrisma.message.findMany).toHaveBeenCalledWith({
      where: { matchId: 'match-1' },
      orderBy: { createdAt: 'asc' },
    });
    expect(result).toHaveLength(2);
  });

  it('returns empty array when no messages', async () => {
    mockPrisma.message.findMany.mockResolvedValue([]);

    const result = await messageRepository.findByMatch('match-empty');

    expect(result).toHaveLength(0);
  });
});

describe('messageRepository.countByMatch', () => {
  it('returns message count for a match', async () => {
    mockPrisma.message.count.mockResolvedValue(5);

    const result = await messageRepository.countByMatch('match-1');

    expect(result).toBe(5);
    expect(mockPrisma.message.count).toHaveBeenCalledWith({ where: { matchId: 'match-1' } });
  });
});
