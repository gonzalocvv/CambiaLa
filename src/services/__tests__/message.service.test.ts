import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockMatchRepo = vi.hoisted(() => ({
  findById: vi.fn(),
}));

const mockMessageRepo = vi.hoisted(() => ({
  create: vi.fn(),
  findByMatch: vi.fn(),
}));

vi.mock('@/repositories/match.repository', () => ({ matchRepository: mockMatchRepo }));
vi.mock('@/repositories/message.repository', () => ({ messageRepository: mockMessageRepo }));

import { MessageAccessError, MatchNotFoundError, messageService } from '../message.service';

const NOW = new Date('2026-06-01T12:00:00Z');

function makeMatch(overrides = {}) {
  return {
    id: 'match-1',
    userAId: 'user-a',
    userBId: 'user-b',
    score: 3,
    aToB: ['URU1'],
    bToA: ['ARG2'],
    status: 'active',
    lastUpdated: NOW,
    createdAt: NOW,
    ...overrides,
  };
}

function makeDbMessage(overrides = {}) {
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

beforeEach(() => {
  vi.clearAllMocks();
});

describe('messageService.getMessages', () => {
  it('returns messages for a participant (user A)', async () => {
    mockMatchRepo.findById.mockResolvedValue(makeMatch());
    mockMessageRepo.findByMatch.mockResolvedValue([makeDbMessage()]);

    const result = await messageService.getMessages('match-1', 'user-a');

    expect(result).toHaveLength(1);
    expect(result[0].body).toBe('Hola');
    expect(result[0].fromUserId).toBe('user-a');
  });

  it('returns messages for a participant (user B)', async () => {
    mockMatchRepo.findById.mockResolvedValue(makeMatch());
    mockMessageRepo.findByMatch.mockResolvedValue([makeDbMessage({ fromUserId: 'user-b' })]);

    const result = await messageService.getMessages('match-1', 'user-b');

    expect(result).toHaveLength(1);
    expect(result[0].fromUserId).toBe('user-b');
  });

  it('throws MatchNotFoundError when match does not exist', async () => {
    mockMatchRepo.findById.mockResolvedValue(null);

    await expect(messageService.getMessages('nonexistent', 'user-a')).rejects.toThrow(
      MatchNotFoundError,
    );
  });

  it('throws MessageAccessError when user is not a participant', async () => {
    mockMatchRepo.findById.mockResolvedValue(makeMatch());

    await expect(messageService.getMessages('match-1', 'user-c')).rejects.toThrow(
      MessageAccessError,
    );
  });
});

describe('messageService.sendMessage', () => {
  it('creates and returns a new message', async () => {
    mockMatchRepo.findById.mockResolvedValue(makeMatch());
    mockMessageRepo.create.mockResolvedValue(makeDbMessage({ body: '¡Dale!' }));

    const result = await messageService.sendMessage('match-1', 'user-a', '¡Dale!');

    expect(mockMessageRepo.create).toHaveBeenCalledWith('match-1', 'user-a', '¡Dale!');
    expect(result.body).toBe('¡Dale!');
    expect(result.createdAt).toBe(NOW.toISOString());
    expect(result.readAt).toBeNull();
  });

  it('throws MessageAccessError when sender is not a participant', async () => {
    mockMatchRepo.findById.mockResolvedValue(makeMatch());

    await expect(messageService.sendMessage('match-1', 'user-x', 'hola')).rejects.toThrow(
      MessageAccessError,
    );
  });

  it('throws MatchNotFoundError when match does not exist', async () => {
    mockMatchRepo.findById.mockResolvedValue(null);

    await expect(messageService.sendMessage('nonexistent', 'user-a', 'hola')).rejects.toThrow(
      MatchNotFoundError,
    );
  });
});
